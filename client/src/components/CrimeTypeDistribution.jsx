import React, { useState, useEffect } from 'react';
import { FiBarChart2, FiFilter } from 'react-icons/fi';
import { apiGet } from '../utils/api';
import { normalizeCrimeList } from '../utils/crime';

function CrimeTypeDistribution() {
  const [chartType, setChartType] = useState('pie');
  const [timeRange, setTimeRange] = useState('month');
  const [crimeData, setCrimeData] = useState({ week: {}, month: {}, year: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCrimeData = async () => {
      try {
        setLoading(true);
        const crimes = normalizeCrimeList(await apiGet('/api/crimes?limit=2000'));
        
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        
        const countByType = (filteredCrimes) => {
          const counts = {};
          filteredCrimes.forEach(crime => {
            const type = crime.type || 'Other';
            counts[type] = (counts[type] || 0) + 1;
          });
          return counts;
        };
        
        setCrimeData({
          week: countByType(crimes.filter(c => new Date(c.date) >= weekAgo)),
          month: countByType(crimes.filter(c => new Date(c.date) >= monthAgo)),
          year: countByType(crimes.filter(c => new Date(c.date) >= yearAgo))
        });
        
        console.log('Crime type distribution loaded:', crimes.length, 'crimes');
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch crime data:', error);
        setLoading(false);
      }
    };
    
    fetchCrimeData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCrimeData, 30000);
    return () => clearInterval(interval);
  }, []);

  const data = crimeData[timeRange] || {};
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  
  // Dynamic color assignment based on crime types
  const generateColors = () => {
    const baseColors = [
      { bg: 'from-red-600/20 to-red-700/20', border: 'border-red-500/30', text: 'text-red-400', bar: 'bg-red-500' },
      { bg: 'from-yellow-600/20 to-yellow-700/20', border: 'border-yellow-500/30', text: 'text-yellow-400', bar: 'bg-yellow-500' },
      { bg: 'from-orange-600/20 to-orange-700/20', border: 'border-orange-500/30', text: 'text-orange-400', bar: 'bg-orange-500' },
      { bg: 'from-purple-600/20 to-purple-700/20', border: 'border-purple-500/30', text: 'text-purple-400', bar: 'bg-purple-500' },
      { bg: 'from-blue-600/20 to-blue-700/20', border: 'border-blue-500/30', text: 'text-blue-400', bar: 'bg-blue-500' },
      { bg: 'from-green-600/20 to-green-700/20', border: 'border-green-500/30', text: 'text-green-400', bar: 'bg-green-500' },
      { bg: 'from-pink-600/20 to-pink-700/20', border: 'border-pink-500/30', text: 'text-pink-400', bar: 'bg-pink-500' },
      { bg: 'from-indigo-600/20 to-indigo-700/20', border: 'border-indigo-500/30', text: 'text-indigo-400', bar: 'bg-indigo-500' }
    ];
    
    const crimeColors = {};
    Object.keys(data).forEach((type, idx) => {
      crimeColors[type] = baseColors[idx % baseColors.length];
    });
    return crimeColors;
  };
  
  const crimeColors = generateColors();

  const maxValue = Math.max(...Object.values(data), 1);

  if (loading) {
    return (
      <div className="min-h-screen pt-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading crime distribution data...</div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="min-h-screen pt-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white space-y-3 bg-slate-800/70 border border-blue-500/30 rounded-xl px-6 py-8 max-w-md">
          <p className="text-2xl font-bold">No crime data available</p>
          <p className="text-gray-300">Add crimes or adjust the selected time range to see distribution charts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="content-container p-6 sm:p-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6">
          Crime Type Distribution 📊
        </h1>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6">
            <label className="block text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
              <FiBarChart2 /> Chart Type
            </label>
            <div className="flex gap-2">
              {['pie', 'bar', 'horizontal'].map(type => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all font-semibold capitalize ${
                    chartType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6">
            <label className="block text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
              <FiFilter /> Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Display */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-8 shadow-lg">
            {chartType === 'pie' && (
              <div className="flex justify-center items-center h-96">
                <svg viewBox="0 0 200 200" className="w-full h-full max-w-sm">
                  {(() => {
                    let currentAngle = 0;
                    const elements = [];

                    Object.entries(data).forEach(([crime, count], idx) => {
                      const sliceAngle = (count / total) * 360;
                      const startAngle = currentAngle;
                      const endAngle = currentAngle + sliceAngle;

                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;

                      const x1 = 100 + 80 * Math.cos(startRad);
                      const y1 = 100 + 80 * Math.sin(startRad);
                      const x2 = 100 + 80 * Math.cos(endRad);
                      const y2 = 100 + 80 * Math.sin(endRad);

                      const largeArc = sliceAngle > 180 ? 1 : 0;
                      const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;

                      const colors = ['#ef4444', '#eab308', '#f97316', '#a855f7', '#3b82f6'];
                      elements.push(
                        <path
                          key={crime}
                          d={pathData}
                          fill={colors[idx]}
                          stroke="rgb(30, 41, 59)"
                          strokeWidth="2"
                          opacity="0.9"
                          className="hover:opacity-100 transition-opacity cursor-pointer"
                        />
                      );

                      const labelAngle = startAngle + sliceAngle / 2;
                      const labelRad = (labelAngle * Math.PI) / 180;
                      const labelX = 100 + 50 * Math.cos(labelRad);
                      const labelY = 100 + 50 * Math.sin(labelRad);

                      if (sliceAngle > 20) {
                        elements.push(
                          <text
                            key={`label-${crime}`}
                            x={labelX}
                            y={labelY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="12"
                            fontWeight="bold"
                            fill="white"
                            pointerEvents="none"
                          >
                            {((count / total) * 100).toFixed(0)}%
                          </text>
                        );
                      }

                      currentAngle = endAngle;
                    });

                    return elements;
                  })()}
                </svg>
              </div>
            )}

            {chartType === 'bar' && (
              <div className="h-96 flex items-end justify-between gap-3 px-2">
                {Object.entries(data).map(([crime, count]) => {
                  const heightPercent = (count / maxValue) * 100;
                  const colors = crimeColors[crime];
                  return (
                    <div key={crime} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center">
                        <div
                          className={`w-full ${colors.bar} rounded-t transition-all hover:opacity-80 cursor-pointer group relative`}
                          style={{ height: `${heightPercent}%`, minHeight: '20px' }}
                        >
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-slate-700 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                            {count}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-300 text-center">{crime}</span>
                      <span className="text-xs text-gray-400">{((count / total) * 100).toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            )}

            {chartType === 'horizontal' && (
              <div className="space-y-4">
                {Object.entries(data).map(([crime, count]) => {
                  const widthPercent = (count / maxValue) * 100;
                  const colors = crimeColors[crime];
                  return (
                    <div key={crime} className="flex items-center gap-4">
                      <div className="w-20 text-sm font-semibold text-gray-300">{crime}</div>
                      <div className="flex-1 bg-slate-700/50 rounded-full h-8 overflow-hidden">
                        <div
                          className={`h-full ${colors.bar} rounded-full flex items-center justify-end pr-3 transition-all`}
                          style={{ width: `${widthPercent}%` }}
                        >
                          {widthPercent > 20 && (
                            <span className="text-xs font-bold text-white">{count}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-16 text-right">
                        <span className={`text-sm font-semibold ${colors.text}`}>{((count / total) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats & Legend */}
          <div className="space-y-4">
            {/* Total */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6">
              <p className="text-gray-400 text-sm mb-2">Total Crimes</p>
              <p className="text-4xl font-bold text-blue-300">{total}</p>
              <p className="text-xs text-gray-400 mt-2">Recorded in {timeRange}</p>
            </div>

            {/* Legend */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-lg font-bold text-blue-300 mb-4">Legend</h3>
              <div className="space-y-3">
                {Object.entries(data).map(([crime, count]) => {
                  const colors = crimeColors[crime];
                  const percent = ((count / total) * 100).toFixed(1);
                  return (
                    <div key={crime} className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-lg p-3`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">{crime}</span>
                        <span className={`text-sm font-bold ${colors.text}`}>{percent}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-300">
                        <span>Count: {count}</span>
                        <span>Rate: {(count / (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365)).toFixed(1)}/day</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Crime */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6">
              <p className="text-gray-400 text-xs mb-2 font-semibold">MOST COMMON</p>
              {(() => {
                const entries = Object.entries(data);
                if (entries.length === 0) {
                  return <p className="text-gray-400">No data for this range.</p>;
                }
                const topCrime = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
                const colors = crimeColors[topCrime[0]];
                return (
                  <div>
                    <p className={`text-2xl font-bold ${colors.text} mb-2`}>{topCrime[0]}</p>
                    <p className="text-3xl font-bold text-white">{topCrime[1]}</p>
                    <p className="text-xs text-gray-400 mt-2">{((topCrime[1] / total) * 100).toFixed(1)}% of total</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Trend Analysis */}
        <div className="mt-8 bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-blue-300 mb-4">📊 Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <p className="text-gray-400 text-sm mb-2 font-semibold">Key Finding #1</p>
              <p className="text-white">Theft dominates with 102 incidents (29.4%), indicating high retail and vehicle theft activity.</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <p className="text-gray-400 text-sm mb-2 font-semibold">Key Finding #2</p>
              <p className="text-white">Robbery and Assault combined represent 32.3%, suggesting violent crime trends need attention.</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <p className="text-gray-400 text-sm mb-2 font-semibold">Recommendation</p>
              <p className="text-white">Increase retail patrols and implement vehicle security awareness programs.</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <p className="text-gray-400 text-sm mb-2 font-semibold">Next Steps</p>
              <p className="text-white">Target crime hotspots with task forces to address concentrations of violent crimes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrimeTypeDistribution;
