import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { apiDelete, apiGet } from "../utils/api";
import { normalizeCrimeList } from "../utils/crime";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import EditCrimeModal from "./EditCrimeModal";

const fieldValue = (value, fallback = "—") => {
  const text = String(value ?? "").trim();
  return text ? text : fallback;
};

const buildSecondaryLabel = (crime) => {
  const parts = [
    crime.village,
    crime.subdistrict,
    crime.district,
    crime.state,
    crime.location,
  ]
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
};

function CrimeRecords() {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const [crimes, setCrimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const fetchCrimes = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    setRefreshing(true);
    setError("");

    try {
      const data = await apiGet("/police/crimes");
      const normalized = normalizeCrimeList(data);
      setCrimes(normalized);
      if (!selectedId && normalized.length > 0) {
        setSelectedId(normalized[0]._id);
      }
    } catch (err) {
      console.error("Failed to fetch crimes:", err);
      setError(err?.message || "Failed to fetch crimes");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrimes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return crimes;

    return crimes.filter((crime) => {
      const haystack = [
        crime.type,
        crime.date,
        crime.time,
        crime.location,
        crime.state,
        crime.district,
        crime.subdistrict,
        crime.village,
        crime.firNo,
        crime.policeStation,
        crime.section,
        crime.description,
      ]
        .map((item) => String(item ?? "").toLowerCase())
        .join(" ");

      return haystack.includes(q);
    });
  }, [crimes, query]);

  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1;
    return filtered.findIndex((crime) => String(crime._id) === String(selectedId));
  }, [filtered, selectedId]);

  const selectedCrime = selectedIndex >= 0 ? filtered[selectedIndex] : null;

  useEffect(() => {
    if (!selectedId) return;
    if (selectedIndex >= 0) return;
    if (filtered.length > 0) {
      setSelectedId(filtered[0]._id);
    } else {
      setSelectedId(null);
    }
  }, [filtered, selectedId, selectedIndex]);

  const selectByIndex = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= filtered.length) return;
    const crime = filtered[nextIndex];
    if (!crime) return;
    setSelectedId(crime._id);
  };

  const handleDelete = async (crime) => {
    if (!crime?._id) return;
    const confirmText = t({
      en: "Are you sure you want to delete this crime record?",
      mr: "हा गुन्हा नोंद रेकॉर्ड हटवायचा आहे का?",
    });
    if (!window.confirm(confirmText)) return;

    try {
      await apiDelete(`/police/crime/${crime._id}`);
      toast.success(t({ en: "Crime record deleted.", mr: "गुन्हा नोंद हटवली." }));
      setMobileDetailOpen(false);
      await fetchCrimes({ silent: true });
    } catch (err) {
      console.error("Failed to delete crime:", err);
      toast.error(err?.message || t({ en: "Failed to delete crime record.", mr: "गुन्हा नोंद हटवता आली नाही." }));
    }
  };

  const shellClass = isDark
    ? "bg-[radial-gradient(circle_at_82%_-18%,_#1f5d86_0%,_#08131f_45%,_#040a10_100%)]"
    : "bg-[radial-gradient(circle_at_82%_-18%,_#c6e3ff_0%,_#eef5fd_48%,_#e6edf7_100%)]";

  const cardClass = isDark
    ? "bg-[#0b1724]/85 border-white/12"
    : "bg-white/95 border-slate-300";

  const mutedText = isDark ? "text-slate-300" : "text-slate-600";
  const strongText = isDark ? "text-white" : "text-slate-900";

  return (
    <div className={`min-h-[calc(100vh-73px)] ${shellClass}`}>
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className={`rounded-3xl border p-5 shadow-2xl sm:p-7 ${cardClass}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-[240px]">
              <p
                className={`mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                  isDark ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-cyan-600/25 bg-cyan-100 text-cyan-800"
                }`}
              >
                <FiAlertTriangle size={13} />
                {t({ en: "Crime Records", mr: "गुन्हे नोंदी" })}
              </p>
              <h2 className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${strongText}`}>
                {t({ en: "Incident Register", mr: "घटना नोंदणी" })}
              </h2>
              <p className={`mt-2 text-sm ${mutedText}`}>
                {t({
                  en: "Search and review incidents. Open a record to navigate with Previous / Next.",
                  mr: "घटना शोधा आणि तपासा. नोंद उघडून मागे / पुढे नेव्हिगेट करा.",
                })}
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
              <div className="w-full sm:max-w-[420px]">
                <label className={`mb-1 block text-xs font-semibold uppercase tracking-[0.12em] ${mutedText}`}>
                  {t({ en: "Search", mr: "शोध" })}
                </label>
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isDark ? "border-white/12 bg-white/5" : "border-slate-300 bg-slate-50"}`}>
                  <FiSearch className={isDark ? "text-cyan-200" : "text-cyan-700"} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t({ en: "Type, FIR no, station, location...", mr: "प्रकार, FIR क्रमांक, स्टेशन, ठिकाण..." })}
                    className={`w-full bg-transparent text-sm outline-none ${strongText} placeholder:${isDark ? "text-slate-400" : "text-slate-500"}`}
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className={`rounded-lg p-1 transition ${isDark ? "text-slate-200 hover:bg-white/10" : "text-slate-700 hover:bg-slate-200"}`}
                      title={t({ en: "Clear search", mr: "शोध साफ करा" })}
                    >
                      <FiX />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                    isDark ? "border-white/12 bg-white/6 text-slate-100" : "border-slate-300 bg-white text-slate-800"
                  }`}
                >
                  {t({ en: "Total", mr: "एकूण" })}{" "}
                  <span className={isDark ? "text-cyan-200" : "text-cyan-700"}>{crimes.length}</span>
                </span>
                <button
                  type="button"
                  onClick={() => fetchCrimes({ silent: true })}
                  disabled={refreshing}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    isDark ? "border-white/20 bg-white/8 text-white hover:bg-white/12" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <FiRefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                  {t({ en: "Refresh", mr: "रीफ्रेश" })}
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${isDark ? "border-rose-300/35 bg-rose-300/10 text-rose-100" : "border-rose-300 bg-rose-50 text-rose-900"}`}>
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
            <section className={`rounded-2xl border ${isDark ? "border-white/12 bg-white/5" : "border-slate-300 bg-slate-50"} overflow-hidden`}>
              <div className={`flex items-center justify-between gap-2 border-b px-4 py-3 ${isDark ? "border-white/10" : "border-slate-200"}`}>
                <p className={`text-sm font-semibold ${strongText}`}>
                  {t({ en: "Records", mr: "नोंदी" })}{" "}
                  <span className={mutedText}>({filtered.length})</span>
                </p>
                {loading ? (
                  <span className={`text-xs font-semibold ${mutedText}`}>{t({ en: "Loading...", mr: "लोड होत आहे..." })}</span>
                ) : null}
              </div>

              <div className="max-h-[65vh] overflow-y-auto">
                {loading ? (
                  <div className={`px-4 py-6 text-sm ${mutedText}`}>{t({ en: "Fetching crime records...", mr: "गुन्हे नोंदी मिळवत आहे..." })}</div>
                ) : filtered.length === 0 ? (
                  <div className={`px-4 py-6 text-sm ${mutedText}`}>{t({ en: "No records match your search.", mr: "तुमच्या शोधाशी जुळणाऱ्या नोंदी नाहीत." })}</div>
                ) : (
                  filtered.map((crime) => {
                    const active = String(crime._id) === String(selectedId);
                    return (
                      <button
                        key={crime._id}
                        type="button"
                        onClick={() => {
                          setSelectedId(crime._id);
                          setMobileDetailOpen(true);
                        }}
                        className={`w-full text-left px-4 py-3 border-b transition ${
                          isDark ? "border-white/8" : "border-slate-200"
                        } ${
                          active
                            ? isDark
                              ? "bg-cyan-500/12"
                              : "bg-cyan-100/70"
                            : isDark
                            ? "hover:bg-white/6"
                            : "hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`truncate text-sm font-semibold ${active ? (isDark ? "text-cyan-100" : "text-cyan-900") : strongText}`}>
                              {fieldValue(crime.type)}
                            </p>
                            <p className={`mt-1 truncate text-xs ${mutedText}`}>{buildSecondaryLabel(crime)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={`text-xs font-semibold ${mutedText}`}>{fieldValue(crime.date)}</p>
                            <p className={`mt-1 text-[11px] ${mutedText}`}>{fieldValue(crime.time)}</p>
                          </div>
                        </div>
                        {crime.firNo ? (
                          <p className={`mt-2 text-[11px] ${mutedText}`}>
                            <span className="font-semibold">{t({ en: "FIR", mr: "FIR" })}:</span> {crime.firNo}
                          </p>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="hidden lg:block">
              <CrimeDetailPanel
                crime={selectedCrime}
                isDark={isDark}
                t={t}
                onPrev={() => selectByIndex(selectedIndex - 1)}
                onNext={() => selectByIndex(selectedIndex + 1)}
                hasPrev={selectedIndex > 0}
                hasNext={selectedIndex >= 0 && selectedIndex < filtered.length - 1}
                onEdit={() => selectedCrime && setEditData(selectedCrime)}
                onDelete={() => selectedCrime && handleDelete(selectedCrime)}
              />
            </section>
          </div>
        </div>
      </div>

      {mobileDetailOpen ? (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileDetailOpen(false)}
            role="presentation"
          />
          <div className={`absolute inset-x-0 bottom-0 max-h-[90vh] rounded-t-3xl border shadow-2xl ${cardClass}`}>
            <div className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? "border-white/10" : "border-slate-200"}`}>
              <p className={`text-sm font-semibold ${strongText}`}>{t({ en: "Record details", mr: "नोंद तपशील" })}</p>
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className={`rounded-xl p-2 transition ${isDark ? "text-slate-100 hover:bg-white/10" : "text-slate-800 hover:bg-slate-100"}`}
              >
                <FiX />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4">
              <CrimeDetailPanel
                crime={selectedCrime}
                isDark={isDark}
                t={t}
                onPrev={() => selectByIndex(selectedIndex - 1)}
                onNext={() => selectByIndex(selectedIndex + 1)}
                hasPrev={selectedIndex > 0}
                hasNext={selectedIndex >= 0 && selectedIndex < filtered.length - 1}
                onEdit={() => selectedCrime && setEditData(selectedCrime)}
                onDelete={() => selectedCrime && handleDelete(selectedCrime)}
                compact
              />
            </div>
          </div>
        </div>
      ) : null}

      {editData ? (
        <EditCrimeModal
          crime={editData}
          onClose={() => setEditData(null)}
          onUpdate={() => fetchCrimes({ silent: true })}
        />
      ) : null}
    </div>
  );
}

function CrimeDetailPanel({
  crime,
  isDark,
  t,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onEdit,
  onDelete,
  compact = false,
}) {
  const panelClass = isDark
    ? "border-white/12 bg-white/5"
    : "border-slate-300 bg-white";
  const strongText = isDark ? "text-white" : "text-slate-900";
  const mutedText = isDark ? "text-slate-300" : "text-slate-600";

  if (!crime) {
    return (
      <div className={`rounded-2xl border p-5 ${panelClass}`}>
        <p className={`text-sm ${mutedText}`}>{t({ en: "Select a record to view details.", mr: "तपशील पाहण्यासाठी नोंद निवडा." })}</p>
      </div>
    );
  }

  const coordText =
    typeof crime.latitude === "number" && typeof crime.longitude === "number"
      ? `${crime.latitude.toFixed(5)}, ${crime.longitude.toFixed(5)}`
      : "—";

  return (
    <div className={`rounded-2xl border ${panelClass} overflow-hidden`}>
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 ${isDark ? "border-white/10" : "border-slate-200"}`}>
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${mutedText}`}>
            {t({ en: "Selected record", mr: "निवडलेली नोंद" })}
          </p>
          <h3 className={`mt-1 truncate text-lg font-bold ${strongText}`}>{fieldValue(crime.type)}</h3>
          <p className={`mt-1 truncate text-xs ${mutedText}`}>
            {fieldValue(crime.date)} · {fieldValue(crime.time)} · {fieldValue(crime.location)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isDark ? "border-white/16 bg-white/8 text-white hover:bg-white/12" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
            }`}
          >
            <FiChevronLeft />
            {t({ en: "Previous", mr: "मागे" })}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isDark ? "border-white/16 bg-white/8 text-white hover:bg-white/12" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
            }`}
          >
            {t({ en: "Next", mr: "पुढे" })}
            <FiChevronRight />
          </button>
        </div>
      </div>

      <div className={`${compact ? "px-4 py-4" : "px-6 py-5"} space-y-5`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoBlock label={t({ en: "FIR No", mr: "FIR क्रमांक" })} value={fieldValue(crime.firNo)} isDark={isDark} />
          <InfoBlock
            label={t({ en: "Police Station", mr: "पोलीस स्टेशन" })}
            value={fieldValue(crime.policeStation)}
            isDark={isDark}
          />
          <InfoBlock label={t({ en: "Section", mr: "कलम" })} value={fieldValue(crime.section)} isDark={isDark} />
          <InfoBlock label={t({ en: "Coordinates", mr: "समन्वय" })} value={coordText} isDark={isDark} mono />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoBlock label={t({ en: "State", mr: "राज्य" })} value={fieldValue(crime.state)} isDark={isDark} />
          <InfoBlock label={t({ en: "District", mr: "जिल्हा" })} value={fieldValue(crime.district)} isDark={isDark} />
          <InfoBlock label={t({ en: "Taluka", mr: "तालुका" })} value={fieldValue(crime.subdistrict)} isDark={isDark} />
          <InfoBlock label={t({ en: "Village", mr: "गाव" })} value={fieldValue(crime.village)} isDark={isDark} />
        </div>

        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {t({ en: "Description", mr: "वर्णन" })}
          </p>
          <div className={`mt-2 rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
            isDark ? "border-white/10 bg-black/20 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
          }`}>
            {fieldValue(crime.description)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            {t({ en: "Edit", mr: "संपादित" })}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {t({ en: "Delete", mr: "हटवा" })}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value, isDark, mono = false }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-300" : "text-slate-600"}`}>{label}</p>
      <p className={`mt-1 text-sm font-semibold ${isDark ? "text-slate-50" : "text-slate-900"} ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export default CrimeRecords;

