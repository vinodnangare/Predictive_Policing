// server/controllers/controller.js
const express = require('express');
const router = express.Router();
const Crime = require('../models/Crime');
const Police = require('../models/Police');
const jwt = require('jsonwebtoken');
const { exec } = require('child_process');

router.post('/login', async (req, res) => {
	const { email, password } = req.body;
	if (
		(email === 'police@example.com' && password === '123456') ||
		(await Police.findOne({ email, password }))
	) {
	
		const token = jwt.sign({ email }, 'secret', { expiresIn: '1d' });
		return res.json({ token });
	}
	res.status(401).json({ error: 'Invalid credentials' });
});

router.post('/add-crime', async (req, res) => {
  try {
    console.log('Received crime data:', req.body);
    const crime = new Crime(req.body);
    await crime.save();
    console.log('Crime saved successfully:', crime);
    res.json({ message: 'Crime added', crime });
  } catch (err) {
    console.error('Error adding crime:', err);
    res.status(400).json({ error: 'Failed to add crime', details: err.message });
  }
});


// Get all crimes with better error handling and logging
router.get('/crimes', async (req, res) => {
	try {
		const crimes = await Crime.find().sort({ date: -1 });
		console.log(`GET /police/crimes - returning ${crimes.length} records`);
		res.json(crimes);
	} catch (err) {
		console.error('Error fetching crimes:', err);
		res.status(500).json({ error: 'Failed to fetch crimes', details: err.message });
	}
});

// Health check endpoint to verify server and DB connectivity
router.get('/health', async (req, res) => {
	try {
		// A quick DB check - count documents (fast)
		const count = await Crime.estimatedDocumentCount();
		res.json({ status: 'ok', db: true, crimeCount: count });
	} catch (err) {
		console.error('Health check failed:', err);
		res.status(500).json({ status: 'error', db: false, details: err.message });
	}
});


router.put('/crime/:id', async (req, res) => {
	try {
		const crime = await Crime.findByIdAndUpdate(req.params.id, req.body, { new: true });
		res.json(crime);
	} catch (err) {
		res.status(400).json({ error: 'Failed to update crime' });
	}
});

router.delete('/crime/:id', async (req, res) => {
	try {
		await Crime.findByIdAndDelete(req.params.id);
		res.json({ message: 'Crime deleted' });
	} catch (err) {
		res.status(400).json({ error: 'Failed to delete crime' });
	}
});

// --- Retrain Model Endpoint ---
router.post('/retrain', async (req, res) => {
  // Example: run a Python script or any retraining logic
  exec('python retrain_model.py', (error, stdout, stderr) => {
    if (error) {
      console.error('Retrain error:', error);
      return res.json({ success: false, error: stderr || error.message });
    }
    res.json({ success: true, output: stdout });
  });
});

module.exports = router;
