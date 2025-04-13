"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '@/context/AuthContext';
import {
  SEND_EMERGENCY_ALERT,
  SUBMIT_DAILY_INFO,
  SUBMIT_SYMPTOMS,
  DailyInfoInput,
  SymptomsInput
} from '@/lib/userService';
import { BellIcon, ClipboardDocumentListIcon, HeartIcon } from '@heroicons/react/24/outline';

// Common symptoms for COVID-19 and RSV
const COMMON_SYMPTOMS = [
  { id: 'fever', label: 'Fever' },
  { id: 'cough', label: 'Cough' },
  { id: 'shortness_of_breath', label: 'Shortness of Breath' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'body_aches', label: 'Body Aches' },
  { id: 'headache', label: 'Headache' },
  { id: 'sore_throat', label: 'Sore Throat' },
  { id: 'runny_nose', label: 'Runny Nose' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'diarrhea', label: 'Diarrhea' }
];

const HEALTH_METRICS = {
  weight: {
    label: 'Weight (kg)',
    placeholder: 'Enter your weight in kilograms',
    min: 20,
    max: 300,
    step: 0.1,
    info: 'Normal range: 50-100 kg for adults'
  },
  glucoseLevel: {
    label: 'Blood Glucose Level (mg/dL)',
    placeholder: 'Enter your blood glucose level',
    min: 50,
    max: 400,
    step: 1,
    info: 'Normal range: 70-180 mg/dL. Values outside this range may trigger an alert.'
  },
  sleepHours: {
    label: 'Sleep Duration (hours)',
    placeholder: 'Enter hours of sleep',
    min: 0,
    max: 24,
    step: 0.5,
    info: 'Recommended: 7-9 hours. Less than 5 hours may trigger an alert.'
  },
  exerciseMinutes: {
    label: 'Exercise Duration (minutes)',
    placeholder: 'Enter minutes of exercise',
    min: 0,
    max: 300,
    step: 5,
    info: 'Recommended: 30-60 minutes daily'
  },
  mood: {
    label: 'Mood',
    placeholder: 'Select your mood',
    options: ['excellent', 'good', 'fair', 'poor', 'very poor'],
    info: 'Select how you feel today'
  }
};

export default function PatientDashboard() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [showEmergencyAlert, setShowEmergencyAlert] = useState(false);
  const [showDailyInfo, setShowDailyInfo] = useState(false);
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [dailyInfo, setDailyInfo] = useState<DailyInfoInput>({
    weight: 0,
    glucoseLevel: 0,
    sleepHours: 0,
    exerciseMinutes: 0,
    mood: 'good',
    notes: ''
  });
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomsNotes, setSymptomsNotes] = useState('');

  const [sendEmergencyAlert] = useMutation(SEND_EMERGENCY_ALERT);
  const [submitDailyInfo] = useMutation(SUBMIT_DAILY_INFO);
  const [submitSymptoms] = useMutation(SUBMIT_SYMPTOMS);

  const handleEmergencyAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Sending emergency alert:', emergencyMessage);
      
      const result = await sendEmergencyAlert({
        variables: {
          message: emergencyMessage
        }
      });
      
      console.log('Emergency alert result:', result);
      alert('Emergency alert sent successfully!');
      setShowEmergencyAlert(false);
      setEmergencyMessage('');
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      alert('Failed to send emergency alert. Please try again or contact emergency services directly if this is urgent.');
    }
  };

  const handleDailyInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convert all numeric values to numbers and ensure required fields are present
      const formattedInput = {
        weight: parseFloat(dailyInfo.weight as any) || 0,
        glucoseLevel: parseFloat(dailyInfo.glucoseLevel as any) || 0,
        sleepHours: parseFloat(dailyInfo.sleepHours as any) || 0,
        exerciseMinutes: parseFloat(dailyInfo.exerciseMinutes as any) || 0,
        mood: dailyInfo.mood || 'good',
        notes: dailyInfo.notes || ''
      };

      console.log('Submitting daily info:', formattedInput);
      
      const result = await submitDailyInfo({
        variables: {
          input: formattedInput
        }
      });
      
      console.log('Daily info submission result:', result);
      alert('Daily information submitted successfully!');
      setShowDailyInfo(false);
      setDailyInfo({
        weight: 0,
        glucoseLevel: 0,
        sleepHours: 0,
        exerciseMinutes: 0,
        mood: 'good',
        notes: ''
      });
    } catch (error) {
      console.error('Error submitting daily info:', error);
      alert('Failed to submit daily information. Please try again or contact support if the problem persists.');
    }
  };

  const handleSymptomsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await submitSymptoms({
        variables: {
          input: {
            symptoms: selectedSymptoms,
            additionalNotes: symptomsNotes
          }
        }
      });
      console.log('Symptoms submitted successfully:', data);
      setSelectedSymptoms([]);
      setSymptomsNotes('');
      alert('Symptoms submitted successfully!');
    } catch (error) {
      console.error('Error submitting symptoms:', error);
      alert('Error submitting symptoms. Please try again.');
    }
  };

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptomId)
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

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
  if (!user || user.role !== 'patient') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Unauthorized Access</h1>
          <p className="mt-2 text-gray-600">You do not have permission to access this dashboard.</p>
          <button
            onClick={() => window.location.href = 'http://localhost:3000/dashboard'}
            className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Patient Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = 'http://localhost:3000/dashboard'}
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-4">
              <button
                onClick={() => setShowEmergencyAlert(true)}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <BellIcon className="h-5 w-5 mr-2" />
                Send Emergency Alert
              </button>
              <button
                onClick={() => setShowDailyInfo(true)}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <HeartIcon className="h-5 w-5 mr-2" />
                Submit Daily Information
              </button>
              <button
                onClick={() => setShowSymptoms(true)}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                Submit Symptoms
              </button>
            </div>
          </div>

          {/* Emergency Alert Form */}
          {showEmergencyAlert && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Emergency Alert</h2>
              <form onSubmit={handleEmergencyAlert} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Emergency Message</label>
                  <textarea
                    value={emergencyMessage}
                    onChange={(e) => setEmergencyMessage(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Describe your emergency..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEmergencyAlert(false)}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    Send Alert
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Daily Info Form */}
          {showDailyInfo && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Daily Health Information</h3>
              <form onSubmit={handleDailyInfoSubmit} className="space-y-4">
                {Object.entries(HEALTH_METRICS).map(([key, metric]) => (
                  <div key={key} className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      {metric.label}
                      <span className="text-xs text-gray-500 ml-2">({metric.info})</span>
                    </label>
                    {key === 'mood' ? (
                      <select
                        value={dailyInfo[key] || ''}
                        onChange={(e) => setDailyInfo({ ...dailyInfo, [key]: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="">Select mood</option>
                        {metric.options.map(option => (
                          <option key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={dailyInfo[key] || ''}
                        onChange={(e) => setDailyInfo({ ...dailyInfo, [key]: e.target.value })}
                        placeholder={metric.placeholder}
                        min={metric.min}
                        max={metric.max}
                        step={metric.step}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    )}
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                  <textarea
                    value={dailyInfo.notes || ''}
                    onChange={(e) => setDailyInfo({ ...dailyInfo, notes: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Add any additional notes about your health today"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Submit Daily Info
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Symptoms Form */}
          {showSymptoms && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Symptoms Checklist</h2>
              <form onSubmit={handleSymptomsSubmit} className="space-y-4">
                <div className="space-y-2">
                  {COMMON_SYMPTOMS.map((symptom) => (
                    <div key={symptom.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={symptom.id}
                        checked={selectedSymptoms.includes(symptom.id)}
                        onChange={() => toggleSymptom(symptom.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor={symptom.id} className="ml-2 block text-sm text-gray-900">
                        {symptom.label}
                      </label>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                  <textarea
                    value={symptomsNotes}
                    onChange={(e) => setSymptomsNotes(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Any other symptoms or concerns..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowSymptoms(false)}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 