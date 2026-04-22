import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiAlertCircle, FiFilter } from 'react-icons/fi';
import { apiGet } from '../utils/api';
import { normalizeCrimeList } from '../utils/crime';

function PatternRecognition() {
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndAnalyzePatterns = async () => {
      try {
        setLoading(true);
        const crimes = normalizeCrimeList(await apiGet('/api/crimes?limit=2000'));
        
        console.log('Analyzing patterns from', crimes.length, 'crimes');
        const analyzedPatterns = analyzePatterns(crimes);
        setPatterns(analyzedPatterns);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch crimes:', error);
        setLoading(false);
      }
    };
    
    fetchAndAnalyzePatterns();
    
    // Refresh data every 60 seconds
    const interval = setInterval(fetchAndAnalyzePatterns, 60000);
    return () => clearInterval(interval);
  }, []);

  const analyzePatterns = (crimes) => {
    if (!crimes || crimes.length === 0) return [];

    // Group crimes by type and analyze patterns
    const crimesByType = {};
    crimes.forEach(crime => {
      const type = crime.type || 'Unknown';
      if (!crimesByType[type]) {
        crimesByType[type] = [];
      }
      crimesByType[type].push(crime);
    });

    const detectedPatterns = [];
    let patternId = 1;

    Object.entries(crimesByType).forEach(([type, typeCrimes]) => {
      if (typeCrimes.length < 3) return; // Need at least 3 crimes to detect a pattern

      // Analyze time patterns
      const hourCounts = {};
      const locationCounts = {};
      const recentCrimes = [];

      typeCrimes.forEach(crime => {
        const hour = new Date(crime.date).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;

        const location = crime.district || crime.subdistrict || crime.location || 'Unknown';
        locationCounts[location] = (locationCounts[location] || 0) + 1;

        const daysDiff = (new Date() - new Date(crime.date)) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 30) {
          recentCrimes.push(crime);
        }
      });

      // Find peak hours
      const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
      const peakHours = sortedHours.slice(0, 2).map(([h]) => parseInt(h));
      
      let timeRange = 'Various times';
      if (peakHours.length > 0) {
        const start = Math.min(...peakHours);
        const end = Math.max(...peakHours) + 1;
        const formatHour = (h) => {
          const period = h >= 12 ? 'PM' : 'AM';
          const displayHour = h % 12 || 12;
          return `${displayHour} ${period}`;
        };
        timeRange = `${formatHour(start)} - ${formatHour(end)}`;
      }

      // Get common locations
      const topLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([loc]) => loc);

      // Calculate confidence based on consistency
      const maxHourCount = Math.max(...Object.values(hourCounts));
      const confidence = Math.min(95, Math.round((maxHourCount / typeCrimes.length) * 100 + 40));

      // Determine trend
      const recentCount = recentCrimes.length;
      const totalCount = typeCrimes.length;
      let trend = 'stable';
      if (recentCount > totalCount * 0.5) {
        trend = 'increasing';
      } else if (recentCount < totalCount * 0.3) {
        trend = 'decreasing';
      }

      // Get last occurrence
      const sortedByDate = typeCrimes.sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastOccurrence = sortedByDate[0]?.date ? new Date(sortedByDate[0].date).toISOString().split('T')[0] : 'Unknown';

      // Determine frequency
      let frequency = 'Low';
      if (typeCrimes.length > 15) frequency = 'High';
      else if (typeCrimes.length > 8) frequency = 'Medium';

      // Create pattern description
      const modusOperandi = generateModus(type, topLocations, timeRange);

      detectedPatterns.push({
        id: patternId++,
        name: `${type} Pattern`,
        type: type,
        frequency: frequency,
        timeRange: timeRange,
        locations: topLocations,
        occurrences: typeCrimes.length,
        confidence: confidence,
        lastOccurrence: lastOccurrence,
        modus: modusOperandi,
        suspects: ['Investigation ongoing'],
        trend: trend
      });
    });

    return detectedPatterns.sort((a, b) => b.occurrences - a.occurrences);
  };

  const generateModus = (type, locations, timeRange) => {
    const locationStr = locations.length > 0 ? locations.join(', ') : 'various areas';
    return `Multiple ${type.toLowerCase()} incidents in ${locationStr}, primarily during ${timeRange}. Pattern suggests organized activity.`;
  };

  const filteredPatterns = filterType === 'all' 
    ? patterns 
    : patterns.filter(p => p.type === filterType);

  const getConfidenceColor = (confidence) => {
    if (confidence >= 85) return 'text-green-400';
    if (confidence >= 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTrendColor = (trend) => {
    return trend === 'increasing' ? 'text-red-400' : (trend === 'decreasing' ? 'text-green-400' : 'text-yellow-400');
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Analyzing crime patterns...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="content-container p-6 sm:p-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6">
          Pattern Recognition 🔬
        </h1>

        {/* Filter */}
        <div className="mb-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6">
          <label className="flex items-center gap-2 text-gray-300 text-sm font-semibold mb-3">
            <FiFilter /> Filter by Crime Type
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'
              }`}
            >
              All Patterns
            </button>
            {[...new Set(patterns.map(p => p.type))].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Patterns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPatterns.map((pattern) => (
            <div
              key={pattern.id}
              onClick={() => setSelectedPattern(pattern.id === selectedPattern?.id ? null : pattern)}
              className={`bg-gradient-to-br from-slate-800 to-slate-900 border rounded-xl p-6 shadow-lg cursor-pointer transition-all duration-300 ${
                selectedPattern?.id === pattern.id
                  ? 'border-blue-400 ring-2 ring-blue-400/50'
                  : 'border-slate-600/30 hover:border-blue-500/50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{pattern.name}</h3>
                  <p className="text-sm text-gray-400">{pattern.type} • {pattern.frequency} Frequency</p>
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full bg-slate-700/50 ${getConfidenceColor(pattern.confidence)}`}>
                  <FiTrendingUp className="text-lg" />
                  {pattern.confidence}%
                </div>
              </div>

              {/* Pattern Info */}
              <div className="space-y-2 mb-4 text-sm text-gray-300 bg-slate-700/30 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Time Range:</span>
                  <span className="text-white font-semibold">{pattern.timeRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Occurrences:</span>
                  <span className="text-white font-semibold">{pattern.occurrences}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Trend:</span>
                  <span className={`font-semibold ${getTrendColor(pattern.trend)}`}>
                    {pattern.trend === 'increasing' ? '↑ Increasing' : (pattern.trend === 'decreasing' ? '↓ Decreasing' : '→ Stable')}
                  </span>
                </div>
              </div>

              {/* Expandable Content */}
              {selectedPattern?.id === pattern.id && (
                <div className="mt-4 pt-4 border-t border-slate-600/30 space-y-3 animate-in fade-in duration-200">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Modus Operandi:</p>
                    <p className="text-sm text-gray-300">{pattern.modus}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Locations:</p>
                    <div className="flex flex-wrap gap-2">
                      {pattern.locations.map((loc, idx) => (
                        <span key={idx} className="text-xs bg-blue-600/40 text-blue-300 px-2 py-1 rounded">
                          {loc}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Associated Suspects:</p>
                    <div className="flex flex-wrap gap-2">
                      {pattern.suspects.map((suspect, idx) => (
                        <span key={idx} className="text-xs bg-red-600/40 text-red-300 px-2 py-1 rounded">
                          {suspect}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-600/30">
                    <p className="text-xs text-gray-400">Last Occurrence:</p>
                    <p className="text-sm text-cyan-400 font-semibold">{pattern.lastOccurrence}</p>
                  </div>
                  <button className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition text-sm font-semibold">
                    View Details & Recommendations
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Statistics */}
        <div className="mt-8 bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-blue-300 mb-4">📊 Pattern Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <p className="text-gray-400 text-sm mb-2">Total Patterns</p>
              <p className="text-3xl font-bold text-blue-400">{filteredPatterns.length}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <p className="text-gray-400 text-sm mb-2">High Confidence</p>
              <p className="text-3xl font-bold text-green-400">
                {filteredPatterns.filter(p => p.confidence >= 85).length}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <p className="text-gray-400 text-sm mb-2">Increasing Trends</p>
              <p className="text-3xl font-bold text-red-400">
                {filteredPatterns.filter(p => p.trend === 'increasing').length}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <p className="text-gray-400 text-sm mb-2">Total Occurrences</p>
              <p className="text-3xl font-bold text-cyan-400">
                {filteredPatterns.reduce((sum, p) => sum + p.occurrences, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatternRecognition;
