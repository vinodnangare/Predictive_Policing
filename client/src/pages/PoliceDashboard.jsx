import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiActivity,
  FiAlertTriangle,
  FiClock,
  FiCompass,
  FiDatabase,
  FiFilePlus,
  FiMapPin,
  FiRefreshCw,
  FiShield,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { apiGet } from "../utils/api";
import { hasCoordinates, normalizeCrimeList } from "../utils/crime";
import AgencyBrand from "../components/AgencyBrand";
import LeadershipCouncil from "../components/LeadershipCouncil";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

const CHART_COLORS = ["#22d3ee", "#fb7185", "#f59e0b", "#2dd4bf", "#38bdf8", "#34d399"];
const TREND_WINDOW_DAYS = 14;

const toTitleCase = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()) || "Unknown";

const parseCrimeDate = (crime) => {
  const raw = crime?.timestamp || crime?.date || crime?.createdAt;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isClosedCase = (crime) => {
  const status = String(crime?.caseStatus || "").toLowerCase();
  return status.includes("closed") || status.includes("solved") || status.includes("resolved");
};

const getCaseBucket = (crime) => {
  const status = String(crime?.caseStatus || "").toLowerCase();
  if (status.includes("closed") || status.includes("solved") || status.includes("resolved")) return "Closed";
  if (status.includes("investig") || status.includes("progress") || status.includes("review")) {
    return "Investigating";
  }
  if (crime?.assignedOfficer || crime?.assignedOfficerId) return "Assigned";
  return "Open";
};

function PoliceDashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ totalRecords: 0, activeCases: 0, hotspots: 0, modelStatus: "Unknown" });
  const [crimes, setCrimes] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    setRefreshing(true);

    try {
      const [statsResponse, crimeResponse] = await Promise.all([
        apiGet("/api/stats"),
        apiGet("/api/crimes?limit=500"),
      ]);

      setStats({
        totalRecords: Number(statsResponse?.totalRecords || 0),
        activeCases: Number(statsResponse?.activeCases || 0),
        hotspots: Number(statsResponse?.hotspots || 0),
        modelStatus: statsResponse?.modelStatus || "Active",
      });
      setCrimes(normalizeCrimeList(crimeResponse));
      setError("");
      setLastUpdated(new Date());
    } catch (fetchErr) {
      console.error("Dashboard load failed", fetchErr);
      setError("Unable to load one or more dashboard modules. Showing latest available data.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!cancelled) {
        await loadDashboard();
      }
    };

    initialize();
    const intervalId = setInterval(() => {
      if (!cancelled) {
        loadDashboard({ silent: true });
      }
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const analytics = useMemo(() => {
    const locale = language === "mr" ? "mr-IN" : "en-IN";
    const now = Date.now();
    const trendSeed = [];
    const trendMap = {};
    for (let i = TREND_WINDOW_DAYS - 1; i >= 0; i -= 1) {
      const day = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = day.toISOString().slice(0, 10);
      trendMap[key] = {
        key,
        label: day.toLocaleDateString(locale, { day: "2-digit", month: "short" }),
        incidents: 0,
      };
      trendSeed.push(trendMap[key]);
    }

    const typeCounter = {};
    const districtCounter = {};
    const caseCounter = { Open: 0, Assigned: 0, Investigating: 0, Closed: 0 };
    const recentIncidents = [];

    let incidents24h = 0;
    let incidents7d = 0;
    let geoTagged = 0;

    crimes.forEach((crime) => {
      const parsedDate = parseCrimeDate(crime);
      const type = toTitleCase(crime?.type || crime?.crimeType || "Unknown");
      const district = toTitleCase(crime?.district || crime?.subdistrict || crime?.location || "Unknown");
      const caseBucket = getCaseBucket(crime);

      typeCounter[type] = (typeCounter[type] || 0) + 1;
      districtCounter[district] = (districtCounter[district] || 0) + 1;
      caseCounter[caseBucket] = (caseCounter[caseBucket] || 0) + 1;

      if (hasCoordinates(crime)) {
        geoTagged += 1;
      }

      if (parsedDate) {
        const diffMs = now - parsedDate.getTime();
        if (diffMs <= 24 * 60 * 60 * 1000) {
          incidents24h += 1;
        }
        if (diffMs <= 7 * 24 * 60 * 60 * 1000) {
          incidents7d += 1;
        }

        const trendKey = parsedDate.toISOString().slice(0, 10);
        if (trendMap[trendKey]) {
          trendMap[trendKey].incidents += 1;
        }
      }

      recentIncidents.push({
        id: crime?._id || crime?.id,
        type,
        location: district,
        caseStatus: caseBucket,
        time: parsedDate,
      });
    });

    const typeData = Object.entries(typeCounter)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const districtData = Object.entries(districtCounter)
      .map(([name, incidents]) => ({ name, incidents }))
      .sort((a, b) => b.incidents - a.incidents)
      .slice(0, 7);

    const caseStatusData = Object.entries(caseCounter).map(([name, value]) => ({
      key: name,
      label: t({
        en: name,
        mr:
          name === "Closed"
            ? "बंद"
            : name === "Investigating"
            ? "तपास सुरू"
            : name === "Assigned"
            ? "नेमलेले"
            : "उघडे",
      }),
      value,
    }));

    const latest = recentIncidents
      .sort((a, b) => (b.time?.getTime() || 0) - (a.time?.getTime() || 0))
      .slice(0, 7);

    const activeCases = crimes.filter((crime) => !isClosedCase(crime)).length;

    return {
      incidents24h,
      incidents7d,
      geoTagged,
      activeCases,
      trendData: trendSeed,
      typeData,
      districtData,
      caseStatusData,
      latest,
    };
  }, [crimes, language, t]);

  const metricCards = [
    {
      label: t({ en: "Total Incidents", mr: "एकूण घटना" }),
      value: stats.totalRecords || crimes.length,
      note: t({ en: "All recorded incidents", mr: "सर्व नोंदवलेल्या घटना" }),
      toneDark: "text-cyan-200",
      toneLight: "text-cyan-700",
      border: "border-cyan-400/30",
      icon: FiDatabase,
    },
    {
      label: t({ en: "Active Cases", mr: "सक्रिय प्रकरणे" }),
      value: stats.activeCases || analytics.activeCases,
      note: t({ en: "Open and under investigation", mr: "उघडी आणि तपासाधीन" }),
      toneDark: "text-amber-200",
      toneLight: "text-amber-700",
      border: "border-amber-400/30",
      icon: FiAlertTriangle,
    },
    {
      label: t({ en: "High Risk Hotspots", mr: "उच्च-जोखीम हॉटस्पॉट्स" }),
      value: stats.hotspots || analytics.districtData.length,
      note: t({ en: "Unique risk-focused zones", mr: "जोखीम-केंद्रित वेगळे क्षेत्र" }),
      toneDark: "text-rose-200",
      toneLight: "text-rose-700",
      border: "border-rose-400/30",
      icon: FiMapPin,
    },
    {
      label: t({ en: "Incidents (24h)", mr: "घटना (२४ तास)" }),
      value: analytics.incidents24h,
      note: t({
        en: `${analytics.incidents7d} events in last 7 days`,
        mr: `मागील ७ दिवसांत ${analytics.incidents7d} घटना`,
      }),
      toneDark: "text-emerald-200",
      toneLight: "text-emerald-700",
      border: "border-emerald-400/30",
      icon: FiClock,
    },
    {
      label: t({ en: "Model Health", mr: "मॉडेल स्थिती" }),
      value: stats.modelStatus,
      note: t({
        en: `${analytics.geoTagged} geo-tagged records available`,
        mr: `${analytics.geoTagged} भू-टॅग नोंदी उपलब्ध`,
      }),
      toneDark: "text-sky-200",
      toneLight: "text-sky-700",
      border: "border-sky-400/30",
      icon: FiShield,
    },
  ];

  const chartGridColor = isDark ? "#1f3347" : "#c6d6e5";
  const axisColor = isDark ? "#7ca3bc" : "#4a6780";
  const tooltipBg = isDark ? "#0b1724" : "#ffffff";
  const tooltipBorder = isDark ? "#164a67" : "#b8ccdf";

  return (
    <div className={`min-h-[calc(100vh-73px)] ${
      isDark
        ? "bg-[radial-gradient(circle_at_80%_-20%,_#1f5d86_0%,_#08131f_45%,_#040a10_100%)]"
        : "bg-[radial-gradient(circle_at_82%_-18%,_#c6e3ff_0%,_#eef5fd_48%,_#e6edf7_100%)]"
    }`}>
      <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <section className={`rounded-3xl border bg-gradient-to-r p-5 shadow-2xl sm:p-7 ${
          isDark
            ? "border-white/12 from-cyan-500/18 via-sky-500/12 to-transparent shadow-cyan-900/25"
            : "border-slate-300/80 from-cyan-100/80 via-sky-100/70 to-white/70 shadow-slate-300/45"
        }`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <AgencyBrand compact className="mb-3" />
              <p className={`mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                isDark
                  ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                  : "border-cyan-600/25 bg-cyan-100 text-cyan-800"
              }`}>
                <FiCompass size={13} />
                {t({ en: "Command Intelligence", mr: "कमांड इंटेलिजन्स" })}
              </p>
              <h1 className={`text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl ${isDark ? "text-white" : "text-slate-900"}`}>
                {t({ en: "Strategic Police Operations Dashboard", mr: "रणनीतिक पोलीस ऑपरेशन्स डॅशबोर्ड" })}
              </h1>
              <p className={`mt-2 max-w-2xl text-sm sm:text-base ${isDark ? "text-slate-200/90" : "text-slate-700"}`}>
                {t({
                  en: "Monitor emerging threats, review district pressure, and move from incident response to predictive action with one unified view.",
                  mr: "उदयोन्मुख धोके निरीक्षणात ठेवा, जिल्हानिहाय दबाव तपासा आणि एकसंध दृश्यातून घटना-प्रतिक्रियेतून पूर्वानुमानित कृतीकडे जा.",
                })}
              </p>
              {lastUpdated && (
                <p className={`mt-3 text-xs sm:text-sm ${isDark ? "text-cyan-100/80" : "text-slate-700"}`}>
                  {t({ en: "Last synchronized at", mr: "शेवटचा समक्रमण वेळ" })} {lastUpdated.toLocaleTimeString()} {t({ en: "on", mr: "दि." })} {lastUpdated.toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadDashboard()}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  isDark
                    ? "border-white/20 bg-white/8 text-white hover:bg-white/12"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                }`}
                disabled={refreshing}
              >
                <FiRefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                {t({ en: "Refresh", mr: "रीफ्रेश" })}
              </button>
              <button
                type="button"
                onClick={() => navigate("/police/add-crime")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                <FiFilePlus size={16} />
                {t({ en: "Add Incident", mr: "घटना जोडा" })}
              </button>
            </div>
          </div>

          {error && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${isDark ? "border-amber-300/35 bg-amber-300/12 text-amber-100" : "border-amber-400/50 bg-amber-100 text-amber-900"}`}>
              {t({ en: error, mr: "एक किंवा अधिक डॅशबोर्ड मॉड्युल्स लोड करता आले नाहीत. उपलब्ध ताजे डेटा दर्शविला आहे." })}
            </div>
          )}
        </section>

        <LeadershipCouncil />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className={`rounded-2xl border ${card.border} p-4 shadow-lg ${
                  isDark
                    ? "bg-[#0b1928]/82 shadow-black/20"
                    : "bg-white/95 shadow-slate-300/45"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-400" : "text-slate-600"}`}>{card.label}</p>
                  <span className={`rounded-lg p-2 ${isDark ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                    <Icon size={14} />
                  </span>
                </div>
                <p className={`text-2xl font-bold ${isDark ? card.toneDark : card.toneLight}`}>{loading ? "..." : card.value}</p>
                <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{card.note}</p>
              </article>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <article className={`rounded-3xl border border-cyan-400/20 p-4 shadow-xl xl:col-span-2 ${
            isDark
              ? "bg-[#0a1a2a]/82 shadow-black/20"
              : "bg-white/95 shadow-slate-300/45"
          }`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-lg font-bold sm:text-xl ${isDark ? "text-cyan-100" : "text-cyan-900"}`}>{t({ en: "Incident Velocity (Last 14 Days)", mr: "घटना वेग (मागील १४ दिवस)" })}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-cyan-500/15 text-cyan-100" : "bg-cyan-100 text-cyan-800"}`}>
                {t({ en: "Updated live", mr: "लाईव्ह अपडेट" })}
              </span>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={chartGridColor} />
                  <XAxis dataKey="label" stroke={axisColor} tickLine={false} axisLine={false} />
                  <YAxis stroke={axisColor} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: "#67e8f9", strokeDasharray: "3 3" }}
                    contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "10px", color: isDark ? "#d7e7f6" : "#1b334b" }}
                  />
                  <Area type="monotone" dataKey="incidents" stroke="#22d3ee" strokeWidth={2.5} fill="url(#incidentGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className={`rounded-3xl border border-amber-400/20 p-4 shadow-xl ${
            isDark
              ? "bg-[#0b1a29]/85 shadow-black/20"
              : "bg-white/95 shadow-slate-300/45"
          }`}>
            <h2 className={`mb-3 text-lg font-bold sm:text-xl ${isDark ? "text-amber-100" : "text-amber-900"}`}>{t({ en: "Case Status Mix", mr: "प्रकरण स्थिती मिश्रण" })}</h2>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.caseStatusData} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={isDark ? "#2f2b23" : "#ddcfad"} />
                  <XAxis dataKey="label" stroke={isDark ? "#d5c7a0" : "#876f3d"} tickLine={false} axisLine={false} />
                  <YAxis stroke={isDark ? "#d5c7a0" : "#876f3d"} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? "#19140a" : "#fffaf0", border: `1px solid ${isDark ? "#5b4220" : "#ceb98a"}`, borderRadius: "10px", color: isDark ? "#f7edd0" : "#4f3d1c" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {analytics.caseStatusData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={
                          entry.key === "Closed"
                            ? "#34d399"
                            : entry.key === "Investigating"
                            ? "#f59e0b"
                            : entry.key === "Assigned"
                            ? "#38bdf8"
                            : "#fb7185"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <article className={`rounded-3xl border border-sky-400/20 p-4 shadow-xl xl:col-span-2 ${
            isDark
              ? "bg-[#0a1827]/85 shadow-black/20"
              : "bg-white/95 shadow-slate-300/45"
          }`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-lg font-bold sm:text-xl ${isDark ? "text-sky-100" : "text-sky-900"}`}>{t({ en: "Top Crime Categories", mr: "शीर्ष गुन्हे प्रकार" })}</h2>
              <button
                type="button"
                onClick={() => navigate("/police/analytics")}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  isDark
                    ? "border-sky-300/30 bg-sky-400/12 text-sky-100 hover:bg-sky-400/20"
                    : "border-sky-400/40 bg-sky-100 text-sky-800 hover:bg-sky-200"
                }`}
              >
                {t({ en: "Open Full Analytics", mr: "संपूर्ण विश्लेषण उघडा" })}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.typeData.length ? analytics.typeData : [{ name: "No Data", value: 1 }]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={68}
                      outerRadius={102}
                      paddingAngle={3}
                    >
                      {(analytics.typeData.length ? analytics.typeData : [{ name: "No Data", value: 1 }]).map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={analytics.typeData.length ? CHART_COLORS[index % CHART_COLORS.length] : "#475569"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#0d1724", border: "1px solid #1f3b52", borderRadius: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {(analytics.typeData.length ? analytics.typeData : [{ name: t({ en: "No data available", mr: "डेटा उपलब्ध नाही" }), value: 0 }]).map((item, idx) => (
                  <div key={item.name} className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/5" : "border-slate-300 bg-slate-50"}`}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>{item.name}</span>
                      <span className={isDark ? "text-slate-300" : "text-slate-700"}>{item.value}</span>
                    </div>
                    <div className={`h-2 overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${
                            crimes.length > 0 ? Math.max(6, (item.value / crimes.length) * 100) : item.value > 0 ? 8 : 0
                          }%`,
                          backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className={`rounded-3xl border border-teal-400/20 p-4 shadow-xl ${
            isDark
              ? "bg-[#0a1825]/88 shadow-black/20"
              : "bg-white/95 shadow-slate-300/45"
          }`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-lg font-bold sm:text-xl ${isDark ? "text-teal-100" : "text-teal-900"}`}>{t({ en: "District Pressure", mr: "जिल्हा दबाव" })}</h2>
              <FiTrendingUp className={isDark ? "text-teal-200" : "text-teal-700"} />
            </div>

            <div className="space-y-2">
              {(analytics.districtData.length ? analytics.districtData : [{ name: "No district data", incidents: 0 }]).map((district, idx) => {
                const max = analytics.districtData[0]?.incidents || 1;
                const width = district.incidents > 0 ? (district.incidents / max) * 100 : 0;
                return (
                  <div key={district.name} className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/5" : "border-slate-300 bg-slate-50"}`}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className={`font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{district.name}</span>
                      <span className={`font-semibold ${isDark ? "text-teal-100" : "text-teal-700"}`}>{district.incidents}</span>
                    </div>
                    <div className={`h-2 overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-300 to-cyan-400"
                        style={{ width: `${Math.max(width, district.incidents > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                    <p className={`mt-2 text-[11px] uppercase tracking-[0.1em] ${isDark ? "text-slate-400" : "text-slate-600"}`}>{t({ en: "Rank", mr: "क्रमांक" })} #{idx + 1}</p>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <article className={`rounded-3xl border p-4 shadow-xl xl:col-span-2 ${
            isDark
              ? "border-white/12 bg-[#0b1724]/85 shadow-black/20"
              : "border-slate-300 bg-white/95 shadow-slate-300/45"
          }`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-lg font-bold sm:text-xl ${isDark ? "text-white" : "text-slate-900"}`}>{t({ en: "Latest Incident Stream", mr: "नवीनतम घटना प्रवाह" })}</h2>
              <button
                type="button"
                onClick={() => navigate("/police/live-feed")}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  isDark
                    ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100 hover:bg-cyan-300/20"
                    : "border-cyan-400/45 bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
                }`}
              >
                <FiActivity size={14} />
                {t({ en: "Open Live Feed", mr: "लाईव्ह फीड उघडा" })}
              </button>
            </div>

            <div className="space-y-2">
              {analytics.latest.length > 0 ? (
                analytics.latest.map((incident) => (
                  <div
                    key={incident.id || `${incident.type}-${incident.location}`}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${isDark ? "border-white/10 bg-white/5" : "border-slate-300 bg-slate-50"}`}
                  >
                    <div>
                      <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>{incident.type}</p>
                      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{incident.location}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${isDark ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-cyan-400/40 bg-cyan-100 text-cyan-800"}`}>
                        {t({
                          en: incident.caseStatus,
                          mr:
                            incident.caseStatus === "Closed"
                              ? "बंद"
                              : incident.caseStatus === "Investigating"
                              ? "तपास सुरू"
                              : incident.caseStatus === "Assigned"
                              ? "नेमलेले"
                              : "उघडे",
                        })}
                      </span>
                      <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {incident.time ? incident.time.toLocaleString() : t({ en: "Unknown time", mr: "वेळ उपलब्ध नाही" })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`rounded-xl border px-4 py-6 text-center text-sm ${isDark ? "border-white/10 bg-white/5 text-slate-400" : "border-slate-300 bg-slate-50 text-slate-600"}`}>
                  {t({ en: "No incident stream records available yet.", mr: "घटना प्रवाह नोंदी अद्याप उपलब्ध नाहीत." })}
                </div>
              )}
            </div>
          </article>

          <article className={`rounded-3xl border p-4 shadow-xl ${
            isDark
              ? "border-white/12 bg-[#0b1724]/85 shadow-black/20"
              : "border-slate-300 bg-white/95 shadow-slate-300/45"
          }`}>
            <h2 className={`mb-4 text-lg font-bold sm:text-xl ${isDark ? "text-white" : "text-slate-900"}`}>{t({ en: "Quick Launch", mr: "त्वरित प्रवेश" })}</h2>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => navigate("/police/add-crime")}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${isDark ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/20" : "border-cyan-300 bg-cyan-100 text-cyan-900 hover:bg-cyan-200"}`}
              >
                <FiFilePlus className="shrink-0" size={16} />
                <span className="text-sm font-semibold">{t({ en: "Create New Crime Report", mr: "नवीन गुन्हा अहवाल तयार करा" })}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/police/hotspots")}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${isDark ? "border-rose-300/30 bg-rose-300/10 text-rose-50 hover:bg-rose-300/20" : "border-rose-300 bg-rose-100 text-rose-900 hover:bg-rose-200"}`}
              >
                <FiMapPin className="shrink-0" size={16} />
                <span className="text-sm font-semibold">{t({ en: "Open Hotspot Map", mr: "हॉटस्पॉट नकाशा उघडा" })}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/police/officers")}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${isDark ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-50 hover:bg-emerald-300/20" : "border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200"}`}
              >
                <FiUsers className="shrink-0" size={16} />
                <span className="text-sm font-semibold">{t({ en: "Assign Officers to Cases", mr: "प्रकरणांना अधिकारी नेमा" })}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/police/train-model")}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${isDark ? "border-amber-300/30 bg-amber-300/10 text-amber-50 hover:bg-amber-300/20" : "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"}`}
              >
                <FiShield className="shrink-0" size={16} />
                <span className="text-sm font-semibold">{t({ en: "Retrain Prediction Model", mr: "पूर्वानुमान मॉडेल पुन्हा प्रशिक्षित करा" })}</span>
              </button>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

export default PoliceDashboard;
