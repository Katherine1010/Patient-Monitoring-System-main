const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    role: String!
    isVerified: Boolean
    createdAt: String
    updatedAt: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type PasswordResetResponse {
    success: Boolean!
    message: String!
  }

  type VerificationResponse {
    success: Boolean!
    message: String!
  }

  type Query {
    me: User
  }

  type Mutation {
    register(
      email: String!
      password: String!
      firstName: String
      lastName: String
      role: String!
    ): AuthPayload!
    
    login(
      email: String!
      password: String!
    ): AuthPayload!
    
    verifyEmail(
      token: String!
    ): VerificationResponse!
    
    requestPasswordReset(
      email: String!
    ): PasswordResetResponse!
    
    resetPassword(
      token: String!
      newPassword: String!
    ): PasswordResetResponse!
  }
`;

module.exports = typeDefs;