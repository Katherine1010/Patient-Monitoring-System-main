"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    console.log('Home page mounted:', {
      urlToken: token,
      localStorageToken: localStorage.getItem('token'),
      user,
      isLoading
    });

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
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Healthcare Management System</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <button
                    onClick={() => {
                      if (user.role === 'nurse') {
                        window.location.href = 'http://localhost:3001/nurse-dashboard';
                      } else if (user.role === 'patient') {
                        window.location.href = 'http://localhost:3001/patient-dashboard';
                      }
                    }}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      window.location.href = 'http://localhost:3000/login';
                    }}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => window.location.href = 'http://localhost:3000/login'}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Healthcare Management System</h2>
              <p className="text-xl text-gray-600 mb-8">
                {user 
                  ? `Welcome back, ${user.firstName}! You are logged in as a ${user.role}.`
                  : 'Please login to access your dashboard.'}
              </p>
              {user ? (
                <button
                  onClick={() => {
                    if (user.role === 'nurse') {
                      window.location.href = 'http://localhost:3001/nurse-dashboard';
                    } else if (user.role === 'patient') {
                      window.location.href = 'http://localhost:3001/patient-dashboard';
                    }
                  }}
                  className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Go to Dashboard
                </button>
              ) : (
                <button
                  onClick={() => window.location.href = 'http://localhost:3000/login'}
                  className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Login Now
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
