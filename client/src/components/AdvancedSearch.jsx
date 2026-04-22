import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiSearch, FiMapPin, FiClock, FiAlertTriangle } from 'react-icons/fi';
import { API_BASE } from '../utils/api';

function AdvancedSearch() {
  const [crimes, setCrimes] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [filters, setFilters] = useState({
    crimeType: '',
    severity: 'All',
    status: 'All',
    location: '',
    dateFrom: '',
    dateTo: '',
    radiusKm: 5,
    lat: '',
    lon: '',
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAllCrimes();
  }, []);

  const fetchAllCrimes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/police/crimes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCrimes(response.data || []);
    } catch (err) {
      console.error('Error fetching crimes:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const performSearch = () => {
    setSearching(true);
    
    setTimeout(() => {
      let results = crimes.filter(crime => {
        // Type filter
        if (filters.crimeType && filters.crimeType.trim() !== '') {
          if (!crime.type || !crime.type.toLowerCase().includes(filters.crimeType.toLowerCase())) {
            return false;
          }
        }

        // Severity filter
        if (filters.severity !== 'All') {
          if (!crime.severity || crime.severity !== filters.severity) {
            return false;
          }
        }

        // Status filter
        if (filters.status !== 'All') {
          if (!crime.caseStatus || crime.caseStatus !== filters.status) {
            return false;
          }
        }

        // Location filter
        if (filters.location && filters.location.trim() !== '') {
          if (!crime.location || !crime.location.toLowerCase().includes(filters.location.toLowerCase())) {
            return false;
          }
        }

        // Date range filter
        if (filters.dateFrom && filters.dateFrom.trim() !== '') {
          try {
            if (!crime.date || new Date(crime.date) < new Date(filters.dateFrom)) {
              return false;
            }
          } catch (err) {
            console.error('Error parsing from date:', err);
          }
        }

        if (filters.dateTo && filters.dateTo.trim() !== '') {
          try {
            if (!crime.date || new Date(crime.date) > new Date(filters.dateTo)) {
              return false;
            }
          } catch (err) {
            console.error('Error parsing to date:', err);
          }
        }

        // Geofencing filter (only if coordinates are provided)
        if (filters.lat && filters.lon && filters.lat.trim() !== '' && filters.lon.trim() !== '') {
          if (!crime.latitude || !crime.longitude) {
            return false; // Skip crimes without coordinates
          }
          
          try {
            const lat1 = parseFloat(filters.lat);
            const lon1 = parseFloat(filters.lon);
            const lat2 = parseFloat(crime.latitude);
            const lon2 = parseFloat(crime.longitude);
            
            if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
              return false;
            }
            
            const distance = calculateDistance(lat1, lon1, lat2, lon2);
            if (distance > filters.radiusKm) {
              return false;
            }
          } catch (err) {
            console.error('Error calculating distance:', err);
            return false;
          }
        }

        return true;
      });

      setSearchResults(results);
      setSearching(false);
    }, 500);
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'Critical': return 'text-red-400';
      case 'High': return 'text-orange-400';
      case 'Medium': return 'text-yellow-400';
      case 'Low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-blue-400">
        <div className="w-12 h-12 border-4 border-blue-400/20 border-t-blue-400 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-300">Loading search data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] pt-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            🔍 Advanced Search
          </h1>
          <p className="text-gray-300">Find crimes using advanced filters and geofencing</p>
        </div>

        {/* Search Panel */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-8 shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-blue-300 mb-6">Search Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Crime Type */}
            <div>
              <label className="text-gray-300 text-sm font-semibold mb-2 block">Crime Type</label>
              <input
                type="text"
                placeholder="e.g., Theft, Assault..."
                value={filters.crimeType}
                onChange={(e) => setFilters({...filters, crimeType: e.target.value})}
                className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Severity */}
            <div>
              <label className="text-gray-300 text-sm font-semibold mb-2 block">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({...filters, severity: e.target.value})}
                className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white focus:outline-none focus:border-blue-400"
              >
                <option>All</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-gray-300 text-sm font-semibold mb-2 block">Case Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white focus:outline-none focus:border-blue-400"
              >
                <option>All</option>
                <option>Open</option>
                <option>Under Investigation</option>
                <option>Solved</option>
                <option>Closed</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="text-gray-300 text-sm font-semibold mb-2 block">Location</label>
              <input
                type="text"
                placeholder="e.g., Mumbai, Delhi..."
                value={filters.location}
                onChange={(e) => setFilters({...filters, location: e.target.value})}
                className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="text-gray-300 text-sm font-semibold mb-2 block">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="text-gray-300 text-sm font-semibold mb-2 block">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* Geofencing */}
          <div className="bg-slate-700/50 border border-blue-500/20 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-cyan-300 mb-4">📍 Geofencing (Search by Location Radius)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="number"
                placeholder="Latitude"
                value={filters.lat}
                onChange={(e) => setFilters({...filters, lat: e.target.value})}
                step="0.0001"
                className="px-4 py-2 rounded-lg bg-slate-600 border border-blue-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
              />
              <input
                type="number"
                placeholder="Longitude"
                value={filters.lon}
                onChange={(e) => setFilters({...filters, lon: e.target.value})}
                step="0.0001"
                className="px-4 py-2 rounded-lg bg-slate-600 border border-blue-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
              />
              <input
                type="number"
                placeholder="Radius (km)"
                value={filters.radiusKm}
                onChange={(e) => setFilters({...filters, radiusKm: parseFloat(e.target.value)})}
                min="0.1"
                step="0.1"
                className="px-4 py-2 rounded-lg bg-slate-600 border border-blue-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={performSearch}
              disabled={searching}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FiSearch size={20} />
              {searching ? 'Searching...' : 'Search'}
            </button>
            
            <button
              onClick={() => {
                setFilters({
                  crimeType: '',
                  severity: 'All',
                  status: 'All',
                  location: '',
                  dateFrom: '',
                  dateTo: '',
                  radiusKm: 5,
                  lat: '',
                  lon: '',
                });
                setSearchResults([]);
              }}
              className="px-6 py-3 bg-gray-600/50 hover:bg-gray-600 text-white rounded-lg font-bold transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          <h2 className="text-2xl font-bold text-blue-300 mb-4">
            📊 Results ({searchResults.length} crimes found)
          </h2>

          {searchResults.length === 0 && !searching ? (
            <div className="text-center py-16 text-gray-400 bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl">
              <p className="text-2xl mb-2">🔍 No results found</p>
              <p className="text-sm">Try adjusting your search filters or click Search without filters to see all crimes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.map((crime) => (
                <div
                  key={crime._id}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-lg p-6 hover:border-blue-400/60 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-blue-300 flex items-center gap-2">
                        <FiAlertTriangle className={getSeverityColor(crime.severity)} />
                        {crime.type}
                      </h3>
                      <p className="text-gray-300 flex items-center gap-2 mt-2">
                        <FiMapPin size={16} /> {crime.location}
                      </p>
                      <p className="text-gray-400 flex items-center gap-2 mt-1 text-sm">
                        <FiClock size={16} /> {crime.date} at {crime.time}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {crime.caseStatus || 'Open'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-opacity-20 border border-opacity-30 ${
                        crime.severity === 'Critical' ? 'bg-red-500 text-red-300 border-red-500' :
                        crime.severity === 'High' ? 'bg-orange-500 text-orange-300 border-orange-500' :
                        crime.severity === 'Medium' ? 'bg-yellow-500 text-yellow-300 border-yellow-500' :
                        'bg-green-500 text-green-300 border-green-500'
                      }`}>
                        {crime.severity || 'Medium'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdvancedSearch;

