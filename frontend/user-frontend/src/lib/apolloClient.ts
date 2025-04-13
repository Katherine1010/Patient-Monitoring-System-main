import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Create an HTTP link to the user service
const httpLink = createHttpLink({
  uri: 'http://localhost:4002/graphql',
});

// Create an auth link that adds the token to the headers
const authLink = setContext((_, { headers }) => {
  // Get the token from localStorage
  const token = localStorage.getItem('token');
  
  // Log token status for debugging
  console.log('Apollo Client - Token status:', {
    hasToken: !!token,
    tokenLength: token?.length
  });
  
  // Return the headers to the context
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// Create the Apollo Client
const client = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
    },
    query: {
      fetchPolicy: 'network-only',
    },
  },
});

export default client; 