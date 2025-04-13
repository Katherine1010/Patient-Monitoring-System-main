"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_USER_DETAILS = gql`
  query GetUserDetails {
    me {
      id
      email
      firstName
      lastName
      role
    }
  }
`;

export default function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data, loading, error } = useQuery(GET_USER_DETAILS);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="mt-4 text-gray-600">Error loading your information</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const handleRoleNavigation = () => {
    const token = localStorage.getItem('token');
    const userData = JSON.stringify(user);
    
    if (token && userData) {
      const encodedToken = encodeURIComponent(token);
      const encodedUser = encodeURIComponent(userData);
      
      if (user?.role === 'nurse') {
        window.location.href = `http://localhost:3001/nurse-dashboard?token=${encodedToken}&user=${encodedUser}`;
      } else if (user?.role === 'patient') {
        window.location.href = `http://localhost:3001/patient-dashboard?token=${encodedToken}&user=${encodedUser}`;
      }
    } else {
      console.error('Token or user data not found');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Your Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{data?.me?.firstName} {data?.me?.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{data?.me?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium capitalize">{data?.me?.role}</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <button
                onClick={handleRoleNavigation}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Go to {user?.role === 'nurse' ? 'Nurse' : 'Patient'} Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 