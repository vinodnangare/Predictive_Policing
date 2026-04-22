import React, { useState, useEffect } from 'react';
import { FiSliders, FiAlertCircle } from 'react-icons/fi';
import { apiGet } from '../utils/api';
import { normalizeCrimeList } from '../utils/crime';

function RiskScoreCalculator() {
  const [timeRange, setTimeRange] = useState('current');
  const [selectedArea, setSelectedArea] = useState('all');
  const [riskData, setRiskData] = useState([]);
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    const fetchCrimes = async () => {
      try {
        const crimes = normalizeCrimeList(await apiGet('/api/crimes?limit=2000'));
        
        // Get unique districts/areas
        const uniqueDistricts = [...new Set(crimes.map(c => c.district || c.subdistrict || 'Unknown').filter(Boolean))];
        setAreas([
          { id: 'all', name: 'All Areas', district: 'All' },
          ...uniqueDistricts.map((d, i) => ({ id: `area${i}`, name: d, district: d }))
        ]);
        
        calculateRiskScores(crimes);
        console.log('Risk scores calculated for', crimes.length, 'crimes');
      } catch (error) {
        console.error('Failed to fetch crimes:', error);
      }
    };
    
    fetchCrimes();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchCrimes, 30000);
    return () => clearInterval(interval);
  }, [timeRange, selectedArea]);

  const calculateRiskScores = (crimes) => {
    if (!crimes || crimes.length === 0) {
      setRiskData([]);
      return;
    }

    const timeFactors = {
      'current': 1.2,
      'today': 1.0,
      'week': 0.8,
      'month': 0.6
    };

    const districtCounts = {};
    crimes.forEach(crime => {
      const district = crime.district || crime.subdistrict || 'Unknown';
      if (!districtCounts[district]) {
        districtCounts[district] = {
          total: 0,
          highSeverity: 0,
          recentCount: 0,
          hourCounts: {}
        };
      }
      districtCounts[district].total++;
      
      if (['Murder', 'Robbery', 'Kidnapping', 'Assault'].includes(crime.type)) {
        districtCounts[district].highSeverity++;
      }
      
      const daysDiff = (new Date() - new Date(crime.date)) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 30) {
        districtCounts[district].recentCount++;
      }

      // Track hourly distribution
      const hour = new Date(crime.date).getHours();
      districtCounts[district].hourCounts[hour] = (districtCounts[district].hourCounts[hour] || 0) + 1;
    });

    const risks = Object.keys(districtCounts).map((district, i) => {
      const data = districtCounts[district];
      const riskScore = Math.min(100, (data.total * 0.5 + data.highSeverity * 2 + data.recentCount * 0.8) * timeFactors[timeRange]);
      
      // Find peak hours
      let peakHour = 'N/A';
      if (Object.keys(data.hourCounts).length > 0) {
        const maxHour = Object.entries(data.hourCounts).reduce((a, b) => a[1] > b[1] ? a : b);
        const hour = parseInt(maxHour[0]);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        peakHour = `${displayHour}:00 ${period}`;
      }

      return {
        id: i,
        area: district,
        riskScore: riskScore,
        trend: data.recentCount > data.total * 0.3 ? 'increasing' : 'decreasing',
        crimeCount: data.total,
        peakHours: peakHour,
        riskLevel: riskScore >= 70 ? 'High' : riskScore >= 50 ? 'Medium' : 'Low'
      };
    });

    const filteredRisks = selectedArea === 'all' ? risks : risks.filter(r => r.area === areas.find(a => a.id === selectedArea)?.name);
    setRiskData(filteredRisks);
  };

  const getRiskColor = (score) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getRiskBgColor = (score) => {
    if (score >= 70) return 'from-red-600/20 to-red-700/20 border-red-500/30';
    if (score >= 50) return 'from-yellow-600/20 to-yellow-700/20 border-yellow-500/30';
    return 'from-green-600/20 to-green-700/20 border-green-500/30';
  };

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="content-container p-6 sm:p-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6">
          Risk Score Calculator 📈
        </h1>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6">
            <label className="block text-gray-300 text-sm font-semibold mb-3">
              Select Area
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              {areas.map(area => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6">
            <label className="block text-gray-300 text-sm font-semibold mb-3">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="current">Current Hour</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Risk Scores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {riskData.map((risk) => (
            <div
              key={risk.id}
              className={`bg-gradient-to-br ${getRiskBgColor(risk.riskScore)} border rounded-xl p-6 shadow-lg hover:shadow-xl transition-all`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{risk.area}</h3>
                  <p className="text-sm text-gray-400">Risk Assessment</p>
                </div>
                <FiAlertCircle className={`text-2xl ${getRiskColor(risk.riskScore)}`} />
              </div>

              {/* Risk Score Gauge */}
              <div className="mb-4">
                <div className="flex items-end justify-between mb-2">
                  <span className={`text-3xl font-bold ${getRiskColor(risk.riskScore)}`}>
                    {risk.riskScore.toFixed(1)}
                  </span>
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    risk.riskScore >= 70 ? 'bg-red-600/40 text-red-300' :
                    risk.riskScore >= 50 ? 'bg-yellow-600/40 text-yellow-300' :
                    'bg-green-600/40 text-green-300'
                  }`}>
                    {risk.riskLevel}
                  </span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      risk.riskScore >= 70 ? 'bg-red-500' :
                      risk.riskScore >= 50 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${risk.riskScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm text-gray-300 bg-slate-700/30 rounded-lg p-4">
                <div className="flex justify-between">
                  <span>Crimes (24h):</span>
                  <span className="font-semibold text-blue-400">{risk.crimeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Peak Hours:</span>
                  <span className="font-semibold text-blue-400">{risk.peakHours}</span>
                </div>
                <div className="flex justify-between">
                  <span>Trend:</span>
                  <span className={`font-semibold ${risk.trend === 'increasing' ? 'text-red-400' : 'text-green-400'}`}>
                    {risk.trend === 'increasing' ? '↑ Increasing' : '↓ Decreasing'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Risk Summary */}
        <div className="mt-8 bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-blue-300 mb-4">📊 Overall Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <p className="text-gray-400 text-sm mb-2">Average Risk</p>
              <p className={`text-3xl font-bold ${getRiskColor(riskData.reduce((a, r) => a + r.riskScore, 0) / riskData.length)}`}>
                {(riskData.reduce((a, r) => a + r.riskScore, 0) / riskData.length).toFixed(1)}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <p className="text-gray-400 text-sm mb-2">High Risk Areas</p>
              <p className="text-3xl font-bold text-red-400">
                {riskData.filter(r => r.riskScore >= 70).length}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <p className="text-gray-400 text-sm mb-2">Total Crimes</p>
              <p className="text-3xl font-bold text-blue-400">
                {riskData.reduce((a, r) => a + r.crimeCount, 0)}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <p className="text-gray-400 text-sm mb-2">Areas Monitored</p>
              <p className="text-3xl font-bold text-cyan-400">
                {riskData.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskScoreCalculator;
