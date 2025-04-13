const axios = require('axios');
require('dotenv').config();

/**
 * Friendli.ai service for advanced symptom analysis
 */
const friendliService = {
  /**
   * Analyze symptoms using Friendli.ai's API
   * @param {Array} symptoms - Array of symptom objects from the checklist
   * @returns {Promise<Array>} - Array of predicted conditions with probabilities
   */
  analyzeSymptoms: async (symptoms) => {
    try {
      // Check if API key is configured
      if (!process.env.FRIENDLI_API_KEY) {
        console.log('Friendli API key not configured');
        return null;
      }

      // Format symptoms for better processing
      const formattedSymptoms = symptoms.map(s => {
        const severityText = s.severity === 1 ? 'mild' : s.severity === 2 ? 'moderate' : 'severe';
        return `${s.symptom} (${severityText}${s.duration ? `, duration: ${s.duration}` : ''})`;
      }).join(', ');

      // Create prompt for Friendli AI
      const prompt = `As a medical AI assistant, analyze these symptoms and provide potential medical conditions:
Symptoms: ${formattedSymptoms}

Based on these symptoms, list the top 3 most likely conditions in the following JSON format:
[
  {
    "conditionName": "Name of condition",
    "probability": 0.X (between 0.3 and 0.9),
    "matchedSymptoms": ["symptom1", "symptom2"],
    "explanation": "Brief explanation of why this condition matches these symptoms"
  }
]`;

      console.log('Sending request to Friendli.ai...');
      

      const response = await axios.post(
        'https://api.friendli.ai/dedicated', 
        {
          prompt: prompt,
          max_tokens: 800,
          temperature: 0.3,
          team_id: process.env.TEAM_ID
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.FRIENDLI_API_KEY}`
          }
        }
      );

      // Parse the response
      const content = response.data.choices[0]?.text || response.data.choices[0]?.message?.content;
      console.log('Friendli.ai response received');
      
      if (!content) {
        console.log('No valid response content from Friendli.ai');
        return null;
      }
      
      // Extract JSON from the response
      try {
        // Look for JSON array in the response
        const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        const predictions = JSON.parse(jsonStr);
        
        if (Array.isArray(predictions) && predictions.length > 0) {
          return predictions;
        } else {
          console.log('Invalid prediction format received from Friendli.ai');
          return null;
        }
      } catch (parseError) {
        console.error('Error parsing Friendli.ai response:', parseError);
        return null;
      }
    } catch (error) {
      console.error('Error calling Friendli.ai API:', error);
      return null;
    }
  }
};

module.exports = friendliService;