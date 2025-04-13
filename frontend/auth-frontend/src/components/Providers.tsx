'use client';

import { ApolloProvider } from '@apollo/client';
import { AuthProvider } from '@/context/AuthContext';
import { client } from '@/lib/apolloClient';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ApolloProvider>
  );
} 