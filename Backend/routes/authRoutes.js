const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Register route
router.post('/register', authController.register);

// Email verification route
router.get('/verify/:token', authController.verifyEmail);

// Login route
router.post('/login', authController.login);

// Get current user profile (protected)
router.get('/me', authenticate, authController.getCurrentUser);

// Update profile (protected)
router.put('/profile', authenticate, authController.updateProfile);

// Upload profile picture (protected)
router.post('/profile-picture', authenticate, upload.single('profilePicture'), authController.uploadProfilePicture);

module.exports = router;
