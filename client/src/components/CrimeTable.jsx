import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";

// Read backend base URL from Vite env. If not provided, use relative paths (same origin)
const API = import.meta.env.VITE_BACKEND_URL ? import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '') : '';
import EditCrimeModal from "./EditCrimeModal";
import { FiEdit2, FiTrash2, FiAlertTriangle, FiMapPin, FiEye, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import districts from "../data/districts";

function CrimeTable() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [crimeData, setCrimeData] = useState([]);
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [viewModalData, setViewModalData] = useState(null);
  const [viewModalIndex, setViewModalIndex] = useState(0);
  const [filterState, setFilterState] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  
  // Get list of states from districts data
  const states = districts?.states?.map(s => s.state) || [];
  
  // Get districts for selected state
  const districtList = useMemo(() => {
    if (!filterState) return [];
    const stateObj = districts?.states?.find(s => s.state === filterState);
    return stateObj?.districts || [];
  }, [filterState]);

  const fetchCrimes = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API}/police/crimes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setCrimeData(res.data);
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (err) {
      console.error("Failed to fetch crimes:", err);
      setError(err.response?.data?.error || err.message || "Failed to fetch crimes");
    } finally {
      setLoading(false);
    }
  };

  const deleteCrime = async (id) => {
    if (!window.confirm(t({ en: "Are you sure you want to delete this crime record?", mr: "हा गुन्हा नोंद रेकॉर्ड हटवायचा आहे का?" }))) {
      return;
    }

    try {
      await axios.delete(`${API}/police/crime/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success(t({ en: "Crime record deleted.", mr: "गुन्हा नोंद हटवली." }));
      fetchCrimes();
    } catch (err) {
      console.error("Failed to delete crime:", err);
      toast.error(err.response?.data?.error || t({ en: "Failed to delete crime record.", mr: "गुन्हा नोंद हटवता आली नाही." }));
    }
  };

  const deleteMultipleCrimes = async () => {
    if (selectedIds.size === 0) {
      toast.error(t({ en: "No records selected", mr: "कोणतीही नोंद निवडलेली नाही" }));
      return;
    }

    if (!window.confirm(t({ en: `Delete ${selectedIds.size} selected records?`, mr: `${selectedIds.size} निवडलेल्या नोंदी हटवायच्या?` }))) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          axios.delete(`${API}/police/crime/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          })
        )
      );
      toast.success(t({ en: `${selectedIds.size} records deleted.`, mr: `${selectedIds.size} नोंदी हटवल्या.` }));
      fetchCrimes();
    } catch (err) {
      console.error("Failed to delete crimes:", err);
      toast.error(t({ en: "Failed to delete some records", mr: "काही नोंदी हटवता आली नाही" }));
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredCrimes.map(c => c._id));
      setSelectedIds(allIds);
      setSelectAll(true);
    }
  };

  const toggleSelectId = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === filteredCrimes.length && filteredCrimes.length > 0);
  };

  const filteredCrimes = useMemo(() => {
    return crimeData.filter(crime => {
      const stateMatch = !filterState || crime.location?.includes(filterState);
      const districtMatch = !filterDistrict || crime.location?.includes(filterDistrict);
      return stateMatch && districtMatch;
    });
  }, [crimeData, filterState, filterDistrict]);

  const openViewModal = (crime) => {
    setViewModalData(crime);
    setViewModalIndex(filteredCrimes.findIndex(c => c._id === crime._id));
  };

  const goToPrevious = () => {
    if (viewModalIndex > 0) {
      const prevCrime = filteredCrimes[viewModalIndex - 1];
      setViewModalData(prevCrime);
      setViewModalIndex(viewModalIndex - 1);
    }
  };

  const goToNext = () => {
    if (viewModalIndex < filteredCrimes.length - 1) {
      const nextCrime = filteredCrimes[viewModalIndex + 1];
      setViewModalData(nextCrime);
      setViewModalIndex(viewModalIndex + 1);
    }
  };

  useEffect(() => {
    fetchCrimes();
  }, []);

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className={`shadow-2xl rounded-2xl mt-8 overflow-hidden border ${
        isDark
          ? "bg-gradient-to-br from-slate-800 to-slate-900 border-blue-500/30"
          : "bg-gradient-to-br from-white to-slate-100 border-slate-300"
      }`}>
        {/* Header */}
        <div className={`p-8 flex items-center justify-between border-b ${
          isDark ? "border-blue-500/20" : "border-slate-300"
        }`}>
          <h2 className={`text-3xl font-bold flex items-center gap-3 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            <span className={`p-3 rounded-lg ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>
              <FiAlertTriangle className={`text-2xl ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            </span>
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t({ en: "Crime Records", mr: "गुन्हे नोंदी" })}
            </span>
          </h2>
          <button
            onClick={fetchCrimes}
            className={`text-sm font-semibold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
              isDark
                ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-blue-500/30"
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-blue-400/30"
            }`}
            disabled={loading}
          >
            {loading ? t({ en: "🔄 Refreshing...", mr: "🔄 रिफ्रेश होत आहे..." }) : t({ en: "🔄 Refresh", mr: "🔄 रिफ्रेश" })}
          </button>
        </div>

        {error && (
          <div className={`m-6 text-sm rounded-xl p-4 border ${
            isDark
              ? "text-red-300 bg-red-500/10 border-red-500/30"
              : "text-red-700 bg-red-100 border-red-300"
          }`}>
            ⚠️ {error}
          </div>
        )}
        
        <div className="p-8">
          {/* Filters */}
          <div className={`mb-6 p-4 rounded-lg border ${
            isDark
              ? "bg-slate-700/50 border-slate-600"
              : "bg-slate-50 border-slate-200"
          }`}>
            <h3 className={`text-sm font-semibold mb-4 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {t({ en: "Filters", mr: "फिल्टर्स" })}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {t({ en: "State", mr: "राज्य" })}
                </label>
                <select
                  value={filterState}
                  onChange={(e) => {
                    setFilterState(e.target.value);
                    setFilterDistrict("");
                  }}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? "bg-slate-800 border-slate-600 text-slate-100 focus:border-blue-500"
                      : "bg-white border-slate-300 text-slate-900 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="">
                    {t({ en: "All States", mr: "सर्व राज्य" })}
                  </option>
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {t({ en: "District", mr: "जिल्हा" })}
                </label>
                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  disabled={!filterState}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? "bg-slate-800 border-slate-600 text-slate-100 focus:border-blue-500 disabled:opacity-50"
                      : "bg-white border-slate-300 text-slate-900 focus:border-blue-500 disabled:opacity-50"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="">
                    {t({ en: "All Districts", mr: "सर्व जिल्हे" })}
                  </option>
                  {districtList.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
            </div>
            {(filterState || filterDistrict) && (
              <button
                onClick={() => {
                  setFilterState("");
                  setFilterDistrict("");
                }}
                className={`mt-3 text-xs font-semibold px-3 py-1 rounded ${
                  isDark
                    ? "bg-slate-600 hover:bg-slate-500 text-slate-100"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-900"
                }`}
              >
                {t({ en: "Clear Filters", mr: "फिल्टर्स क्लियर करा" })}
              </button>
            )}
          </div>

          {/* Bulk Delete Section */}
          {selectedIds.size > 0 && (
            <div className={`mb-6 p-4 rounded-lg border flex items-center justify-between ${
              isDark
                ? "bg-red-500/10 border-red-500/30"
                : "bg-red-100 border-red-300"
            }`}>
              <span className={`text-sm font-semibold ${isDark ? "text-red-300" : "text-red-700"}`}>
                {t({ en: `${selectedIds.size} record(s) selected`, mr: `${selectedIds.size} नोंद(ी) निवडलेली` })}
              </span>
              <button
                onClick={deleteMultipleCrimes}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              >
                {t({ en: "🗑️ Delete Selected", mr: "🗑️ निवडलेली हटवा" })}
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className={`w-12 h-12 border-4 rounded-full animate-spin mb-4 ${
                isDark
                  ? "border-blue-400/20 border-t-blue-400"
                  : "border-blue-300 border-t-blue-600"
              }`}></div>
              <p className={`font-medium ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                {t({ en: "Loading crime records...", mr: "गुन्हा नोंदी लोड होत आहेत..." })}
              </p>
            </div>
          ) : filteredCrimes.length === 0 ? (
            <div className={`text-center py-16 font-medium ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              <p className="text-2xl mb-2">{t({ en: "🚫 No crime records found", mr: "🚫 कोणतीही गुन्हा नोंद आढळली नाही" })}</p>
              <p className={`text-sm ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                {t({ en: "Add your first crime report or adjust filters", mr: "पहिला गुन्हा अहवाल जोडा किंवा फिल्टर्स समायोजित करा" })}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full min-w-max">
                <thead className={`border-b sticky top-0 z-10 ${
                  isDark
                    ? "bg-gradient-to-r from-blue-600/80 to-blue-700/80 text-blue-100 border-blue-500/30"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-300"
                }`}>
                  <tr>
                    <th className="p-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-4 text-left font-semibold whitespace-nowrap">
                      {t({ en: "Type", mr: "प्रकार" })}
                    </th>
                    <th className="p-4 text-left font-semibold whitespace-nowrap">
                      {t({ en: "Date", mr: "दिनांक" })}
                    </th>
                    <th className="p-4 text-left font-semibold whitespace-nowrap">
                      {t({ en: "Location", mr: "ठिकाण" })}
                    </th>
                    <th className="p-4 text-left font-semibold whitespace-nowrap">
                      {t({ en: "Status", mr: "स्थिति" })}
                    </th>
                    <th className="p-4 text-center font-semibold whitespace-nowrap">
                      {t({ en: "Actions", mr: "क्रिया" })}
                    </th>
                  </tr>
                </thead>

                <tbody className={`divide-y ${isDark ? "divide-slate-700/30" : "divide-slate-200"}`}>
                  {filteredCrimes.map((crime) => (
                    <tr
                      key={crime._id}
                      className={`transition duration-200 ${
                        isDark
                          ? "bg-slate-900/30 hover:bg-slate-800/50 border-slate-700/30"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(crime._id)}
                          onChange={() => toggleSelectId(crime._id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className={`p-4 font-semibold flex items-center gap-2 ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                        <FiAlertTriangle className={isDark ? "text-blue-500" : "text-blue-600"} />
                        <span className={`px-3 py-1 rounded-lg text-sm ${
                          isDark ? "bg-blue-500/10" : "bg-blue-100"
                        }`}>
                          {crime.type}
                        </span>
                      </td>
                      <td className={`p-4 text-sm ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                        {crime.date}
                      </td>
                      <td className={`p-4 flex items-center gap-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                        <FiMapPin className={isDark ? "text-cyan-400" : "text-cyan-600"} size={14} />
                        <span className="truncate max-w-xs">{crime.location}</span>
                      </td>
                      <td className={`p-4 text-sm ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          crime.caseStatus === "Open"
                            ? isDark ? "bg-yellow-500/20 text-yellow-300" : "bg-yellow-100 text-yellow-800"
                            : isDark ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-800"
                        }`}>
                          {crime.caseStatus || t({ en: "Open", mr: "उघड" })}
                        </span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="inline-flex gap-2 flex-wrap justify-center">
                          <button
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-lg transform hover:scale-105 ${
                              isDark
                                ? "bg-cyan-600/80 hover:bg-cyan-600 text-white hover:shadow-cyan-500/30"
                                : "bg-cyan-500 hover:bg-cyan-600 text-white hover:shadow-cyan-400/30"
                            }`}
                            onClick={() => openViewModal(crime)}
                            title={t({ en: "View details", mr: "तपशील पहा" })}
                          >
                            <FiEye size={14} />
                            <span className="hidden xs:inline">
                              {t({ en: "View", mr: "पहा" })}
                            </span>
                          </button>
                          <button
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-lg transform hover:scale-105 ${
                              isDark
                                ? "bg-amber-600/80 hover:bg-amber-600 text-white hover:shadow-amber-500/30"
                                : "bg-amber-500 hover:bg-amber-600 text-white hover:shadow-amber-400/30"
                            }`}
                            onClick={() => setEditData(crime)}
                            title={t({ en: "Edit", mr: "संपादित करा" })}
                          >
                            <FiEdit2 size={14} />
                            <span className="hidden xs:inline">
                              {t({ en: "Edit", mr: "संपादित" })}
                            </span>
                          </button>
                          <button
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-lg transform hover:scale-105 ${
                              isDark
                                ? "bg-red-600/80 hover:bg-red-600 text-white hover:shadow-red-500/30"
                                : "bg-red-500 hover:bg-red-600 text-white hover:shadow-red-400/30"
                            }`}
                            onClick={() => deleteCrime(crime._id)}
                            title={t({ en: "Delete", mr: "हटवा" })}
                          >
                            <FiTrash2 size={14} />
                            <span className="hidden xs:inline">
                              {t({ en: "Delete", mr: "हटवा" })}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editData && (
          <EditCrimeModal
            crime={editData}
            onClose={() => setEditData(null)}
            onUpdate={fetchCrimes}
          />
        )}

        {/* View Modal */}
        {viewModalData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
              isDark
                ? "bg-slate-900 border border-blue-500/30"
                : "bg-white border border-slate-300"
            }`}>
              {/* Modal Header */}
              <div className={`p-6 border-b flex items-center justify-between ${
                isDark ? "border-blue-500/20" : "border-slate-200"
              }`}>
                <h3 className={`text-xl font-bold ${isDark ? "text-blue-100" : "text-blue-900"}`}>
                  {t({ en: "Crime Details", mr: "गुन्हे तपशील" })}
                </h3>
                <button
                  onClick={() => setViewModalData(null)}
                  className={`p-1 rounded-lg transition-colors ${
                    isDark
                      ? "hover:bg-slate-700 text-slate-300 hover:text-slate-100"
                      : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {t({ en: "Crime Type", mr: "गुन्हे प्रकार" })}
                    </label>
                    <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {viewModalData.type}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {t({ en: "Date", mr: "दिनांक" })}
                    </label>
                    <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {viewModalData.date}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {t({ en: "Time", mr: "वेळ" })}
                    </label>
                    <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {viewModalData.time}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {t({ en: "Status", mr: "स्थिति" })}
                    </label>
                    <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {viewModalData.caseStatus || t({ en: "Open", mr: "उघड" })}
                    </p>
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {t({ en: "Location", mr: "ठिकाण" })}
                  </label>
                  <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    {viewModalData.location}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {t({ en: "Latitude", mr: "अक्षांश" })}
                    </label>
                    <p className={`font-mono text-sm ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {viewModalData.latitude?.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {t({ en: "Longitude", mr: "रेखांश" })}
                    </label>
                    <p className={`font-mono text-sm ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {viewModalData.longitude?.toFixed(6)}
                    </p>
                  </div>
                </div>

                {/* New CSV fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {t({ en: "FIR Number", mr: "एफआयआर क्रमांक" })}
                    </label>
                    <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {viewModalData.firNumber || t({ en: "N/A", mr: "न/उ" })}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {t({ en: "Section", mr: "विभाग" })}
                    </label>
                    <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {viewModalData.section || t({ en: "N/A", mr: "न/उ" })}
                    </p>
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {t({ en: "Police Station", mr: "पोलिस स्टेशन" })}
                  </label>
                  <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    {viewModalData.policeStation || t({ en: "N/A", mr: "न/उ" })}
                  </p>
                </div>

                {viewModalData.notes && (
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {t({ en: "Notes", mr: "नोट्स" })}
                    </label>
                    <p className={`${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {viewModalData.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer with Navigation */}
              <div className={`p-6 border-t flex items-center justify-between ${
                isDark ? "border-blue-500/20" : "border-slate-200"
              }`}>
                <button
                  onClick={goToPrevious}
                  disabled={viewModalIndex === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    viewModalIndex === 0
                      ? isDark ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  <FiChevronLeft size={18} />
                  {t({ en: "Previous", mr: "मागील" })}
                </button>

                <span className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {t({ en: `Record ${viewModalIndex + 1} of ${filteredCrimes.length}`, mr: `नोंद ${viewModalIndex + 1} ते ${filteredCrimes.length}` })}
                </span>

                <button
                  onClick={goToNext}
                  disabled={viewModalIndex === filteredCrimes.length - 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    viewModalIndex === filteredCrimes.length - 1
                      ? isDark ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {t({ en: "Next", mr: "पुढील" })}
                  <FiChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
}

export default CrimeTable;

