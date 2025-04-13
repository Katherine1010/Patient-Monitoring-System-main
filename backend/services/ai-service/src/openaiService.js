const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * OpenAI service for advanced symptom analysis
 */
const openaiService = {
  /**
   * Analyze symptoms using OpenAI's GPT model
   * @param {Array} symptoms - Array of symptom objects from the checklist
   * @returns {Promise<Array>} - Array of predicted conditions with probabilities
   */
  analyzeSymptoms: async (symptoms) => {
    try {
      // Check if API key is configured
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        console.log('OpenAI API key not configured properly');
        return null;
      }

      // Format symptoms for better processing
      const formattedSymptoms = symptoms.map(s => {
        const severityText = s.severity === 1 ? 'mild' : s.severity === 2 ? 'moderate' : 'severe';
        return `${s.symptom} (${severityText}${s.duration ? `, duration: ${s.duration}` : ''})`;
      }).join(', ');

      // Create prompt for OpenAI
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
]
`;

      console.log('Sending request to OpenAI...');
      
      // Call OpenAI API with retry logic
      let attempts = 0;
      const maxAttempts = 2;
      
      while (attempts < maxAttempts) {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a medical diagnostic assistant that provides analysis in structured JSON format only." },
              { role: "user", content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 800,
          });

          // Parse the response
          const content = response.choices[0]?.message.content;
          console.log('OpenAI response received');
          
          // Extract JSON from the response
          try {
            // Look for JSON array in the response
            const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
            const jsonStr = jsonMatch ? jsonMatch[0] : content;
            const predictions = JSON.parse(jsonStr);
            
            if (Array.isArray(predictions) && predictions.length > 0) {
              return predictions;
            } else {
              console.log('Invalid prediction format received from OpenAI');
              return null;
            }
          } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError);
            return null;
          }
        } catch (apiError) {
          attempts++;
          
          // Check if this is a rate limit or quota error
          if (apiError.status === 429 || 
              (apiError.error && apiError.error.type === 'insufficient_quota')) {
            console.error('OpenAI API quota exceeded or rate limited');
            
            // Don't retry quota errors - they won't resolve quickly
            return null;
          }
          
          // For other errors, retry once with a delay if we haven't hit max attempts
          if (attempts < maxAttempts) {
            console.log(`Retrying OpenAI request after error (attempt ${attempts} of ${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.error('Error calling OpenAI API:', apiError);
            return null;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return null;
    }
  }
};

module.exports = openaiService;