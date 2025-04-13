import { gql } from '@apollo/client';

// Nurse Queries and Mutations
export const GET_NURSE_PATIENTS = gql`
  query GetNursePatients($nurseId: ID!) {
    getNursePatients(nurseId: $nurseId) {
      id
      firstName
      lastName
      email
      vitalSigns {
        id
        heartRate
        bloodPressure
        temperature
        oxygenLevel
        timestamp
      }
    }
  }
`;

export const ADD_VITAL_SIGNS = gql`
  mutation AddVitalSigns($patientId: ID!, $input: VitalSignsInput!) {
    addVitalSigns(patientId: $patientId, input: $input) {
      id
      heartRate
      bloodPressure
      temperature
      oxygenLevel
      timestamp
    }
  }
`;

export const SEND_MOTIVATIONAL_TIP = gql`
  mutation SendMotivationalTip($patientId: ID!, $message: String!) {
    sendMotivationalTip(patientId: $patientId, message: $message) {
      id
      message
      timestamp
    }
  }
`;

// Patient Queries and Mutations
export const GET_PATIENT_DATA = gql`
  query GetPatientData($patientId: ID!) {
    getPatientData(patientId: $patientId) {
      id
      firstName
      lastName
      email
      vitalSigns {
        id
        heartRate
        bloodPressure
        temperature
        oxygenLevel
        timestamp
      }
      messages {
        id
        message
        timestamp
        sender {
          id
          firstName
          lastName
          role
        }
      }
    }
  }
`;

export const GET_PATIENT_HISTORY = gql`
  query GetPatientHistory($patientId: ID!) {
    getPatientHistory(patientId: $patientId) {
      id
      vitalSigns {
        id
        heartRate
        bloodPressure
        temperature
        oxygenLevel
        timestamp
      }
      messages {
        id
        message
        timestamp
        sender {
          id
          firstName
          lastName
          role
        }
      }
    }
  }
`;

// Types
export interface VitalSigns {
  id: string;
  heartRate: number;
  bloodPressure: string;
  temperature: number;
  oxygenLevel: number;
  timestamp: string;
}

export interface Message {
  id: string;
  message: string;
  timestamp: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  vitalSigns: VitalSigns[];
  messages: Message[];
}

export interface VitalSignsInput {
  heartRate: number;
  bloodPressure: string;
  temperature: number;
  oxygenLevel: number;
} 