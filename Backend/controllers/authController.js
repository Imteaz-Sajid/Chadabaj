const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { User, PendingUser } = require('../models/User');

// Configure nodemailer transporter with Brevo (Sendinblue)
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_KEY
  }
});

// Log configuration (without verification)
console.log('📧 SMTP Configuration:');
console.log('   Host:', 'smtp-relay.brevo.com');
console.log('   Port:', 587);
console.log('   User:', process.env.SMTP_USER);
console.log('   Key:', process.env.SMTP_KEY ? '***' + process.env.SMTP_KEY.slice(-10) : 'Missing');

// Register user
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, nidNumber, phoneNumber, address, role } = req.body;

    // Validate input
    if (!fullName || !email || !password || !nidNumber || !phoneNumber || !address || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields: fullName, email, password, NID number, phone number, address, and role' 
      });
    }

    // Check if role is valid
    if (!['User', 'Police', 'DC'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role. Must be User, Police, or DC' 
      });
    }

    // Check if user already exists in User collection
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'An account already exists with this email' 
      });
    }

    // Check if NID already exists in User collection
    const existingNID = await User.findOne({ nidNumber });
    if (existingNID) {
      return res.status(400).json({ 
        success: false, 
        message: 'An account already exists with this NID number' 
      });
    }

    // Check if pending registration exists
    const existingPending = await PendingUser.findOne({ email });
    if (existingPending) {
      return res.status(400).json({ 
        success: false, 
        message: 'A verification email has already been sent to this email. Please check your inbox or wait for it to expire.' 
      });
    }

    // Check if NID exists in pending users
    const existingPendingNID = await PendingUser.findOne({ nidNumber });
    if (existingPendingNID) {
      return res.status(400).json({ 
        success: false, 
        message: 'This NID number is already associated with a pending registration' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create pending user (not actual user yet)
    const pendingUser = new PendingUser({
      fullName,
      email,
      password: hashedPassword,
      nidNumber,
      phoneNumber,
      address,
      role,
      verificationToken
    });

    await pendingUser.save();

    // Send verification email (REQUIRED)
    const verificationLink = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;
    
    const mailOptions = {
      from: `${process.env.SENDER_NAME} <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: 'Verify Your Email to Complete Registration - Chadabaj.com',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333;">Welcome to Chadabaj.com, ${fullName}!</h2>
            <p style="color: #666; font-size: 16px;">Thank you for registering as a <strong>${role}</strong>.</p>
            <p style="color: #666; font-size: 16px;"><strong>Important:</strong> Your account will only be created after you verify your email address.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Registration Details:</h3>
              <p style="color: #666; margin: 5px 0;"><strong>Name:</strong> ${fullName}</p>
              <p style="color: #666; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="color: #666; margin: 5px 0;"><strong>NID Number:</strong> ${nidNumber}</p>
              <p style="color: #666; margin: 5px 0;"><strong>Role:</strong> ${role}</p>
            </div>
            
            <p style="color: #666; font-size: 16px;">Please verify your email by clicking the button below:</p>
            <a href="${verificationLink}" 
               style="display: inline-block; padding: 12px 30px; margin: 20px 0; 
                      background-color: #4CAF50; color: white; text-decoration: none; 
                      border-radius: 5px; font-weight: bold;">
              Verify Email & Create Account
            </a>
            <p style="color: #999; font-size: 14px;">Or copy and paste this link in your browser:</p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">${verificationLink}</p>
            <p style="color: #e74c3c; font-size: 14px; margin-top: 20px;">
              ⚠️ This verification link will expire in 24 hours.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If you didn't create this account, please ignore this email. Your account will not be created without verification.
            </p>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent to:', email);
      
      res.status(201).json({ 
        success: true, 
        message: 'Registration initiated successfully! A verification email has been sent to your email address. Please check your inbox and click the verification link to complete your account creation. The link will expire in 24 hours.'
      });
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      // Delete pending user if email fails
      await PendingUser.deleteOne({ _id: pendingUser._id });
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email. Please ensure the email address is correct and try again. If the problem persists, contact support.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: error.message 
    });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find pending user with this verification token
    const pendingUser = await PendingUser.findOne({ verificationToken: token });

    if (!pendingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification token. Please register again.' 
      });
    }

    // Check if user with this email already exists (shouldn't happen, but just in case)
    const existingUser = await User.findOne({ email: pendingUser.email });
    if (existingUser) {
      // Clean up pending user
      await PendingUser.deleteOne({ _id: pendingUser._id });
      return res.status(400).json({ 
        success: false, 
        message: 'An account with this email already exists. Please login instead.' 
      });
    }

    // Create the actual user account
    const newUser = new User({
      fullName: pendingUser.fullName,
      email: pendingUser.email,
      password: pendingUser.password,
      nidNumber: pendingUser.nidNumber,
      phoneNumber: pendingUser.phoneNumber,
      address: pendingUser.address,
      role: pendingUser.role,
      isVerified: true
    });

    await newUser.save();

    // Delete the pending user
    await PendingUser.deleteOne({ _id: pendingUser._id });

    res.status(200).json({ 
      success: true, 
      message: 'Email verified successfully! Your account has been created. You can now log in.' 
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during email verification',
      error: error.message 
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email, password, and role' 
      });
    }

    // Find user by email and role
    const user = await User.findOne({ email, role });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials or wrong portal selected' 
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account not found. Please complete your registration by verifying your email first.' 
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: error.message 
    });
  }
};
