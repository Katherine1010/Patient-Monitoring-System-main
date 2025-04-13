const {
  VitalSigns,
  HealthData,
  Alert,
  MotivationalTip,
  SymptomChecklist,
  NursePatient
} = require('./userModel');
const axios = require('axios');
require('dotenv').config();

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
    me: (_, __, { user }) => {
      return user;
    },
    getDailyInfo: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      // In a real application, you would fetch this from a database
      return [];
    },
    getSymptoms: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      // In a real application, you would fetch this from a database
      return [];
    },
    // Patient queries
    getPatientVitalSigns: async (_, { patientId }, { user }) => {
      checkAuth(user);
      
      // Allow patients to view only their own vital signs, nurses and admins can view any patient's data
      if (user.role === 'patient' && user.id !== patientId) {
        throw new Error('Unauthorized. Patients can only view their own vital signs.');
      }
      
      return await VitalSigns.find({ patientId }).sort({ timestamp: -1 });
    },
    
    getPatientHealthData: async (_, { patientId }, { user }) => {
      checkAuth(user);
      
      // Allow patients to view only their own health data
      if (user.role === 'patient' && user.id !== patientId) {
        throw new Error('Unauthorized. Patients can only view their own health data.');
      }
      
      return await HealthData.find({ patientId }).sort({ timestamp: -1 });
    },
    
    getPatientAlerts: async (_, { patientId }, { user }) => {
      checkAuth(user);
      
      // Allow patients to view only their own alerts
      if (user.role === 'patient' && user.id !== patientId) {
        throw new Error('Unauthorized. Patients can only view their own alerts.');
      }
      
      return await Alert.find({ patientId }).sort({ timestamp: -1 });
    },
    
    getPatientMotivationalTips: async (_, { patientId }, { user }) => {
      checkAuth(user);
      
      // Allow patients to view only their own tips
      if (user.role === 'patient' && user.id !== patientId) {
        throw new Error('Unauthorized. Patients can only view their own motivational tips.');
      }
      
      return await MotivationalTip.find({ patientId }).sort({ timestamp: -1 });
    },
    
    getPatientSymptomChecklists: async (_, { patientId }, { user }) => {
      checkAuth(user);
      
      // Allow patients to view only their own symptom checklists
      if (user.role === 'patient' && user.id !== patientId) {
        throw new Error('Unauthorized. Patients can only view their own symptom checklists.');
      }
      
      return await SymptomChecklist.find({ patientId }).sort({ timestamp: -1 });
    },
    
    // Nurse queries
    getNursePatients: async (_, { nurseId }, { user }) => {
      checkAuth(user);
      
      // Only allow nurses to view their own patients
      if (user.role === 'nurse' && user.id !== nurseId) {
        throw new Error('Unauthorized. Nurses can only view their own patient list.');
      }
      checkRole(user, ['nurse']);
      
      const nursePatients = await NursePatient.find({ nurseId, active: true });
      return nursePatients.map(np => np.patientId);
    },
    
    getNurseAlerts: async (_, { nurseId }, { user }) => {
      checkAuth(user);
      
      // Only allow nurses to view their own alerts
      if (user.role === 'nurse' && user.id !== nurseId) {
        throw new Error('Unauthorized. Nurses can only view alerts for their patients.');
      }
      checkRole(user, ['nurse']);
      
      // Get all patient IDs assigned to this nurse
      const nursePatients = await NursePatient.find({ nurseId, active: true });
      const patientIds = nursePatients.map(np => np.patientId);
      
      // Get all alerts for these patients
      return await Alert.find({ patientId: { $in: patientIds } }).sort({ timestamp: -1 });
    },
    
    getNurseTips: async (_, { nurseId }, { user }) => {
      checkAuth(user);
      
      // Only allow nurses to view their own tips
      if (user.role === 'nurse' && user.id !== nurseId) {
        throw new Error('Unauthorized. Nurses can only view their own motivational tips.');
      }
      checkRole(user, ['nurse']);
      
      return await MotivationalTip.find({ nurseId }).sort({ timestamp: -1 });
    },
    
    // Combined queries
    getVitalSignsByDateRange: async (_, { patientId, startDate, endDate }, { user }) => {
      checkAuth(user);
      
      // Allow patients to view only their own vital signs
      if (user.role === 'patient' && user.id !== patientId) {
        throw new Error('Unauthorized. Patients can only view their own vital signs.');
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return await VitalSigns.find({
        patientId,
        timestamp: { $gte: start, $lte: end }
      }).sort({ timestamp: -1 });
    },
    
    getHealthDataByDateRange: async (_, { patientId, startDate, endDate }, { user }) => {
      checkAuth(user);
      
      // Allow patients to view only their own health data
      if (user.role === 'patient' && user.id !== patientId) {
        throw new Error('Unauthorized. Patients can only view their own health data.');
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return await HealthData.find({
        patientId,
        timestamp: { $gte: start, $lte: end }
      }).sort({ timestamp: -1 });
    },
    
    getSymptomChecklistById: async (_, { id }, { user }) => {
      // Allow this query to be called by either an authenticated user or via internal service token
      // The context middleware will set user=null if no valid token is provided
      
      try {
        const checklist = await SymptomChecklist.findById(id);
        if (!checklist) {
          throw new Error('Symptom checklist not found');
        }
        
        // If user is null, this is likely a system call via internal token
        // which was already validated in the context middleware
        if (user) {
          // For regular users, check authorization
          if (user.role === 'patient' && user.id !== checklist.patientId.toString()) {
            throw new Error('Unauthorized. Patients can only view their own checklists.');
          }
        }
        
        return checklist;
      } catch (error) {
        console.error('Error fetching symptom checklist by ID:', error);
        throw error;
      }
    }
  },
  
  Mutation: {
    submitDailyInfo: async (_, { input }, { user }) => {
      checkAuth(user);
      
      // Create new health data entry
      const healthData = new HealthData({
        patientId: user.id,
        weight: input.weight,
        glucoseLevel: input.glucoseLevel,
        sleepHours: input.sleepHours,
        exerciseMinutes: input.exerciseMinutes,
        mood: input.mood,
        notes: input.notes,
        timestamp: new Date()
      });
      
      await healthData.save();
      
      // Check for abnormal values and create alerts if necessary
      if (
        (input.glucoseLevel && (input.glucoseLevel < 70 || input.glucoseLevel > 180)) ||
        (input.sleepHours && input.sleepHours < 5)
      ) {
        // Create an alert for abnormal values
        const alert = new Alert({
          patientId: user.id,
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
      }
      
      return healthData;
    },
    submitSymptoms: async (_, { input }, { user }) => {
      checkAuth(user);
      
      // Create new symptom checklist
      const checklist = new SymptomChecklist({
        patientId: user.id,
        symptoms: input.symptoms.map(symptom => ({
          symptom,
          severity: 5, // Default severity
          duration: 'ongoing'
        })),
        notes: input.additionalNotes,
        timestamp: new Date()
      });
      
      await checklist.save();
      
      // Call AI service to process symptoms
      try {
        await axios.post(process.env.AI_SERVICE_URL, {
          query: `
            mutation ProcessSymptoms($checklistId: ID!) {
              processSymptomChecklist(checklistId: $checklistId)
            }
          `,
          variables: {
            checklistId: checklist.id
          }
        });
      } catch (error) {
        console.error('Error calling AI service:', error);
      }
      
      return checklist;
    },
    sendEmergencyAlert: async (_, { message }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      // In a real application, you would send this to emergency services
      return {
        id: Date.now().toString(),
        message,
        timestamp: new Date().toISOString(),
        status: 'SENT'
      };
    },
    // Patient mutations
    recordHealthData: async (_, {
      patientId,
      weight,
      glucoseLevel,
      sleepHours,
      exerciseMinutes,
      mood,
      notes
    }, { user }) => {
      checkAuth(user);
      
      // Patients can only record their own health data
      if (user.role === 'patient' && user.id !== patientId) {
        throw new Error('Unauthorized. Patients can only record their own health data.');
      }
      
      // Create new health data entry
      const healthData = new HealthData({
        patientId,
        weight,
        glucoseLevel,
        sleepHours,
        exerciseMinutes,
        mood,
        notes,
        timestamp: new Date()
      });
      
      await healthData.save();
      
      // Check for abnormal values and create alerts if necessary
      if (
        (glucoseLevel && (glucoseLevel < 70 || glucoseLevel > 180)) ||
        (sleepHours && sleepHours < 5)
      ) {
        // Create an alert for abnormal values
        const alert = new Alert({
          patientId,
          type: 'abnormal_vitals',
          message: `Abnormal health data recorded: ${
            glucoseLevel < 70 ? 'Low blood glucose level' : 
            glucoseLevel > 180 ? 'High blood glucose level' : 
            'Low sleep hours'
          }`,
          priority: glucoseLevel < 70 || glucoseLevel > 200 ? 'high' : 'medium',
          status: 'active',
          timestamp: new Date()
        });
        
        await alert.save();
      }
      
      return healthData;
    },
    
    createPatientAlert: async (_, { patientId, type, message, priority }, { user }) => {
      checkAuth(user);
      
      // Patients can only create alerts for themselves
      if (user.role === 'patient' && user.id !== patientId) {
        throw new Error('Unauthorized. Patients can only create alerts for themselves.');
      }
      
      const alert = new Alert({
        patientId,
        type,
        message,
        priority,
        status: 'active',
        timestamp: new Date()
      });
      
      await alert.save();
      return alert;
    },
    
    submitSymptomChecklist: async (_, { patientId, symptoms, notes }, { user }) => {
      checkAuth(user);
      
      // Patients can only submit their own symptom checklists
      if (user.role === 'patient' && user.id !== patientId) {
        throw new Error('Unauthorized. Patients can only submit their own symptom checklists.');
      }
      
      const checklist = new SymptomChecklist({
        patientId,
        symptoms,
        notes,
        aiProcessed: false,
        timestamp: new Date()
      });
      
      await checklist.save();
      
      // Send the symptom checklist to the AI service for processing
      try {
        const aiServiceUrl = process.env.AI_SERVICE_URL;
        await axios.post(aiServiceUrl, {
          query: `
            mutation ProcessSymptoms($checklistId: ID!) {
              processSymptomChecklist(checklistId: $checklistId)
            }
          `,
          variables: {
            checklistId: checklist.id
          }
        });
      } catch (error) {
        console.error('Error calling AI service:', error);
      }
      
      return checklist;
    },
    
    markTipAsRead: async (_, { tipId }, { user }) => {
      checkAuth(user);
      
      const tip = await MotivationalTip.findById(tipId);
      if (!tip) {
        throw new Error('Motivational tip not found');
      }
      
      // Only the patient who received the tip can mark it as read
      if (user.role === 'patient' && user.id !== tip.patientId.toString()) {
        throw new Error('Unauthorized. Patients can only mark their own tips as read.');
      }
      
      tip.isRead = true;
      await tip.save();
      
      return tip;
    },
    
    // Nurse mutations
    recordVitalSigns: async (_, {
      nurseId,
      patientId,
      heartRate,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      temperature,
      respirationRate,
      oxygenSaturation,
      notes
    }, { user }) => {
      checkAuth(user);
      
      // Only nurses can record vital signs
      if (user.role === 'nurse' && user.id !== nurseId) {
        throw new Error('Unauthorized. Nurses can only record vital signs under their own ID.');
      }
      checkRole(user, ['nurse']);
      
      // Verify that the patient is assigned to this nurse
      const nursePatientRelation = await NursePatient.findOne({
        nurseId,
        patientId,
        active: true
      });
      
      if (!nursePatientRelation) {
        throw new Error('Unauthorized. This patient is not assigned to you.');
      }
      
      // Create new vital signs entry
      const vitalSigns = new VitalSigns({
        patientId,
        heartRate,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        temperature,
        respirationRate,
        oxygenSaturation,
        notes,
        timestamp: new Date()
      });
      
      await vitalSigns.save();
      
      // Check for abnormal values and create alerts if necessary
      let abnormalValues = [];
      
      if (heartRate && (heartRate < 60 || heartRate > 100)) {
        abnormalValues.push(`Heart rate: ${heartRate} bpm`);
      }
      
      if (bloodPressureSystolic && bloodPressureDiastolic) {
        if (bloodPressureSystolic > 140 || bloodPressureDiastolic > 90) {
          abnormalValues.push(`Blood pressure: ${bloodPressureSystolic}/${bloodPressureDiastolic} mmHg (high)`);
        } else if (bloodPressureSystolic < 90 || bloodPressureDiastolic < 60) {
          abnormalValues.push(`Blood pressure: ${bloodPressureSystolic}/${bloodPressureDiastolic} mmHg (low)`);
        }
      }
      
      if (temperature && (temperature < 36 || temperature > 38)) {
        abnormalValues.push(`Temperature: ${temperature}°C`);
      }
      
      if (respirationRate && (respirationRate < 12 || respirationRate > 20)) {
        abnormalValues.push(`Respiration rate: ${respirationRate} breaths/min`);
      }
      
      if (oxygenSaturation && oxygenSaturation < 95) {
        abnormalValues.push(`Oxygen saturation: ${oxygenSaturation}%`);
      }
      
      if (abnormalValues.length > 0) {
        // Create an alert for abnormal vital signs
        const alert = new Alert({
          patientId,
          nurseId,
          type: 'abnormal_vitals',
          message: `Abnormal vital signs recorded: ${abnormalValues.join(', ')}`,
          priority: abnormalValues.length > 2 ? 'high' : 'medium',
          status: 'active',
          timestamp: new Date()
        });
        
        await alert.save();
      }
      
      return vitalSigns;
    },
    
    sendMotivationalTip: async (_, { nurseId, patientId, message }, { user }) => {
      checkAuth(user);
      
      // Only nurses can send motivational tips
      if (user.role === 'nurse' && user.id !== nurseId) {
        throw new Error('Unauthorized. Nurses can only send tips under their own ID.');
      }
      checkRole(user, ['nurse']);
      
      // Verify that the patient is assigned to this nurse
      const nursePatientRelation = await NursePatient.findOne({
        nurseId,
        patientId,
        active: true
      });
      
      if (!nursePatientRelation) {
        throw new Error('Unauthorized. This patient is not assigned to you.');
      }
      
      // Create new motivational tip
      const tip = new MotivationalTip({
        nurseId,
        patientId,
        message,
        isRead: false,
        timestamp: new Date()
      });
      
      await tip.save();
      return tip;
    },
    
    resolveAlert: async (_, { alertId, nurseId }, { user }) => {
      checkAuth(user);
      
      // Only nurses can resolve alerts
      if (user.role === 'nurse' && user.id !== nurseId) {
        throw new Error('Unauthorized. Nurses can only resolve alerts under their own ID.');
      }
      checkRole(user, ['nurse']);
      
      const alert = await Alert.findById(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }
      
      // Verify that the patient is assigned to this nurse
      const nursePatientRelation = await NursePatient.findOne({
        nurseId,
        patientId: alert.patientId,
        active: true
      });
      
      if (!nursePatientRelation) {
        throw new Error('Unauthorized. This patient is not assigned to you.');
      }
      
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolvedBy = nurseId;
      
      await alert.save();
      return alert;
    }
  }
};

module.exports = resolvers;