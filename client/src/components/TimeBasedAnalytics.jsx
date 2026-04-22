import React, { useEffect, useMemo, useState } from 'react';
import { FiClock, FiFilter, FiTrendingUp } from 'react-icons/fi';
import { apiGet } from '../utils/api';
import { normalizeCrimeList } from '../utils/crime';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

function TimeBasedAnalytics() {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const [hourlyData, setHourlyData] = useState([]);
  const [dayOfWeekData, setDayOfWeekData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const toDate = (crime) => {
      const candidate = crime.timestamp || crime.date || crime.createdAt;
      const parsed = candidate ? new Date(candidate) : null;
      return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
    };

    const fetchTimeBasedData = async () => {
      try {
        setLoading(true);
        const crimes = normalizeCrimeList(await apiGet('/api/crimes?limit=5000'));

        const hourlyCounts = Array(24).fill(0);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayCounts = Array(7).fill(0);
        const dayHourCounts = Array(7)
          .fill(null)
          .map(() => Array(24).fill(0));

        const now = new Date();
        const monthMap = {};

        for (let i = 11; i >= 0; i -= 1) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthMap[key] = {
            label: d.toLocaleDateString('en-US', { month: 'short' }),
            crimes: 0,
            fullDate: d,
          };
        }

        crimes.forEach((crime) => {
          const parsed = toDate(crime);
          if (!parsed) return;

          const hour = parsed.getHours();
          const day = parsed.getDay();
          if (hour >= 0 && hour <= 23) {
            hourlyCounts[hour] += 1;
            dayHourCounts[day][hour] += 1;
          }
          if (day >= 0 && day <= 6) dayCounts[day] += 1;

          const mKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
          if (monthMap[mKey]) {
            monthMap[mKey].crimes += 1;
          }
        });

        setHourlyData(
          hourlyCounts.map((count, i) => ({
            hour: `${String(i).padStart(2, '0')}:00`,
            crimes: count,
          }))
        );

        setDayOfWeekData(
          dayNames.map((day, i) => {
            const maxCount = Math.max(...dayHourCounts[i]);
            const peakHourIndex = maxCount > 0 ? dayHourCounts[i].indexOf(maxCount) : null;
            return {
              day,
              crimes: dayCounts[i],
              peak: peakHourIndex === null ? 'N/A' : `${String(peakHourIndex).padStart(2, '0')}:00`,
            };
          })
        );

        setMonthlyData(
          Object.values(monthMap)
            .sort((a, b) => a.fullDate - b.fullDate)
            .map((item) => ({ month: item.label, crimes: item.crimes }))
        );
      } catch (error) {
        console.error('Failed to fetch time-based data:', error);
        setHourlyData([]);
        setDayOfWeekData([]);
        setMonthlyData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeBasedData();
    const interval = setInterval(fetchTimeBasedData, 60000);
    return () => clearInterval(interval);
  }, []);

  const maxHourly = useMemo(() => Math.max(...hourlyData.map((d) => d.crimes), 1), [hourlyData]);
  const maxDayOfWeek = useMemo(() => Math.max(...dayOfWeekData.map((d) => d.crimes), 1), [dayOfWeekData]);
  const maxMonthly = useMemo(() => Math.max(...monthlyData.map((d) => d.crimes), 1), [monthlyData]);

  const insights = useMemo(() => {
    const topHour = hourlyData.reduce(
      (best, item) => (item.crimes > best.crimes ? item : best),
      { hour: 'N/A', crimes: 0 }
    );
    const lowHour = hourlyData.reduce(
      (best, item) => (item.crimes < best.crimes ? item : best),
      hourlyData[0] || { hour: 'N/A', crimes: 0 }
    );
    const busiestDay = dayOfWeekData.reduce(
      (best, item) => (item.crimes > best.crimes ? item : best),
      { day: 'N/A', crimes: 0 }
    );
    const highestMonth = monthlyData.reduce(
      (best, item) => (item.crimes > best.crimes ? item : best),
      { month: 'N/A', crimes: 0 }
    );

    const annualTotal = monthlyData.reduce((sum, item) => sum + item.crimes, 0);
    const firstHalf = monthlyData.slice(0, 6).reduce((sum, item) => sum + item.crimes, 0);
    const secondHalf = monthlyData.slice(6).reduce((sum, item) => sum + item.crimes, 0);
    const halfTrendPct = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

    return {
      topHour,
      lowHour,
      busiestDay,
      highestMonth,
      annualTotal,
      halfTrendPct,
    };
  }, [dayOfWeekData, hourlyData, monthlyData]);

  const panelClass = isDark
    ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30'
    : 'bg-gradient-to-br from-white to-slate-100 border border-slate-300';

  if (loading) {
    return (
      <div className={`min-h-[calc(100vh-73px)] pt-4 flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100'}`}>
        <div className={`text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {t({ en: 'Loading time-based analytics...', mr: 'वेळ-आधारित विश्लेषण लोड होत आहे...' })}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-73px)] pt-4 ${isDark ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100'}`}>
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6">
          {t({ en: 'Time-Based Analytics', mr: 'वेळ-आधारित विश्लेषण' })}
        </h1>

        <div className={`${panelClass} rounded-xl p-6 shadow-lg mb-8`}>
          <h3 className="text-xl font-bold text-blue-300 mb-6 flex items-center gap-2">
            <FiClock /> {t({ en: '24-Hour Actual Crime Pattern', mr: '24-तास प्रत्यक्ष गुन्हे नमुना' })}
          </h3>

          <div className="flex items-end justify-between gap-1 h-64 rounded-lg p-4 bg-black/5">
            {hourlyData.map((data) => {
              const heightPercent = (data.crimes / maxHourly) * 100;
              return (
                <div key={data.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-gradient-to-t from-cyan-500 to-blue-400 rounded-t hover:from-cyan-600 hover:to-blue-500 transition-all cursor-pointer group relative"
                    style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                    title={`${data.hour}: ${data.crimes}`}
                  >
                    <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition whitespace-nowrap ${isDark ? 'bg-slate-700 text-cyan-300' : 'bg-slate-200 text-slate-800'}`}>
                      {data.crimes}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{data.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${panelClass} rounded-xl p-6 shadow-lg mb-8`}>
          <h3 className="text-xl font-bold text-blue-300 mb-6 flex items-center gap-2">
            <FiTrendingUp /> {t({ en: 'Weekly Actual Pattern', mr: 'साप्ताहिक प्रत्यक्ष नमुना' })}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
            {dayOfWeekData.map((data) => {
              const heightPercent = (data.crimes / maxDayOfWeek) * 100;
              const isWeekend = data.day === 'Saturday' || data.day === 'Sunday';
              return (
                <div key={data.day} className="flex flex-col items-center">
                  <div className="w-full flex flex-col items-center mb-2">
                    <div
                      className={`w-full rounded-t transition-all cursor-pointer group relative ${
                        isWeekend
                          ? 'bg-gradient-to-t from-red-500 to-orange-400'
                          : 'bg-gradient-to-t from-blue-500 to-cyan-400'
                      }`}
                      style={{ height: `${heightPercent}%`, minHeight: '20px' }}
                    >
                      <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition whitespace-nowrap ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'}`}>
                        {data.crimes}
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${isWeekend ? 'text-red-400' : 'text-blue-400'}`}>
                    {data.day.slice(0, 3)}
                  </span>
                  <span className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    {t({ en: 'Peak', mr: 'शिखर' })}: {data.peak}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${panelClass} rounded-xl p-6 shadow-lg mb-8`}>
          <h3 className="text-xl font-bold text-blue-300 mb-6">{t({ en: 'Last 12 Months Actual Trend', mr: 'मागील 12 महिन्यांचा प्रत्यक्ष ट्रेंड' })}</h3>

          <div className="flex items-end justify-between gap-2 h-56 rounded-lg p-4 bg-black/5">
            {monthlyData.map((data) => {
              const heightPercent = (data.crimes / maxMonthly) * 100;
              return (
                <div key={data.month} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-gradient-to-t from-purple-500 to-pink-400 rounded-t hover:from-purple-600 hover:to-pink-500 transition-all cursor-pointer group relative"
                    style={{ height: `${heightPercent}%`, minHeight: '8px' }}
                  >
                    <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition whitespace-nowrap ${isDark ? 'bg-slate-700 text-purple-300' : 'bg-slate-200 text-slate-800'}`}>
                      {data.crimes}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{data.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${isDark ? 'bg-gradient-to-br from-blue-600/20 to-blue-700/20 border-blue-500/30' : 'bg-gradient-to-br from-blue-100 to-cyan-100 border-blue-300'} border rounded-xl p-6`}>
          <h3 className="text-lg font-bold text-blue-300 mb-4 flex items-center gap-2">
            <FiFilter /> {t({ en: 'Actual Data Insights', mr: 'प्रत्यक्ष डेटा निरीक्षण' })}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/50' : 'bg-white/80'}`}>
              <p className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{t({ en: 'Daily Pattern', mr: 'दैनिक नमुना' })}</p>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                {t({ en: 'Peak hour', mr: 'शिखर तास' })}: {insights.topHour.hour} ({insights.topHour.crimes})
                . {t({ en: 'Lowest activity', mr: 'किमान हालचाल' })}: {insights.lowHour.hour}.
              </p>
            </div>

            <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/50' : 'bg-white/80'}`}>
              <p className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{t({ en: 'Weekly Pattern', mr: 'साप्ताहिक नमुना' })}</p>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                {t({ en: 'Busiest day', mr: 'सर्वाधिक व्यस्त दिवस' })}: {insights.busiestDay.day} ({insights.busiestDay.crimes}).
              </p>
            </div>

            <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/50' : 'bg-white/80'}`}>
              <p className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{t({ en: 'Seasonal Pattern', mr: 'हंगामी नमुना' })}</p>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                {t({ en: 'Highest month', mr: 'सर्वाधिक महिना' })}: {insights.highestMonth.month} ({insights.highestMonth.crimes}).
              </p>
            </div>

            <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/50' : 'bg-white/80'}`}>
              <p className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{t({ en: '12-Month Trend', mr: '12-महिने ट्रेंड' })}</p>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                {t({ en: 'Total cases', mr: 'एकूण प्रकरणे' })}: {insights.annualTotal}. {t({ en: 'Second half vs first half', mr: 'दुसरे सहामाही विरुद्ध पहिले सहामाही' })}: {insights.halfTrendPct >= 0 ? '+' : ''}{insights.halfTrendPct.toFixed(1)}%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimeBasedAnalytics;
