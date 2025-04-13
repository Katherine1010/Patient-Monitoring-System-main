"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useApolloClient, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const client = useApolloClient();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for token in URL first
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userData = urlParams.get('user');
        
        if (token && userData) {
          console.log('Token and user data found in URL');
          const decodedToken = decodeURIComponent(token).trim();
          const decodedUser = decodeURIComponent(userData);
          
          console.log('Decoded token:', decodedToken);
          console.log('Decoded user:', decodedUser);
          
          // Store the token and user data first
          localStorage.setItem('token', decodedToken);
          localStorage.setItem('user', decodedUser);
          
          try {
            const parsedUser = JSON.parse(decodedUser);
            console.log('Setting user from URL:', parsedUser);
            setUser(parsedUser);
            
            // Navigate to the appropriate dashboard
            if (parsedUser.role === 'nurse') {
              router.push('/nurse-dashboard');
            } else if (parsedUser.role === 'patient') {
              router.push('/patient-dashboard');
            }
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        } else {
          // Check localStorage for existing data
          const storedToken = localStorage.getItem('token');
          const storedUser = localStorage.getItem('user');
          
          if (storedToken && storedUser) {
            console.log('Token and user data found in localStorage');
            // Verify stored token with auth service
            try {
              const { data } = await client.query({
                query: gql`
                  query ValidateToken {
                    me {
                      id
                      email
                      role
                    }
                  }
                `,
                context: {
                  headers: {
                    Authorization: `Bearer ${storedToken}`
                  }
                }
              });
              
              if (data?.me) {
                console.log('Stored token validated with auth service:', data.me);
                try {
                  const parsedUser = JSON.parse(storedUser);
                  console.log('Setting user from localStorage:', parsedUser);
                  setUser(parsedUser);
                } catch (error) {
                  console.error('Error parsing stored user data:', error);
                }
              } else {
                console.error('Stored token validation failed: No user data returned');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
              }
            } catch (error) {
              console.error('Error validating stored token:', error);
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = 'http://localhost:3000/login';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 