'use client';

import { ApolloProvider } from '@apollo/client';
import { AuthProvider } from '@/context/AuthContext';
import { getApolloClient } from '@/lib/apolloClient';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const client = getApolloClient();
  
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ApolloProvider>
  );
} 