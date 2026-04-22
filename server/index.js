require('dotenv').config();  

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const controller = require('./controllers/controller');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || 'https://predictive-policing-1.onrender.com,http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || localhostOriginPattern.test(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS blocked for origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(bodyParser.json({ limit: '2mb' }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

const connectDB = async () => {
  try {
    const dbUrl = process.env.DB_URL || process.env.MONGODB_URI;
    // Disable command buffering so queries fail fast when disconnected
    mongoose.set('bufferCommands', false);
    await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.warn('⚠️  Server will continue without database. Install MongoDB or set MONGODB_URI environment variable.');
  }
};

connectDB();

app.use('/police', controller);
// Also mount under /api for legacy client calls
app.use('/api', controller);

app.post('/train-model', (req, res) => {
  const { spawn } = require('child_process');
  const scriptPath = path.join(__dirname, 'retrain_model.py');
  const pythonPath = process.env.PYTHON_PATH || 'python';
  
  const python = spawn(pythonPath, [scriptPath], { 
    cwd: __dirname, 
    env: { 
      ...process.env, 
      PYTHONUNBUFFERED: '1',
      DB_URL: process.env.DB_URL || 'mongodb://localhost:27017/predictive_policing'
    }
  });

  let stdoutData = '';
  let stderrData = '';

  python.stdout.on('data', (data) => {
    console.log('Python stdout:', data.toString());
    stdoutData += data;
  });

  python.stderr.on('data', (data) => {
    console.error('Python stderr:', data.toString());
    stderrData += data;
  });

  python.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
    
    if (code !== 0) {
      return res.status(500).json({ 
        success: false, 
        error: 'Training failed',
        details: stderrData,
        code: code
      });
    }

    try {
      const data = JSON.parse(stdoutData);
      return res.json({ success: true, data });
    } catch (e) {
      console.error('Error parsing Python output:', e);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to parse training results',
        details: stdoutData,
        parseError: e.message
      });
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
