const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type MedicalCondition {
    id: ID!
    name: String!
    description: String
    symptoms: [String!]!
    severity: String!
    commonTreatments: [String]
    aiGenerated: Boolean
  }

  type MedicalConditionsResponse {
    conditions: [String!]!
    confidence: Float!
    recommendation: String!
  }

  type AIPrediction {
    id: ID!
    patientId: ID!
    symptomChecklistId: ID!
    predictedConditions: [PredictedCondition!]!
    timestamp: String!
    reviewed: Boolean
    reviewedBy: ID
    reviewNotes: String
    usedGpt: Boolean
  }

  type PredictedCondition {
    conditionId: ID
    conditionName: String!
    probability: Float!
    matchedSymptoms: [String!]!
    explanation: String
    aiGenerated: Boolean
  }

  type OperationResult {
    success: Boolean!
    message: String
  }

  type FriendliStatus {
    available: Boolean!
    disabledUntil: String
    reason: String
  }

  type Query {
    getPredictionBySymptomChecklistId(checklistId: ID!): AIPrediction
    getPatientPredictions(patientId: ID!): [AIPrediction!]!
    getMedicalConditions(patientId: ID!, symptoms: [String!]!): MedicalConditionsResponse!
    getMedicalConditionById(conditionId: ID!): MedicalCondition
    predictSymptoms(symptoms: [SymptomInput!]!): [PredictedCondition!]!
    friendliStatus: FriendliStatus!
  }

  type Mutation {
    processSymptomChecklist(checklistId: ID!, useGpt: Boolean): Boolean!
    reviewPrediction(predictionId: ID!, nurseId: ID!, reviewNotes: String): AIPrediction!
    createMedicalCondition(
      name: String!,
      description: String,
      symptoms: [String!]!,
      severity: String!,
      commonTreatments: [String!]
    ): MedicalCondition!
    toggleGptForPrediction(enabled: Boolean!): ToggleResponse!
    resetFriendliStatus: OperationResult!
  }

  input SymptomInput {
    symptom: String!
    severity: Int
    duration: String
  }

  type ToggleResponse {
    success: Boolean!
    message: String
  }
`;

module.exports = typeDefs;