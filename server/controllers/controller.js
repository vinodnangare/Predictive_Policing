// server/controllers/controller.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Crime = require('../models/Crime');
const Police = require('../models/Police');
const Suspect = require('../models/Suspect');
const jwt = require('jsonwebtoken');
const { exec } = require('child_process');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });
let crimesCache = [];
let crimesCacheTimestamp = null;
let suspectsCache = [];
let suspectsCacheTimestamp = null;
const streamClients = new Set();

const sendSseEvent = (res, eventName, payload) => {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const inIndiaBounds = (lat, lng) => lat >= 5 && lat <= 38 && lng >= 60 && lng <= 100;

const normalizeCoordinates = (latitude, longitude) => {
  let lat = toNumber(latitude);
  let lng = toNumber(longitude);

  if (lat === null || lng === null) return { latitude: null, longitude: null };
  if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) {
    return { latitude: null, longitude: null };
  }

  if (!inIndiaBounds(lat, lng) && inIndiaBounds(lng, lat)) {
    [lat, lng] = [lng, lat];
  }

  return { latitude: lat, longitude: lng };
};

const buildLocationLabel = (crime) => {
  if (crime.location) return crime.location;
  return [crime.subdistrict, crime.district, crime.state].filter(Boolean).join(', ') || 'Unknown location';
};

const normalizeCrimeRecord = (crime) => {
  const type = crime.type || crime.crimeType || 'Unknown';
  const coords = normalizeCoordinates(crime.latitude, crime.longitude);

  return {
    ...crime,
    type,
    crimeType: type,
    latitude: coords.latitude,
    longitude: coords.longitude,
    location: buildLocationLabel(crime),
  };
};

const normalizeText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const normalizeKeyText = (value) => normalizeText(value).toLowerCase();

const normalizeDateInput = (value) => {
  const raw = normalizeText(value);
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const normalizeTimeInput = (value) => {
  const raw = normalizeText(value);
  if (!raw) return '00:00';

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const normalizeOptionalField = (value) => {
  const cleaned = normalizeText(value);
  return cleaned || undefined;
};

const buildCrimeFingerprint = (crime = {}) => {
  const coords = normalizeCoordinates(crime.latitude, crime.longitude);
  const coordinateKey =
    typeof coords.latitude === 'number' && typeof coords.longitude === 'number'
      ? `${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`
      : '';

  const locationKey = [
    crime.village,
    crime.subdistrict,
    crime.district,
    crime.state,
    crime.location,
  ]
    .map(normalizeKeyText)
    .filter(Boolean)
    .join('|');

  return [
    normalizeKeyText(crime.type || crime.crimeType || 'unknown'),
    normalizeDateInput(crime.date) || '',
    normalizeTimeInput(crime.time) || '00:00',
    coordinateKey,
    normalizeKeyText(crime.firNo),
    normalizeKeyText(crime.section),
    normalizeKeyText(crime.policeStation),
    locationKey,
  ].join('#');
};

const pickCsvValue = (row, aliases) => {
  if (!row || typeof row !== 'object' || !Array.isArray(aliases)) return '';

  const aliasSet = new Set(
    aliases
      .map((alias) => normalizeKeyText(alias).replace(/[^a-z0-9]/g, ''))
      .filter(Boolean)
  );

  for (const [key, rawValue] of Object.entries(row)) {
    const compactKey = normalizeKeyText(key).replace(/[^a-z0-9]/g, '');
    if (!aliasSet.has(compactKey)) continue;
    const value = normalizeText(rawValue);
    if (value) return value;
  }

  return '';
};

const isCaseOpen = (crime) => {
  const caseStatus = String(crime.caseStatus || '').toLowerCase();
  return caseStatus !== 'closed' && caseStatus !== 'solved';
};

const computeStats = (crimes, dbConnected) => {
  const normalized = (Array.isArray(crimes) ? crimes : []).map(normalizeCrimeRecord);
  const hotspots = new Set(
    normalized
      .filter((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number')
      .map((c) => c.district || c.subdistrict || c.location)
  ).size;

  const now = Date.now();
  const recent24h = normalized.filter((crime) => {
    const parsed = Date.parse(crime.date);
    if (Number.isNaN(parsed)) return false;
    return now - parsed <= 24 * 60 * 60 * 1000;
  }).length;

  return {
    totalRecords: normalized.length,
    activeCases: normalized.filter(isCaseOpen).length,
    hotspots,
    withCoordinates: normalized.filter((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number').length,
    recent24h,
    modelStatus: dbConnected ? 'Active' : 'Degraded',
    lastUpdated: new Date().toISOString(),
  };
};

const getRecentNormalizedCrimes = async (limit = 0) => {
  const isConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const cappedLimit = Math.max(0, Math.min(2000, Number.parseInt(limit || '0', 10) || 0));

  if (!isConnected) {
    if (cappedLimit > 0) {
      return crimesCache.slice(0, cappedLimit);
    }
    return crimesCache;
  }

  let query = Crime.find().sort({ createdAt: -1 });
  if (cappedLimit > 0) {
    query = query.limit(cappedLimit);
  }

  const crimes = await query.lean();
  const normalizedCrimes = crimes.map(normalizeCrimeRecord);
  crimesCache = normalizedCrimes;
  crimesCacheTimestamp = new Date().toISOString();
  return normalizedCrimes;
};

const broadcastCrimeStreamUpdate = async () => {
  if (streamClients.size === 0) return;

  try {
    const crimes = await getRecentNormalizedCrimes(200);
    const payload = {
      timestamp: new Date().toISOString(),
      crimes,
    };

    for (const client of streamClients) {
      sendSseEvent(client, 'crimes', payload);
    }
  } catch (error) {
    console.error('Failed to broadcast crime stream update:', error);
    for (const client of streamClients) {
      sendSseEvent(client, 'error', { message: 'Failed to stream latest crimes' });
    }
  }
};

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

const knownLocations = {
  'kopargaon': {
    state: 'Maharashtra',
    district: 'Ahmednagar',
    subdistrict: 'Kopargaon',
    village: null
  },
  'niphad': {
    state: 'Maharashtra',
    district: 'Nashik',
    subdistrict: 'Niphad',
    village: null
  }
};

const extractLocationHierarchy = (displayName, address = {}) => {
  // Split the display name into parts
  const parts = displayName.toLowerCase().split(',').map(p => p.trim());
  
  // Check for known locations first
  for (const [key, value] of Object.entries(knownLocations)) {
    if (parts.some(p => p.includes(key))) {
      return value;
    }
  }
  
  // Default extraction from Nominatim response
  return {
    state: address.state || (parts.find(p => p.includes('maharashtra')) ? 'Maharashtra' : null),
    district:
      address.county ||
      address.state_district ||
      (parts.find(p => p.includes('nashik')) ? 'Nashik' : parts.find(p => p.includes('ahmednagar')) ? 'Ahmednagar' : null),
    subdistrict:
      address.city_district ||
      address.suburb ||
      address.town ||
      (parts.find(p => p.includes('kopargaon')) ? 'Kopargaon' : parts.find(p => p.includes('niphad')) ? 'Niphad' : null),
    village: address.village || address.hamlet || null
  };
};

const geocodeLocation = async (location) => {
  try {
    const raw = String(location || '').trim();
    if (!raw) return null;

    const pinMatch = raw.match(/\b\d{6}\b/);
    const queries = [];
    if (pinMatch) {
      queries.push(`${pinMatch[0]}, India`);
    }
    queries.push(`${raw}, India`);

    const uniqueQueries = [...new Set(queries.filter(Boolean))];

    for (const query of uniqueQueries) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=1&countrycodes=in`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PredictivePolicing/1.0',
          'Accept-Language': 'en'
        }
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const locationHierarchy = extractLocationHierarchy(data[0].display_name, data[0].address || {});
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          display_name: data[0].display_name,
          ...locationHierarchy
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

router.post('/add-crime', async (req, res) => {
  try {
    console.log('Received crime data:', req.body);
    const date = normalizeDateInput(req.body.date);
    const time = normalizeTimeInput(req.body.time);
    const type = normalizeText(req.body.type || req.body.crimeType || '');

    const locationText = normalizeText(req.body.location);
    const state = normalizeOptionalField(req.body.state);
    const district = normalizeOptionalField(req.body.district);
    const subdistrict = normalizeOptionalField(req.body.subdistrict || req.body.taluka);
    const village = normalizeOptionalField(req.body.village);

    const fallbackLocation = [village, subdistrict, district, state].filter(Boolean).join(', ');
    const description = normalizeText(req.body.description) || 'No description provided';

    if (!type) {
      return res.status(400).json({ error: 'Crime type is required' });
    }
    if (!date) {
      return res.status(400).json({ error: 'Valid date is required (YYYY-MM-DD)' });
    }
    if (!time) {
      return res.status(400).json({ error: 'Valid time is required (HH:MM)' });
    }

    const baseLocation = locationText || fallbackLocation;
    if (!baseLocation) {
      return res.status(400).json({ error: 'Location details are required' });
    }

    const payload = {
      ...req.body,
      type,
      date,
      time,
      location: baseLocation,
      description,
      state,
      district,
      subdistrict,
      village,
      firNo: normalizeOptionalField(req.body.firNo || req.body.firNumber || req.body['FIR No']),
      section: normalizeOptionalField(req.body.section || req.body['Section']),
      policeStation: normalizeOptionalField(req.body.policeStation || req.body['Police Station']),
    };

    delete payload.crimeType;
    delete payload.taluka;

    const userCoords = normalizeCoordinates(payload.latitude, payload.longitude);
    const locationData = await geocodeLocation(payload.location);

    const crimeData = {
      ...payload,
      latitude: userCoords.latitude ?? locationData?.latitude ?? null,
      longitude: userCoords.longitude ?? locationData?.longitude ?? null,
      state: payload.state || locationData?.state,
      district: payload.district || locationData?.district,
      subdistrict: payload.subdistrict || locationData?.subdistrict,
      village: payload.village || locationData?.village,
    };

    crimeData.fingerprint = buildCrimeFingerprint(crimeData);
    const legacyDuplicateQuery = {
      type: crimeData.type,
      date: crimeData.date,
      time: crimeData.time,
    };

    if (crimeData.firNo) {
      legacyDuplicateQuery.firNo = crimeData.firNo;
    } else {
      legacyDuplicateQuery.location = crimeData.location;
    }

    const existingCrime = await Crime.findOne({
      $or: [
        { fingerprint: crimeData.fingerprint },
        legacyDuplicateQuery,
      ],
    })
      .select('_id')
      .lean();
    if (existingCrime) {
      return res.status(409).json({
        error: 'Duplicate crime record skipped',
        duplicate: true,
        existingCrimeId: existingCrime._id,
      });
    }

    const crime = new Crime(crimeData);
    await crime.save();
    await broadcastCrimeStreamUpdate();

    console.log('Crime saved successfully:', crime._id);
    res.json({
      message: locationData ? 'Crime added with location enrichment' : 'Crime added',
      crime,
      geocoded: Boolean(locationData),
    });
  } catch (err) {
    console.error('Error adding crime:', err);
    res.status(400).json({ error: 'Failed to add crime', details: err.message });
  }
});


router.get('/stream/crimes', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  res.write(': connected\n\n');
  streamClients.add(res);

  try {
    const crimes = await getRecentNormalizedCrimes(200);
    sendSseEvent(res, 'crimes', {
      timestamp: new Date().toISOString(),
      crimes,
    });
  } catch (error) {
    sendSseEvent(res, 'error', { message: 'Failed to load initial crime stream snapshot' });
  }

  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    streamClients.delete(res);
  });
});


// Get all crimes with DB state check and cache fallback
router.get('/crimes', async (req, res) => {
  try {
    const isConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const limit = Math.max(0, Math.min(1000, Number.parseInt(req.query.limit || '0', 10) || 0));

    if (!isConnected) {
      if (crimesCache && crimesCache.length > 0) {
        console.warn('DB disconnected; serving crimes from cache');
        res.set('X-Data-Source', 'cache');
        res.set('X-Cache-Timestamp', crimesCacheTimestamp || 'unknown');
        return res.status(200).json(crimesCache);
      }
      return res.status(503).json({
        error: 'Database not connected',
        details: 'MongoDB connection is unavailable. Please check DB_URL or whitelist IP in Atlas.',
        hint: 'Provide local MongoDB or set MONGODB_URI/DB_URL in environment.'
      });
    }

    const normalizedCrimes = await getRecentNormalizedCrimes(limit);
    console.log(`GET /police/crimes - returning ${normalizedCrimes.length} records`);
    res.json(normalizedCrimes);
  } catch (err) {
    console.error('Error fetching crimes:', err);
    res.status(500).json({ error: 'Failed to fetch crimes', details: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const isConnected = mongoose.connection && mongoose.connection.readyState === 1;
    if (!isConnected) {
      return res.json(computeStats(crimesCache, false));
    }

    const crimes = await Crime.find().lean();
    return res.json(computeStats(crimes, true));
  } catch (err) {
    console.error('Error fetching stats:', err);
    return res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

// Health check endpoint to verify server and DB connectivity
router.get('/health', async (req, res) => {
  try {
    const readyState = mongoose.connection ? mongoose.connection.readyState : 0;
    const connected = readyState === 1;
    if (!connected) {
      return res.json({ status: 'ok', db: false, readyState });
    }
    const count = await Crime.estimatedDocumentCount();
    res.json({ status: 'ok', db: true, readyState, crimeCount: count });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ status: 'error', db: false, details: err.message });
  }
});

router.get('/suspects', async (req, res) => {
  try {
    const isConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const limit = Math.max(0, Math.min(2000, Number.parseInt(req.query.limit || '0', 10) || 0));

    if (!isConnected) {
      if (suspectsCache.length > 0) {
        res.set('X-Data-Source', 'cache');
        res.set('X-Cache-Timestamp', suspectsCacheTimestamp || 'unknown');
        return res.status(200).json(limit > 0 ? suspectsCache.slice(0, limit) : suspectsCache);
      }
      return res.json([]);
    }

    let query = Suspect.find().sort({ updatedAt: -1 });
    if (limit > 0) {
      query = query.limit(limit);
    }

    const suspects = await query.lean();
    suspectsCache = suspects;
    suspectsCacheTimestamp = new Date().toISOString();
    res.json(suspects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suspects', details: err.message });
  }
});

router.post('/suspects', async (req, res) => {
  try {
    const {
      name,
      aliases,
      age,
      height,
      gender,
      riskLevel,
      status,
      primaryType,
      lastSeenDate,
      lastSeenLocation,
      description,
      linkedCrimes,
    } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Suspect name is required' });
    }

    const suspect = new Suspect({
      name: String(name).trim(),
      aliases: Array.isArray(aliases) ? aliases.filter(Boolean) : [],
      age: age ? Number(age) : undefined,
      height,
      gender,
      riskLevel,
      status,
      primaryType,
      lastSeenDate: lastSeenDate ? new Date(lastSeenDate) : undefined,
      lastSeenLocation,
      description,
      linkedCrimes: Array.isArray(linkedCrimes) ? linkedCrimes : [],
    });

    await suspect.save();
    suspectsCache = [suspect.toObject(), ...suspectsCache.filter((item) => String(item._id) !== String(suspect._id))];
    suspectsCacheTimestamp = new Date().toISOString();

    if (Array.isArray(linkedCrimes) && linkedCrimes.length > 0) {
      await Crime.updateMany(
        { _id: { $in: linkedCrimes } },
        { $addToSet: { suspects: suspect.name } }
      );
      await broadcastCrimeStreamUpdate();
    }

    res.status(201).json({ message: 'Suspect created', suspect });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create suspect', details: err.message });
  }
});

router.put('/suspects/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    if (updates.lastSeenDate) {
      updates.lastSeenDate = new Date(updates.lastSeenDate);
    }

    const suspect = await Suspect.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!suspect) {
      return res.status(404).json({ error: 'Suspect not found' });
    }

    suspectsCache = suspectsCache.map((item) => (String(item._id) === String(suspect._id) ? suspect.toObject() : item));
    suspectsCacheTimestamp = new Date().toISOString();
    res.json({ message: 'Suspect updated', suspect });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update suspect', details: err.message });
  }
});

router.delete('/suspects/:id', async (req, res) => {
  try {
    const suspect = await Suspect.findByIdAndDelete(req.params.id);
    if (!suspect) {
      return res.status(404).json({ error: 'Suspect not found' });
    }

    if (suspect.name) {
      await Crime.updateMany({}, { $pull: { suspects: suspect.name } });
      await broadcastCrimeStreamUpdate();
    }

    suspectsCache = suspectsCache.filter((item) => String(item._id) !== String(req.params.id));
    suspectsCacheTimestamp = new Date().toISOString();
    res.json({ message: 'Suspect deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete suspect', details: err.message });
  }
});

router.post('/suspects/:id/link-crime', async (req, res) => {
  try {
    const { crimeId } = req.body || {};
    if (!crimeId) {
      return res.status(400).json({ error: 'crimeId is required' });
    }

    const suspect = await Suspect.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { linkedCrimes: crimeId }, updatedAt: new Date() },
      { new: true }
    );

    if (!suspect) {
      return res.status(404).json({ error: 'Suspect not found' });
    }

    await Crime.findByIdAndUpdate(crimeId, { $addToSet: { suspects: suspect.name } });
    await broadcastCrimeStreamUpdate();

    suspectsCache = suspectsCache.map((item) => (String(item._id) === String(suspect._id) ? suspect.toObject() : item));
    suspectsCacheTimestamp = new Date().toISOString();
    res.json({ message: 'Crime linked to suspect', suspect });
  } catch (err) {
    res.status(500).json({ error: 'Failed to link crime to suspect', details: err.message });
  }
});

// Create a new officer
router.post('/officers', async (req, res) => {
  try {
    const { email, password, name, badgeNumber, rank, department, phone, isActive } = req.body;

    if (!email || !password || !name || !badgeNumber) {
      return res.status(400).json({ error: 'email, password, name, and badgeNumber are required' });
    }

    const exists = await Police.findOne({ $or: [{ email }, { badgeNumber }] });
    if (exists) {
      return res.status(409).json({ error: 'Officer with this email or badge number already exists' });
    }

    const officer = new Police({
      email,
      password,
      name,
      badgeNumber,
      rank: rank || 'Officer',
      department,
      phone,
      isActive: isActive !== undefined ? isActive : true
    });

    await officer.save();
    res.status(201).json({ message: 'Officer created', officer });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create officer', details: err.message });
  }
});


router.put('/crime/:id', async (req, res) => {
	try {
    const existing = await Crime.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Crime not found' });
    }

    const updates = { ...req.body };

    if (updates.date !== undefined) {
      const normalizedDate = normalizeDateInput(updates.date);
      if (!normalizedDate) {
        return res.status(400).json({ error: 'Invalid date format (expected YYYY-MM-DD)' });
      }
      updates.date = normalizedDate;
    }

    if (updates.time !== undefined) {
      const normalizedTime = normalizeTimeInput(updates.time);
      if (!normalizedTime) {
        return res.status(400).json({ error: 'Invalid time format (expected HH:MM)' });
      }
      updates.time = normalizedTime;
    }

    if (updates.type !== undefined) {
      updates.type = normalizeText(updates.type);
    }

    if (updates.location !== undefined) {
      updates.location = normalizeText(updates.location);
    }

    if (updates.description !== undefined) {
      updates.description = normalizeText(updates.description) || 'No description provided';
    }

    if (updates.firNo !== undefined) {
      updates.firNo = normalizeOptionalField(updates.firNo);
    }

    if (updates.section !== undefined) {
      updates.section = normalizeOptionalField(updates.section);
    }

    if (updates.policeStation !== undefined) {
      updates.policeStation = normalizeOptionalField(updates.policeStation);
    }

    if (updates.latitude !== undefined || updates.longitude !== undefined) {
      const mergedLatitude = updates.latitude !== undefined ? updates.latitude : existing.latitude;
      const mergedLongitude = updates.longitude !== undefined ? updates.longitude : existing.longitude;
      const coords = normalizeCoordinates(mergedLatitude, mergedLongitude);
      updates.latitude = coords.latitude;
      updates.longitude = coords.longitude;
    }

    updates.updatedAt = new Date();

    const mergedCrime = {
      ...existing.toObject(),
      ...updates,
    };

    updates.fingerprint = buildCrimeFingerprint(mergedCrime);

    const duplicate = await Crime.findOne({
      _id: { $ne: req.params.id },
      fingerprint: updates.fingerprint,
    })
      .select('_id')
      .lean();

    if (duplicate) {
      return res.status(409).json({
        error: 'Update would create a duplicate crime record',
        duplicate: true,
      });
    }

		const crime = await Crime.findByIdAndUpdate(req.params.id, updates, { new: true });
    await broadcastCrimeStreamUpdate();
		res.json(crime);
	} catch (err) {
		res.status(400).json({ error: 'Failed to update crime', details: err.message });
	}
});

router.delete('/crime/:id', async (req, res) => {
	try {
    const deletedCrime = await Crime.findByIdAndDelete(req.params.id);
    if (!deletedCrime) {
      return res.status(404).json({ error: 'Crime not found' });
    }
    await broadcastCrimeStreamUpdate();
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

// --- Bulk CSV Upload Endpoint ---
router.post('/upload-csv', upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  const errors = [];
  let added = 0;
  let failed = 0;
  let skippedDuplicates = 0;
  let rowsProcessed = 0;
  let geocodedCount = 0;

  const cleanupUpload = () => {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  };

  const pushError = (message) => {
    errors.push(message);
    failed += 1;
  };

  fs.createReadStream(req.file.path)
    .pipe(csv({ mapHeaders: ({ header }) => (header ? header.trim() : header) }))
    .on('data', (row) => {
      rowsProcessed += 1;

      try {
        const type = pickCsvValue(row, ['Crime Type', 'Type', 'CrimeType']);
        const date = normalizeDateInput(pickCsvValue(row, ['Date', 'Crime Date', 'Incident Date']));
        const time = normalizeTimeInput(pickCsvValue(row, ['Time', 'Incident Time']) || '00:00');

        if (!type || !date) {
          pushError(`Row ${rowsProcessed}: Missing required fields (Crime Type, Date)`);
          return;
        }

        if (!time) {
          pushError(`Row ${rowsProcessed}: Invalid time format (expected HH:MM)`);
          return;
        }

        const pincode = pickCsvValue(row, ['Pincode', 'Pin Code', 'PIN', 'Postal Code']);
        const city = pickCsvValue(row, ['City', 'Town']);
        const explicitLocation = pickCsvValue(row, ['Location', 'Address']);
        const state = pickCsvValue(row, ['State']) || 'Maharashtra';
        const district = pickCsvValue(row, ['District']);
        const subdistrict = pickCsvValue(row, ['Taluka', 'Subdistrict', 'Sub District', 'Tehsil']);
        const village = pickCsvValue(row, ['Village']);

        const locationLabel =
          explicitLocation ||
          [village, subdistrict, district, state, pincode].filter(Boolean).join(', ') ||
          [city, district, state, pincode].filter(Boolean).join(', ');

        const firNo = pickCsvValue(row, ['FIR No', 'FIR Number', 'FIRNO', 'FIR']);
        const section = pickCsvValue(row, ['Section', 'BNS Section', 'IPC Section']);
        const policeStation = pickCsvValue(row, ['Police Station', 'PoliceStation', 'PS']);

        const latitudeRaw = pickCsvValue(row, ['Latitude', 'Lat']);
        const longitudeRaw = pickCsvValue(row, ['Longitude', 'Lng', 'Long']);

        const record = {
          type,
          description: pickCsvValue(row, ['Description', 'Details', 'Crime Description']) || 'No description provided',
          date,
          time,
          location: locationLabel || 'Unknown location',
          state,
          district: district || undefined,
          subdistrict: subdistrict || undefined,
          village: village || undefined,
          firNo: firNo || undefined,
          section: section || undefined,
          policeStation: policeStation || undefined,
        };

        if (latitudeRaw || longitudeRaw) {
          if (!latitudeRaw || !longitudeRaw) {
            pushError(`Row ${rowsProcessed}: Latitude and Longitude must both be provided`);
            return;
          }

          const coords = normalizeCoordinates(latitudeRaw, longitudeRaw);
          if (coords.latitude === null || coords.longitude === null) {
            pushError(`Row ${rowsProcessed}: Invalid coordinates provided`);
            return;
          }

          record.latitude = coords.latitude;
          record.longitude = coords.longitude;
          results.push(record);
        } else if (locationLabel || city || pincode) {
          record.needsGeocoding = true;
          record.geocodeQuery = [explicitLocation, village, subdistrict, district, state, pincode, city]
            .filter(Boolean)
            .join(', ');
          results.push(record);
        } else {
          pushError(`Row ${rowsProcessed}: Missing location data (coordinates or location fields required)`);
        }
      } catch (err) {
        pushError(`Row ${rowsProcessed}: Parse error - ${err.message}`);
      }
    })
    .on('end', async () => {
      try {
        const recordsToGeocode = results.filter((record) => record.needsGeocoding);
        const readyRecords = results.filter((record) => !record.needsGeocoding);

        if (recordsToGeocode.length > 0) {
          console.log(`Geocoding ${recordsToGeocode.length} records...`);

          for (const record of recordsToGeocode) {
            try {
              await new Promise((resolve) => setTimeout(resolve, 1100));

              const geocoded = await geocodeLocation(record.geocodeQuery);

              if (geocoded) {
                record.latitude = geocoded.latitude;
                record.longitude = geocoded.longitude;
                record.location = geocoded.display_name || record.location;
                record.district = record.district || geocoded.district || 'Unknown';
                record.state = record.state || geocoded.state || 'Maharashtra';
                record.subdistrict = record.subdistrict || geocoded.subdistrict;
                record.village = record.village || geocoded.village;

                delete record.needsGeocoding;
                delete record.geocodeQuery;
                readyRecords.push(record);
                geocodedCount += 1;
              } else {
                pushError(`Geocoding failed for location: ${record.geocodeQuery}`);
              }
            } catch (geocodeErr) {
              pushError(`Geocoding error: ${geocodeErr.message} - Query: ${record.geocodeQuery}`);
            }
          }
        }

        const inFileFingerprintSet = new Set();
        const uploadUniqueRecords = [];

        for (const record of readyRecords) {
          const coords = normalizeCoordinates(record.latitude, record.longitude);
          const normalizedRecord = {
            ...record,
            type: normalizeText(record.type),
            date: normalizeDateInput(record.date),
            time: normalizeTimeInput(record.time) || '00:00',
            location: normalizeText(record.location) || 'Unknown location',
            description: normalizeText(record.description) || 'No description provided',
            state: normalizeOptionalField(record.state),
            district: normalizeOptionalField(record.district),
            subdistrict: normalizeOptionalField(record.subdistrict),
            village: normalizeOptionalField(record.village),
            firNo: normalizeOptionalField(record.firNo),
            section: normalizeOptionalField(record.section),
            policeStation: normalizeOptionalField(record.policeStation),
            latitude: coords.latitude,
            longitude: coords.longitude,
          };

          normalizedRecord.fingerprint = buildCrimeFingerprint(normalizedRecord);

          if (inFileFingerprintSet.has(normalizedRecord.fingerprint)) {
            skippedDuplicates += 1;
            continue;
          }

          inFileFingerprintSet.add(normalizedRecord.fingerprint);
          uploadUniqueRecords.push(normalizedRecord);
        }

        if (uploadUniqueRecords.length > 0) {
          const candidateDates = [...new Set(uploadUniqueRecords.map((record) => record.date))];
          const candidateTypes = [...new Set(uploadUniqueRecords.map((record) => record.type))];

          const existingRecords = await Crime.find({
            date: { $in: candidateDates },
            type: { $in: candidateTypes },
          })
            .select('fingerprint type date time location latitude longitude state district subdistrict village firNo section policeStation')
            .lean();

          const existingFingerprints = new Set(
            existingRecords.map((record) => record.fingerprint || buildCrimeFingerprint(record))
          );
          const recordsToInsert = [];

          for (const record of uploadUniqueRecords) {
            if (existingFingerprints.has(record.fingerprint)) {
              skippedDuplicates += 1;
              continue;
            }
            recordsToInsert.push(record);
          }

          for (const record of recordsToInsert) {
            try {
              await Crime.create(record);
              added += 1;
            } catch (insertErr) {
              pushError(`Insert failed for ${record.type} on ${record.date}: ${insertErr.message}`);
            }
          }
        }

        if (added > 0) {
          await broadcastCrimeStreamUpdate();
        }

        cleanupUpload();

        res.json({
          message: `Processed ${rowsProcessed} rows. Added ${added} records, skipped ${skippedDuplicates} duplicates, and failed ${failed} rows.`,
          added,
          failed,
          skippedDuplicates,
          skipped: skippedDuplicates,
          total: rowsProcessed,
          geocoded: geocodedCount,
          errors: errors.slice(0, 20),
        });
      } catch (err) {
        cleanupUpload();
        res.status(500).json({
          error: 'Database error while inserting records',
          details: err.message,
        });
      }
    })
    .on('error', (err) => {
      cleanupUpload();
      res.status(500).json({ error: 'Failed to parse CSV file', details: err.message });
    });
});

// Get all officers
let officersCache = [];
let officersCacheTimestamp = null;

router.get('/officers', async (req, res) => {
  try {
    const isConnected = mongoose.connection && mongoose.connection.readyState === 1;
    if (!isConnected) {
      if (officersCache && officersCache.length > 0) {
        console.warn('DB disconnected; serving officers from cache');
        res.set('X-Data-Source', 'cache');
        res.set('X-Cache-Timestamp', officersCacheTimestamp || 'unknown');
        return res.status(200).json(officersCache);
      }
      return res.status(503).json({
        error: 'Database not connected',
        details: 'MongoDB connection is unavailable. Please check DB_URL or whitelist IP in Atlas.'
      });
    }

    const officers = await Police.find({ isActive: true })
      .select('name badgeNumber rank department phone assignedCases')
      .sort({ name: 1 });
    officersCache = officers;
    officersCacheTimestamp = new Date().toISOString();
    res.json(officers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch officers', details: err.message });
  }
});

// Assign officer to a case
router.post('/assign-officer', async (req, res) => {
  try {
    const { crimeId, officerId, officerName } = req.body;

    if (!crimeId || !officerId) {
      return res.status(400).json({ error: 'crimeId and officerId are required' });
    }

    // Update Crime with assigned officer
    const crime = await Crime.findByIdAndUpdate(
      crimeId,
      { 
        assignedOfficer: officerName,
        assignedOfficerId: officerId 
      },
      { new: true }
    );

    if (!crime) {
      return res.status(404).json({ error: 'Crime not found' });
    }

    // Update Police officer's assignedCases array
    await Police.findByIdAndUpdate(
      officerId,
      { $addToSet: { assignedCases: crimeId } } // addToSet prevents duplicates
    );

    await broadcastCrimeStreamUpdate();

    res.json({ 
      message: 'Officer assigned successfully',
      crime 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign officer', details: err.message });
  }
});

// Unassign officer from a case
router.post('/unassign-officer', async (req, res) => {
  try {
    const { crimeId } = req.body;

    if (!crimeId) {
      return res.status(400).json({ error: 'crimeId is required' });
    }

    const crime = await Crime.findById(crimeId);
    if (!crime) {
      return res.status(404).json({ error: 'Crime not found' });
    }

    const officerId = crime.assignedOfficerId;

    // Remove officer from crime
    crime.assignedOfficer = null;
    crime.assignedOfficerId = null;
    await crime.save();

    // Remove case from officer's assignedCases
    if (officerId) {
      await Police.findByIdAndUpdate(
        officerId,
        { $pull: { assignedCases: crimeId } }
      );
    }

    await broadcastCrimeStreamUpdate();

    res.json({ 
      message: 'Officer unassigned successfully',
      crime 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unassign officer', details: err.message });
  }
});

module.exports = router;
