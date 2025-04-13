# Healthcare System

A comprehensive healthcare management system with patient monitoring, symptom tracking, and medical analysis capabilities.

## Project Overview

This system consists of multiple services working together:

### Frontend Applications
1. **Auth Frontend** (`frontend/auth-frontend`): Authentication and user management interface
2. **User Frontend** (`frontend/user-frontend`): Main application for patients and nurses

### Backend Services
1. **Auth Service** (`backend/services/auth-service`): Handles user authentication and authorization
2. **User Service** (`backend/services/user-service`): Manages user data, symptoms, and vital signs
3. **AI Service** (`backend/services/ai-service`): Provides medical analysis and recommendations

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- MongoDB
- Python 3.8 or later (for AI service)
- Docker (optional, for containerized deployment)

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd healthcare-system
```

### 2. Install Backend Dependencies

#### Auth Service
```bash
cd backend/services/auth-service
npm install
```

#### User Service
```bash
cd backend/services/user-service
npm install
```

#### AI Service
```bash
cd backend/services/ai-service
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

#### Auth Frontend
```bash
cd frontend/auth-frontend
npm install
```

#### User Frontend
```bash
cd frontend/user-frontend
npm install
```

## Configuration

### Backend Services

1. **Auth Service** (`backend/services/auth-service/.env`):
```env
PORT=4001
MONGODB_URI=mongodb://localhost:27017/auth
JWT_SECRET=your_jwt_secret
```

2. **User Service** (`backend/services/user-service/.env`):
```env
PORT=4002
MONGODB_URI=mongodb://localhost:27017/users
AUTH_SERVICE_URL=http://localhost:4001
```

3. **AI Service** (`backend/services/ai-service/.env`):
```env
PORT=4003
USER_SERVICE_URL=http://localhost:4002
```

### Frontend Applications

1. **Auth Frontend** (`frontend/auth-frontend/.env.local`):
```env
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:4001
```

2. **User Frontend** (`frontend/user-frontend/.env.local`):
```env
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:4001
NEXT_PUBLIC_USER_SERVICE_URL=http://localhost:4002
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:4003
```

## Starting the Application

### 1. Start MongoDB
```bash
# If using Docker
docker run -d -p 27017:27017 --name mongodb mongo

# Or start MongoDB service
mongod
```

### 2. Start Backend Services

#### Auth Service
```bash
cd backend/services/auth-service
npm run dev
```

#### User Service
```bash
cd backend/services/user-service
npm run dev
```

#### AI Service
```bash
cd backend/services/ai-service
python app.py
```

### 3. Start Frontend Applications

#### Auth Frontend
```bash
cd frontend/auth-frontend
npm run dev
```

#### User Frontend
```bash
cd frontend/user-frontend
npm run dev
```

## Accessing the Application

- Auth Frontend: http://localhost:3000
- User Frontend: http://localhost:3001

## Exaple of Users

### Patients
- Email: patient@example.com
- Password: password123

### Nurses
- Email: nurse@example.com
- Password: password123

## API Endpoints

### Auth Service (http://localhost:4001)
- POST /graphql
  - Register
  - Login
  - Validate Token

### User Service (http://localhost:4002)
- POST /graphql
  - Get Patient History
  - Get Medical Conditions
  - Add Vital Signs
  - Send Motivational Tips

### AI Service (http://localhost:4003)
- POST /graphql
  - Analyze Symptoms
  - Get Medical Recommendations

## Development Workflow

1. Start MongoDB
2. Start all backend services
3. Start frontend applications
4. Access the application through the frontend URLs
5. Use the default users for testing

## Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**
   - Ensure MongoDB is running
   - Check connection strings in .env files

2. **Service Communication Issues**
   - Verify all services are running
   - Check service URLs in configuration files

3. **Authentication Issues**
   - Clear browser localStorage
   - Check JWT_SECRET in auth service


## License

This project is licensed under the MIT License - see the LICENSE file for details. # Patient-Monitoring-System
