import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiBell, FiClock, FiMapPin } from 'react-icons/fi';
import { apiGet, buildApiUrl } from '../utils/api';
import { normalizeCrimeList, hasCoordinates } from '../utils/crime';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

function LiveCrimeFeed() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [crimes, setCrimes] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [streamMode, setStreamMode] = useState('connecting');

  const mapToRecentCrimes = (rows) =>
    normalizeCrimeList(rows)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50)
      .map((crime) => ({
        id: crime._id || crime.id,
        type: crime.type || t({ en: 'Unknown', mr: 'अज्ञात' }),
        location: crime.location,
        latitude: crime.latitude,
        longitude: crime.longitude,
        description: crime.description || t({ en: 'Crime incident reported', mr: 'गुन्हा घटना नोंदवली' }),
        timestamp: crime.timestamp,
        district: crime.district,
        state: crime.state || t({ en: 'Maharashtra', mr: 'महाराष्ट्र' }),
      }));

  const fetchRecentCrimes = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/api/crimes?limit=50');

      setCrimes(mapToRecentCrimes(data));
      setLastFetch(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch crimes:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let closed = false;
    let eventSource = null;
    let fallbackInterval = null;

    const applyStreamRows = (rows) => {
      if (closed) return;
      setCrimes(mapToRecentCrimes(rows));
      setLastFetch(new Date());
      setLoading(false);
    };

    const startPollingFallback = () => {
      if (fallbackInterval || closed) return;
      setStreamMode('polling');

      const poll = async () => {
        try {
          const data = await apiGet('/api/crimes?limit=50');
          applyStreamRows(data);
        } catch (error) {
          console.error('Polling fallback failed:', error);
          if (!closed) setLoading(false);
        }
      };

      poll();
      fallbackInterval = setInterval(poll, 10000);
    };

    const startStream = () => {
      if (typeof EventSource === 'undefined') {
        startPollingFallback();
        return;
      }

      try {
        setStreamMode('connecting');
        eventSource = new EventSource(buildApiUrl('/api/stream/crimes'), { withCredentials: true });
      } catch (error) {
        console.error('Unable to create EventSource:', error);
        startPollingFallback();
        return;
      }

      eventSource.addEventListener('crimes', (event) => {
        if (closed) return;
        try {
          const payload = JSON.parse(event.data);
          applyStreamRows(Array.isArray(payload?.crimes) ? payload.crimes : []);
          setStreamMode('sse');
        } catch (error) {
          console.error('Failed to parse stream payload:', error);
        }
      });

      const switchToFallback = () => {
        if (closed) return;
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        startPollingFallback();
      };

      eventSource.addEventListener('error', switchToFallback);
      eventSource.onerror = switchToFallback;
    };

    if (!autoRefresh) {
      setStreamMode('paused');
      fetchRecentCrimes();
      return () => {
        closed = true;
      };
    }

    setLoading(true);
    startStream();

    return () => {
      closed = true;
      if (eventSource) {
        eventSource.close();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [autoRefresh]);

  const getSeverityByCrimeType = (type) => {
    // Determine severity based on crime type
    const highSeverity = ['Murder', 'Kidnapping', 'Robbery', 'Arson'];
    const mediumSeverity = ['Assault', 'Burglary', 'Drug Offense'];
    
    if (highSeverity.includes(type)) return 'Critical';
    if (mediumSeverity.includes(type)) return 'High';
    return 'Medium';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'text-red-400 bg-red-600/20 border-red-500/30';
      case 'High': return 'text-orange-400 bg-orange-600/20 border-orange-500/30';
      case 'Medium': return 'text-yellow-400 bg-yellow-600/20 border-yellow-500/30';
      default: return 'text-green-400 bg-green-600/20 border-green-500/30';
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'Critical':
        return t({ en: 'Critical', mr: 'गंभीर' });
      case 'High':
        return t({ en: 'High', mr: 'उच्च' });
      case 'Medium':
        return t({ en: 'Medium', mr: 'मध्यम' });
      default:
        return t({ en: 'Low', mr: 'कमी' });
    }
  };

  const getCrimeTypeColor = (type) => {
    switch (type) {
      case 'Robbery': return 'text-red-400';
      case 'Theft': return 'text-yellow-400';
      case 'Assault': return 'text-orange-400';
      case 'Vandalism': return 'text-purple-400';
      default: return 'text-blue-400';
    }
  };

  const getTimeAgo = (date) => {
    if (!date || Number.isNaN(new Date(date).getTime())) return t({ en: 'Unknown', mr: 'अज्ञात' });
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return t({ en: `${seconds}s ago`, mr: `${seconds}से. पूर्वी` });
    if (seconds < 3600) return t({ en: `${Math.floor(seconds / 60)}m ago`, mr: `${Math.floor(seconds / 60)}मि. पूर्वी` });
    if (seconds < 86400) return t({ en: `${Math.floor(seconds / 3600)}h ago`, mr: `${Math.floor(seconds / 3600)}ता. पूर्वी` });
    return t({ en: `${Math.floor(seconds / 86400)}d ago`, mr: `${Math.floor(seconds / 86400)}दि. पूर्वी` });
  };

  const handleManualRefresh = () => {
    fetchRecentCrimes();
  };

  // Calculate real-time stats
  const criticalHighCount = crimes.filter(c => {
    const severity = getSeverityByCrimeType(c.type);
    return severity === 'Critical' || severity === 'High';
  }).length;

  // Get crimes from last 24 hours
  const last24Hours = crimes.filter(c => {
    if (!c.timestamp) return false;
    const hoursDiff = (new Date() - c.timestamp) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  }).length;

  const withCoordinatesCount = crimes.filter((c) => hasCoordinates(c)).length;
  const modeLabel = !autoRefresh
    ? t({ en: 'Paused', mr: 'थांबवले' })
    : streamMode === 'sse'
    ? t({ en: 'Live SSE', mr: 'लाईव्ह SSE' })
    : streamMode === 'polling'
    ? t({ en: 'Fallback Polling', mr: 'पर्यायी पोलिंग' })
    : t({ en: 'Connecting', mr: 'जुळत आहे' });

  return (
    <div className={`min-h-[calc(100vh-73px)] pt-4 ${isDark ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100'}`}>
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t({ en: 'Recent Crime Feed 📡', mr: 'अलीकडील गुन्हे फीड 📡' })}
            </h1>
            {lastFetch && (
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                {t({ en: 'Last updated:', mr: 'शेवटचा अपडेट:' })} {lastFetch.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              {t({ en: 'Refresh', mr: 'रिफ्रेश' })}
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                autoRefresh
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              <FiRefreshCw className={autoRefresh ? 'animate-spin' : ''} />
              {autoRefresh ? t({ en: 'Live', mr: 'लाईव्ह' }) : t({ en: 'Paused', mr: 'थांबले' })}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
          {/* Stats */}
          <div className="bg-gradient-to-br from-red-600/20 to-red-700/20 border border-red-500/30 rounded-xl p-6">
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Critical/High', mr: 'गंभीर/उच्च' })}</p>
            <p className="text-3xl font-bold text-red-300">{criticalHighCount}</p>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Serious incidents', mr: 'गंभीर घटना' })}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-xl p-6">
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Total Records', mr: 'एकूण नोंदी' })}</p>
            <p className="text-3xl font-bold text-blue-300">{crimes.length}</p>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Recent reports', mr: 'अलीकडील अहवाल' })}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 border border-emerald-500/30 rounded-xl p-6">
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Last 24 Hours', mr: 'मागील 24 तास' })}</p>
            <p className="text-3xl font-bold text-emerald-300">{last24Hours}</p>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'New incidents', mr: 'नवीन घटना' })}</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-700/20 border border-cyan-500/30 rounded-xl p-6">
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'With Coordinates', mr: 'समन्वयासह' })}</p>
            <p className="text-xl font-bold text-cyan-300">{withCoordinatesCount}/{crimes.length}</p>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Map-ready records', mr: 'नकाशासाठी तयार नोंदी' })}</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-700/20 border border-cyan-500/30 rounded-xl p-6">
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Feed Status', mr: 'फीड स्थिती' })}</p>
            <p className="text-xl font-bold text-cyan-300 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                !autoRefresh ? 'bg-gray-400' : streamMode === 'sse' ? 'bg-emerald-400 animate-pulse' : streamMode === 'polling' ? 'bg-amber-400 animate-pulse' : 'bg-blue-400 animate-pulse'
              }`}></span>
              {modeLabel}
            </p>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Push stream with auto fallback', mr: 'ऑटो फॉलबॅकसह लाईव्ह प्रवाह' })}</p>
          </div>
        </div>

        {/* Recent Feed */}
        <div className={`border border-blue-500/30 rounded-xl shadow-lg overflow-hidden ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-white to-slate-100'}`}>
          <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-b border-blue-500/30 p-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-blue-300 flex items-center gap-2">
              <FiBell className="animate-pulse" /> {t({ en: 'Recent Incidents', mr: 'अलीकडील घटना' })}
            </h3>
            <span className={`text-xs font-semibold flex items-center gap-1 ${streamMode === 'polling' ? 'text-amber-300' : 'text-emerald-400'}`}>
              <span className={`w-2 h-2 rounded-full ${streamMode === 'polling' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`}></span>
              {streamMode === 'polling' ? t({ en: 'Fallback Feed Active', mr: 'पर्यायी फीड सक्रिय' }) : t({ en: 'Recent Feed Active', mr: 'अलीकडील फीड सक्रिय' })}
            </span>
          </div>

          <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
            {loading && crimes.length === 0 ? (
              <div className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                <FiRefreshCw className="animate-spin mx-auto mb-2 text-2xl" />
                {t({ en: 'Loading live feed...', mr: 'लाईव्ह फीड लोड होत आहे...' })}
              </div>
            ) : crimes.length > 0 ? (
              crimes.map((crime) => {
                const severity = getSeverityByCrimeType(crime.type);
                return (
                  <div
                    key={crime.id}
                    className="p-4 hover:bg-slate-700/30 transition-colors border-l-4 border-slate-600/30"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Severity Indicator */}
                        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                          severity === 'Critical' ? 'bg-red-500 animate-pulse' :
                          severity === 'High' ? 'bg-orange-500 animate-pulse' :
                          severity === 'Medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}></div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-bold text-sm ${getCrimeTypeColor(crime.type)}`}>
                              {crime.type.toUpperCase()}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded border ${getSeverityColor(severity)}`}>
                              {getSeverityLabel(severity)}
                            </span>
                          </div>
                          <p className={`text-sm mb-1 flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                            <FiMapPin className="w-3 h-3" />
                            {crime.location}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{crime.description}</p>
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                            {t({ en: 'Coords:', mr: 'निर्देशांक:' })} {hasCoordinates(crime) ? `${crime.latitude.toFixed(4)}, ${crime.longitude.toFixed(4)}` : t({ en: 'Not available', mr: 'उपलब्ध नाही' })}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-3">
                        <p className={`text-xs flex items-center gap-1 justify-end mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                          <FiClock className="w-3 h-3" />
                          {getTimeAgo(crime.timestamp)}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{crime.timestamp ? crime.timestamp.toLocaleDateString() : t({ en: 'Unknown date', mr: 'अज्ञात दिनांक' })}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                {t({ en: 'No crime records found in the database.', mr: 'डेटाबेसमध्ये कोणतीही गुन्हा नोंद आढळली नाही.' })}
              </div>
            )}
          </div>

          {/* Feed Footer */}
          <div className={`border-t p-4 text-center text-xs ${isDark ? 'bg-slate-700/30 border-slate-600/30 text-gray-400' : 'bg-slate-100 border-slate-300 text-slate-600'}`}>
            <p>
              {t({ en: 'Source:', mr: 'स्रोत:' })} {modeLabel} • {t({ en: 'Last update:', mr: 'शेवटचा अपडेट:' })} {lastFetch?.toLocaleTimeString() || 'N/A'}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className={`mt-8 border border-blue-500/30 rounded-xl p-6 ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-white to-slate-100'}`}>
          <h3 className="text-lg font-bold text-blue-300 mb-4">{t({ en: 'Legend', mr: 'दर्शकसूची' })}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t({ en: 'Critical', mr: 'गंभीर' }), color: 'bg-red-600/40 text-red-300', desc: t({ en: 'Immediate danger', mr: 'तात्काळ धोका' }) },
              { label: t({ en: 'High', mr: 'उच्च' }), color: 'bg-orange-600/40 text-orange-300', desc: t({ en: 'Urgent response', mr: 'त्वरित प्रतिसाद' }) },
              { label: t({ en: 'Medium', mr: 'मध्यम' }), color: 'bg-yellow-600/40 text-yellow-300', desc: t({ en: 'Standard response', mr: 'मानक प्रतिसाद' }) },
              { label: t({ en: 'Low', mr: 'कमी' }), color: 'bg-green-600/40 text-green-300', desc: t({ en: 'Routine handling', mr: 'नियमित हाताळणी' }) }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded text-sm font-semibold ${item.color}`}>
                  {item.label}
                </span>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveCrimeFeed;

