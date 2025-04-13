# Patient Monitoring System

A microservices-based GraphQL application for remote patient monitoring and nurse collaboration.

## Project Architecture

This application uses a microservices architecture with the following components:

### Backend Services

1. **Auth Service** - Handles user authentication, registration, and account management
2. **User Service** - Manages patient data, vital signs, health metrics, and nurse-patient interactions
3. **AI Service** - Processes symptom data using AI to provide medical predictions
4. **API Gateway** - Central entry point that connects all services with schema stitching

### Technologies Used

- Node.js and Express
- GraphQL with Apollo Server
- MongoDB for data storage
- JSON Web Tokens (JWT) for authentication
- Schema stitching for the API gateway
- SendGrid for email communications

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas connection)
- SendGrid account (for email functionality)

### Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/patient-monitoring-system.git
   cd patient-monitoring-system
   ```

2. Install dependencies for all services:
   ```
   npm run install-all
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in each service directory
   - Update values in each `.env` file with your specific configuration

4. Start MongoDB (if using local MongoDB):
   ```
   mongod
   ```

5. Start all services:
   ```
   npm start
   ```

Alternatively, you can start each service individually:
- Auth Service: `npm run auth`
- User Service: `npm run user`
- AI Service: `npm run ai`
- API Gateway: `npm run gateway`

## API Endpoints

When running, your services will be available at:

- API Gateway: http://localhost:4000/graphql
- Auth Service: http://localhost:4001/graphql
- User Service: http://localhost:4002/graphql
- AI Service: http://localhost:4003/graphql

## Service Descriptions

### Auth Service
- User registration and authentication
- JWT token generation and validation
- Password reset functionality
- Email verification

### User Service
- Patient health data management
- Vital signs tracking
- Nurse-patient relationship management
- Alerts and notifications
- Motivational tips for patients

### AI Service
- Symptom analysis
- Medical condition prediction
- Health trend analysis
- Recommendation generation

## Development

### Folder Structure

```
patient-monitoring-system/
├── backend/
│   ├── api-gateway/
│   │   └── src/
│   │       └── index.js
│   └── services/
│       ├── auth-service/
│       │   └── src/
│       │       ├── index.js
│       │       ├── authModel.js
│       │       ├── authSchema.js
│       │       ├── authResolvers.js
│       │       └── emailService.js
│       ├── user-service/
│       │   └── src/
│       │       ├── index.js
│       │       ├── userModel.js
│       │       ├── userSchema.js
│       │       └── userResolvers.js
│       └── ai-service/
│           └── src/
│               ├── index.js
│               ├── aiModel.js
│               ├── aiSchema.js
│               └── aiResolvers.js
```

### Running in Development Mode

To run a service with nodemon for automatic reloading during development:

```
cd backend/services/auth-service
npm run dev
```

## Security Notes

- Make sure to use strong, unique values for JWT_SECRET and INTERNAL_SERVICE_TOKEN
- Never commit .env files containing secrets to version control
- The INTERNAL_SERVICE_TOKEN is used for secure communication between microservices

## License

[MIT](LICENSE)


# env for api gateway 

PORT=4000
JWT_SECRET=5d2qtmUJTYw4txHra6SPwRjrUureeaoIxYV+MDLQmcE8709JGH
AUTH_SERVICE_URL=http://localhost:4001/graphql
USER_SERVICE_URL=http://localhost:4002/graphql
AI_SERVICE_URL=http://localhost:4003/graphql


# AI Service Configuration
PORT=4003
MONGODB_URI=mongodb+srv://maxafangscodev:NQPHLNEiEBjywk54@cluster0.t79zoi9.mongodb.net/patient-monitoring-ai?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=5d2qtmUJTYw4txHra6SPwRjrUureeaoIxYV+MDLQmcE8709JGH
USER_SERVICE_URL=http://localhost:4002/graphql
AUTH_SERVICE_URL=http://localhost:4001/graphql
INTERNAL_SERVICE_TOKEN=5d2qtmUJTYw4txHra6SPwRjrUureeaoIxYV+MDLQmcE8709JGH
USE_GPT=true
FRIENDLI_API_KEY=flp_EOHcZ3XTdCj6sfJasFYcLEBHaTy6MmLEsOJZRwxxNLv03b
TEAM_ID=KWyts4XQDEWU

# Env for auth service 

PORT=4001
MONGODB_URI=mongodb+srv://maxafangscodev:NQPHLNEiEBjywk54@cluster0.t79zoi9.mongodb.net/patient-monitoring-auth?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=5d2qtmUJTYw4txHra6SPwRjrUureeaoIxYV+MDLQmcE8709JGH
SENDGRID_API_KEY=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
FROM_EMAIL=maxafangsco@gmail.com
CLIENT_URL=http://localhost:3000


# Env for user-service 

PORT=4002
MONGODB_URI=mongodb+srv://maxafangscodev:NQPHLNEiEBjywk54@cluster0.t79zoi9.mongodb.net/patient-monitoring-user?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=5d2qtmUJTYw4txHra6SPwRjrUureeaoIxYV+MDLQmcE8709JGH
AI_SERVICE_URL=http://localhost:4003/graphql
AUTH_SERVICE_URL=http://localhost:4001/graphql
INTERNAL_SERVICE_TOKEN=5d2qtmUJTYw4txHra6SPwRjrUureeaoIxYV+MDLQmcE8709JGH