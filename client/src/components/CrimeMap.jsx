import { useState, useEffect, useMemo } from "react";
import { useLocation } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Marker,
  Popup,
  useMap,
  Circle,
} from "react-leaflet";
import HotspotPopup from './HotspotPopup';
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import React from 'react';
import { apiGet } from "../utils/api";
import { normalizeCrimeList, hasCoordinates } from "../utils/crime";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});


function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (
      center &&
      typeof center[0] === 'number' &&
      typeof center[1] === 'number' &&
      !isNaN(center[0]) &&
      !isNaN(center[1])
    ) {
      map.flyTo(center, zoom, { animate: true, duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

const geocodeLocation = async (locationString, level) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationString)}&limit=1&countrycodes=in`;
    const response = await fetch(url, { headers: { 'User-Agent': 'CrimeMapApp/1.0' } });
    if (!response.ok) throw new Error('Geocoding API failed');
    const data = await response.json();
    if (data && data.length > 0) {
      const result = data[0];
      return { lat: parseFloat(result.lat), lng: parseFloat(result.lon), address: result.display_name, confidence: 'high' };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

const knownCoordinates = {
  "Maharashtra": [19.7515, 75.7139],
  "Delhi": [28.7041, 77.1025],
  "Karnataka": [15.3173, 75.7139],
  "Tamil Nadu": [11.1271, 78.6569],
  "Uttar Pradesh": [26.8467, 80.9462],
  "Gujarat": [22.2587, 71.1924],
  "Rajasthan": [27.0238, 74.2179],
  "West Bengal": [22.9868, 87.8550],
  "Madhya Pradesh": [22.9734, 78.6569],
  "Andhra Pradesh": [15.9129, 79.7400],
  "Punjab": [31.1471, 75.3412],
  "Haryana": [29.0588, 76.0856],
  "INDIA_CENTER": [20.5937, 78.9629]
};

function CrimeMap({ crimeData = [], isPublicView = false }) {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subdistricts, setSubdistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedState, setSelectedState] = useState("All");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [selectedSubdistrict, setSelectedSubdistrict] = useState("All");
  const [selectedVillage, setSelectedVillage] = useState("All");

  const [locationData, setLocationData] = useState([]);
  const [mapCenter, setMapCenter] = useState(knownCoordinates.INDIA_CENTER);
  const [mapZoom, setMapZoom] = useState(5);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("All India");
  const location = useLocation();
  const [hotspots, setHotspots] = useState([]);
  const [showHotspots, setShowHotspots] = useState(true);
  const [hotspotRadius, setHotspotRadius] = useState(2000);
  const [apiCrimeData, setApiCrimeData] = useState([]);
  const [crimeLoading, setCrimeLoading] = useState(false);
  const [crimeError, setCrimeError] = useState("");

  const normalizedPropCrimes = useMemo(() => normalizeCrimeList(crimeData), [crimeData]);
  const normalizedApiCrimes = useMemo(() => normalizeCrimeList(apiCrimeData), [apiCrimeData]);
  const sourceCrimeData = normalizedPropCrimes.length > 0 ? normalizedPropCrimes : normalizedApiCrimes;

  useEffect(() => {
    if (normalizedPropCrimes.length > 0) return;
    let cancelled = false;
    const fetchCrimes = async () => {
      try {
        setCrimeLoading(true);
        const data = await apiGet('/api/crimes?limit=1000');
        if (cancelled) return;
        setApiCrimeData(Array.isArray(data) ? data : []);
        setCrimeError("");
      } catch (error) {
        if (!cancelled) setCrimeError('Unable to load crime records for map.');
      } finally {
        if (!cancelled) setCrimeLoading(false);
      }
    };
    fetchCrimes();
    const interval = setInterval(fetchCrimes, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [normalizedPropCrimes.length]);

  useEffect(() => {
    if (selectedState !== "All") return;
    if (hotspots.length > 0) return;
    const firstCrimeWithCoords = sourceCrimeData.find((crime) => hasCoordinates(crime));
    if (firstCrimeWithCoords) {
      setMapCenter([firstCrimeWithCoords.latitude, firstCrimeWithCoords.longitude]);
      setMapZoom(7);
    }
  }, [sourceCrimeData, selectedState, hotspots.length]);

  const normalize = (val) => val?.trim().toLowerCase();

  const getStateObj = useMemo(() =>
    (stateName) => locationData.find((s) => normalize(s.state) === normalize(stateName))
  , [locationData]);

  const getDistrictObj = useMemo(() =>
    (stateName, districtName) => getStateObj(stateName)?.districts?.find((d) => normalize(d.district) === normalize(districtName))
  , [getStateObj]);

  const getSubdistrictObj = useMemo(() =>
    (stateName, districtName, subdistrictName) =>
      getDistrictObj(stateName, districtName)?.subDistricts?.find((sd) => normalize(sd.subDistrict) === normalize(subdistrictName))
  , [getDistrictObj]);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/pranshumaheshwari/indian-cities-and-villages/refs/heads/master/data.json")
      .then((res) => res.json())
      .then((data) => setLocationData(data))
      .catch((err) => console.error("Failed to fetch location data:", err));
  }, []);

  useEffect(() => {
    if (locationData.length > 0) setStates(locationData.map((s) => s.state));
  }, [locationData]);

  const buildLocationString = () => {
    const parts = [];
    if (selectedVillage !== "All") parts.push(selectedVillage);
    if (selectedSubdistrict !== "All") parts.push(selectedSubdistrict);
    if (selectedDistrict !== "All") parts.push(selectedDistrict);
    if (selectedState !== "All") parts.push(selectedState);
    if (parts.length === 0) return "India";
    parts.push("India");
    return parts.join(", ");
  };

  const getFallbackCoordinates = (level) => {
    let key = null;
    if (level === 'state') key = selectedState;
    if (level === 'district') key = selectedDistrict;
    if (level === 'subdistrict') key = selectedSubdistrict;
    if (level === 'village') key = selectedVillage;
    if (key && knownCoordinates[key]) return knownCoordinates[key];
    if (knownCoordinates[selectedState]) return knownCoordinates[selectedState];
    return knownCoordinates.INDIA_CENTER;
  };

  const updateMap = (lat, lng, level) => {
    const safeLat = Number(lat);
    const safeLng = Number(lng);
    if (safeLat != null && safeLng != null && !isNaN(safeLat) && !isNaN(safeLng)) {
      setMapCenter([safeLat, safeLng]);
      let newZoom = 5;
      switch (level) {
        case "state": newZoom = 6; break;
        case "district": newZoom = 8; break;
        case "subdistrict": newZoom = 10; break;
        case "village": newZoom = 12; break;
        default: newZoom = 5;
      }
      setMapZoom(newZoom);
      setSelectedMarker([safeLat, safeLng]);
    } else {
      setSelectedMarker(null);
    }
  };

  const updateMapWithGeocoding = async (level) => {
    if (selectedState === "All") {
      setCurrentAddress("All India");
      updateMap(knownCoordinates.INDIA_CENTER[0], knownCoordinates.INDIA_CENTER[1], "national");
      return;
    }
    const locationString = buildLocationString();
    setIsGeocoding(true);
    setCurrentAddress(`Locating ${locationString}...`);
    try {
      const coords = await geocodeLocation(locationString, level);
      if (coords && coords.lat && coords.lng) {
        setCurrentAddress(coords.address || locationString);
        updateMap(coords.lat, coords.lng, level);
      } else {
        const fallbackCoords = getFallbackCoordinates(level);
        setCurrentAddress(`${locationString} (Approximate Location)`);
        updateMap(fallbackCoords[0], fallbackCoords[1], level);
      }
    } catch (error) {
      const fallbackCoords = getFallbackCoordinates(level);
      setCurrentAddress(`${locationString} (Approximate Location)`);
      updateMap(fallbackCoords[0], fallbackCoords[1], level);
    } finally {
      setIsGeocoding(false);
    }
  };

  useEffect(() => {
    if (selectedState === "All") {
      setDistricts([]);
      setSelectedDistrict("All");
      setSubdistricts([]);
      setSelectedSubdistrict("All");
      setVillages([]);
      setSelectedVillage("All");
      updateMapWithGeocoding("national");
    } else {
      const stateObj = getStateObj(selectedState);
      setDistricts(stateObj?.districts?.map((d) => d.district) || []);
      setSelectedDistrict("All");
      setSubdistricts([]);
      setSelectedSubdistrict("All");
      setVillages([]);
      setSelectedVillage("All");
      updateMapWithGeocoding("state");
    }
  }, [selectedState, getStateObj]);

  useEffect(() => {
    if (selectedDistrict === "All") {
      setSubdistricts([]);
      setSelectedSubdistrict("All");
      setVillages([]);
      setSelectedVillage("All");
      if (selectedState !== "All") updateMapWithGeocoding("state");
    } else {
      const districtObj = getDistrictObj(selectedState, selectedDistrict);
      setSubdistricts(districtObj?.subDistricts?.map((sd) => sd.subDistrict) || []);
      setSelectedSubdistrict("All");
      setVillages([]);
      setSelectedVillage("All");
      updateMapWithGeocoding("district");
    }
  }, [selectedDistrict, selectedState, getStateObj, getDistrictObj]);

  useEffect(() => {
    if (selectedSubdistrict === "All") {
      setVillages([]);
      setSelectedVillage("All");
      if (selectedDistrict !== "All") updateMapWithGeocoding("district");
    } else {
      const subObj = getSubdistrictObj(selectedState, selectedDistrict, selectedSubdistrict);
      const villageList = subObj?.villages?.length
        ? subObj.villages
        : subObj?.villagesData?.map(v => v.name) || [];
      setVillages(villageList);
      setSelectedVillage("All");
      updateMapWithGeocoding("subdistrict");
    }
  }, [selectedSubdistrict, selectedDistrict, selectedState, getDistrictObj, getSubdistrictObj]);

  useEffect(() => {
    if (selectedVillage === "All") {
      if (selectedSubdistrict !== "All") updateMapWithGeocoding("subdistrict");
      return;
    }
    if (selectedVillage !== "All" && selectedSubdistrict !== "All") updateMapWithGeocoding("village");
  }, [selectedVillage, selectedSubdistrict, selectedDistrict, selectedState]);

  useEffect(() => {
    try {
      const stateHotspots = location?.state?.hotspots;
      if (stateHotspots && Array.isArray(stateHotspots)) {
        setHotspots(stateHotspots);
        if (stateHotspots.length > 0) { setMapCenter([stateHotspots[0].lat, stateHotspots[0].lng]); setMapZoom(10); }
        return;
      }
      const savedHotspots = localStorage.getItem('lastTrainedHotspots');
      if (savedHotspots) {
        const parsed = JSON.parse(savedHotspots);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHotspots(parsed);
          setMapCenter([parsed[0].lat, parsed[0].lng]);
          setMapZoom(10);
        }
      }
    } catch (e) { console.error('Error loading hotspots:', e); }
  }, [location]);

  const filteredData = useMemo(() => {
    return sourceCrimeData.filter((crime) => {
      const crimeDate = new Date(crime.date);
      const isAfterStart = startDate ? crimeDate >= new Date(startDate) : true;
      const isBeforeEnd = endDate ? crimeDate <= new Date(endDate) : true;
      const isTypeMatch = selectedType === "All" || crime.type === selectedType;
      const isStateMatch = selectedState === "All" || normalize(crime.state) === normalize(selectedState);
      const isDistrictMatch = selectedDistrict === "All" || normalize(crime.district) === normalize(selectedDistrict);
      const isSubdistrictMatch = selectedSubdistrict === "All" || normalize(crime.subdistrict) === normalize(selectedSubdistrict);
      const isVillageMatch = selectedVillage === "All" || normalize(crime.village) === normalize(selectedVillage);
      return isAfterStart && isBeforeEnd && isTypeMatch && isStateMatch && isDistrictMatch && isSubdistrictMatch && isVillageMatch;
    });
  }, [sourceCrimeData, startDate, endDate, selectedType, selectedState, selectedDistrict, selectedSubdistrict, selectedVillage]);

  const crimeClusters = useMemo(() => {
    const clusters = {};
    filteredData.forEach((crime) => {
      if (hasCoordinates(crime)) {
        const key = `${crime.latitude},${crime.longitude}`;
        if (!clusters[key]) {
          clusters[key] = {
            latitude: crime.latitude, longitude: crime.longitude,
            location: crime.location, state: crime.state, district: crime.district,
            subdistrict: crime.subdistrict, village: crime.village,
            count: 0, typeCounts: {}, latestDate: crime.date || null,
          };
        }
        const cluster = clusters[key];
        cluster.count += 1;
        const typeKey = String(crime.type || "Unknown").trim() || "Unknown";
        cluster.typeCounts[typeKey] = (cluster.typeCounts[typeKey] || 0) + 1;
        if (crime.date) {
          const currentLatest = cluster.latestDate ? Date.parse(cluster.latestDate) : 0;
          const candidate = Date.parse(crime.date);
          if (!Number.isNaN(candidate) && candidate > currentLatest) cluster.latestDate = crime.date;
        }
        if (!cluster.village && crime.village) cluster.village = crime.village;
        if (!cluster.subdistrict && crime.subdistrict) cluster.subdistrict = crime.subdistrict;
        if (!cluster.district && crime.district) cluster.district = crime.district;
        if (!cluster.state && crime.state) cluster.state = crime.state;
      }
    });
    return Object.values(clusters).map((cluster) => {
      const topTypes = Object.entries(cluster.typeCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type, count]) => ({ type, count }));
      return { ...cluster, type: topTypes[0]?.type || "Unknown", topTypes };
    });
  }, [filteredData]);

  const stats = useMemo(() => ({
    totalCrimes: sourceCrimeData.length,
    filteredCrimes: filteredData.length,
    uniqueLocations: crimeClusters.length,
    hotspots: hotspots.length,
  }), [sourceCrimeData.length, filteredData.length, crimeClusters.length, hotspots.length]);

  // Shared select style
  const selectCls = `w-full rounded-lg border px-2.5 py-2 text-sm font-medium outline-none transition
    focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/40
    disabled:cursor-not-allowed disabled:opacity-50
    ${isDark
      ? "border-slate-600 bg-slate-800 text-slate-100 disabled:bg-slate-700"
      : "border-slate-300 bg-white text-slate-900 disabled:bg-slate-100"}`;

  const labelCls = `mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] ${isDark ? "text-slate-400" : "text-slate-500"}`;

  return (
    <div className={isPublicView ? "mt-2" : "mt-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-8"}>

      {!isPublicView && (
        <div className={`relative mb-4 rounded-2xl border p-4 shadow-xl ${
          isDark ? "border-slate-600 bg-slate-900/95" : "border-slate-300 bg-slate-100/80"
        }`}>

          {/* ── Geocoding pill ── */}
          {isGeocoding && (
            <div className={`absolute right-4 top-4 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold z-10 ${
              isDark ? "bg-cyan-500 text-white" : "bg-cyan-400 text-cyan-900"
            }`}>
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              {t({ en: "Finding location...", mr: "स्थान शोधत आहे..." })}
            </div>
          )}

          {/* ── Current location badge ── */}
          {currentAddress && !isGeocoding && (
            <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${
              isDark
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                : "border-emerald-300 bg-emerald-50 text-emerald-800"
            }`}>
              <span>📍</span>
              <span>{t({ en: "Current Location:", mr: "वर्तमान स्थान:" })} {currentAddress}</span>
            </div>
          )}

          {/* ── ALL FILTERS IN ONE ROW ── */}
          <div className="flex flex-wrap items-end gap-3">

            {/* State */}
            <div className="min-w-[140px] flex-1">
              <label className={labelCls}>{t({ en: "State", mr: "राज्य" })}</label>
              <select className={selectCls} value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                <option value="All">{t({ en: "All States", mr: "सर्व राज्ये" })}</option>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* District */}
            <div className="min-w-[140px] flex-1">
              <label className={labelCls}>{t({ en: "District", mr: "जिल्हा" })}</label>
              <select
                className={selectCls}
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={selectedState === "All"}
              >
                <option value="All">{t({ en: "All Districts", mr: "सर्व जिल्हे" })}</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Subdistrict */}
            <div className="min-w-[150px] flex-1">
              <label className={labelCls}>{t({ en: "Taluka", mr: "तालुका" })}</label>
              <select
                className={selectCls}
                value={selectedSubdistrict}
                onChange={(e) => setSelectedSubdistrict(e.target.value)}
                disabled={selectedDistrict === "All"}
              >
                <option value="All">{t({ en: "All Talukas", mr: "सर्व तालुके" })}</option>
                {subdistricts.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Village */}
            <div className="min-w-[140px] flex-1">
              <label className={labelCls}>{t({ en: "Village", mr: "गाव" })}</label>
              <select
                className={selectCls}
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                disabled={selectedSubdistrict === "All"}
              >
                <option value="All">{t({ en: "All Villages", mr: "सर्व गावे" })}</option>
                {villages.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* Divider */}
            <div className={`hidden lg:block self-stretch w-px mx-1 ${isDark ? "bg-slate-700" : "bg-slate-300"}`} />

            {/* Hotspot toggle + radius — inline with dropdowns */}
            <div className={`flex items-end gap-3 rounded-xl border px-3 py-2 shrink-0 ${
              isDark ? "border-slate-600 bg-slate-800/80" : "border-slate-300 bg-white"
            }`}>
              <label className={`flex items-center gap-2 text-sm font-medium cursor-pointer ${isDark ? "text-slate-100" : "text-slate-700"}`}>
                <input
                  type="checkbox"
                  checked={showHotspots}
                  onChange={(e) => setShowHotspots(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-400 accent-cyan-500"
                />
                {t({ en: "Hotspots", mr: "हॉटस्पॉट" })}
              </label>
              <div className={`flex items-center gap-2 text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-700"}`}>
                <span className="text-xs whitespace-nowrap">{t({ en: "Radius", mr: "त्रिज्या" })}</span>
                <input
                  type="range"
                  min="500"
                  max="4000"
                  step="250"
                  value={hotspotRadius}
                  onChange={(e) => setHotspotRadius(Number(e.target.value))}
                  className="w-20 accent-cyan-400"
                />
                <span className={`w-12 text-right text-xs font-semibold ${isDark ? "text-cyan-300" : "text-cyan-600"}`}>
                  {hotspotRadius}m
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPublicView && (
        <div className="mb-3 rounded-xl border border-cyan-200/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-50">
          Public map view is read-only and does not expose police operation controls.
        </div>
      )}

      {crimeLoading && (
        <div className="mb-3 px-3 py-2 rounded bg-blue-50 text-blue-700 border border-blue-200 text-sm">
          Loading crime records from database...
        </div>
      )}
      {crimeError && (
        <div className="mb-3 px-3 py-2 rounded bg-red-50 text-red-700 border border-red-200 text-sm">
          {crimeError}
        </div>
      )}

      {/* MAP */}
      <div className="relative">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className={`w-full rounded-xl border shadow-lg ${isPublicView ? "h-[70vh] min-h-[520px]" : "h-[520px]"}`}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapUpdater center={mapCenter} zoom={mapZoom} />

          {selectedMarker && selectedMarker[0] != null && selectedMarker[1] != null && (
            <>
              <Marker position={selectedMarker}>
                <Popup>
                  <strong>
                    {selectedVillage !== "All" ? selectedVillage
                      : selectedSubdistrict !== "All" ? selectedSubdistrict
                      : selectedDistrict !== "All" ? selectedDistrict
                      : selectedState}
                  </strong>
                  <br />📍 {currentAddress}<br />
                  Latitude: {selectedMarker[0].toFixed(4)}, Longitude: {selectedMarker[1].toFixed(4)}
                </Popup>
              </Marker>
              <Circle
                center={selectedMarker}
                radius={selectedVillage !== "All" ? 1000 : 2000}
                pathOptions={{
                  color: selectedVillage !== "All" ? 'green'
                    : selectedSubdistrict !== "All" ? 'blue'
                    : selectedDistrict !== "All" ? 'purple' : 'red',
                  fillOpacity: 0.1, weight: 2
                }}
              />
            </>
          )}

          {crimeClusters.map((crime, i) => (
            <CircleMarker
              key={i}
              center={[crime.latitude, crime.longitude]}
              radius={Math.min(6 + crime.count * 2, 25)}
              fillOpacity={0.7}
              fillColor={crime.count > 10 ? "darkred" : crime.count > 5 ? "red" : "orange"}
              stroke={false}
            >
              <Tooltip>
                <strong>📍 {crime.location}</strong><br />
                🔢 Number of Crimes: {crime.count}<br />
                🗓️ Latest: {crime.latestDate || "—"}<br />
                📌 {crime.subdistrict || "—"}, {crime.district || "—"}, {crime.state || "—"}<br />
                🏘️ Village: {crime.village || "N/A"}<br />
                🧾 Top Types: {crime.topTypes?.length ? crime.topTypes.map((item) => `${item.type} (${item.count})`).join(", ") : "—"}<br />
                {crime.count > 5 && <span className="text-red-600 font-bold">🔥 Hotspot</span>}
              </Tooltip>
            </CircleMarker>
          ))}

          {showHotspots && hotspots.map((h, i) => {
            if (!h || !h.lat || !h.lng) return null;
            const hotspotId = `hotspot-${h.lat}-${h.lng}-${i}`;
            const likelihood = h.prediction?.likelihood || h.score || 0;
            const color = likelihood > 75 ? '#ef4444' : likelihood > 50 ? '#f97316' : '#eab308';
            const radius = Math.max(500, Math.min(hotspotRadius, hotspotRadius * (likelihood / 50 || 1)));
            return (
              <React.Fragment key={hotspotId}>
                <Marker
                  position={[h.lat, h.lng]}
                  icon={new L.Icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                  })}
                >
                  <Popup><HotspotPopup hotspot={h} index={i} /></Popup>
                </Marker>
                <Circle
                  center={[h.lat, h.lng]}
                  radius={radius}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.2 + (likelihood / 300), weight: 2 }}
                />
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur shadow rounded-lg p-3 text-xs border border-gray-200 space-y-1.5 z-[400]">
          <div className="font-semibold text-gray-800 text-sm">Legend</div>
          <div className="flex items-center gap-2 text-gray-700"><span className="inline-block w-3 h-3 bg-red-500 rounded-full" /> High likelihood hotspot</div>
          <div className="flex items-center gap-2 text-gray-700"><span className="inline-block w-3 h-3 bg-orange-400 rounded-full" /> Medium likelihood hotspot</div>
          <div className="flex items-center gap-2 text-gray-700"><span className="inline-block w-3 h-3 bg-yellow-400 rounded-full" /> Low likelihood hotspot</div>
          <div className="flex items-center gap-2 text-gray-700"><span className="inline-block w-3 h-3 bg-blue-500 rounded-full" /> Crime clusters</div>
        </div>

        {/* Stats */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur shadow rounded-lg p-3 text-xs border border-gray-200 space-y-1 z-[400]">
          <div className="font-semibold text-gray-800 text-sm">Quick stats</div>
          <div className="text-gray-700">Crimes (filtered / total): {stats.filteredCrimes} / {stats.totalCrimes}</div>
          <div className="text-gray-700">Unique locations: {stats.uniqueLocations}</div>
          <div className="text-gray-700">Hotspots: {stats.hotspots}</div>
        </div>
      </div>
    </div>
  );
}

export default CrimeMap;