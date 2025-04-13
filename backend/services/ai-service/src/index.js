const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const mongoose = require('mongoose');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('./aiSchema');
const resolvers = require('./aiResolvers');
const axios = require('axios');
require('dotenv').config();

// Create schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/patient-monitoring-ai')
  .then(() => console.log('MongoDB Connected - AI Service'))
  .catch(err => console.error('MongoDB Connection Error:', err));

async function startServer() {
  // Create Express server
  const app = express();
  
  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      // Get the user token from the headers - handle both "authorization" and "Authorization"
      const authHeader = req.headers.authorization || req.headers.Authorization || '';
      
      // Check for internal service token for system-to-system communication
      const isInternalRequest = authHeader === `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}` || 
                               authHeader === process.env.INTERNAL_SERVICE_TOKEN;
      
      if (isInternalRequest) {
        return {
          user: {
            id: 'system',
            role: 'system',
            email: 'system@patientmonitoring.internal'
          }
        };
      }
      
      // If not an internal request, try to validate the token
      if (authHeader) {
        try {
          // Format token if needed
          const token = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
          
          // Validate token by calling auth service
          const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001/graphql';
          const { data } = await axios.post(authServiceUrl, {
            query: `
              query ValidateToken {
                me {
                  id
                  email
                  role
                }
              }
            `
          }, {
            headers: {
              Authorization: token
            }
          });
          
          if (data.data && data.data.me) {
            return { user: data.data.me };
          }
        } catch (error) {
          console.error('Token validation failed:', error.message);
        }
      }
      
      // Return empty context without logging
      return {};
    },
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        path: error.path,
        extensions: {
          code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
        }
      };
    },
  });

  await server.start();
  // Apply middleware
  server.applyMiddleware({ app });

  // Start server
  const PORT = process.env.AI_SERVICE_PORT || 4003;
  app.listen(PORT, () => {
    console.log(`AI Service running at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer();