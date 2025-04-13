const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { loadSchema } = require('@graphql-tools/load');
const { UrlLoader } = require('@graphql-tools/url-loader');
const { delegateToSchema } = require('@graphql-tools/delegate');
const { wrapSchema, introspectSchema } = require('@graphql-tools/wrap');
const { print } = require('graphql');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

// Helper function to retry loading schemas with exponential backoff
async function loadSchemaWithRetry(url, maxRetries = 5, initialDelay = 1000) {
  let currentRetry = 0;
  let delay = initialDelay;

  while (currentRetry < maxRetries) {
    try {
      console.log(`Attempting to load schema from ${url}, attempt ${currentRetry + 1}/${maxRetries}`);
      const schema = await loadSchema(url, { 
        loaders: [new UrlLoader()],
        // Add reasonable timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`Successfully loaded schema from ${url}`);
      return schema;
    } catch (error) {
      currentRetry++;
      if (currentRetry === maxRetries) {
        throw error;
      }
      console.log(`Failed to load schema from ${url}, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Exponential backoff with some randomness
      delay = delay * 1.5 + Math.random() * 1000;
    }
  }
}

// Create schema executor that forwards the Authorization header
const createExecutor = (url) => {
  return async ({ document, variables, context }) => {

    const query = print(document);
    const fetchResult = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the authorization token from the context to the service
        ...(context.token && { 'Authorization': context.token })
      },
      body: JSON.stringify({ query, variables }),
    });
    
    const result = await fetchResult.json();
    
    // Log if there are errors in the response
    if (result.errors) {
      console.log(`Errors from ${url}:`, JSON.stringify(result.errors));
    }
    
    return result;
  };
};

// Create remote schema with proper delegation
const createRemoteSchema = async (url) => {
  // Load the remote schema
  const schema = await loadSchemaWithRetry(url);
  
  // Wrap the schema with an executor that forwards auth headers
  return wrapSchema({
    schema,
    executor: createExecutor(url),
  });
};

async function startServer() {
  // Create Express server
  const app = express();
  
  // Enable CORS
  app.use(cors({
    origin: '*',
    credentials: true
  }));
  
  try {
    console.log('Loading remote schemas...');
    
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001/graphql';
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:4002/graphql';
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:4003/graphql';
    
    console.log('Service URLs:', {
      auth: authServiceUrl,
      user: userServiceUrl,
      ai: aiServiceUrl
    });
    
    // Load all schemas with enhanced schema creation that passes auth
    const [authServiceSchema, userServiceSchema, aiServiceSchema] = await Promise.all([
      createRemoteSchema(authServiceUrl).catch(err => {
        console.error('Failed to load auth service schema:', err);
        throw err;
      }),
      createRemoteSchema(userServiceUrl).catch(err => {
        console.error('Failed to load user service schema:', err);
        throw err;
      }),
      createRemoteSchema(aiServiceUrl).catch(err => {
        console.error('Failed to load AI service schema:', err);
        throw err;
      })
    ]);
    
    console.log('Successfully loaded all remote schemas');
    
    // Stitch schemas together
    const gatewaySchema = stitchSchemas({
      subschemas: [
        { 
          schema: authServiceSchema,
          merge: {
            Query: {
              getMedicalConditions: {
                selectionSet: '{ conditions confidence recommendation }',
                resolve: (result) => result
              }
            }
          }
        },
        { 
          schema: userServiceSchema,
          merge: {
            Query: {
              getMedicalConditions: {
                selectionSet: '{ conditions confidence recommendation }',
                resolve: (result) => result
              }
            }
          }
        },
        { 
          schema: aiServiceSchema,
          merge: {
            Query: {
              getMedicalConditions: {
                selectionSet: '{ conditions confidence recommendation }',
                resolve: (result) => result
              }
            }
          }
        }
      ]
    });
    
    // Create Apollo Server
    const server = new ApolloServer({
      schema: gatewaySchema,
      context: ({ req }) => {
        // Get the user token from the headers
        const token = req.headers.authorization || '';
  
        // Add the token to the context for all service requests
        return { 
          token,
          // Add service URLs to context for resolvers
          serviceUrls: {
            auth: authServiceUrl,
            user: userServiceUrl,
            ai: aiServiceUrl
          }
        };
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
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API Gateway running at http://localhost:${PORT}${server.graphqlPath}`);
    });
  } catch (error) {
    console.error('Error starting API Gateway:', error);
    process.exit(1);
  }
}

// Add a small delay before starting to allow services to spin up
setTimeout(() => {
  console.log('Starting API Gateway with delay to allow services to initialize...');
  startServer().catch(error => {
    console.error('Failed to start API Gateway:', error);
    process.exit(1);
  });
}, 10000); // Increased delay to 10 seconds