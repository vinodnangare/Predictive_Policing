import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FiRefreshCw, FiDownload } from 'react-icons/fi';
import { apiGet } from '../utils/api';
import { normalizeCrimeList } from '../utils/crime';

function CrimeAnalytics() {
  const [crimeData, setCrimeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Analyze data for different visualizations
  const [stateData, setStateData] = useState([]);
  const [typeData, setTypeData] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [districtData, setDistrictData] = useState([]);

  // Fetch crime data
  const fetchCrimes = async () => {
    try {
      setLoading(true);
      setRefreshing(true);

      const response = await apiGet('/api/crimes');
      setCrimeData(normalizeCrimeList(response));
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch crime data');
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCrimes();
  }, []);

  // Process data for visualizations
  useEffect(() => {
    if (crimeData.length === 0) return;

    // Helper function to normalize state names
    const normalizeState = (state) => {
      if (!state) return 'Unknown';
      return state.trim().charAt(0).toUpperCase() + state.trim().slice(1).toLowerCase();
    };

    // State-wise crime counts (normalized)
    const stateMap = {};
    crimeData.forEach(crime => {
      const state = normalizeState(crime.state);
      stateMap[state] = (stateMap[state] || 0) + 1;
    });
    setStateData(Object.entries(stateMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));

    // Crime type distribution
    const typeMap = {};
    crimeData.forEach(crime => {
      const type = crime.type || 'Other';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    setTypeData(Object.entries(typeMap).map(([name, value]) => ({ name, value })));

    // District-wise crime counts (normalized)
    const districtMap = {};
    crimeData.forEach(crime => {
      const district = crime.district ? crime.district.trim() : 'Unknown';
      districtMap[district] = (districtMap[district] || 0) + 1;
    });
    setDistrictData(
      Object.entries(districtMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    );

    // Time series (by date)
    const dateMap = {};
    crimeData.forEach(crime => {
      const date = crime.date || 'Unknown';
      dateMap[date] = (dateMap[date] || 0) + 1;
    });
    setTimeSeriesData(
      Object.entries(dateMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    );
  }, [crimeData]);

  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6', '#d946ef'];

  const downloadChart = (chartId) => {
    const svg = document.getElementById(chartId);
    if (svg) {
      const link = document.createElement('a');
      link.href = 'data:image/svg+xml;base64,' + btoa(svg.outerHTML);
      link.download = `${chartId}.svg`;
      link.click();
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] pt-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              📊 Crime Analytics & Insights
            </h1>
            <p className="text-gray-300">Real-time crime data visualization and statistical analysis</p>
          </div>
          <button
            onClick={fetchCrimes}
            disabled={refreshing}
            className="mt-4 sm:mt-0 flex items-center gap-2 bg-cyan-600/80 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
          >
            <FiRefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-blue-400">
            <div className="w-12 h-12 border-4 border-blue-400/20 border-t-blue-400 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-300 font-medium">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Total Crimes</p>
                <p className="text-3xl font-bold text-blue-400">{crimeData.length}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-700/20 border border-cyan-500/30 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Crime Types</p>
                <p className="text-3xl font-bold text-cyan-400">{typeData.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">States/Regions</p>
                <p className="text-3xl font-bold text-purple-400">{stateData.length}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Districts</p>
                <p className="text-3xl font-bold text-emerald-400">{districtData.length}</p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* State-wise Crime Distribution */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-blue-300">State-wise Crime Distribution</h2>
                  <button
                    onClick={() => downloadChart('stateChart')}
                    className="text-gray-400 hover:text-blue-400 transition"
                    title="Download chart"
                  >
                    <FiDownload size={18} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stateData} id="stateChart">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #3b82f6' }}
                      labelStyle={{ color: '#e0e7ff' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Crime Type Distribution */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-500/30 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-cyan-300">Crime Type Distribution</h2>
                  <button
                    onClick={() => downloadChart('typeChart')}
                    className="text-gray-400 hover:text-cyan-400 transition"
                    title="Download chart"
                  >
                    <FiDownload size={18} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart id="typeChart">
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4' }}
                      labelStyle={{ color: '#e0e7ff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top 10 Districts */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-purple-300">Top 10 Districts by Crime Count</h2>
                  <button
                    onClick={() => downloadChart('districtChart')}
                    className="text-gray-400 hover:text-purple-400 transition"
                    title="Download chart"
                  >
                    <FiDownload size={18} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={districtData} layout="vertical" id="districtChart">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9ca3af" />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #8b5cf6' }}
                      labelStyle={{ color: '#e0e7ff' }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Crime Trend Over Time */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-emerald-500/30 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-emerald-300">Crime Trend Over Time</h2>
                  <button
                    onClick={() => downloadChart('trendChart')}
                    className="text-gray-400 hover:text-emerald-400 transition"
                    title="Download chart"
                  >
                    <FiDownload size={18} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData} id="trendChart">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #10b981' }}
                      labelStyle={{ color: '#e0e7ff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#10b981" 
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-blue-300 mb-4">📈 Summary Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-gray-300 font-semibold mb-3">Crime Type Breakdown</h3>
                  <div className="space-y-2">
                    {typeData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-gray-400">{item.name}</span>
                        <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg text-sm font-semibold">
                          {item.value} crimes
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-gray-300 font-semibold mb-3">Most Affected States</h3>
                  <div className="space-y-2">
                    {stateData.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-gray-400">{item.name}</span>
                        <span className="bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-lg text-sm font-semibold">
                          {item.value} crimes
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CrimeAnalytics;

