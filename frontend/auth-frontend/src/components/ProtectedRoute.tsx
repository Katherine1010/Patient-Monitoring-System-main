'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('nurse' | 'patient')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (allowedRoles && !allowedRoles.includes(user?.role as 'nurse' | 'patient')) {
      router.push(user?.role === 'nurse' ? '/nurse/dashboard' : '/patient/dashboard');
    }
  }, [isAuthenticated, user, allowedRoles, router]);

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role as 'nurse' | 'patient')) {
    return null;
  }

  return <>{children}</>;
} 