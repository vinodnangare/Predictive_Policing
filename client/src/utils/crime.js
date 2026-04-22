const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const inIndiaBounds = (lat, lng) => lat >= 5 && lat <= 38 && lng >= 60 && lng <= 100;

const normalizeCoordinates = (latitude, longitude) => {
  let lat = toNumber(latitude);
  let lng = toNumber(longitude);

  if (lat === null || lng === null) {
    return { latitude: null, longitude: null };
  }

  const isLatValid = lat >= -90 && lat <= 90;
  const isLngValid = lng >= -180 && lng <= 180;
  if (!isLatValid || !isLngValid) {
    return { latitude: null, longitude: null };
  }

  // Fix common CSV entry issue where lat/lng are swapped for India.
  if (!inIndiaBounds(lat, lng) && inIndiaBounds(lng, lat)) {
    [lat, lng] = [lng, lat];
  }

  return { latitude: lat, longitude: lng };
};

const buildLocationLabel = (crime) => {
  if (crime.location) return crime.location;
  const parts = [crime.subdistrict, crime.district, crime.state].filter(Boolean);
  return parts.length ? parts.join(", ") : "Unknown location";
};

export const normalizeCrime = (raw = {}) => {
  const type = raw.type || raw.crimeType || "Unknown";
  const { latitude, longitude } = normalizeCoordinates(raw.latitude, raw.longitude);
  const dateValue = raw.date || raw.createdAt || null;
  const parsedTimestamp = dateValue ? new Date(dateValue) : null;

  return {
    ...raw,
    id: raw._id || raw.id,
    _id: raw._id || raw.id,
    type,
    crimeType: type,
    latitude,
    longitude,
    location: buildLocationLabel(raw),
    caseStatus: raw.caseStatus || "Open",
    timestamp: parsedTimestamp && !Number.isNaN(parsedTimestamp.getTime()) ? parsedTimestamp : null,
  };
};

export const normalizeCrimeList = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeCrime);
};

export const hasCoordinates = (crime) =>
  crime && typeof crime.latitude === "number" && typeof crime.longitude === "number";
