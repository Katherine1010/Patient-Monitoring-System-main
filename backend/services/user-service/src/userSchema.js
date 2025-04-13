const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    role: String!
  }

  type DailyInfo {
    id: ID!
    weight: Float
    glucoseLevel: Float
    sleepHours: Float
    exerciseMinutes: Float
    mood: String
    notes: String
    timestamp: String!
  }

  type Symptoms {
    id: ID!
    patientId: ID!
    symptoms: [String!]!
    additionalNotes: String
    timestamp: String!
    possibleConditions: [String!]
    recommendation: String
  }

  type EmergencyAlert {
    id: ID!
    message: String!
    timestamp: String!
    status: String!
  }

  type VitalSigns {
    id: ID!
    patientId: ID!
    temperature: Float!
    heartRate: Int!
    bloodPressureSystolic: Int!
    bloodPressureDiastolic: Int!
    respirationRate: Int!
    notes: String
    timestamp: String!
  }

  type Message {
    id: ID!
    patientId: ID!
    nurseId: ID!
    content: String!
    type: String!
    timestamp: String!
  }

  type MedicalConditionsResponse {
    conditions: [String!]!
    confidence: Float!
    recommendation: String!
  }

  type PatientHistory {
    vitalSigns: [VitalSigns!]!
    messages: [Message!]!
  }

  input DailyInfoInput {
    weight: Float!
    glucoseLevel: Float!
    sleepHours: Float!
    exerciseMinutes: Float!
    mood: String!
    notes: String
  }

  input SymptomsInput {
    symptoms: [String!]!
    additionalNotes: String
  }

  input VitalSignsInput {
    patientId: ID!
    temperature: Float!
    heartRate: Int!
    bloodPressureSystolic: Int!
    bloodPressureDiastolic: Int!
    respirationRate: Int!
    notes: String
  }

  input MessageInput {
    patientId: ID!
    nurseId: ID!
    content: String!
    type: String!
  }

  type Query {
    me: User
    getDailyInfo: [DailyInfo!]!
    getSymptoms: [Symptoms!]!
    getNursePatients(nurseId: ID): [User!]!
    getPatientVitalSigns(patientId: ID!): [VitalSigns!]!
    getPatientSymptomChecklists(patientId: ID!): [Symptoms!]!
    getPatientHistory(patientId: ID!): PatientHistory!
    getMedicalConditions(patientId: ID!, symptoms: [String!]!): MedicalConditionsResponse!
    getPatientMessages(patientId: ID!): [Message!]!
  }

  type Mutation {
    submitDailyInfo(input: DailyInfoInput!): DailyInfo!
    submitSymptoms(input: SymptomsInput!): Symptoms!
    sendEmergencyAlert(message: String!): EmergencyAlert!
    addVitalSigns(input: VitalSignsInput!): VitalSigns!
    sendMotivationalTip(input: MessageInput!): Message!
    sendMessage(input: MessageInput!): Message!
  }
`;

module.exports = typeDefs;