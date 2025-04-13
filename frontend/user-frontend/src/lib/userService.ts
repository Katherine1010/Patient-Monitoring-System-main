import { gql } from '@apollo/client';

// Nurse Queries and Mutations
export const GET_PATIENT_VITAL_SIGNS = gql`
  query GetPatientVitalSigns($patientId: ID!) {
    getPatientVitalSigns(patientId: $patientId) {
      id
      patientId
      temperature
      heartRate
      bloodPressureSystolic
      bloodPressureDiastolic
      respirationRate
      notes
      timestamp
    }
  }
`;

export const ADD_VITAL_SIGNS = gql`
  mutation AddVitalSigns($input: VitalSignsInput!) {
    addVitalSigns(input: $input) {
      id
      patientId
      temperature
      heartRate
      bloodPressureSystolic
      bloodPressureDiastolic
      respirationRate
      notes
      timestamp
    }
  }
`;

export const SEND_MOTIVATIONAL_TIP = gql`
  mutation SendMotivationalTip($input: MessageInput!) {
    sendMotivationalTip(input: $input) {
      id
      patientId
      nurseId
      content
      type
      timestamp
    }
  }
`;

export const GET_PATIENT_HISTORY = gql`
  query GetPatientHistory($patientId: ID!) {
    getPatientHistory(patientId: $patientId) {
      vitalSigns {
        id
        patientId
        temperature
        heartRate
        bloodPressureSystolic
        bloodPressureDiastolic
        respirationRate
        notes
        timestamp
      }
      messages {
        id
        patientId
        message
        timestamp
      }
    }
  }
`;

export const GET_MEDICAL_CONDITIONS = gql`
  query GetMedicalConditions($patientId: ID!, $symptoms: [String!]!) {
    getMedicalConditions(patientId: $patientId, symptoms: $symptoms) {
      conditions
      confidence
      recommendation
    }
  }
`;

// Patient Queries and Mutations
export const SEND_EMERGENCY_ALERT = gql`
  mutation SendEmergencyAlert($message: String!) {
    sendEmergencyAlert(message: $message) {
      id
      message
      timestamp
      status
    }
  }
`;

export const SUBMIT_DAILY_INFO = gql`
  mutation SubmitDailyInfo($input: DailyInfoInput!) {
    submitDailyInfo(input: $input) {
      id
      weight
      glucoseLevel
      sleepHours
      exerciseMinutes
      mood
      notes
      timestamp
    }
  }
`;

export const SUBMIT_SYMPTOMS = gql`
  mutation SubmitSymptoms($input: SymptomsInput!) {
    submitSymptoms(input: $input) {
      id
      symptoms
      additionalNotes
      timestamp
      possibleConditions
      recommendation
    }
  }
`;

// Types
export interface VitalSigns {
  id: string;
  patientId: string;
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  temperature: number;
  respirationRate: number;
  notes?: string;
  timestamp: string;
}

export interface Message {
  id: string;
  patientId: string;
  nurseId: string;
  content: string;
  type: 'motivational' | 'medical';
  timestamp: string;
}

export interface PatientHistory {
  vitalSigns: VitalSigns[];
  messages: Message[];
}

export interface DailyInfoInput {
  weight: number;
  glucoseLevel: number;
  sleepHours: number;
  exerciseMinutes: number;
  mood: 'excellent' | 'good' | 'fair' | 'poor' | 'very poor';
  notes?: string;
}

export interface SymptomsInput {
  symptoms: string[];
  additionalNotes?: string;
}

export interface MedicalConditionsResponse {
  conditions: string[];
  confidence: number;
  recommendation: string;
}

export interface MessageInput {
  patientId: string;
  content: string;
  type: 'motivational' | 'medical';
} 