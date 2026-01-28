# Chadabaj.com - MERN Authentication System

A full-stack MERN (MongoDB, Express, React, Node.js) application with email verification and role-based authentication.

## Features

- ✅ User registration with email verification
- ✅ Role-based authentication (User, Police, DC)
- ✅ JWT-based authentication
- ✅ Password hashing with bcryptjs
- ✅ Email verification using Nodemailer
- ✅ Modern UI with Tailwind CSS
- ✅ React Router for navigation

## Project Structure

```
Chadabaj.com/
├── Backend/
│   ├── controllers/
│   │   └── authController.js
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   └── authRoutes.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
└── Frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AuthPage.jsx
    │   │   └── EmailVerify.jsx
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    ├── .env.example
    ├── package.json
    └── tailwind.config.js
```

## Setup Instructions

### Backend Setup

1. Navigate to the Backend folder:
```bash
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file by copying `.env.example`:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
MONGODB_URI=mongodb+srv://chadabaj:chadabaj@chadabaj.ahigygh.mongodb.net/chadabaj
JWT_SECRET=your_strong_secret_key
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:3000
PORT=5000
```

**Note for Gmail:**
- Use App Password instead of regular password
- Go to Google Account → Security → 2-Step Verification → App Passwords
- Generate an app password for "Mail"

5. Start the backend server:
```bash
npm run dev
```

Server will run on http://localhost:5000

### Frontend Setup

1. Navigate to the Frontend folder:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Start the React development server:
```bash
npm start
```

Frontend will run on http://localhost:3000

## API Endpoints

### Authentication Routes

**POST** `/api/auth/register`
- Register a new user
- Body: `{ email, password, role }`
- Sends verification email

**GET** `/api/auth/verify/:token`
- Verify email address
- Returns success/error message

**POST** `/api/auth/login`
- Login user
- Body: `{ email, password, role }`
- Returns JWT token and user data

## Usage

1. **Registration:**
   - Select your portal (User/Police/DC)
   - Click "Register" tab
   - Enter email and password
   - Check your email for verification link

2. **Email Verification:**
   - Click the link in your email
   - You'll be redirected to verification page
   - After successful verification, go to login

3. **Login:**
   - Select your portal
   - Click "Login" tab
   - Enter credentials
   - You'll be redirected to your dashboard

## Security Features

- Password hashing using bcryptjs
- JWT token-based authentication
- Email verification before login
- Role-based access control
- CORS enabled for frontend communication

## Technologies Used

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- bcryptjs
- jsonwebtoken
- nodemailer
- cors
- dotenv

### Frontend
- React 18
- React Router DOM
- Axios
- Tailwind CSS

## Environment Variables

### Backend
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `EMAIL_USER`: Email address for sending verification emails
- `EMAIL_PASSWORD`: Email password/app password
- `FRONTEND_URL`: Frontend URL for verification links
- `PORT`: Server port (default: 5000)

### Frontend
- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:5000)

## License

ISC
