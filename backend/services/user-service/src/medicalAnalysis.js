const COMMON_CONDITIONS = {
  'COVID-19': {
    symptoms: ['fever', 'cough', 'shortness of breath', 'fatigue', 'body aches', 'loss of taste or smell', 'diarrhea', 'nausea'],
    severity: 'high',
    recommendation: 'Seek immediate medical attention and get tested for COVID-19'
  },
  'RSV': {
    symptoms: ['cough', 'runny nose', 'fever', 'wheezing', 'difficulty breathing'],
    severity: 'moderate',
    recommendation: 'Monitor symptoms and consult with healthcare provider'
  },
  'Common Cold': {
    symptoms: ['runny nose', 'sore throat', 'cough', 'sneezing', 'mild fever'],
    severity: 'low',
    recommendation: 'Rest, stay hydrated, and monitor symptoms'
  },
  'Flu': {
    symptoms: ['fever', 'cough', 'sore throat', 'body aches', 'fatigue', 'headache', 'nausea'],
    severity: 'moderate',
    recommendation: 'Rest, stay hydrated, and consider antiviral medication if diagnosed early'
  },
  'Gastroenteritis': {
    symptoms: ['diarrhea', 'nausea', 'vomiting', 'stomach cramps', 'fever'],
    severity: 'moderate',
    recommendation: 'Stay hydrated, follow BRAT diet (bananas, rice, applesauce, toast), and monitor symptoms'
  },
  'Food Poisoning': {
    symptoms: ['diarrhea', 'nausea', 'vomiting', 'stomach pain', 'fever'],
    severity: 'moderate',
    recommendation: 'Stay hydrated, avoid solid foods until symptoms improve, and seek medical attention if symptoms persist'
  },
  'Irritable Bowel Syndrome': {
    symptoms: ['diarrhea', 'abdominal pain', 'bloating', 'constipation'],
    severity: 'low',
    recommendation: 'Monitor diet, stay hydrated, and consult with a gastroenterologist for management'
  }
};

function analyzeMedicalConditions(symptoms) {
  const possibleConditions = [];
  const matchedSymptoms = new Set();

  // Check each condition
  for (const [condition, data] of Object.entries(COMMON_CONDITIONS)) {
    const matchingSymptoms = symptoms.filter(symptom => 
      data.symptoms.some(s => s.toLowerCase().includes(symptom.toLowerCase()))
    );

    if (matchingSymptoms.length > 0) {
      possibleConditions.push({
        condition,
        matchingSymptoms,
        severity: data.severity,
        recommendation: data.recommendation
      });

      matchingSymptoms.forEach(symptom => matchedSymptoms.add(symptom));
    }
  }

  // Sort conditions by severity (high to low)
  possibleConditions.sort((a, b) => {
    const severityOrder = { high: 3, moderate: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  // Generate overall recommendation
  let recommendation = 'Monitor your symptoms and maintain good hygiene practices.';
  if (possibleConditions.length > 0) {
    const highestSeverity = possibleConditions[0].severity;
    if (highestSeverity === 'high') {
      recommendation = 'Seek immediate medical attention and get tested.';
    } else if (highestSeverity === 'moderate') {
      recommendation = 'Consult with your healthcare provider and monitor symptoms closely.';
    }
  }

  return {
    possibleConditions,
    recommendation,
    unmatchedSymptoms: symptoms.filter(s => !matchedSymptoms.has(s))
  };
}

module.exports = {
  analyzeMedicalConditions
}; 