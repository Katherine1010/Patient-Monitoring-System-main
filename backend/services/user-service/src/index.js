const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const mongoose = require('mongoose');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('./userSchema');
const resolvers = require('./userResolvers');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

// Create schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/patient-monitoring-user')
  .then(() => console.log('MongoDB Connected - User Service'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Create a secondary connection to the auth database to fetch user data
const mongoose_auth = require('mongoose');
const authConnection = mongoose_auth.createConnection(process.env.AUTH_MONGODB_URI || 'mongodb://localhost:27017/patient-monitoring-auth');
console.log('Secondary connection to auth database created');

// Create User model on the auth connection
const authUserSchema = new mongoose_auth.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['patient', 'nurse'], required: true }
}, {
  timestamps: true
});

const AuthUser = authConnection.model('User', authUserSchema);
console.log('Auth User model created');

// Export the AuthUser model
module.exports.AuthUser = AuthUser;

async function startServer() {
  // Create Express server
  const app = express();
  
  // Configure CORS
  app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  
  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      // Get the user token from the headers - handle both "authorization" and "Authorization"
      const authHeader = req.headers.authorization || req.headers.Authorization || '';
      
      // Auth service handles token validation, user service just uses the decoded data
      let user = null;
      
      if (authHeader) {
        try {
          // Format token if needed (sometimes clients send as "Bearer token" or just "token")
          const token = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
          
          // Validate token by calling auth service
          const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001/graphql';
          console.log('Validating token with auth service...');
          
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
            user = data.data.me;
            console.log(`User authenticated: ${user.email} (${user.role})`);
          } else {
            console.log('Token validation returned no user data:', data);
          }
        } catch (err) {
          console.error('Token validation failed:', err.message);
          if (err.response) {
            console.error('Auth service response:', err.response.data);
          }
        }
      } else {
        console.log('No authentication token provided');
      }
      
      return { user };
    },
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      // Return a cleaner error to the client
      return {
        message: error.message,
        path: error.path,
        // Do not expose the full stack trace in production
        extensions: {
          code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
        }
      };
    },
  });

  await server.start();
  // Apply middleware with CORS disabled (we're using express-cors)
  server.applyMiddleware({ app, cors: false });

  // Start server
  const PORT = process.env.USER_SERVICE_PORT || 4002;
  app.listen(PORT, () => {
    console.log(`User Service running at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer();