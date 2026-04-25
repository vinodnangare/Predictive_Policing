import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiEye,
  FiTrash2,
  FiEdit2,
  FiCheckSquare,
  FiSquare,
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

const buildLocationLabel = (crime) => {
  const parts = [crime.village, crime.subdistrict, crime.district, crime.state, crime.location]
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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailCrimeId, setDetailCrimeId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchCrimes = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const data = await apiGet("/police/crimes");
      const normalized = normalizeCrimeList(data);
      setCrimes(normalized);
    } catch (err) {
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
        crime.type, crime.date, crime.time, crime.location, crime.state,
        crime.district, crime.subdistrict, crime.village, crime.firNo,
        crime.policeStation, crime.section, crime.description,
      ]
        .map((item) => String(item ?? "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [crimes, query]);

  // Detail modal navigation
  const detailIndex = useMemo(
    () => filtered.findIndex((c) => String(c._id) === String(detailCrimeId)),
    [filtered, detailCrimeId]
  );
  const detailCrime = detailIndex >= 0 ? filtered[detailIndex] : null;

  const openDetail = (crime) => setDetailCrimeId(crime._id);
  const closeDetail = () => setDetailCrimeId(null);
  const goPrev = () => detailIndex > 0 && setDetailCrimeId(filtered[detailIndex - 1]._id);
  const goNext = () => detailIndex < filtered.length - 1 && setDetailCrimeId(filtered[detailIndex + 1]._id);

  // Selection
  const allFilteredIds = filtered.map((c) => String(c._id));
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(String(id))) next.delete(String(id));
      else next.add(String(id));
      return next;
    });
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
      closeDetail();
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(String(crime._id)); return n; });
      await fetchCrimes({ silent: true });
    } catch (err) {
      toast.error(err?.message || t({ en: "Failed to delete crime record.", mr: "गुन्हा नोंद हटवता आली नाही." }));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmText = t({
      en: `Delete ${selectedIds.size} selected record(s)?`,
      mr: `${selectedIds.size} निवडलेल्या नोंदी हटवायच्या आहेत का?`,
    });
    if (!window.confirm(confirmText)) return;
    setBulkDeleting(true);
    let failed = 0;
    for (const id of selectedIds) {
      try {
        await apiDelete(`/police/crime/${id}`);
      } catch {
        failed++;
      }
    }
    setBulkDeleting(false);
    setSelectedIds(new Set());
    if (failed === 0) {
      toast.success(t({ en: "Selected records deleted.", mr: "निवडलेल्या नोंदी हटवल्या." }));
    } else {
      toast.error(t({ en: `${failed} deletion(s) failed.`, mr: `${failed} नोंदी हटवता आल्या नाहीत.` }));
    }
    await fetchCrimes({ silent: true });
  };

  // Theme
  const shellClass = isDark
    ? "bg-[radial-gradient(circle_at_82%_-18%,_#1f5d86_0%,_#08131f_45%,_#040a10_100%)]"
    : "bg-[radial-gradient(circle_at_82%_-18%,_#c6e3ff_0%,_#eef5fd_48%,_#e6edf7_100%)]";
  const cardClass = isDark ? "bg-[#0b1724]/85 border-white/12" : "bg-white/95 border-slate-300";
  const mutedText = isDark ? "text-slate-300" : "text-slate-600";
  const strongText = isDark ? "text-white" : "text-slate-900";
  const tableBorder = isDark ? "border-white/10" : "border-slate-200";
  const tableRowHover = isDark ? "hover:bg-white/5" : "hover:bg-slate-50";
  const tableHead = isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600";

  return (
    <div className={`min-h-[calc(100vh-73px)] ${shellClass}`}>
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className={`rounded-3xl border p-5 shadow-2xl sm:p-7 ${cardClass}`}>

          {/* ── Header ── */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-[240px]">
              <p className={`mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                isDark ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-cyan-600/25 bg-cyan-100 text-cyan-800"
              }`}>
                <FiAlertTriangle size={13} />
                {t({ en: "Crime Records", mr: "गुन्हे नोंदी" })}
              </p>
              <h2 className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${strongText}`}>
                {t({ en: "Incident Register", mr: "घटना नोंदणी" })}
              </h2>
              <p className={`mt-2 text-sm ${mutedText}`}>
                {t({ en: "Search, select and manage crime records.", mr: "गुन्हे शोधा, निवडा आणि व्यवस्थापित करा." })}
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
              {/* Search */}
              <div className="w-full sm:max-w-[420px]">
                <label className={`mb-1 block text-xs font-semibold uppercase tracking-[0.12em] ${mutedText}`}>
                  {t({ en: "Search", mr: "शोध" })}
                </label>
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  isDark ? "border-white/12 bg-white/5" : "border-slate-300 bg-slate-50"
                }`}>
                  <FiSearch className={isDark ? "text-cyan-200" : "text-cyan-700"} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t({ en: "Type, FIR no, station, location...", mr: "प्रकार, FIR क्रमांक, स्टेशन, ठिकाण..." })}
                    className={`w-full bg-transparent text-sm outline-none ${strongText} placeholder:text-slate-400`}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className={`rounded-lg p-1 transition ${isDark ? "text-slate-200 hover:bg-white/10" : "text-slate-700 hover:bg-slate-200"}`}
                    >
                      <FiX />
                    </button>
                  )}
                </div>
              </div>

              {/* Counts + actions */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                  isDark ? "border-white/12 bg-white/6 text-slate-100" : "border-slate-300 bg-white text-slate-800"
                }`}>
                  {t({ en: "Total", mr: "एकूण" })}{" "}
                  <span className={isDark ? "text-cyan-200" : "text-cyan-700"}>{crimes.length}</span>
                </span>

                {someSelected && (
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiTrash2 size={15} />
                    {bulkDeleting
                      ? t({ en: "Deleting...", mr: "हटवत आहे..." })
                      : t({ en: `Delete (${selectedIds.size})`, mr: `हटवा (${selectedIds.size})` })}
                  </button>
                )}

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

          {/* ── Error ── */}
          {error && (
            <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
              isDark ? "border-rose-300/35 bg-rose-300/10 text-rose-100" : "border-rose-300 bg-rose-50 text-rose-900"
            }`}>
              {error}
            </div>
          )}

          {/* ── Table ── */}
          <div className={`mt-6 rounded-2xl border overflow-hidden ${isDark ? "border-white/12" : "border-slate-200"}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className={`${tableHead} text-xs uppercase tracking-[0.1em]`}>
                    {/* Select all checkbox */}
                    <th className={`w-10 px-4 py-3 border-b ${tableBorder} text-center`}>
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className={`transition ${isDark ? "text-slate-300 hover:text-white" : "text-slate-500 hover:text-slate-800"}`}
                        title={allSelected ? t({ en: "Deselect all", mr: "सर्व रद्द करा" }) : t({ en: "Select all", mr: "सर्व निवडा" })}
                      >
                        {allSelected ? <FiCheckSquare size={17} /> : <FiSquare size={17} />}
                      </button>
                    </th>
                    <th className={`px-4 py-3 text-left border-b ${tableBorder}`}>{t({ en: "Type", mr: "प्रकार" })}</th>
                    <th className={`px-4 py-3 text-left border-b ${tableBorder}`}>{t({ en: "FIR No", mr: "FIR क्र." })}</th>
                    <th className={`px-4 py-3 text-left border-b ${tableBorder}`}>{t({ en: "Police Station", mr: "पोलीस स्टेशन" })}</th>
                    <th className={`px-4 py-3 text-left border-b ${tableBorder}`}>{t({ en: "Location", mr: "ठिकाण" })}</th>
                    <th className={`px-4 py-3 text-left border-b ${tableBorder}`}>{t({ en: "Date", mr: "तारीख" })}</th>
                    <th className={`px-4 py-3 text-left border-b ${tableBorder}`}>{t({ en: "Section", mr: "कलम" })}</th>
                    <th className={`px-4 py-3 text-center border-b ${tableBorder}`}>{t({ en: "Actions", mr: "क्रिया" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className={`px-4 py-10 text-center text-sm ${mutedText}`}>
                        {t({ en: "Fetching crime records...", mr: "गुन्हे नोंदी मिळवत आहे..." })}
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={`px-4 py-10 text-center text-sm ${mutedText}`}>
                        {t({ en: "No records match your search.", mr: "तुमच्या शोधाशी जुळणाऱ्या नोंदी नाहीत." })}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((crime, idx) => {
                      const isChecked = selectedIds.has(String(crime._id));
                      const isEven = idx % 2 === 0;
                      return (
                        <tr
                          key={crime._id}
                          className={`transition ${tableRowHover} ${
                            isChecked
                              ? isDark ? "bg-cyan-500/10" : "bg-cyan-50"
                              : isEven
                              ? isDark ? "bg-white/[0.02]" : "bg-white"
                              : isDark ? "bg-white/[0.01]" : "bg-slate-50/50"
                          }`}
                        >
                          {/* Checkbox */}
                          <td className={`px-4 py-3 border-b ${tableBorder} text-center`}>
                            <button
                              type="button"
                              onClick={() => toggleSelect(crime._id)}
                              className={`transition ${
                                isChecked
                                  ? "text-cyan-400"
                                  : isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-700"
                              }`}
                            >
                              {isChecked ? <FiCheckSquare size={16} /> : <FiSquare size={16} />}
                            </button>
                          </td>

                          <td className={`px-4 py-3 border-b ${tableBorder}`}>
                            <span className={`font-semibold ${strongText}`}>{fieldValue(crime.type)}</span>
                          </td>
                          <td className={`px-4 py-3 border-b ${tableBorder}`}>
                            <span className={`font-mono text-xs ${isDark ? "text-cyan-200" : "text-cyan-700"}`}>
                              {fieldValue(crime.firNo)}
                            </span>
                          </td>
                          <td className={`px-4 py-3 border-b ${tableBorder} ${mutedText}`}>
                            {fieldValue(crime.policeStation)}
                          </td>
                          <td className={`px-4 py-3 border-b ${tableBorder} max-w-[200px]`}>
                            <span className={`block truncate text-xs ${mutedText}`} title={buildLocationLabel(crime)}>
                              {buildLocationLabel(crime)}
                            </span>
                          </td>
                          <td className={`px-4 py-3 border-b ${tableBorder} whitespace-nowrap`}>
                            <span className={`text-xs ${mutedText}`}>{fieldValue(crime.date)}</span>
                            {crime.time && (
                              <span className={`ml-1 text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                {crime.time}
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-3 border-b ${tableBorder}`}>
                            <span className={`text-xs ${mutedText}`}>{fieldValue(crime.section)}</span>
                          </td>

                          {/* Action buttons */}
                          <td className={`px-4 py-3 border-b ${tableBorder}`}>
                            <div className="flex items-center justify-center gap-1">
                              {/* View */}
                              <button
                                type="button"
                                onClick={() => openDetail(crime)}
                                title={t({ en: "View details", mr: "तपशील पहा" })}
                                className={`rounded-lg p-2 transition ${
                                  isDark
                                    ? "text-cyan-300 hover:bg-cyan-500/15"
                                    : "text-cyan-600 hover:bg-cyan-100"
                                }`}
                              >
                                <FiEye size={15} />
                              </button>
                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => setEditData(crime)}
                                title={t({ en: "Edit", mr: "संपादित" })}
                                className={`rounded-lg p-2 transition ${
                                  isDark
                                    ? "text-amber-300 hover:bg-amber-500/15"
                                    : "text-amber-600 hover:bg-amber-100"
                                }`}
                              >
                                <FiEdit2 size={15} />
                              </button>
                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDelete(crime)}
                                title={t({ en: "Delete", mr: "हटवा" })}
                                className={`rounded-lg p-2 transition ${
                                  isDark
                                    ? "text-rose-400 hover:bg-rose-500/15"
                                    : "text-rose-500 hover:bg-rose-100"
                                }`}
                              >
                                <FiTrash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            {!loading && filtered.length > 0 && (
              <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs ${tableBorder} ${mutedText} ${
                isDark ? "bg-white/[0.02]" : "bg-slate-50"
              }`}>
                <span>
                  {t({ en: "Showing", mr: "दर्शवत आहे" })}{" "}
                  <span className={strongText}>{filtered.length}</span>{" "}
                  {t({ en: "of", mr: "पैकी" })}{" "}
                  <span className={strongText}>{crimes.length}</span>{" "}
                  {t({ en: "records", mr: "नोंदी" })}
                </span>
                {someSelected && (
                  <span className={isDark ? "text-cyan-300" : "text-cyan-700"}>
                    {selectedIds.size} {t({ en: "selected", mr: "निवडले" })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail Popup Modal ── */}
      {detailCrime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeDetail}
            role="presentation"
          />

          {/* Modal panel */}
          <div className={`relative z-10 w-full max-w-2xl rounded-3xl border shadow-2xl ${
            isDark ? "bg-[#0b1724] border-white/15" : "bg-white border-slate-200"
          }`}>
            {/* Modal header */}
            <div className={`flex items-center justify-between border-b px-6 py-4 ${
              isDark ? "border-white/10" : "border-slate-200"
            }`}>
              <div className="min-w-0 pr-4">
                <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${mutedText}`}>
                  {t({ en: "Record Details", mr: "नोंद तपशील" })}
                </p>
                <h3 className={`mt-1 truncate text-lg font-bold ${strongText}`}>
                  {fieldValue(detailCrime.type)}
                </h3>
                <p className={`mt-0.5 text-xs ${mutedText}`}>
                  {fieldValue(detailCrime.date)} · {fieldValue(detailCrime.time)} · {fieldValue(detailCrime.location)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {/* Prev / Next */}
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={detailIndex <= 0}
                  title={t({ en: "Previous", mr: "मागे" })}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    isDark ? "border-white/16 bg-white/8 text-white hover:bg-white/14" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <FiChevronLeft size={15} />
                  {t({ en: "Prev", mr: "मागे" })}
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={detailIndex >= filtered.length - 1}
                  title={t({ en: "Next", mr: "पुढे" })}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    isDark ? "border-white/16 bg-white/8 text-white hover:bg-white/14" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {t({ en: "Next", mr: "पुढे" })}
                  <FiChevronRight size={15} />
                </button>
                {/* Close */}
                <button
                  type="button"
                  onClick={closeDetail}
                  className={`rounded-xl p-2 transition ${
                    isDark ? "text-slate-300 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
              {/* Record counter */}
              <p className={`text-xs ${mutedText}`}>
                {t({ en: "Record", mr: "नोंद" })} {detailIndex + 1} / {filtered.length}
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoBlock label={t({ en: "FIR No", mr: "FIR क्रमांक" })} value={fieldValue(detailCrime.firNo)} isDark={isDark} />
                <InfoBlock label={t({ en: "Police Station", mr: "पोलीस स्टेशन" })} value={fieldValue(detailCrime.policeStation)} isDark={isDark} />
                <InfoBlock label={t({ en: "Section", mr: "कलम" })} value={fieldValue(detailCrime.section)} isDark={isDark} />
                <InfoBlock
                  label={t({ en: "Coordinates", mr: "समन्वय" })}
                  value={
                    typeof detailCrime.latitude === "number" && typeof detailCrime.longitude === "number"
                      ? `${detailCrime.latitude.toFixed(5)}, ${detailCrime.longitude.toFixed(5)}`
                      : "—"
                  }
                  isDark={isDark}
                  mono
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoBlock label={t({ en: "State", mr: "राज्य" })} value={fieldValue(detailCrime.state)} isDark={isDark} />
                <InfoBlock label={t({ en: "District", mr: "जिल्हा" })} value={fieldValue(detailCrime.district)} isDark={isDark} />
                <InfoBlock label={t({ en: "Taluka", mr: "तालुका" })} value={fieldValue(detailCrime.subdistrict)} isDark={isDark} />
                <InfoBlock label={t({ en: "Village", mr: "गाव" })} value={fieldValue(detailCrime.village)} isDark={isDark} />
              </div>

              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {t({ en: "Description", mr: "वर्णन" })}
                </p>
                <div className={`mt-2 rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                  isDark ? "border-white/10 bg-black/20 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                }`}>
                  {fieldValue(detailCrime.description)}
                </div>
              </div>

              {/* Modal action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { closeDetail(); setEditData(detailCrime); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                >
                  <FiEdit2 size={14} />
                  {t({ en: "Edit", mr: "संपादित" })}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(detailCrime)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  <FiTrash2 size={14} />
                  {t({ en: "Delete", mr: "हटवा" })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editData && (
        <EditCrimeModal
          crime={editData}
          onClose={() => setEditData(null)}
          onUpdate={() => fetchCrimes({ silent: true })}
        />
      )}
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