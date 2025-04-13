// Create a simple in-memory rate limit checker
let friendliDisabled = false;
let friendliDisabledUntil = null;

// Check if there's a valid API key and if we're not in a cooldown period
const isFriendliAvailable = () => {
  const apiKey = process.env.FRIENDLI_API_KEY;
  
  // If no API key, Friendli is not available
  if (!apiKey) {
    return false;
  }
  
  // If we're in a cooldown period, check if it's expired
  if (friendliDisabled) {
    const now = new Date();
    if (friendliDisabledUntil && now < friendliDisabledUntil) {
      // Still in cooldown
      const minutesRemaining = Math.ceil((friendliDisabledUntil - now) / (1000 * 60));
      console.log(`Friendli.ai integration temporarily disabled for ${minutesRemaining} more minutes due to rate limiting`);
      return false;
    } else {
      // Cooldown expired, reset the flag
      friendliDisabled = false;
      friendliDisabledUntil = null;
      console.log('Friendli.ai integration cooldown period ended, re-enabling');
    }
  }
  
  return true;
};

// Disable Friendli for a period of time
const disableFriendliTemporarily = (minutes = 60) => {
  friendliDisabled = true;
  friendliDisabledUntil = new Date(Date.now() + minutes * 60 * 1000);
  console.log(`Friendli.ai integration disabled for ${minutes} minutes due to rate limit or errors`);
};

const { MedicalCondition, AIPrediction } = require('./aiModel');
const friendliService = require('./friendliService');
const axios = require('axios');
require('dotenv').config();

// Enhanced AI prediction algorithm that combines rule-based and Friendli approaches
const predictMedicalConditions = async (symptoms, useAI = true) => {
  // Get all medical conditions from the database
  const allConditions = await MedicalCondition.find({});
  let predictions = [];
  
  // Try Friendli.ai analysis first if enabled and available
  if (useAI && isFriendliAvailable()) {
    try {
      console.log('Attempting to use Friendli.ai for symptom analysis...');
      const aiPredictions = await friendliService.analyzeSymptoms(symptoms);
      
      if (aiPredictions && aiPredictions.length > 0) {
        console.log('Successfully obtained predictions from Friendli.ai');
        
        // Convert Friendli.ai predictions to match our format
        for (const prediction of aiPredictions) {
          // Try to find a matching condition in our database
          let conditionId = null;
          let matchingCondition = allConditions.find(c => 
            c.name.toLowerCase() === prediction.conditionName.toLowerCase()
          );
          
          if (matchingCondition) {
            conditionId = matchingCondition._id;
          } else {
            // Create a new condition in the database for future reference
            try {
              const newCondition = new MedicalCondition({
                name: prediction.conditionName,
                description: prediction.explanation || `Condition identified by AI for symptoms: ${prediction.matchedSymptoms.join(", ")}`,
                symptoms: prediction.matchedSymptoms,
                severity: determineSeverity(prediction.probability),
                commonTreatments: ["Consult healthcare provider"],
                aiGenerated: true
              });
              
              const savedCondition = await newCondition.save();
              conditionId = savedCondition._id;
              console.log(`Created new condition in database: ${prediction.conditionName}`);
            } catch (error) {
              console.error('Error creating new condition:', error);
              // Continue without creating a condition
            }
          }
          
          predictions.push({
            conditionId: conditionId,
            conditionName: prediction.conditionName,
            probability: prediction.probability,
            matchedSymptoms: prediction.matchedSymptoms,
            explanation: prediction.explanation,
            aiGenerated: true
          });
        }
        
        // If we got valid predictions, return them
        if (predictions.length > 0) {
          return predictions.sort((a, b) => b.probability - a.probability);
        }
      }
    } catch (error) {
      console.error('Error using Friendli.ai for prediction:', error);
      
      // If this is a rate limit or other API error, disable Friendli temporarily
      if (error.response && (error.response.status === 429 || error.response.status >= 500)) {
        disableFriendliTemporarily(60); // Disable for 60 minutes
      }
      
      // Fall back to basic algorithm
    }
  } else if (useAI && !isFriendliAvailable()) {
    console.log('Friendli.ai integration is currently disabled or unavailable, using basic algorithm');
  }
  
  // Fall back to basic algorithm if Friendli.ai didn't provide results
  console.log('Using basic algorithm for symptom analysis...');
  
  // For each condition, calculate how many symptoms match
  for (const condition of allConditions) {
    const matchedSymptoms = condition.symptoms.filter(s => 
      symptoms.some(patientSymptom => 
        patientSymptom.symptom.toLowerCase() === s.toLowerCase()
      )
    );
    
    // Calculate simple probability based on number of matched symptoms
    if (matchedSymptoms.length > 0) {
      const probability = matchedSymptoms.length / condition.symptoms.length;
      
      // If at least 30% of symptoms match, consider it a potential condition
      if (probability >= 0.3) {
        predictions.push({
          conditionId: condition._id,
          conditionName: condition.name,
          probability: probability,
          matchedSymptoms: matchedSymptoms
        });
      }
    }
  }
  
  // Sort by probability (highest first)
  return predictions.sort((a, b) => b.probability - a.probability);
};

// Helper function to determine severity based on probability
function determineSeverity(probability) {
  if (probability >= 0.8) return 'severe';
  if (probability >= 0.6) return 'moderate';
  if (probability >= 0.4) return 'mild';
  return 'mild';
}

// Helper function to check authentication
const checkAuth = (user) => {
  if (!user) {
    throw new Error('Authentication required. Please log in.');
  }
};

// Helper function to check role authorization
const checkRole = (user, allowedRoles) => {
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Unauthorized. This action requires ${allowedRoles.join(' or ')} role.`);
  }
};

const resolvers = {
  Query: {
    getPredictionBySymptomChecklistId: async (_, { checklistId }, { user }) => {
      checkAuth(user);
      const prediction = await AIPrediction.findOne({ symptomChecklistId: checklistId });
      return prediction;
    },
    
    getPatientPredictions: async (_, { patientId }, { user }) => {
      checkAuth(user);
      
      // Patients can only view their own predictions, nurses/admins can view any patient's predictions
      if (user.role === 'patient' && user.id !== patientId) {
        throw new Error('Unauthorized. Patients can only view their own predictions.');
      }
      
      return await AIPrediction.find({ patientId }).sort({ timestamp: -1 });
    },
    
    getMedicalConditions: async (_, { patientId, symptoms }, { user }) => {
      checkAuth(user);
      
      // Check if there are any symptoms to analyze
      if (!symptoms || symptoms.length === 0) {
        return {
          conditions: [],
          confidence: 0,
          recommendation: "No symptoms reported for analysis."
        };
      }
      
      try {
        // Process the symptoms using our prediction algorithm
        const predictedConditions = await predictMedicalConditions(symptoms, false);
        
        // Format the response
        return {
          conditions: predictedConditions.map(pc => pc.conditionName),
          confidence: predictedConditions.length > 0 ? 
            predictedConditions[0].probability : 0.3,
          recommendation: predictedConditions.length > 0 ? 
            predictedConditions[0].explanation : "No specific conditions identified."
        };
      } catch (error) {
        console.error('Error analyzing symptoms:', error);
        throw new Error(`Failed to analyze symptoms: ${error.message}`);
      }
    },
    
    getMedicalConditionById: async (_, { conditionId }, { user }) => {
      checkAuth(user);
      return await MedicalCondition.findById(conditionId);
    },
    
    predictSymptoms: async (_, { symptoms }, { user }) => {
      checkAuth(user);

      const useGPT = symptoms.length >= 3 && process.env.USE_GPT !== 'false';
      
      // Process the symptoms using our enhanced prediction algorithm
      const predictedConditions = await predictMedicalConditions(symptoms, useGPT);
      
      return predictedConditions;
    },

    friendliStatus: async (_, __, { user }) => {
      checkAuth(user);
      checkRole(user, ['nurse', 'admin']);
      
      const available = isFriendliAvailable();
      
      return {
        available,
        disabledUntil: friendliDisabledUntil ? friendliDisabledUntil.toISOString() : null,
        reason: friendliDisabled ? 'Rate limiting or API errors' : 
                (!process.env.FRIENDLI_API_KEY) ? 
                'API key not configured' : (available ? 'Available' : 'Unknown issue')
      };
    }
  },
  
  Mutation: {
    processSymptomChecklist: async (_, { checklistId, useGpt }, { user }) => {

      
      try {
        // Fetch the symptom checklist from the user service
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:4002/graphql';
        const { data } = await axios.post(userServiceUrl, {
          query: `
            query GetChecklistById($checklistId: ID!) {
              getSymptomChecklistById(id: $checklistId) {
                id
                patientId
                symptoms {
                  symptom
                  severity
                  duration
                }
                notes
                timestamp
              }
            }
          `,
          variables: {
            checklistId: checklistId
          }
        }, {
          headers: {
            // Using a system token for internal service communication
            Authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`
          }
        });

        if (!data.data || !data.data.getSymptomChecklistById) {
          throw new Error('Failed to fetch symptom checklist');
        }
        
        const checklist = data.data.getSymptomChecklistById;
        
        if (!checklist) {
          throw new Error('Symptom checklist not found');
        }
        
        // Check if a prediction already exists for this checklist
        const existingPrediction = await AIPrediction.findOne({ symptomChecklistId: checklistId });
        if (existingPrediction) {
          return true; // Already processed
        }
        
 
        const useGPT = useGpt !== undefined ? useGpt : 
                      (checklist.symptoms.length >= 3 && process.env.USE_GPT !== 'false');
        
        // Process the symptoms using our enhanced prediction algorithm
        const predictedConditions = await predictMedicalConditions(checklist.symptoms, useGPT);
        
        // Create a new AI prediction
        const aiPrediction = new AIPrediction({
          patientId: checklist.patientId,
          symptomChecklistId: checklistId,
          predictedConditions,
          timestamp: new Date(),
          usedGpt: useGPT && predictedConditions.some(p => p.aiGenerated)
        });

        console.log("Predicted conditions:", JSON.stringify(predictedConditions));
        
        await aiPrediction.save();
        
        // Create an alert for the highest probability condition if above threshold
        if (predictedConditions.length > 0 && predictedConditions[0].probability > 0.5) {
          try {
            // Prepare a detailed message including the explanation if available
            let alertMessage = `Possible medical condition detected: ${predictedConditions[0].conditionName} (${Math.round(predictedConditions[0].probability * 100)}% match)`;
            
            if (predictedConditions[0].explanation) {
              alertMessage += `. ${predictedConditions[0].explanation.substring(0, 100)}...`;
            }
            
            alertMessage += " Please consult a healthcare professional.";
            
            // Create an alert in the user service
            await axios.post(userServiceUrl, {
              query: `
                mutation CreateAlert($patientId: ID!, $type: String!, $message: String!, $priority: String!) {
                  createPatientAlert(
                    patientId: $patientId,
                    type: $type,
                    message: $message,
                    priority: $priority
                  ) {
                    id
                  }
                }
              `,
              variables: {
                patientId: checklist.patientId,
                type: 'ai_prediction',
                message: alertMessage,
                priority: predictedConditions[0].probability > 0.7 ? 'high' : 'medium'
              }
            }, {
              headers: {
                Authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`
              }
            });
          } catch (error) {
            console.error('Error creating alert:', error);
            // Don't throw error as the prediction was still created successfully
          }
        }

        try {
                  
          console.log(`Checklist ${checklistId} marked as processed`);
        } catch (error) {
          console.error('Error updating checklist status:', error);
        }
        
        return true;
      } catch (error) {
        console.error('Error processing symptom checklist:', error);
        return false;
      }
    },
    
    reviewPrediction: async (_, { predictionId, nurseId, reviewNotes }, { user }) => {
      checkAuth(user);
      checkRole(user, ['nurse', 'admin']);
      
      // Only allow nurses to review predictions under their own ID
      if (user.role === 'nurse' && user.id !== nurseId) {
        throw new Error('Unauthorized. Nurses can only review predictions under their own ID.');
      }
      
      const prediction = await AIPrediction.findById(predictionId);
      if (!prediction) {
        throw new Error('Prediction not found');
      }
      
      // Update the prediction with the review
      prediction.reviewed = true;
      prediction.reviewedBy = nurseId;
      prediction.reviewNotes = reviewNotes;
      
      await prediction.save();
      return prediction;
    },
    
    createMedicalCondition: async (_, { 
      name, 
      description, 
      symptoms, 
      severity, 
      commonTreatments 
    }, { user }) => {
      checkAuth(user);
      checkRole(user, ['nurse']); // Only nurses can create medical conditions
      
      const condition = new MedicalCondition({
        name,
        description,
        symptoms,
        severity,
        commonTreatments
      });
      
      await condition.save();
      return condition;
    },
    
    toggleGptForPrediction: async (_, { enabled }, { user }) => {
      checkAuth(user);
      checkRole(user, ['nurse']); // Only nurses can toggle GPT usage
      
      try {
        // This would typically update a system-wide setting or environment variable
        // For simplicity, we'll just return success
        // In a real implementation, this might update a settings collection in the database
        
        console.log(`GPT usage for predictions ${enabled ? 'enabled' : 'disabled'} by user ${user.id}`);
        
        return {
          success: true,
          message: `GPT integration for symptom analysis has been ${enabled ? 'enabled' : 'disabled'}`
        };
      } catch (error) {
        console.error('Error toggling GPT usage:', error);
        return {
          success: false,
          message: 'Failed to toggle GPT usage. Please try again.'
        };
      }
    },

    resetFriendliStatus: async (_, __, { user }) => {
      checkAuth(user);
      checkRole(user, ['nurse', 'admin']);
      
      friendliDisabled = false;
      friendliDisabledUntil = null;
      
      return {
        success: true,
        message: 'Friendli.ai integration reset successfully'
      };
    }
  }
};

module.exports = resolvers;