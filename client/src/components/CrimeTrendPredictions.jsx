import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { FiTrendingUp, FiAlertTriangle, FiCheckCircle, FiDatabase, FiTarget } from 'react-icons/fi';
import { apiGet } from '../utils/api';
import { normalizeCrimeList } from '../utils/crime';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

function CrimeTrendPredictions() {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const [historicalData, setHistoricalData] = useState([]);
  const [futureData, setFutureData] = useState([]);
  const [summary, setSummary] = useState({
    trendDirection: t({ en: 'Stable', mr: 'स्थिर' }),
    confidence: 0,
    increaseRate: 0,
    hotspotShift: t({ en: 'None', mr: 'नाही' }),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSummary((prev) => ({
      ...prev,
      trendDirection: t({ en: 'Stable', mr: 'स्थिर' }),
      hotspotShift: t({ en: 'None', mr: 'नाही' }),
    }));
  }, [t]);

  useEffect(() => {
    const fetchAndPredict = async () => {
      try {
        setLoading(true);
        const raw = await apiGet('/api/crimes?limit=5000');
        const crimes = normalizeCrimeList(raw || []);

        const byMonth = {};
        const now = new Date();

        crimes.forEach((crime) => {
          const dateVal = crime.timestamp || crime.date || crime.createdAt;
          const date = dateVal ? new Date(dateVal) : null;
          if (!date || Number.isNaN(date.getTime())) return;

          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const type = String(crime.type || t({ en: 'Unknown', mr: 'अज्ञात' }));

          if (!byMonth[monthKey]) {
            byMonth[monthKey] = {
              key: monthKey,
              monthDate: new Date(date.getFullYear(), date.getMonth(), 1),
              total: 0,
              districtCounts: {},
              typeCounts: {},
            };
          }

          byMonth[monthKey].total += 1;
          byMonth[monthKey].typeCounts[type] = (byMonth[monthKey].typeCounts[type] || 0) + 1;

          const district = crime.district || crime.subdistrict || t({ en: 'Unknown', mr: 'अज्ञात' });
          byMonth[monthKey].districtCounts[district] = (byMonth[monthKey].districtCounts[district] || 0) + 1;
        });

        // Ensure at least the last 12 months exist even if no records are present.
        for (let i = 11; i >= 0; i -= 1) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!byMonth[key]) {
            byMonth[key] = {
              key,
              monthDate: d,
              total: 0,
              districtCounts: {},
              typeCounts: {},
            };
          }
        }

        const monthRows = Object.values(byMonth)
          .sort((a, b) => a.monthDate - b.monthDate)
          .slice(-18)
          .map((row) => {
            const entries = Object.entries(row.typeCounts).sort((a, b) => b[1] - a[1]);
            const peakType = entries[0]?.[0] || t({ en: 'None', mr: 'नाही' });
            const peakValue = entries[0]?.[1] || 0;

            return {
              key: row.key,
              label: row.monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
              monthDate: row.monthDate,
              actual: row.total,
              peakType,
              peakValue,
              districtCounts: row.districtCounts,
              typeCounts: row.typeCounts,
            };
          });

        const values = monthRows.map((row) => row.actual);
        const recent = values.slice(-6);
        const previous = values.slice(-12, -6);

        const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
        const prevAvg = previous.length ? previous.reduce((a, b) => a + b, 0) / previous.length : recentAvg || 1;
        const increaseRate = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0;

        let trendDirection = t({ en: 'Stable', mr: 'स्थिर' });
        if (increaseRate > 8) trendDirection = t({ en: 'Increasing', mr: 'वाढत आहे' });
        if (increaseRate < -8) trendDirection = t({ en: 'Decreasing', mr: 'घटत आहे' });

        const monthlyDeltas = [];
        for (let i = 1; i < values.length; i += 1) {
          monthlyDeltas.push(values[i] - values[i - 1]);
        }
        const volatility = monthlyDeltas.length
          ? Math.sqrt(monthlyDeltas.map((d) => d * d).reduce((sum, sq) => sum + sq, 0) / monthlyDeltas.length)
          : 0;

        const avgLevel = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 1;
        const normalizedVolatility = Math.min(1, volatility / Math.max(1, avgLevel));
        const confidence = Math.max(55, Math.min(92, Math.round(92 - normalizedVolatility * 42)));

        const districtTrendScores = {};
        monthRows.slice(-6).forEach((row, idx) => {
          const weight = idx + 1;
          Object.entries(row.districtCounts).forEach(([district, count]) => {
            districtTrendScores[district] = (districtTrendScores[district] || 0) + count * weight;
          });
        });

        const hotspotShift = Object.entries(districtTrendScores).sort((a, b) => b[1] - a[1])[0]?.[0] || t({ en: 'None', mr: 'नाही' });

        const nextThree = [];
        const trendSlope = recent.length >= 2 ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1) : 0;
        const baseline = recent.length ? recent[recent.length - 1] : values[values.length - 1] || 0;

        for (let i = 1; i <= 3; i += 1) {
          const projected = Math.max(0, Math.round(baseline + trendSlope * i + increaseRate * 0.04 * baseline));
          const prevMonth = monthRows[monthRows.length - 1]?.monthDate || now;
          const d = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + i, 1);
          nextThree.push({
            key: `pred-${i}`,
            label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            predicted: projected,
            confidence,
            monthDate: d,
          });
        }

        const historyForChart = monthRows.map((row) => ({
          month: row.label,
          actual: row.actual,
          predicted: null,
        }));

        if (historyForChart.length > 0) {
          historyForChart[historyForChart.length - 1].predicted = historyForChart[historyForChart.length - 1].actual;
        }

        const futureForChart = nextThree.map((row) => ({
          month: row.label,
          actual: null,
          predicted: row.predicted,
        }));

        setHistoricalData(historyForChart);
        setFutureData(futureForChart);
        setSummary({
          trendDirection,
          confidence,
          increaseRate,
          hotspotShift,
        });
      } catch (error) {
        console.error('Error fetching trend data:', error);
        setHistoricalData([]);
        setFutureData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAndPredict();
    const interval = setInterval(fetchAndPredict, 120000);
    return () => clearInterval(interval);
  }, [t]);

  const fullSeries = useMemo(() => [...historicalData, ...futureData], [historicalData, futureData]);

  const chartColors = isDark
    ? {
        grid: 'rgba(255,255,255,0.08)',
        axis: '#CBD5E1',
        tooltipBg: '#0F172A',
        tooltipText: '#E2E8F0',
        tooltipBorder: '#334155',
      }
    : {
        grid: '#E2E8F0',
        axis: '#334155',
        tooltipBg: '#FFFFFF',
        tooltipText: '#0F172A',
        tooltipBorder: '#CBD5E1',
      };

  const panelClass = isDark
    ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30'
    : 'bg-gradient-to-br from-white to-slate-100 border border-slate-300';

  if (loading) {
    return (
      <div className={`min-h-[calc(100vh-73px)] pt-4 flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100'}`}>
        <div className={`text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>{t({ en: 'Loading trend data...', mr: 'ट्रेंड डेटा लोड होत आहे...' })}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-73px)] pt-4 ${isDark ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100'}`}>
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
          {t({ en: 'Crime Trend & Forecast Intelligence 📈', mr: 'गुन्हे ट्रेंड आणि अंदाज बुद्धिमत्ता 📈' })}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`${panelClass} rounded-xl p-4 shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t({ en: 'Trend Direction', mr: 'ट्रेंड दिशा' })}</h3>
              <FiTrendingUp className="text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-300">{summary.trendDirection}</p>
          </div>

          <div className={`${panelClass} rounded-xl p-4 shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t({ en: 'Forecast Confidence', mr: 'अंदाज विश्वसनीयता' })}</h3>
              <FiTarget className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-300">{summary.confidence}%</p>
          </div>

          <div className={`${panelClass} rounded-xl p-4 shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t({ en: '6-Month Change', mr: '6-महिने बदल' })}</h3>
              <FiAlertTriangle className="text-yellow-400" />
            </div>
            <p className={`text-2xl font-bold ${summary.increaseRate > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
              {summary.increaseRate >= 0 ? '+' : ''}{summary.increaseRate.toFixed(1)}%
            </p>
          </div>

          <div className={`${panelClass} rounded-xl p-4 shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t({ en: 'Emerging Hotspot', mr: 'उदयोन्मुख हॉटस्पॉट' })}</h3>
              <FiDatabase className="text-cyan-400" />
            </div>
            <p className="text-xl font-bold text-cyan-300 truncate">{summary.hotspotShift}</p>
          </div>
        </div>

        <div className={`${panelClass} rounded-xl p-6 shadow-lg mb-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-purple-300">{t({ en: 'Actual History + Forecast', mr: 'प्रत्यक्ष इतिहास + अंदाज' })}</h3>
            <span className={`text-xs px-3 py-1 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
              {t({ en: 'Actual data is from recorded crimes', mr: 'प्रत्यक्ष डेटा नोंदवलेल्या गुन्ह्यांमधून' })}
            </span>
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={fullSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="month" stroke={chartColors.axis} />
              <YAxis stroke={chartColors.axis} />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartColors.tooltipBg,
                  border: `1px solid ${chartColors.tooltipBorder}`,
                  borderRadius: '10px',
                }}
                labelStyle={{ color: chartColors.tooltipText }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', r: 4 }}
                name={t({ en: 'Actual Crimes', mr: 'प्रत्यक्ष गुन्हे' })}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#F59E0B"
                strokeWidth={3}
                strokeDasharray="6 4"
                dot={{ fill: '#F59E0B', r: 4 }}
                name={t({ en: 'Forecast', mr: 'अंदाज' })}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className={`${panelClass} rounded-xl p-6 shadow-lg`}>
            <h3 className="text-lg font-bold text-blue-300 mb-4">{t({ en: 'Next 3 Months Forecast', mr: 'पुढील 3 महिन्यांचा अंदाज' })}</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={futureData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="month" stroke={chartColors.axis} />
                <YAxis stroke={chartColors.axis} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: '10px',
                  }}
                  labelStyle={{ color: chartColors.tooltipText }}
                />
                <Bar dataKey="predicted" fill="#F59E0B" radius={[8, 8, 0, 0]} name={t({ en: 'Forecast Cases', mr: 'अंदाजित प्रकरणे' })} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={`${panelClass} rounded-xl p-6 shadow-lg`}>
            <h3 className="text-lg font-bold text-cyan-300 mb-4">{t({ en: 'Operational Recommendation', mr: 'ऑपरेशनल शिफारस' })}</h3>
            <div className="space-y-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} text-sm`}>
                  {summary.increaseRate > 8
                    ? t({ en: 'Crime volume is climbing. Increase patrol scheduling in the top hotspot district.', mr: 'गुन्हेगारी प्रमाण वाढत आहे. प्रमुख हॉटस्पॉट जिल्ह्यात गस्ती वाढवा.' })
                    : summary.increaseRate < -8
                      ? t({ en: 'Current prevention measures are showing positive impact. Maintain targeted operations.', mr: 'सध्याच्या प्रतिबंधात्मक उपायांचा सकारात्मक परिणाम दिसतो. लक्षित कारवाई कायम ठेवा.' })
                      : t({ en: 'Trend is currently stable. Keep surveillance focused on recurring categories.', mr: 'सध्या ट्रेंड स्थिर आहे. पुनरावृत्ती होणाऱ्या प्रकारांवर लक्ष ठेवा.' })}
                </p>
              </div>

              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} text-sm`}>
                  {t({ en: 'Forecast confidence is based on historical consistency and month-over-month volatility.', mr: 'अंदाज विश्वास ऐतिहासिक सातत्य आणि महिना-निहाय अस्थिरतेवर आधारित आहे.' })}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-emerald-300">
                <FiCheckCircle />
                <span>{t({ en: 'This page uses recorded case history for actual values.', mr: 'या पृष्ठावर प्रत्यक्ष मूल्यांसाठी नोंदवलेला केस इतिहास वापरला आहे.' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrimeTrendPredictions;
