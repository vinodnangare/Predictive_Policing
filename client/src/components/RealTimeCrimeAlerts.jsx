import React, { useState, useEffect } from 'react';
import { FiBell, FiMapPin, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiGet, buildApiUrl } from '../utils/api';
import { normalizeCrimeList, hasCoordinates } from '../utils/crime';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const toRadians = (deg) => (deg * Math.PI) / 180;
const getDistanceMeters = (from, to) => {
  if (!from || !to) return null;
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function RealTimeCrimeAlerts() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [alerts, setAlerts] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [geofenceRadius, setGeofenceRadius] = useState(1000);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [geoError, setGeoError] = useState("");
  const [streamMode, setStreamMode] = useState('connecting');

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError(t({ en: 'Geolocation is not available in this browser.', mr: 'या ब्राउझरमध्ये जिओलोकेशन उपलब्ध नाही.' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError("");
      },
      () => setGeoError(t({ en: 'Location access is blocked. Distance filtering is limited.', mr: 'लोकेशन प्रवेश बंद आहे. अंतर फिल्टर मर्यादित आहे.' })),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [t]);

  const mapCrimesToAlerts = (rows) =>
    normalizeCrimeList(rows)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .map((crime) => {
        const type = crime.type || t({ en: 'Unknown', mr: 'अज्ञात' });
        const severity = ['Murder', 'Homicide', 'Kidnapping', 'Robbery'].includes(type) ? 'Critical' : 'High';
        const distanceMeters = hasCoordinates(crime)
          ? getDistanceMeters(userPosition, { lat: crime.latitude, lng: crime.longitude })
          : null;
        const etaMinutes = typeof distanceMeters === 'number' ? Math.max(2, Math.round(distanceMeters / 500)) : null;

        return {
          id: crime._id || crime.id,
          type,
          location: crime.location || `${crime.district || t({ en: 'Unknown District', mr: 'अज्ञात जिल्हा' })}${crime.subdistrict ? ', ' + crime.subdistrict : ''}`,
          distanceMeters,
          severity,
          timestamp: crime.timestamp,
          lat: crime.latitude,
          lng: crime.longitude,
          description: crime.description || t({ en: 'Crime incident reported', mr: 'गुन्हा घटना नोंदवली' }),
          officers: Number(crime.officers || 0),
          etaMinutes,
        };
      })
      .filter((crime) => crime.distanceMeters === null || crime.distanceMeters <= geofenceRadius)
      .slice(0, 15);

  const fetchRecentCrimes = async () => {
    try {
      const data = normalizeCrimeList(await apiGet('/api/crimes?limit=100'));

      const recentAlerts = mapCrimesToAlerts(data);
      
      if (notificationsEnabled) {
        setAlerts(recentAlerts);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  useEffect(() => {
    let closed = false;
    let eventSource = null;
    let fallbackInterval = null;

    const applyAlerts = (rows) => {
      if (closed || !notificationsEnabled) return;
      setAlerts(mapCrimesToAlerts(rows));
      setLastUpdated(new Date());
    };

    const startPollingFallback = () => {
      if (fallbackInterval || closed) return;
      setStreamMode('polling');

      const poll = async () => {
        try {
          const data = await apiGet('/api/crimes?limit=100');
          applyAlerts(data);
        } catch (error) {
          console.error('Crime alert polling fallback failed:', error);
        }
      };

      poll();
      fallbackInterval = setInterval(poll, 5000);
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
        console.error('Unable to create alert stream EventSource:', error);
        startPollingFallback();
        return;
      }

      eventSource.addEventListener('crimes', (event) => {
        if (closed || !notificationsEnabled) return;
        try {
          const payload = JSON.parse(event.data);
          applyAlerts(Array.isArray(payload?.crimes) ? payload.crimes : []);
          setStreamMode('sse');
        } catch (error) {
          console.error('Failed to parse alert stream payload:', error);
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

    if (!notificationsEnabled) {
      setStreamMode('paused');
      return () => {
        closed = true;
      };
    }

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
  }, [notificationsEnabled, geofenceRadius, userPosition]);

  const dismissAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'Robbery': return 'from-red-600/20 to-red-700/20 border-red-500/30';
      case 'Assault': return 'from-orange-600/20 to-orange-700/20 border-orange-500/30';
      case 'Theft': return 'from-yellow-600/20 to-yellow-700/20 border-yellow-500/30';
      case 'Emergency': return 'from-purple-600/20 to-purple-700/20 border-purple-500/30';
      default: return 'from-blue-600/20 to-blue-700/20 border-blue-500/30';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'Robbery': return '🔫';
      case 'Assault': return '👊';
      case 'Theft': return '🚗';
      case 'Emergency': return '🚨';
      default: return '⚠️';
    }
  };

  const handleViewOnMap = (alertItem) => {
    if (alertItem.lat && alertItem.lng) {
      window.open(`https://www.google.com/maps?q=${alertItem.lat},${alertItem.lng}`, '_blank', 'noopener');
      return;
    }
    if (alertItem.location) {
      window.open(`https://www.google.com/maps?q=${encodeURIComponent(alertItem.location)}`, '_blank', 'noopener');
      return;
    }
    toast.error(t({ en: 'No coordinates available for this alert.', mr: 'या अलर्टसाठी निर्देशांक उपलब्ध नाहीत.' }));
  };

  const handleShowDetails = (alert) => {
    setSelectedAlert(alert);
  };

  const handleCloseDetails = () => setSelectedAlert(null);
  const etaValues = alerts.map((a) => a.etaMinutes).filter((value) => typeof value === 'number');
  const avgEta = etaValues.length
    ? (etaValues.reduce((sum, value) => sum + value, 0) / etaValues.length).toFixed(1)
    : 'N/A';
  const modeLabel = !notificationsEnabled
    ? t({ en: 'Paused', mr: 'थांबवले' })
    : streamMode === 'sse'
    ? t({ en: 'Live SSE', mr: 'लाईव्ह SSE' })
    : streamMode === 'polling'
    ? t({ en: 'Fallback Polling', mr: 'पर्यायी पोलिंग' })
    : t({ en: 'Connecting', mr: 'जुळत आहे' });

  const getSeverityLabel = (severity) => {
    if (severity === 'Critical') {
      return t({ en: 'Critical', mr: 'गंभीर' });
    }
    return t({ en: 'High', mr: 'उच्च' });
  };

  return (
    <div className={`min-h-[calc(100vh-73px)] pt-4 ${isDark ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100'}`}>
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6">
          {t({ en: 'Real-Time Crime Alerts 🚨', mr: 'रिअल-टाइम गुन्हे अलर्ट 🚨' })}
        </h1>
        {geoError && (
          <p className="text-sm text-amber-300 bg-amber-700/20 border border-amber-500/30 rounded-lg px-3 py-2 mb-4">
            {geoError}
          </p>
        )}

        {/* Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Notification Settings */}
          <div className={`border border-blue-500/30 rounded-xl p-6 lg:col-span-2 ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-white to-slate-100'}`}>
            <h3 className="text-lg font-bold text-blue-300 mb-6 flex items-center gap-2">
              <FiBell /> {t({ en: 'Alert Settings', mr: 'अलर्ट सेटिंग्स' })}
            </h3>

            <div className="space-y-4">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600/30">
                <div>
                  <p className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{t({ en: 'Push Notifications', mr: 'पुश सूचना' })}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Receive instant alerts for crimes in monitored areas', mr: 'नियंत्रित क्षेत्रातील गुन्ह्यांसाठी त्वरित अलर्ट मिळवा' })}</p>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notificationsEnabled ? 'bg-emerald-600' : 'bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>

              {/* Geofence Radius */}
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/30">
                <label className={`flex items-center gap-2 font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  <FiMapPin /> {t({ en: 'Geofence Radius', mr: 'जिओफेन्स त्रिज्या' })}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={geofenceRadius}
                    onChange={(e) => setGeofenceRadius(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-blue-400 font-bold text-lg min-w-24">{geofenceRadius}m</span>
                </div>
                <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Alerts only for crimes within this radius of your location', mr: 'तुमच्या स्थानापासून या त्रिज्येतील गुन्ह्यांसाठीच अलर्ट' })}</p>
              </div>

              {/* Alert Types */}
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/30">
                <p className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>{t({ en: 'Alert Types to Monitor', mr: 'निरीक्षणासाठी अलर्ट प्रकार' })}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { en: 'Robbery', mr: 'दरोडा' },
                    { en: 'Assault', mr: 'हल्ला' },
                    { en: 'Theft', mr: 'चोरी' },
                    { en: 'Emergency', mr: 'आपत्काल' },
                  ].map(type => (
                    <label key={type.en} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{t(type)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-red-600/20 to-red-700/20 border border-red-500/30 rounded-xl p-6">
              <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Active Alerts', mr: 'सक्रिय अलर्ट' })}</p>
              <p className="text-4xl font-bold text-red-300">{alerts.length}</p>
              <p className={`text-xs mt-2 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                {notificationsEnabled ? t({ en: 'Monitoring', mr: 'निरीक्षण सुरू' }) : t({ en: 'Disabled', mr: 'बंद' })}
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 border border-emerald-500/30 rounded-xl p-6">
              <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Zone Radius', mr: 'क्षेत्र त्रिज्या' })}</p>
              <p className="text-4xl font-bold text-emerald-300">{geofenceRadius}m</p>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Detection radius set', mr: 'शोध त्रिज्या सेट' })}</p>
            </div>

            <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-700/20 border border-cyan-500/30 rounded-xl p-6">
              <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Alert Source', mr: 'अलर्ट स्रोत' })}</p>
              <p className="text-2xl font-bold text-cyan-300">{modeLabel}</p>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Avg ETA:', mr: 'सरासरी ETA:' })} {avgEta === 'N/A' ? '—' : `${avgEta} ${t({ en: 'min', mr: 'मि.' })}`}</p>
            </div>
          </div>
        </div>

        {/* Real-Time Alerts */}
        <div className={`border border-blue-500/30 rounded-xl shadow-lg overflow-hidden ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-white to-slate-100'}`}>
          <div className="bg-gradient-to-r from-red-600/20 to-red-700/20 border-b border-red-500/30 p-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-red-300 flex items-center gap-2">
              <FiAlertTriangle className="animate-pulse" /> {t({ en: 'Crime Alerts Timeline', mr: 'गुन्हे अलर्ट टाइमलाइन' })}
            </h3>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-2 ${
              notificationsEnabled
                ? 'bg-emerald-600/40 text-emerald-300'
                : 'bg-slate-700/50 text-gray-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${notificationsEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`}></span>
              {notificationsEnabled ? t({ en: 'LIVE', mr: 'लाईव्ह' }) : t({ en: 'OFFLINE', mr: 'ऑफलाइन' })}
            </span>
          </div>

          <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-gradient-to-r ${getAlertColor(alert.type)} border-l-4 ${
                    alert.severity === 'Critical'
                      ? 'border-l-red-500 animate-pulse'
                      : 'border-l-orange-500'
                  } p-4 hover:bg-opacity-75 transition-all`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-white">{(alert.type || 'Unknown').toUpperCase()}</h4>
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${
                            alert.severity === 'Critical'
                              ? 'bg-red-600/40 text-red-300'
                              : 'bg-orange-600/40 text-orange-300'
                          }`}>
                            {getSeverityLabel(alert.severity)}
                          </span>
                        </div>
                        <p className="text-white text-sm mb-1">{alert.location}</p>
                        <p className="text-gray-300 text-xs">
                          📍 {alert.distanceMeters === null ? 'N/A' : `${Math.round(alert.distanceMeters)}m`} {t({ en: 'away', mr: 'दूर' })} •
                          🚗 {alert.etaMinutes === null ? 'N/A' : `${alert.etaMinutes} ${t({ en: 'min', mr: 'मि.' })}`} ETA •
                          👮 {alert.officers} {alert.officers !== 1 ? t({ en: 'officers responding', mr: 'अधिकारी प्रतिसाद देत आहेत' }) : t({ en: 'officer responding', mr: 'अधिकारी प्रतिसाद देत आहेत' })}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-gray-400 hover:text-white transition ml-3 font-bold text-xl"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex gap-2 ml-10">
                    <button
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition"
                      onClick={() => handleViewOnMap(alert)}
                    >
                      {t({ en: 'View on Map', mr: 'नकाशावर पहा' })}
                    </button>
                    <button
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 px-3 py-1 rounded transition"
                      onClick={() => handleShowDetails(alert)}
                    >
                      {t({ en: 'Details', mr: 'तपशील' })}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={`p-12 text-center ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                <p className="text-lg mb-2">{t({ en: '✓ No active crime alerts', mr: '✓ सक्रिय गुन्हे अलर्ट नाहीत' })}</p>
                <p className="text-sm">{t({ en: 'Your area is secure. The feed will update when incidents are reported.', mr: 'तुमचे क्षेत्र सुरक्षित आहे. घटना नोंदवल्यावर फीड अपडेट होईल.' })}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`border-t p-4 text-center text-xs ${isDark ? 'bg-slate-700/30 border-slate-600/30 text-gray-400' : 'bg-slate-100 border-slate-300 text-slate-600'}`}>
            <p>{t({ en: 'Source:', mr: 'स्रोत:' })} {modeLabel} • {t({ en: 'Last update:', mr: 'शेवटचा अपडेट:' })} {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}</p>
          </div>
        </div>

        {selectedAlert && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-blue-500/40 rounded-xl p-6 w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-gray-400">{t({ en: 'Alert Type', mr: 'अलर्ट प्रकार' })}</p>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    {getAlertIcon(selectedAlert.type)} {(selectedAlert.type || 'Unknown').toUpperCase()}
                  </h3>
                </div>
                <button className="text-gray-400 hover:text-white text-xl" onClick={handleCloseDetails}>✕</button>
              </div>

              <div className="space-y-2 text-sm text-gray-200">
                <p><span className="text-gray-400">{t({ en: 'Location:', mr: 'ठिकाण:' })}</span> {selectedAlert.location || 'N/A'}</p>
                <p><span className="text-gray-400">{t({ en: 'Severity:', mr: 'तीव्रता:' })}</span> {getSeverityLabel(selectedAlert.severity)}</p>
                <p><span className="text-gray-400">{t({ en: 'Distance:', mr: 'अंतर:' })}</span> {selectedAlert.distanceMeters === null ? 'N/A' : `${Math.round(selectedAlert.distanceMeters)}m`}</p>
                <p><span className="text-gray-400">{t({ en: 'ETA:', mr: 'ETA:' })}</span> {selectedAlert.etaMinutes === null ? 'N/A' : `${selectedAlert.etaMinutes} ${t({ en: 'min', mr: 'मि.' })}`}</p>
                <p><span className="text-gray-400">{t({ en: 'Officers:', mr: 'अधिकारी:' })}</span> {selectedAlert.officers || 0}</p>
                <p><span className="text-gray-400">{t({ en: 'Description:', mr: 'वर्णन:' })}</span> {selectedAlert.description || t({ en: 'No details provided.', mr: 'तपशील उपलब्ध नाही.' })}</p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-4 py-2 rounded bg-slate-700 text-gray-200 hover:bg-slate-600"
                  onClick={handleCloseDetails}
                >
                  {t({ en: 'Close', mr: 'बंद करा' })}
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => handleViewOnMap(selectedAlert)}
                >
                  {t({ en: 'View on Map', mr: 'नकाशावर पहा' })}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-300 mb-3">{t({ en: '📝 How It Works', mr: '📝 हे कसे कार्य करते' })}</h3>
          <ul className={`text-sm space-y-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            <li>{t({ en: '✓ Crimes are reported in real-time by officers and citizens', mr: '✓ अधिकारी आणि नागरिकांकडून घटना रिअल-टाइममध्ये नोंदवल्या जातात' })}</li>
            <li>{t({ en: "✓ You'll receive instant notifications for incidents within your geofence radius", mr: '✓ तुमच्या जिओफेन्स त्रिज्येतील घटनांचे त्वरित अलर्ट मिळतात' })}</li>
            <li>{t({ en: '✓ Severity level determines alert priority and notification type', mr: '✓ तीव्रतेनुसार अलर्ट प्राधान्य व प्रकार ठरतो' })}</li>
            <li>{t({ en: '✓ GPS location shows distance to incident and estimated officer arrival time', mr: '✓ GPS मुळे घटनेचे अंतर आणि अंदाजित पोहोच वेळ दिसते' })}</li>
            <li>{t({ en: '✓ Customize alert types and radius to match your patrolling area', mr: '✓ तुमच्या गस्त क्षेत्रानुसार अलर्ट प्रकार आणि त्रिज्या सानुकूल करा' })}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default RealTimeCrimeAlerts;

