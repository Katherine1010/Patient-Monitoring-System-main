const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Schema for medical conditions
const medicalConditionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  symptoms: {
    type: [String],
    required: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['mild', 'moderate', 'severe', 'critical']
  },
  commonTreatments: {
    type: [String]
  },
  aiGenerated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Schema for predicted conditions (embedded in AI predictions)
const predictedConditionSchema = new mongoose.Schema({
  conditionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'MedicalCondition'
  },
  conditionName: {
    type: String,
    required: true
  },
  probability: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  matchedSymptoms: {
    type: [String],
    required: true
  },
  explanation: {
    type: String
  },
  aiGenerated: {
    type: Boolean,
    default: false
  }
});

// Schema for AI predictions
const aiPredictionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  symptomChecklistId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  predictedConditions: [predictedConditionSchema],
  timestamp: {
    type: Date,
    default: Date.now
  },
  reviewed: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId
  },
  reviewNotes: {
    type: String
  },
  usedGpt: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create and export models
const MedicalCondition = mongoose.model('MedicalCondition', medicalConditionSchema);
const AIPrediction = mongoose.model('AIPrediction', aiPredictionSchema);

module.exports = {
  MedicalCondition,
  AIPrediction
};