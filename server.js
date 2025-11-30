
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Load environment variables from .env.local when available (safe require)
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv might not be installed in some environments; ignore if missing
}

// Initialize Twilio Client using environment variables with sensible fallbacks
const ACCOUNT_SID = process.env.ACCOUNT_SID;
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const FROM_NUMBER = process.env.FROM_NUMBER;
const client = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Mongoose Schema for Farmer
const FarmerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Farmer = mongoose.model('Farmer', FarmerSchema);

// Routes

// 1. Check if user exists (for Signup flow)
app.post('/api/check-user', async (req, res) => {
  console.log(`🔍 Checking user: ${req.body.phone}`);
  const { phone } = req.body;
  try {
    const user = await Farmer.findOne({ phone });
    if (user) {
      return res.json({ exists: true });
    }
    return res.json({ exists: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Register new Farmer
app.post('/api/register', async (req, res) => {
  console.log(`📝 Registering user: ${req.body.name}`);
  const { name, location, phone, password } = req.body;
  try {
    // Double check existence
    const existingUser = await Farmer.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newFarmer = new Farmer({ name, location, phone, password });
    await newFarmer.save();
    
    // Return user info
    res.status(201).json({ 
      success: true, 
      user: { id: newFarmer._id, name, location, phone } 
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// 3. Login
app.post('/api/login', async (req, res) => {
  console.log(`🔑 Login attempt: ${req.body.phone}`);
  const { phone, password } = req.body;
  try {
    const user = await Farmer.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "Phone number not found" });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    res.json({ 
      success: true, 
      user: { id: user._id, name: user.name, location: user.location, phone: user.phone } 
    });
  } catch (err) {
    res.status(500).json({ message: "Server error during login" });
  }
});

// 4. Send SMS (Bypasses CORS)
app.post('/api/send-sms', async (req, res) => {
  const { to, body } = req.body;
  console.log(`📩 Sending SMS to ${to}...`);
  
  if (!to || !body) {
    return res.status(400).json({ success: false, message: "Missing 'to' or 'body'" });
  }

  try {
    const message = await client.messages.create({
      body: body,
      from: FROM_NUMBER,
      to: to
    });
    
    console.log(`✅ SMS Sent Successfully! SID: ${message.sid}`);
    res.json({ success: true, sid: message.sid });
  } catch (error) {
    // Log the full error object for better debugging
    console.error("❌ Twilio Error:", error);

    // Build a richer payload from Twilio error fields when available
    const errPayload = {
      success: false,
      error: error && error.message ? error.message : String(error)
    };
    if (error && error.code) errPayload.code = error.code;
    if (error && error.status) errPayload.status = error.status;
    if (error && error.moreInfo) errPayload.moreInfo = error.moreInfo;

    // Return the enhanced error object so frontend can surface it for debugging
    res.status(500).json(errPayload);
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
  console.log(`waiting for requests...`);
});
