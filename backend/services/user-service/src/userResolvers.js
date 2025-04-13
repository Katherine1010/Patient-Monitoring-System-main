const { SymptomChecklist, HealthData, Alert, User, VitalSigns, Message } = require('./userModel');
const { analyzeMedicalConditions } = require('./medicalAnalysis');
const mongoose = require('mongoose');
const AuthUser = require('./index').AuthUser;
const fetch = require('node-fetch');

const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return user;
    },
    getDailyInfo: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await HealthData.find({ patientId: user.id }).sort({ timestamp: -1 });
    },
    getSymptoms: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await SymptomChecklist.find({ patientId: user.id }).sort({ timestamp: -1 });
    },
    getNursePatients: async (_, { nurseId }, { user }) => {
      if (!user || user.role !== 'nurse') throw new Error('Not authorized');
      console.log('Getting patients for nurse. NurseId provided:', nurseId || 'None');
      
      try {
        // Find all users with role 'patient' from the auth database
        console.log('Looking for patients in the auth database');
        let patients;
        
        try {
          // First try to use the AuthUser model if available
          if (typeof AuthUser !== 'undefined' && AuthUser) {
            console.log('Using AuthUser model to fetch patients');
            patients = await AuthUser.find({ role: 'patient' });
          } else {
            // Fallback to querying the MongoDB directly
            console.log('AuthUser model not available, querying MongoDB directly');
            const authConnection = mongoose.createConnection('mongodb://localhost:27017/patient-monitoring-auth');
            const authUserSchema = new mongoose.Schema({
              email: String, password: String, firstName: String, lastName: String, role: String
            });
            const AuthUser = authConnection.model('User', authUserSchema);
            patients = await AuthUser.find({ role: 'patient' });
            // Close the temporary connection after use
            await authConnection.close();
          }
        } catch (error) {
          console.error('Error trying to find patients in auth database:', error);
          // Fallback to the user database
          console.log('Fallback to user database');
          patients = await User.find({ role: 'patient' });
        }
        
        console.log(`Found ${patients.length} patients in database`);
        
        if (patients.length > 0) {
          console.log('Sample patient:', {
            id: patients[0]._id,
            email: patients[0].email,
            firstName: patients[0].firstName || '[No firstName]',
            lastName: patients[0].lastName || '[No lastName]',
            role: patients[0].role
          });
        }
        
        // Map MongoDB documents to the schema format
        return patients.map(patient => {
          return {
            id: patient._id.toString(),
            email: patient.email,
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            role: patient.role
          };
        });
      } catch (error) {
        console.error('Error fetching patients:', error);
        return [];
      }
    },
    getPatientVitalSigns: async (_, { patientId }, { user }) => {
      if (!user || user.role !== 'nurse') throw new Error('Not authorized');
      console.log('Getting vital signs for patient:', patientId);
      
      try {
        // Try to find the patient from Auth database to validate the ID
        let authPatient = null;
        try {
          if (typeof AuthUser !== 'undefined' && AuthUser) {
            if (mongoose.Types.ObjectId.isValid(patientId)) {
              authPatient = await AuthUser.findById(patientId);
            }
            if (authPatient) {
              console.log('Patient found in auth database:', authPatient.email);
            }
          }
        } catch (error) {
          console.error('Error checking for patient in auth DB:', error);
        }
        
        // Convert patientId to MongoDB ObjectId if needed
        let mongoPatientId;
        if (mongoose.Types.ObjectId.isValid(patientId)) {
          mongoPatientId = new mongoose.Types.ObjectId(patientId);
        } else {
          mongoPatientId = patientId;
        }
        
        console.log('Looking for vital signs with patientId:', mongoPatientId);
        
        // Try to find vital signs
        const vitalSigns = await VitalSigns.find({ patientId: mongoPatientId }).sort({ timestamp: -1 });
        console.log(`Found ${vitalSigns.length} vital sign records for patient ${patientId}`);
        
        // For testing, return test data for specific patients
        if (vitalSigns.length === 0 && (patientId === '67f736c545010811be93f1d2' || authPatient)) {
          console.log('No vital signs found, returning test data for patient');
          return [{
            id: 'testvitals1',
            patientId: patientId,
            temperature: 37.2,
            heartRate: 72,
            bloodPressureSystolic: 120,
            bloodPressureDiastolic: 80,
            respirationRate: 16,
            notes: 'Example vital signs for testing',
            timestamp: new Date().toISOString()
          }];
        }
        
        return vitalSigns.map(record => ({
          id: record._id.toString(),
          patientId: record.patientId.toString(),
          temperature: record.temperature,
          heartRate: record.heartRate,
          bloodPressureSystolic: record.bloodPressureSystolic || 0,
          bloodPressureDiastolic: record.bloodPressureDiastolic || 0,
          respirationRate: record.respirationRate || 0,
          notes: record.notes,
          timestamp: record.timestamp
        }));
      } catch (error) {
        console.error('Error fetching vital signs:', error);
        return [];
      }
    },
    getPatientSymptomChecklists: async (_, { patientId }, { user }) => {
      if (!user || user.role !== 'nurse') throw new Error('Not authorized');
      console.log('Getting symptoms for patient:', patientId);
      
      try {
        // Try to find the patient from Auth database to validate the ID
        let authPatient = null;
        try {
          if (typeof AuthUser !== 'undefined' && AuthUser) {
            if (mongoose.Types.ObjectId.isValid(patientId)) {
              authPatient = await AuthUser.findById(patientId);
            }
            if (authPatient) {
              console.log('Patient found in auth database:', authPatient.email);
            }
          }
        } catch (error) {
          console.error('Error checking for patient in auth DB:', error);
        }
        
        // Convert patientId to MongoDB ObjectId if needed
        let mongoPatientId;
        if (mongoose.Types.ObjectId.isValid(patientId)) {
          mongoPatientId = new mongoose.Types.ObjectId(patientId);
        } else {
          mongoPatientId = patientId;
        }
        
        console.log('Looking for symptoms with patientId:', mongoPatientId);
        
        const symptoms = await SymptomChecklist.find({ patientId: mongoPatientId }).sort({ timestamp: -1 });
        console.log(`Found ${symptoms.length} symptom records for patient ${patientId}`);
        
        // Debug log of the symptom structure
        if (symptoms.length > 0) {
          console.log('First symptom record structure:', JSON.stringify(symptoms[0], null, 2));
        }
        
        // For testing, return test data for specific patients
        if (symptoms.length === 0 && (patientId === '67f736c545010811be93f1d2' || authPatient)) {
          console.log('No symptoms found, returning test data for patient');
          return [{
            id: 'testsymptoms1',
            patientId: patientId,
            symptoms: ['cough', 'fever', 'fatigue'],
            additionalNotes: 'Example symptoms for testing',
            timestamp: new Date().toISOString(),
            possibleConditions: ['Common Cold', 'Flu'],
            recommendation: 'Rest and stay hydrated'
          }];
        }
        
        // Ensure symptoms is never null and timestamp is valid
        return symptoms.map(record => {
          // Format the timestamp
          let timestamp;
          if (record.timestamp) {
            if (typeof record.timestamp === 'string') {
              timestamp = record.timestamp;
            } else {
              try {
                timestamp = record.timestamp.toISOString();
              } catch (e) {
                timestamp = new Date().toISOString(); // Fallback to current date
              }
            }
          } else {
            timestamp = new Date().toISOString(); // Fallback to current date
          }
          
          // Handle symptoms - they might be stored as array of objects with 'symptom' property
          let formattedSymptoms = [];
          if (Array.isArray(record.symptoms)) {
            formattedSymptoms = record.symptoms.map(s => {
              // Handle both formats: string or object with 'symptom' property
              if (typeof s === 'string') return s;
              if (s && typeof s === 'object' && s.symptom) return s.symptom;
              if (s && typeof s === 'object' && s.name) return s.name;
              return 'Unknown symptom';
            });
          }
          
          console.log('Formatted symptoms:', formattedSymptoms);
          
          return {
            id: record._id.toString(),
            patientId: record.patientId.toString(),
            symptoms: formattedSymptoms.length > 0 ? formattedSymptoms : [], // Use empty array if no valid symptoms
            additionalNotes: record.additionalNotes || record.notes || '', // Support both field names
            timestamp: timestamp,
            possibleConditions: record.possibleConditions || [],
            recommendation: record.recommendation || ''
          };
        });
      } catch (error) {
        console.error('Error fetching symptoms:', error);
        return [];
      }
    },
    getPatientHistory: async (_, { patientId }, { user }) => {
      if (!user || user.role !== 'nurse') throw new Error('Not authorized');
      const vitalSigns = await VitalSigns.find({ patientId }).sort({ timestamp: -1 });
      const messages = await Message.find({ patientId }).sort({ timestamp: -1 });
      return { vitalSigns, messages };
    },
    getMedicalConditions: async (_, { patientId, symptoms }, { user }) => {
      if (!user || user.role !== 'nurse') throw new Error('Not authorized');
      console.log('Analyzing symptoms:', symptoms);
      
      // Check if there are any symptoms to analyze
      if (!symptoms || symptoms.length === 0) {
        return {
          conditions: [],
          confidence: 0,
          recommendation: "No symptoms reported for analysis."
        };
      }
      
      try {
        // Analyze symptoms
        const analysis = analyzeMedicalConditions(symptoms);
        
        // Format the response
        return {
          conditions: analysis.possibleConditions.map(c => c.condition),
          confidence: analysis.possibleConditions.length > 0 ? 0.7 : 0.3,
          recommendation: analysis.recommendation
        };
      } catch (error) {
        console.error('Error analyzing symptoms:', error);
        throw new Error(`Failed to analyze symptoms: ${error.message}`);
      }
    },
    getPatientMessages: async (_, { patientId }, { user }) => {
      if (!user || user.role !== 'nurse') throw new Error('Not authorized');
      console.log('Getting messages for patient:', patientId);
      
      try {
        // Convert patientId to MongoDB ObjectId if needed
        let mongoPatientId;
        if (mongoose.Types.ObjectId.isValid(patientId)) {
          mongoPatientId = new mongoose.Types.ObjectId(patientId);
        } else {
          mongoPatientId = patientId;
        }
        
        console.log('Looking for messages with patientId:', mongoPatientId);
        
        const messages = await Message.find({ patientId: mongoPatientId }).sort({ timestamp: -1 });
        console.log(`Found ${messages.length} messages for patient ${patientId}`);
        
        // For testing, return test data for specific patients
        if (messages.length === 0 && patientId === '67f736c545010811be93f1d2') {
          console.log('No messages found, returning test data for patient');
          return [{
            id: 'testmessage1',
            patientId: patientId,
            nurseId: user.id,
            content: 'Remember to stay hydrated and get plenty of rest!',
            type: 'motivational',
            timestamp: new Date().toISOString()
          }];
        }
        
        return messages.map(message => ({
          id: message._id.toString(),
          patientId: message.patientId.toString(),
          nurseId: message.nurseId.toString(),
          content: message.content,
          type: message.type,
          timestamp: message.timestamp
        }));
      } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
    }
  },
  Mutation: {
    submitDailyInfo: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      console.log('Submitting daily info:', input);
      console.log('User:', user);
      
      // Make sure we have a valid patientId
      let patientId = user.id;
      try {
        if (mongoose.Types.ObjectId.isValid(patientId)) {
          patientId = new mongoose.Types.ObjectId(patientId);
        }
      } catch (error) {
        console.error('Error converting patientId to ObjectId:', error);
      }
      
      // Create new health data entry
      const healthData = new HealthData({
        patientId: patientId,
        weight: input.weight,
        glucoseLevel: input.glucoseLevel,
        sleepHours: input.sleepHours,
        exerciseMinutes: input.exerciseMinutes,
        mood: input.mood,
        notes: input.notes,
        timestamp: new Date()
      });
      
      await healthData.save();
      console.log('Health data saved with ID:', healthData._id);
      
      // Check for abnormal values and create alerts if necessary
      if (
        (input.glucoseLevel && (input.glucoseLevel < 70 || input.glucoseLevel > 180)) ||
        (input.sleepHours && input.sleepHours < 5)
      ) {
        // Create an alert for abnormal values
        const alert = new Alert({
          patientId: patientId,
          type: 'abnormal_vitals',
          message: `Abnormal health data recorded: ${
            input.glucoseLevel < 70 ? 'Low blood glucose level' : 
            input.glucoseLevel > 180 ? 'High blood glucose level' : 
            'Low sleep hours'
          }`,
          priority: input.glucoseLevel < 70 || input.glucoseLevel > 200 ? 'high' : 'medium',
          status: 'active',
          timestamp: new Date()
        });
        
        await alert.save();
        console.log('Alert created for abnormal values with ID:', alert._id);
      }
      
      return {
        id: healthData._id.toString(),
        patientId: patientId.toString(),
        ...input,
        timestamp: healthData.timestamp
      };
    },
    submitSymptoms: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      console.log('Submitting symptoms:', input);
      console.log('User:', user);
      
      // Make sure we have a valid patientId
      let patientId = user.id;
      try {
        if (mongoose.Types.ObjectId.isValid(patientId)) {
          patientId = new mongoose.Types.ObjectId(patientId);
        }
      } catch (error) {
        console.error('Error converting patientId to ObjectId:', error);
      }
      
      // Format symptoms for analysis - convert to simple string array if needed
      let symptomsForAnalysis = input.symptoms;
      if (Array.isArray(input.symptoms)) {
        symptomsForAnalysis = input.symptoms.map(s => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object' && s.symptom) return s.symptom;
          if (s && typeof s === 'object' && s.name) return s.name;
          return 'Unknown symptom';
        });
      }
      
      // Analyze symptoms using medical analysis module
      const analysisResult = analyzeMedicalConditions(symptomsForAnalysis);
      console.log('Analysis result:', analysisResult);
      
      // Create timestamp
      const now = new Date();
      const timestamp = now.toISOString();
      
      // Create symptoms array with proper format
      const formattedSymptoms = Array.isArray(input.symptoms) 
        ? input.symptoms.map(symptom => {
            if (typeof symptom === 'string') {
              return {
                symptom: symptom,
                severity: 5, // Default severity
                duration: 'ongoing' // Default duration
              };
            }
            return symptom;
          })
        : [];
        
      // Create new symptom checklist
      const checklist = new SymptomChecklist({
        patientId: patientId,
        symptoms: formattedSymptoms.length > 0 ? formattedSymptoms : [], // Ensure symptoms is never null
        notes: input.additionalNotes || '', // Use notes field for additionalNotes
        timestamp: timestamp,
        aiProcessed: true,
        possibleConditions: analysisResult.possibleConditions.map(pc => pc.condition),
        recommendation: analysisResult.recommendation
      });
      
      await checklist.save();
      console.log('Symptom checklist saved with ID:', checklist._id);
      
      // Extract symptoms as strings for the response
      const symptomStrings = formattedSymptoms.map(s => 
        typeof s === 'string' ? s : (s.symptom || 'Unknown symptom')
      );
      
      return {
        id: checklist._id.toString(),
        patientId: patientId.toString(), // Convert back to string
        symptoms: symptomStrings, // Return symptoms as array of strings
        additionalNotes: input.additionalNotes || '',
        timestamp: timestamp,
        possibleConditions: analysisResult.possibleConditions.map(pc => pc.condition),
        recommendation: analysisResult.recommendation
      };
    },
    sendEmergencyAlert: async (_, { message }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      console.log('Sending emergency alert:', message);
      console.log('User:', user);
      
      // Make sure we have a valid patientId
      let patientId = user.id;
      try {
        if (mongoose.Types.ObjectId.isValid(patientId)) {
          patientId = new mongoose.Types.ObjectId(patientId);
        }
      } catch (error) {
        console.error('Error converting patientId to ObjectId:', error);
      }
      
      // Create new emergency alert
      const alert = new Alert({
        patientId: patientId,
        type: 'emergency',
        message,
        priority: 'critical',
        status: 'active',
        timestamp: new Date()
      });
      
      await alert.save();
      console.log('Emergency alert saved with ID:', alert._id);
      
      return {
        id: alert._id.toString(),
        patientId: patientId.toString(),
        message,
        timestamp: alert.timestamp,
        status: 'SENT'
      };
    },
    addVitalSigns: async (_, { input }, { user }) => {
      if (!user || user.role !== 'nurse') throw new Error('Not authorized');
      
      console.log('Adding vital signs:', input);
      console.log('User (nurse):', user);
      
      // Validate patient ID
      if (!input.patientId) throw new Error('Patient ID is required');
      
      // Make sure we have a valid patientId
      let patientId = input.patientId;
      try {
        if (mongoose.Types.ObjectId.isValid(patientId)) {
          patientId = new mongoose.Types.ObjectId(patientId);
        }
      } catch (error) {
        console.error('Error converting patientId to ObjectId:', error);
      }
      
      // Create new vital signs entry
      const vitalSigns = new VitalSigns({
        patientId: patientId,
        temperature: input.temperature,
        heartRate: input.heartRate,
        bloodPressureSystolic: input.bloodPressureSystolic,
        bloodPressureDiastolic: input.bloodPressureDiastolic,
        respirationRate: input.respirationRate,
        notes: input.notes,
        timestamp: new Date().toISOString()
      });
      
      await vitalSigns.save();
      console.log('Vital signs saved with ID:', vitalSigns._id);
      
      // Check for abnormal values and create alerts if necessary
      let isAbnormal = false;
      let abnormalMessage = "Abnormal vital signs recorded: ";
      
      if (input.temperature > 38.0) {
        isAbnormal = true;
        abnormalMessage += "High temperature; ";
      }
      
      if (input.heartRate < 60 || input.heartRate > 100) {
        isAbnormal = true;
        abnormalMessage += input.heartRate < 60 ? "Low heart rate; " : "High heart rate; ";
      }
      
      if (input.bloodPressureSystolic > 140 || input.bloodPressureSystolic < 90) {
        isAbnormal = true;
        abnormalMessage += input.bloodPressureSystolic > 140 ? "High systolic blood pressure; " : "Low systolic blood pressure; ";
      }
      
      if (input.bloodPressureDiastolic > 90 || input.bloodPressureDiastolic < 60) {
        isAbnormal = true;
        abnormalMessage += input.bloodPressureDiastolic > 90 ? "High diastolic blood pressure; " : "Low diastolic blood pressure; ";
      }
      
      if (isAbnormal) {
        // Create an alert for abnormal values
        const alert = new Alert({
          patientId: patientId,
          type: 'abnormal_vitals',
          message: abnormalMessage,
          priority: 'high',
          status: 'active',
          timestamp: new Date()
        });
        
        await alert.save();
        console.log('Alert created for abnormal vital signs with ID:', alert._id);
      }
      
      return {
        id: vitalSigns._id.toString(),
        patientId: patientId.toString(),
        temperature: vitalSigns.temperature,
        heartRate: vitalSigns.heartRate,
        bloodPressureSystolic: vitalSigns.bloodPressureSystolic,
        bloodPressureDiastolic: vitalSigns.bloodPressureDiastolic,
        respirationRate: vitalSigns.respirationRate,
        notes: vitalSigns.notes,
        timestamp: vitalSigns.timestamp
      };
    },
    sendMotivationalTip: async (_, { input }, { user }) => {
      if (!user || user.role !== 'nurse') throw new Error('Not authorized');
      const message = new Message({
        ...input,
        timestamp: new Date().toISOString()
      });
      await message.save();
      return message;
    },
    sendMessage: async (_, { input }, context) => {
      try {
        const { patientId, nurseId, content, type } = input;
        
        // Verify the nurse is authenticated
        if (!context.user || context.user.role !== 'nurse') {
          throw new Error('Unauthorized: Only nurses can send messages');
        }

        // Verify the nurse exists
        const nurse = await User.findById(nurseId);
        if (!nurse) {
          throw new Error('Nurse not found');
        }

        // Verify the patient exists
        const patient = await User.findById(patientId);
        if (!patient) {
          throw new Error('Patient not found');
        }

        // Create the message
        const message = new Message({
          patientId,
        nurseId,
          content,
          type,
          timestamp: new Date()
        });

        await message.save();
        return message;
      } catch (error) {
        console.error('Error sending message:', error);
        throw new Error(`Failed to send message: ${error.message}`);
      }
    }
  }
};

module.exports = resolvers;