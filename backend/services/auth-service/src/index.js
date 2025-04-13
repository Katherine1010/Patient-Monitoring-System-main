const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const mongoose = require('mongoose');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('./authModel');
const typeDefs = require('./authSchema');
const resolvers = require('./authResolvers');
require('dotenv').config();

// Create schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected - Auth Service'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function startServer() {
  // Create Express server
  const app = express();
  
  // Enable CORS
  app.use(cors());
  
  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      // Get the user token from the headers
      const authHeader = req.headers.authorization || req.headers.Authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : authHeader;
      
      if (token) {
        try {
          console.log('Verifying token...');
          // Verify the token
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log('Token decoded:', decoded);
          
          // Get the user from the database
          const user = await User.findById(decoded.userId);
          console.log('User found:', user ? 'Yes' : 'No');
          
          if (user) {
            // Add the user to the context
            return { user };
          }
        } catch (error) {
          console.error('Token verification failed:', error.message);
        }
      }
      
      // Return empty context if no valid token
      return {};
    },
    introspection: true,
    playground: true,
  });

  await server.start();
  // Apply middleware
  server.applyMiddleware({ 
    app,
    path: '/graphql',
    cors: {
      origin: '*',
      credentials: true
    }
  });

  // Start server
  const PORT = process.env.AUTH_SERVICE_PORT || 4001;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auth Service running at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer().catch(err => {
  console.error('Error starting Auth Service:', err);
  process.exit(1);
});