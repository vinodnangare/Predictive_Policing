import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiTrendingUp, FiUser, FiCheckCircle, FiClock } from 'react-icons/fi';
import { API_BASE } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

function OfficerPerformance() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [crimes, setCrimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [officerStats, setOfficerStats] = useState({});
  const [performanceMetrics, setPerformanceMetrics] = useState([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCrimes();
  }, []);

  const fetchCrimes = async () => {
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

  // Calculate performance metrics
  useEffect(() => {
    if (crimes.length === 0) return;

    const stats = {};
    const typeStats = {};
    const statusDistribution = {};
    let totalCases = 0;
    let solvedCases = 0;

    crimes.forEach(crime => {
      // Officer stats
      const officer = crime.assignedOfficer || 'Unassigned';
      if (!stats[officer]) {
        stats[officer] = {
          name: officer,
          assignedCases: 0,
          solvedCases: 0,
          investigatingCases: 0,
          openCases: 0,
          averageResolutionDays: 0,
          crimeTypes: {}
        };
      }

      stats[officer].assignedCases += 1;
      
      if (crime.caseStatus === 'Solved') {
        stats[officer].solvedCases += 1;
        solvedCases += 1;
      } else if (crime.caseStatus === 'Under Investigation') {
        stats[officer].investigatingCases += 1;
      } else if (crime.caseStatus === 'Open') {
        stats[officer].openCases += 1;
      }

      // Crime type tracking
      stats[officer].crimeTypes[crime.type] = (stats[officer].crimeTypes[crime.type] || 0) + 1;

      // Status distribution
      statusDistribution[crime.caseStatus || 'Open'] = (statusDistribution[crime.caseStatus || 'Open'] || 0) + 1;
      totalCases += 1;
    });

    // Convert to array and calculate clearance rates
    const statsArray = Object.values(stats)
      .map(officer => ({
        ...officer,
        clearanceRate: officer.assignedCases > 0 ? ((officer.solvedCases / officer.assignedCases) * 100).toFixed(1) : 0,
        investigationRate: officer.assignedCases > 0 ? ((officer.investigatingCases / officer.assignedCases) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.solvedCases - a.solvedCases);

    setOfficerStats(stats);
    setPerformanceMetrics([
      {
        name: 'Total Cases',
        value: totalCases,
        color: '#3b82f6'
      },
      {
        name: 'Solved',
        value: solvedCases,
        color: '#10b981',
        percentage: totalCases > 0 ? ((solvedCases / totalCases) * 100).toFixed(1) : 0
      },
      {
        name: 'In Progress',
        value: crimes.filter(c => c.caseStatus === 'Under Investigation').length,
        color: '#f59e0b'
      },
      {
        name: 'Open',
        value: crimes.filter(c => c.caseStatus === 'Open').length,
        color: '#ef4444'
      }
    ]);
  }, [crimes]);

  const statusChartData = useMemo(() => {
    const statusMap = {};
    crimes.forEach(crime => {
      const status = crime.caseStatus || 'Open';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [crimes]);

  const severityChartData = useMemo(() => {
    const severityMap = {};
    crimes.forEach(crime => {
      const severity = crime.severity || 'Medium';
      severityMap[severity] = (severityMap[severity] || 0) + 1;
    });
    return Object.entries(severityMap).map(([name, value]) => ({ name, value }));
  }, [crimes]);

  const topOfficersData = useMemo(() => {
    return Object.values(officerStats)
      .sort((a, b) => b.solvedCases - a.solvedCases)
      .slice(0, 5)
      .map(officer => ({
        name: officer.name || 'Unassigned',
        cases: officer.assignedCases,
        solved: officer.solvedCases
      }));
  }, [officerStats]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-blue-400">
        <div className="w-12 h-12 border-4 border-blue-400/20 border-t-blue-400 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-300">Loading performance metrics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] pt-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            👮 Officer Performance & Metrics
          </h1>
          <p className="text-gray-300">Track officer productivity and case resolution rates</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {performanceMetrics.map((metric, idx) => (
            <div key={idx} className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-2">{metric.name}</p>
              <p className="text-3xl font-bold text-blue-400">{metric.value}</p>
              {metric.percentage !== undefined && (
                <p className="text-xs text-green-400 mt-2">✓ {metric.percentage}% clearance</p>
              )}
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Case Status Distribution */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-blue-300 mb-4">Case Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #3b82f6' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Crime Severity Distribution */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-blue-300 mb-4">Crime Severity Levels</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={severityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #3b82f6' }} />
                <Bar dataKey="value" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Officers */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-blue-300 mb-4">🏆 Top Officers by Cases Solved</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topOfficersData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #3b82f6' }} />
                <Bar dataKey="solved" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Officer Case Load */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-blue-300 mb-4">Officer Case Load</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topOfficersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #3b82f6' }} />
                <Bar dataKey="cases" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Officer Stats */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-blue-300 mb-6">📊 Detailed Officer Performance</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-gradient-to-r from-blue-600/80 to-blue-700/80 text-blue-100 border-b border-blue-500/30">
                <tr>
                  <th className="p-4 text-left font-semibold">Officer</th>
                  <th className="p-4 text-center font-semibold">Assigned Cases</th>
                  <th className="p-4 text-center font-semibold">Solved</th>
                  <th className="p-4 text-center font-semibold">Investigating</th>
                  <th className="p-4 text-center font-semibold">Open</th>
                  <th className="p-4 text-center font-semibold">Clearance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {Object.values(officerStats)
                  .sort((a, b) => b.solvedCases - a.solvedCases)
                  .map((officer, idx) => (
                    <tr key={idx} className="bg-slate-900/30 hover:bg-slate-800/50 transition-all">
                      <td className="p-4 font-semibold text-blue-300">{officer.name || 'Unassigned'}</td>
                      <td className="p-4 text-center text-gray-300">{officer.assignedCases}</td>
                      <td className="p-4 text-center text-green-400 font-semibold">{officer.solvedCases}</td>
                      <td className="p-4 text-center text-yellow-400">{officer.investigatingCases}</td>
                      <td className="p-4 text-center text-red-400">{officer.openCases}</td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                          {officer.clearanceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OfficerPerformance;

