import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

let client: ApolloClient<any> | null = null;

export function getApolloClient() {
  if (!client) {
    const httpLink = createHttpLink({
      uri: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL,
    });

    const authLink = setContext((_, { headers }) => {
      // Get the authentication token from local storage if it exists
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      // Return the headers to the context so httpLink can read them
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : "",
        }
      }
    });

    client = new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
      ssrMode: typeof window === 'undefined',
    });
  }
  return client;
}

export function initializeApollo(initialState = null) {
  const _apolloClient = getApolloClient();

  // If your page has Next.js data fetching methods that use Apollo Client, the initial state
  // gets hydrated here
  if (initialState) {
    _apolloClient.cache.restore(initialState);
  }
  // For SSG and SSR always create a new Apollo Client
  if (typeof window === 'undefined') return _apolloClient;
  // Create the Apollo Client once in the client
  return _apolloClient;
}

export function useApollo(initialState: any) {
  return initializeApollo(initialState);
} 