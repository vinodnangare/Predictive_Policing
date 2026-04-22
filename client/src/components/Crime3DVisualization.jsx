import React, { useState, useEffect } from 'react';
import { FiSliders, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { apiGet } from '../utils/api';
import { normalizeCrimeList } from '../utils/crime';

function Crime3DVisualization() {
  const [timeSlider, setTimeSlider] = useState(12);
  const [selectedHour, setSelectedHour] = useState('12:00 PM');
  const [crimeData, setCrimeData] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [allCrimes, setAllCrimes] = useState([]);

  useEffect(() => {
    const fetchAllCrimes = async () => {
      try {
        const data = normalizeCrimeList(await apiGet('/api/crimes?limit=2000'));
        setAllCrimes(data);
        console.log('Fetched crimes for 3D viz:', data.length);
      } catch (error) {
        console.error('Failed to fetch crimes:', error);
      }
    };
    fetchAllCrimes();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchAllCrimes, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hour = timeSlider.toString().padStart(2, '0');
    const period = timeSlider < 12 ? 'AM' : 'PM';
    const displayHour = timeSlider % 12 || 12;
    setSelectedHour(`${displayHour}:00 ${period}`);
    
    fetchCrimeDataByHour(timeSlider);
  }, [timeSlider, allCrimes]);

  const fetchCrimeDataByHour = (hour) => {
    const getCrimeHour = (crime) => {
      if (crime.time && /^\d{1,2}:\d{2}/.test(crime.time)) {
        const parsed = Number.parseInt(crime.time.split(':')[0], 10);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 23) {
          return parsed;
        }
      }
      const parsedDate = new Date(crime.date);
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getHours();
    };

    const filteredData = allCrimes
      .filter((crime) => getCrimeHour(crime) === hour)
      .map((crime, i) => ({
        id: crime._id || i,
        lat: crime.latitude,
        lng: crime.longitude,
        elevation: 25 + (['Murder', 'Robbery', 'Kidnapping'].includes(crime.type) ? 55 : 30),
        intensity: ['Murder', 'Robbery', 'Kidnapping'].includes(crime.type) ? 80 : 50,
        type: crime.type,
        time: hour,
        location: crime.district
      }));
    setCrimeData(filteredData);
  };

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="content-container p-6 sm:p-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6">
          3D Crime Visualization 📊
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 3D Visualization Area */}
          <div className="lg:col-span-3 bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-8 shadow-lg min-h-96">
            <div className="relative w-full h-96 bg-slate-700/50 rounded-lg border border-slate-600/30 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent"></div>
              
              {/* 3D Grid Background */}
              <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#60a5fa" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>

              {/* Crime Data Points */}
              <div className="relative w-full h-full">
                {crimeData.map((crime) => {
                  const x = ((crime.lng - 72.7777) / 0.2) * 100;
                  const y = ((crime.lat - 19.0760) / 0.2) * 100;
                  const size = (crime.intensity / 100) * 20 + 8;
                  const colors = {
                    'Theft': '#fbbf24',
                    'Robbery': '#ef4444',
                    'Assault': '#ef4444',
                    'Vandalism': '#8b5cf6'
                  };

                  return (
                    <div
                      key={crime.id}
                      className="absolute rounded-full cursor-pointer hover:opacity-100 transition-all duration-300"
                      style={{
                        left: `${Math.max(0, Math.min(100, x))}%`,
                        top: `${Math.max(0, Math.min(100, y))}%`,
                        width: `${size * zoom}px`,
                        height: `${size * zoom}px`,
                        backgroundColor: colors[crime.type],
                        opacity: 0.7,
                        transform: `translate(-50%, -50%) scale(${1 + crime.elevation / 100})`,
                        boxShadow: `0 0 ${size}px ${colors[crime.type]}80`
                      }}
                      title={`${crime.type} - Elevation: ${crime.elevation.toFixed(1)}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.2))}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition"
              >
                <FiZoomOut /> Zoom Out
              </button>
              <button
                onClick={() => setZoom(Math.min(2, zoom + 0.2))}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition"
              >
                <FiZoomIn /> Zoom In
              </button>
            </div>
          </div>

          {/* Controls & Legend */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-blue-300 mb-6 flex items-center gap-2">
              <FiSliders /> Controls
            </h3>

            {/* Time Slider */}
            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Time (Hour): {selectedHour}
              </label>
              <input
                type="range"
                min="0"
                max="23"
                value={timeSlider}
                onChange={(e) => setTimeSlider(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>00:00 (Midnight)</span>
                <span>23:00 (Night)</span>
              </div>
            </div>

            {/* Crime Type Legend */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h4 className="text-gray-300 font-semibold text-sm mb-3">Crime Types</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-300">Robbery & Assault</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span className="text-sm text-gray-300">Theft</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm text-gray-300">Vandalism</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h4 className="text-gray-300 font-semibold text-sm mb-3">Stats</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <p>Crimes at {selectedHour}: <span className="text-blue-400 font-bold">{crimeData.length}</span></p>
                <p>Avg Elevation: <span className="text-blue-400 font-bold">{(crimeData.reduce((a, c) => a + c.elevation, 0) / crimeData.length).toFixed(1)}</span></p>
                <p>Zoom Level: <span className="text-blue-400 font-bold">{zoom.toFixed(1)}x</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Crime3DVisualization;
