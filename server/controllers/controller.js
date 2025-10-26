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

-
router.post('/add-crime', async (req, res) => {
	try {
		const crime = new Crime(req.body);
		await crime.save();
		res.json({ message: 'Crime added', crime });
	} catch (err) {
		res.status(400).json({ error: 'Failed to add crime' });
	}
});


router.get('/crimes', async (req, res) => {
	const crimes = await Crime.find().sort({ date: -1 });
	res.json(crimes);
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
