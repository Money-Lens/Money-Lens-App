const express = require('express');
const User = require('./../models/User.model');
const jwt = require('jsonwebtoken');
const auth = require('./../middleware/auth.middleware');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const router = express.Router();

router.get('/verify-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Create a new user
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, firebaseUid } = req.body; // Include lastName, remove age
    
    console.log('SIGN UP ROUTE', req);
    // Check if user already exists
    // const existingUser =  await User.findOne({ email });
    const existingUser =  await User.findOne({ email });

  
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({ firstName, lastName, email, firebaseUid });
    await user.save();

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('SIGNUP ERROR:', error); 
    res.status(500).json({ message: error.message });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users from MongoDB
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Test route to check if the backend is running
router.get('/hello', async (req, res) => {
  try {
    res.send('Hello world from backend');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Self-explanatory
router.post('/login', async (req, res) => {
  try {
    console.log('LOGIN ROUTE');

    const { email, firebaseUid } = req.body;

    // Find user
    let user = await User.findOne({ email });

    if (user && user.firebaseUid !== firebaseUid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        email,
        firebaseUid,
        name: req.body.name || 'User',
        lastName: req.body.lastName || 'Unknown',
      });
      await user.save();
    }

    // Generate JWT token with expiration
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '31d',
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get information about logged in user
router.get('/user', auth, async (req, res) => {
  console.log("GETTING USER INFO");
  console.log("User ID from request:", req.user ? req.user._id : "No user found");
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Setup 2FA
router.post('/setup-2fa', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `MoneyLens:${user.email}`
    });

    // Save secret to user
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({ qrCodeUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify 2FA
router.post('/verify-2fa', async (req, res) => {
  try {
    const { email, token } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token
    });

    if (verified) {
      user.twoFactorEnabled = true;
      await user.save();
    }

    res.json({ verified });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check if 2FA is required
router.post('/check-2fa', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ requires2FA: user.twoFactorEnabled });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;