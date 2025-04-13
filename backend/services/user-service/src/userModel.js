const mongoose = require('mongoose');

// Schema for vital signs
const vitalSignsSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  heartRate: {
    type: Number,
    required: true
  },
  bloodPressureSystolic: {
    type: Number,
    required: true
  },
  bloodPressureDiastolic: {
    type: Number,
    required: true
  },
  temperature: {
    type: Number,
    required: true
  },
  respirationRate: {
    type: Number,
    required: true
  },
  notes: {
    type: String
  },
  timestamp: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Schema for patient health data
const healthDataSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  weight: {
    type: Number
  },
  glucoseLevel: {
    type: Number
  },
  sleepHours: {
    type: Number
  },
  exerciseMinutes: {
    type: Number
  },
  mood: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'very poor']
  },
  notes: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Schema for alerts
const alertSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    required: true,
    enum: ['emergency', 'abnormal_vitals', 'medication', 'appointment', 'ai_prediction']
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'resolved', 'dismissed'],
    default: 'active'
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Schema for motivational tips
const motivationalTipSchema = new mongoose.Schema({
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Define a schema for symptom checklist items (single symptoms)
const symptomChecklistItemSchema = new mongoose.Schema({
  symptom: {
    type: String,
    required: true
  },
  severity: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  duration: {
    type: String,
    enum: ['less than 1 day', 'few days', 'a week', 'ongoing'],
    default: 'ongoing'
  }
});

// SymptomChecklist Schema
const symptomChecklistSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symptoms: [symptomChecklistItemSchema],
  notes: {
    type: String
  },
  additionalNotes: {
    type: String
  },
  aiProcessed: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  possibleConditions: {
    type: [String]
  },
  recommendation: {
    type: String
  }
}, {
  timestamps: true
});

// Schema for nurse-patient relationship
const nursePatientSchema = new mongoose.Schema({
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  assignedDate: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Schema for user
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['patient', 'nurse'], required: true },
  assignedNurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

const messageSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['motivational', 'medical'], required: true },
  timestamp: { type: String, required: true }
});

// Create and export models
const User = mongoose.model('User', userSchema);
const VitalSigns = mongoose.model('VitalSigns', vitalSignsSchema);
const HealthData = mongoose.model('HealthData', healthDataSchema);
const Alert = mongoose.model('Alert', alertSchema);
const MotivationalTip = mongoose.model('MotivationalTip', motivationalTipSchema);
const SymptomChecklist = mongoose.model('SymptomChecklist', symptomChecklistSchema);
const NursePatient = mongoose.model('NursePatient', nursePatientSchema);
const Message = mongoose.model('Message', messageSchema);

module.exports = {
  User,
  VitalSigns,
  HealthData,
  Alert,
  MotivationalTip,
  SymptomChecklist,
  NursePatient,
  Message
};