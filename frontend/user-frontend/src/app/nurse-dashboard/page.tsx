"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  GET_PATIENT_VITAL_SIGNS,
  ADD_VITAL_SIGNS,
  SEND_MOTIVATIONAL_TIP,
  GET_PATIENT_HISTORY,
  GET_MEDICAL_CONDITIONS as GET_MEDICAL_CONDITIONS_QUERY
} from '@/lib/userService';
import { PlusIcon, ChatBubbleLeftIcon, ClockIcon, UserIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Patient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface VitalSigns {
  id: string;
  patientId: string;
  temperature: number;
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  respirationRate: number;
  notes?: string;
  timestamp: string;
}

interface SymptomItem {
  symptom: string;
  severity?: number;
  duration?: string;
}

interface SymptomChecklist {
  id: string;
  patientId: string;
  symptoms: (string | SymptomItem)[];
  additionalNotes?: string;
  timestamp: string;
  possibleConditions?: string[];
  recommendation?: string;
}

interface Symptom {
  id: string;
  symptom: string;
  additionalNotes?: string;
  timestamp: string;
}

interface MedicalConditions {
  conditions: string[];
  confidence: number;
  recommendation: string;
}

interface Message {
  id: string;
  content: string;
  type: string;
  timestamp: string;
}

// Add this constant for debugging
const DEBUG = true;

const GET_NURSE_PATIENTS = gql`
  query GetNursePatients($nurseId: ID) {
    getNursePatients(nurseId: $nurseId) {
      id
      email
      firstName
      lastName
      role
    }
  }
`;

const GET_PATIENT_SYMPTOMS = gql`
  query GetPatientSymptomChecklists($patientId: ID!) {
    getPatientSymptomChecklists(patientId: $patientId) {
      id
      symptoms
      additionalNotes
      timestamp
    }
  }
`;

const GET_MEDICAL_CONDITIONS = gql`
  query GetMedicalConditions($patientId: ID!, $symptoms: [String!]!) {
    getMedicalConditions(patientId: $patientId, symptoms: $symptoms) {
      conditions
      confidence
      recommendation
    }
  }
`;

const GET_PATIENT_MESSAGES = gql`
  query GetPatientMessages($patientId: ID!) {
    getPatientMessages(patientId: $patientId) {
      id
      content
      type
      timestamp
    }
  }
`;

const VITAL_SIGNS_METRICS = {
  temperature: {
    label: 'Body Temperature (°C)',
    placeholder: 'Enter temperature in Celsius',
    min: 35,
    max: 42,
    step: 0.1,
    info: 'Normal range: 36.1-37.2°C'
  },
  heartRate: {
    label: 'Heart Rate (bpm)',
    placeholder: 'Enter heart rate',
    min: 40,
    max: 200,
    step: 1,
    info: 'Normal range: 60-100 bpm'
  },
  bloodPressureSystolic: {
    label: 'Blood Pressure - Systolic (mmHg)',
    placeholder: 'Enter systolic pressure',
    min: 70,
    max: 200,
    step: 1,
    info: 'Normal range: 90-120 mmHg'
  },
  bloodPressureDiastolic: {
    label: 'Blood Pressure - Diastolic (mmHg)',
    placeholder: 'Enter diastolic pressure',
    min: 40,
    max: 120,
    step: 1,
    info: 'Normal range: 60-80 mmHg'
  },
  respirationRate: {
    label: 'Respiratory Rate (breaths/min)',
    placeholder: 'Enter respiratory rate',
    min: 8,
    max: 40,
    step: 1,
    info: 'Normal range: 12-20 breaths/min'
  }
};

// Function to handle MongoDB ID format
function formatMongoId(id: any): string {
  // If it's already a valid string ID, return it
  if (typeof id === 'string') {
    return id;
  }
  // If it's an object with a toString method (like ObjectId), use that
  if (id && typeof id === 'object' && 'toString' in id) {
    return id.toString();
  }
  // Default fallback
  return String(id || '');
}

// Helper function to extract symptom text regardless of format
function getSymptomText(symptom: string | SymptomItem): string {
  if (typeof symptom === 'string') {
    return symptom;
  }
  return symptom.symptom || 'Unknown symptom';
}

// Helper function to get severity text
function getSeverityText(severity?: number): string {
  if (!severity) return '';
  
  if (severity <= 3) return 'Mild';
  if (severity <= 6) return 'Moderate';
  return 'Severe';
}

export default function NurseDashboard() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [vitalSigns, setVitalSigns] = useState<Partial<VitalSigns>>({
    temperature: 0,
    heartRate: 0,
    bloodPressureSystolic: 0,
    bloodPressureDiastolic: 0,
    respirationRate: 0
  });
  const [motivationalTip, setMotivationalTip] = useState('');
  const [showVitalSignsForm, setShowVitalSignsForm] = useState(true);
  const [showMotivationalTipForm, setShowMotivationalTipForm] = useState(false);
  const [medicalConditions, setMedicalConditions] = useState<MedicalConditions | null>(null);
  const [showMedicalConditions, setShowMedicalConditions] = useState(false);
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [showTipForm, setShowTipForm] = useState(false);
  const [activeTab, setActiveTab] = useState('vitals');
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    console.log('Nurse Dashboard Mounted:', {
      urlToken: token,
      localStorageToken: localStorage.getItem('token'),
      user,
      isLoading
    });

    if (user) {
      console.log('Current user info:', {
        id: user.id,
        email: user.email,
        role: user.role
      });
    } else {
      console.log('No user currently logged in');
    }

    if (token) {
      try {
        // Decode and store the token
        const decodedToken = decodeURIComponent(token);
        localStorage.setItem('token', decodedToken);
        
        // Get user data from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            console.log('User data from localStorage:', parsedUser);
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
      } catch (error) {
        console.error('Error handling token:', error);
      }
    }
  }, [user, isLoading]);

  const { data: patientHistory, loading: historyLoading } = useQuery(GET_PATIENT_HISTORY, {
    variables: { patientId: selectedPatient?.id },
    skip: !selectedPatient?.id
  });

  const { data: conditionsData, loading: conditionsLoading } = useQuery(GET_MEDICAL_CONDITIONS, {
    variables: { 
      patientId: selectedPatient?.id,
      symptoms: {
        temperature: vitalSigns.temperature,
        heartRate: vitalSigns.heartRate,
        bloodPressureSystolic: vitalSigns.bloodPressureSystolic,
        bloodPressureDiastolic: vitalSigns.bloodPressureDiastolic,
        respirationRate: vitalSigns.respirationRate
      }
    },
    skip: !selectedPatient?.id || !showMedicalConditions || !vitalSigns.temperature
  });

  const { data: patientsData, loading: patientsLoading, error: patientsError } = useQuery(GET_NURSE_PATIENTS, {
    variables: { nurseId: user?.id },
    skip: !user?.id,
    onCompleted: (data) => {
      if (DEBUG) {
        console.log('Patients data loaded:', data);
        if (data?.getNursePatients) {
          console.log(`Found ${data.getNursePatients.length} patients:`);
          data.getNursePatients.forEach((patient: Patient) => {
            console.log(`Patient: ${patient.firstName} ${patient.lastName} (${patient.email}), ID: ${patient.id}, Role: ${patient.role}`);
          });
        }
      }
    },
    onError: (error) => {
      console.error('Error loading patients:', error);
      if (error.graphQLErrors) {
        console.error('GraphQL errors:', error.graphQLErrors);
      }
      if (error.networkError) {
        console.error('Network error:', error.networkError);
      }
    }
  });

  const { data: symptomsData, loading: symptomsLoading } = useQuery(GET_PATIENT_SYMPTOMS, {
    variables: { patientId: selectedPatient?.id },
    skip: !selectedPatient?.id,
    onCompleted: (data) => {
      console.log('Symptoms data loaded:', {
        patientId: selectedPatient?.id,
        symptoms: data?.getPatientSymptomChecklists
      });
      if (data?.getPatientSymptomChecklists) {
        setSymptoms(data.getPatientSymptomChecklists);
      }
    },
    onError: (error) => {
      console.error('Error loading symptoms:', error);
    }
  });

  const { data: vitalSignsData, loading: vitalSignsLoading, error: vitalSignsError } = useQuery(GET_PATIENT_VITAL_SIGNS, {
    variables: { patientId: selectedPatient?.id },
    skip: !selectedPatient?.id,
    onCompleted: (data) => console.log('Vital signs data loaded:', data),
    onError: (error) => console.error('Error loading vital signs:', error)
  });

  const { data: medicalConditionsData, loading: medicalConditionsLoading } = useQuery(GET_MEDICAL_CONDITIONS_QUERY, {
    variables: {
      patientId: selectedPatient?.id,
      symptoms: symptomsData?.getPatientSymptomChecklists?.[0]?.symptoms?.map((s: string | SymptomItem) => 
        typeof s === 'string' ? s : s.symptom
      ).filter(Boolean) || []
    },
    skip: !selectedPatient?.id || !symptomsData?.getPatientSymptomChecklists?.[0]?.symptoms?.length,
    onCompleted: (data) => {
      console.log('Medical conditions query completed:', {
        inputSymptoms: symptomsData?.getPatientSymptomChecklists?.[0]?.symptoms?.map((s: string | SymptomItem) => 
          typeof s === 'string' ? s : s.symptom
        ).filter(Boolean) || [],
        receivedData: data
      });
      if (data?.getMedicalConditions) {
        setMedicalConditions(data.getMedicalConditions);
      }
    },
    onError: (error) => {
      console.error('Error fetching medical conditions:', error);
    }
  });

  const { data: messagesData, loading: messagesLoading } = useQuery(GET_PATIENT_MESSAGES, {
    variables: { patientId: selectedPatient?.id },
    skip: !selectedPatient?.id,
    onCompleted: (data) => {
      console.log('Messages data loaded:', data);
      if (data?.getPatientMessages) {
        setMessages(data.getPatientMessages);
      }
    },
    onError: (error) => {
      console.error('Error loading messages:', error);
    }
  });

  const [addVitalSigns] = useMutation(ADD_VITAL_SIGNS);
  const [sendMotivationalTip] = useMutation(SEND_MOTIVATIONAL_TIP);

  const handleSelectPatient = (patient: Patient) => {
    console.log('Selected patient:', patient);
    setSelectedPatient(patient);
    setShowVitalSignsForm(true);
    setShowSymptoms(false);
    setMedicalConditions(null);
  };

  const handleVitalSignsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Submitting vital signs:', {
      patientId: selectedPatient?.id,
      temperature: vitalSigns.temperature,
      heartRate: vitalSigns.heartRate,
      bloodPressureSystolic: vitalSigns.bloodPressureSystolic,
      bloodPressureDiastolic: vitalSigns.bloodPressureDiastolic,
      respirationRate: vitalSigns.respirationRate,
      notes: vitalSigns.notes
    });
    
    try {
      const response = await addVitalSigns({
        variables: {
          input: {
            patientId: selectedPatient?.id,
            temperature: vitalSigns.temperature,
            heartRate: vitalSigns.heartRate,
            bloodPressureSystolic: vitalSigns.bloodPressureSystolic,
            bloodPressureDiastolic: vitalSigns.bloodPressureDiastolic,
            respirationRate: vitalSigns.respirationRate,
            notes: vitalSigns.notes
          }
        },
        refetchQueries: [
          {
            query: GET_PATIENT_VITAL_SIGNS,
            variables: { patientId: selectedPatient?.id }
          }
        ]
      });
      
      console.log('Vital signs added successfully:', response.data);
      
      // Reset form after submission
      setVitalSigns({
        temperature: 0,
        heartRate: 0,
        bloodPressureSystolic: 0,
        bloodPressureDiastolic: 0,
        respirationRate: 0
      });
      
      // Show success message
      alert('Vital signs recorded successfully');
      
    } catch (error) {
      console.error('Error adding vital signs:', error);
      alert('Failed to record vital signs: ' + (error as any).message);
    }
  };

  const handleSendMotivationalTip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendMotivationalTip({
        variables: {
          input: {
            patientId: selectedPatient?.id,
            nurseId: user?.id,
            content: motivationalTip,
            type: 'motivational'
          }
        }
      });
      setShowTipForm(false);
      setMotivationalTip('');
      alert('Motivational tip sent successfully!');
    } catch (error) {
      console.error('Error sending motivational tip:', error);
      alert('Error sending motivational tip: ' + (error as any).message);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = 'http://localhost:3001';
    } else if (user && user.role !== 'nurse') {
      window.location.href = 'http://localhost:3001';
    }
  }, [user, isLoading]);

  // Add this debug message handler
  useEffect(() => {
    if (patientsData) {
      console.log("Patient data received:", patientsData);
    }
    if (patientsError) {
      console.error("Patient data error:", patientsError);
    }
  }, [patientsData, patientsError]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  // If no user or wrong role, show unauthorized message
  if (!user || user.role !== 'nurse') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Unauthorized Access</h1>
          <p className="mt-2 text-gray-600">You do not have permission to access this dashboard.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Add a hard-coded example if no patients are found  
  const renderPatients = () => {
    if (patientsLoading) {
      return <p>Loading patients...</p>;
    }
    
    if (patientsError) {
      return (
        <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded">
          <p>Error loading patients: {patientsError.message}</p>
          <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(patientsError, null, 2)}</pre>
          
          {/* Show hardcoded example patient for debugging */}
          <div className="mt-4 p-4 border border-gray-300 rounded">
            <h3 className="font-medium text-gray-700">Example Patient (For Testing)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              <div
                className="p-4 border rounded-lg cursor-pointer border-gray-200 hover:bg-blue-50 hover:border-blue-500"
                onClick={() => handleSelectPatient({
                  id: '67f736c545010811be93f1d2',
                  email: 'a@gmail.com',
                  firstName: 'Kathy',
                  lastName: 'Vincent',
                  role: 'patient'
                })}
              >
                <h3 className="font-medium">Kathy Vincent</h3>
                <p className="text-sm text-gray-600">a@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (!patientsData?.getNursePatients?.length) {
      return (
        <div>
          <p>No patients found in the database. Please make sure patients are assigned to your account.</p>
          
          {/* Show hardcoded example patient for debugging */}
          <div className="mt-4 p-4 border border-gray-300 rounded">
            <h3 className="font-medium text-gray-700">Example Patient (For Testing)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              <div
                className="p-4 border rounded-lg cursor-pointer border-gray-200 hover:bg-blue-50 hover:border-blue-500"
                onClick={() => handleSelectPatient({
                  id: '67f736c545010811be93f1d2',
                  email: 'a@gmail.com',
                  firstName: 'Kathy',
                  lastName: 'Vincent',
                  role: 'patient'
                })}
              >
                <h3 className="font-medium">Kathy Vincent</h3>
                <p className="text-sm text-gray-600">a@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patientsData.getNursePatients.map((patient: Patient) => (
          <div
            key={patient.id}
            className={`p-4 border rounded-lg cursor-pointer ${
              selectedPatient?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => handleSelectPatient(patient)}
          >
            <h3 className="font-medium">{patient.firstName} {patient.lastName}</h3>
            <p className="text-sm text-gray-600">{patient.email}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Nurse Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Back to Dashboard
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Nurse Dashboard</h1>
          
          {/* Patient Selection */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Select Patient</h2>
            {renderPatients()}
          </div>

          {/* Patient Information */}
          {selectedPatient && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Patient Information: {selectedPatient.firstName} {selectedPatient.lastName}
              </h2>
              
              {/* Tabs */}
              <div className="border-b border-gray-200 mb-4">
                <div className="flex space-x-4 mb-6">
                  <button
                    onClick={() => setActiveTab('vitals')}
                    className={`px-4 py-2 rounded-md ${
                      activeTab === 'vitals'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Vital Signs
                  </button>
                  <button
                    onClick={() => setActiveTab('symptoms')}
                    className={`px-4 py-2 rounded-md ${
                      activeTab === 'symptoms'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Symptoms
                  </button>
                  <button
                    onClick={() => setActiveTab('medical')}
                    className={`px-4 py-2 rounded-md ${
                      activeTab === 'medical'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Medical Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className={`px-4 py-2 rounded-md ${
                      activeTab === 'messages'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Motivational Tips
                  </button>
                </div>
              </div>

              {/* Messages Tab */}
              {activeTab === 'messages' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Sent Motivational Tips</h3>
                    {messagesLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading messages...</p>
                      </div>
                    ) : messages.length > 0 ? (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div key={message.id} className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-blue-800">{message.content}</p>
                                <p className="text-sm text-blue-600 mt-2">
                                  {new Date(message.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {message.type}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No motivational tips have been sent yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Vital Signs Tab */}
              {activeTab === 'vitals' && (
                <div>
                  {/* Add New Vital Signs Button */}
                  <div className="mb-4">
                    <button
                      onClick={() => setShowVitalSignsForm(true)} 
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <PlusIcon className="inline-block w-5 h-5 mr-1" /> Add New Vital Signs
                    </button>
                  </div>
                
                  {/* Add New Vital Signs Form */}
                  <div className="mb-8 p-4 border rounded-lg bg-gray-50">
                    <h3 className="text-lg font-medium mb-4">Record New Vital Signs</h3>
                    <form onSubmit={handleVitalSignsSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Body Temperature (°C)
                          </label>
                          <input
                            type="number"
                            min="35"
                            max="42"
                            step="0.1"
                            value={vitalSigns.temperature || ''}
                            onChange={(e) => setVitalSigns({ ...vitalSigns, temperature: parseFloat(e.target.value) })}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Enter temperature"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">Normal range: 36.1-37.2°C</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Heart Rate (bpm)
                          </label>
                          <input
                            type="number"
                            min="40"
                            max="200"
                            step="1"
                            value={vitalSigns.heartRate || ''}
                            onChange={(e) => setVitalSigns({ ...vitalSigns, heartRate: parseInt(e.target.value) })}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Enter heart rate"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">Normal range: 60-100 bpm</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Blood Pressure - Systolic (mmHg)
                          </label>
                          <input
                            type="number"
                            min="70"
                            max="200"
                            step="1"
                            value={vitalSigns.bloodPressureSystolic || ''}
                            onChange={(e) => setVitalSigns({ ...vitalSigns, bloodPressureSystolic: parseInt(e.target.value) })}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Enter systolic pressure"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">Normal range: 90-120 mmHg</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Blood Pressure - Diastolic (mmHg)
                          </label>
                          <input
                            type="number"
                            min="40"
                            max="120"
                            step="1"
                            value={vitalSigns.bloodPressureDiastolic || ''}
                            onChange={(e) => setVitalSigns({ ...vitalSigns, bloodPressureDiastolic: parseInt(e.target.value) })}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Enter diastolic pressure"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">Normal range: 60-80 mmHg</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Respiratory Rate (breaths/min)
                          </label>
                          <input
                            type="number"
                            min="8"
                            max="40"
                            step="1"
                            value={vitalSigns.respirationRate || ''}
                            onChange={(e) => setVitalSigns({ ...vitalSigns, respirationRate: parseInt(e.target.value) })}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Enter respiratory rate"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">Normal range: 12-20 breaths/min</p>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <textarea
                            value={vitalSigns.notes || ''}
                            onChange={(e) => setVitalSigns({ ...vitalSigns, notes: e.target.value })}
                            rows={3}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Enter any additional notes"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Save Vital Signs
                        </button>
                      </div>
                    </form>
                  </div>
                
                  {/* List of Vital Signs */}
                  {vitalSignsLoading ? (
                    <p>Loading vital signs...</p>
                  ) : vitalSignsError ? (
                    <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded">
                      <p>Error loading vital signs: {vitalSignsError.message}</p>
                      <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(vitalSignsError, null, 2)}</pre>
                    </div>
                  ) : vitalSignsData?.getPatientVitalSigns?.length ? (
                    <div className="space-y-4">
                      {vitalSignsData.getPatientVitalSigns.map((record: VitalSigns) => (
                        <div key={record.id} className="border rounded-lg p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Heart Rate</p>
                              <p className="font-medium">{record.heartRate} bpm</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Blood Pressure</p>
                              <p className="font-medium">
                                {record.bloodPressureSystolic}/{record.bloodPressureDiastolic} mmHg
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Temperature</p>
                              <p className="font-medium">{record.temperature}°C</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Respiration Rate</p>
                              <p className="font-medium">{record.respirationRate} /min</p>
                            </div>
                          </div>
                          {record.notes && (
                            <div className="mt-4">
                              <p className="text-sm text-gray-500">Notes</p>
                              <p className="text-sm">{record.notes}</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Recorded: {new Date(record.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No vital signs records found for this patient.</p>
                  )}
                </div>
              )}

              {/* Symptoms Tab */}
              {activeTab === 'symptoms' && (
                <div>
                  {symptomsLoading ? (
                    <p>Loading symptoms...</p>
                  ) : symptomsData?.getPatientSymptomChecklists?.length ? (
                    <div className="space-y-4">
                      {symptomsData.getPatientSymptomChecklists.map((checklist: SymptomChecklist) => (
                        <div key={checklist.id} className="border rounded-lg p-4">
                          <div className="mb-3">
                            <h3 className="font-medium text-gray-900 mb-2">Symptoms Reported</h3>
                            {checklist.symptoms && checklist.symptoms.length > 0 ? (
                              <div className="space-y-2">
                                {checklist.symptoms.map((symptom: string | SymptomItem, index: number) => {
                                  const symptomText = getSymptomText(symptom);
                                  const hasDetails = typeof symptom === 'object' && (symptom.severity || symptom.duration);
                                  
                                  return (
                                    <div key={index} className="flex">
                                      <div className="mr-2">•</div>
                                      <div>
                                        <span className="text-sm text-gray-800">{symptomText}</span>
                                        {hasDetails && (
                                          <div className="text-xs text-gray-600 ml-1">
                                            {typeof symptom === 'object' && symptom.severity && (
                                              <span className="mr-2">Severity: {getSeverityText(symptom.severity)} ({symptom.severity}/10)</span>
                                            )}
                                            {typeof symptom === 'object' && symptom.duration && (
                                              <span>Duration: {symptom.duration}</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No specific symptoms reported</p>
                            )}
                          </div>
                          
                          {checklist.additionalNotes && (
                            <div className="mb-3 border-t pt-2">
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Additional Notes</h4>
                              <p className="text-sm text-gray-800">{checklist.additionalNotes}</p>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 mt-2">
                            Recorded: {checklist.timestamp ? 
                              new Date(checklist.timestamp).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                              : 'Date not available'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No symptom records found for this patient.</p>
                  )}
                </div>
              )}

              {/* Medical Analysis Tab */}
              {activeTab === 'medical' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Medical Condition Analysis</h3>
                    {medicalConditionsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Analyzing symptoms...</p>
                      </div>
                    ) : medicalConditions && medicalConditions.conditions.length > 0 ? (
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-blue-800">Possible Conditions</h4>
                          <ul className="mt-2 space-y-2">
                            {medicalConditions.conditions.map((condition: string, index: number) => (
                              <li key={index} className="text-blue-700">
                                • {condition}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-yellow-800">Confidence Level</h4>
                          <p className="mt-2 text-yellow-700">
                            {Math.round(medicalConditions.confidence * 100)}% confidence in predictions
                          </p>
                        </div>
                        
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-green-800">Recommendation</h4>
                          <p className="mt-2 text-green-700">{medicalConditions.recommendation}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">No medical condition analysis available. Please report symptoms to get an analysis.</p>
                    )}
                  </div>
                </div>
              )}

              {/* After the Symptoms and Vital Signs tabs */}
              {/* Motivational Tip Form */}
              <div className="mt-8 border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Send Motivational Tip</h3>
                  <button
                    onClick={() => setShowTipForm(!showTipForm)}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {showTipForm ? 'Cancel' : 'New Tip'}
                  </button>
                </div>
                
                {showTipForm && (
                  <form onSubmit={handleSendMotivationalTip} className="bg-gray-50 p-4 rounded-lg border mb-4">
                    <div className="mb-4">
                      <label htmlFor="motivationalTip" className="block text-sm font-medium text-gray-700 mb-1">
                        Message
                      </label>
                      <textarea
                        id="motivationalTip"
                        rows={3}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Enter a motivational message for the patient"
                        value={motivationalTip}
                        onChange={(e) => setMotivationalTip(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Send Message
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 