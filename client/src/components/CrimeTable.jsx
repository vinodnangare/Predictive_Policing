import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

// Read backend base URL from Vite env. If not provided, use relative paths (same origin)
const API = import.meta.env.VITE_BACKEND_URL ? import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '') : '';
import EditCrimeModal from "./EditCrimeModal";
import { FiEdit2, FiTrash2, FiAlertTriangle, FiMapPin } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

function CrimeTable() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [crimeData, setCrimeData] = useState([]);
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCrimes = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API}/police/crimes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setCrimeData(res.data);
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
        <div className="p-8 flex items-center justify-between border-b border-blue-500/20">
          <h2 className={`text-3xl font-bold flex items-center gap-3 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            <span className="bg-blue-500/20 p-3 rounded-lg"><FiAlertTriangle className="text-blue-400 text-2xl" /></span>
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{t({ en: "Crime Records", mr: "गुन्हे नोंदी" })}</span>
          </h2>
          <button
            onClick={fetchCrimes}
            className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            disabled={loading}
          >
            {loading ? t({ en: "🔄 Refreshing...", mr: "🔄 रिफ्रेश होत आहे..." }) : t({ en: "🔄 Refresh", mr: "🔄 रिफ्रेश" })}
          </button>
        </div>

        {error && (
          <div className="m-6 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            ⚠️ {error}
          </div>
        )}
        
        <div className="p-8">
        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-blue-400">
            <div className="w-12 h-12 border-4 border-blue-400/20 border-t-blue-400 rounded-full animate-spin mb-4"></div>
            <p className={`font-medium ${isDark ? "text-gray-300" : "text-slate-600"}`}>{t({ en: "Loading crime records...", mr: "गुन्हा नोंदी लोड होत आहेत..." })}</p>
          </div>
        ) : crimeData.length === 0 ? (
          <div className={`text-center py-16 font-medium ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            <p className="text-2xl mb-2">{t({ en: "🚫 No crime records found", mr: "🚫 कोणतीही गुन्हा नोंद आढळली नाही" })}</p>
            <p className={`text-sm ${isDark ? "text-gray-500" : "text-slate-500"}`}>{t({ en: "Add your first crime report to get started", mr: "सुरुवात करण्यासाठी पहिला गुन्हा अहवाल जोडा" })}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full min-w-max">
              <thead className="bg-gradient-to-r from-blue-600/80 to-blue-700/80 text-blue-100 border-b border-blue-500/30 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-left font-semibold whitespace-nowrap">{t({ en: "Type", mr: "प्रकार" })}</th>
                  <th className="p-4 text-left font-semibold whitespace-nowrap">{t({ en: "Date", mr: "दिनांक" })}</th>
                  <th className="p-4 text-left font-semibold whitespace-nowrap">{t({ en: "Time", mr: "वेळ" })}</th>
                  <th className="p-4 text-left font-semibold whitespace-nowrap">{t({ en: "Location", mr: "ठिकाण" })}</th>
                  <th className="p-4 text-center font-semibold whitespace-nowrap min-w-[140px]">{t({ en: "Actions", mr: "क्रिया" })}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-700/30">
                {crimeData.map((crime) => (
                  <tr
                    key={crime._id}
                    className="bg-slate-900/30 hover:bg-slate-800/50 transition duration-200 border-slate-700/30"
                  >
                    <td className="p-4 font-semibold text-blue-300 flex items-center gap-2">
                      <FiAlertTriangle className="text-blue-500" />
                      <span className="bg-blue-500/10 px-3 py-1 rounded-lg text-sm">{crime.type}</span>
                    </td>
                    <td className="p-4 text-gray-300 text-sm">{crime.date}</td>
                    <td className="p-4 text-gray-300 text-sm">{crime.time}</td>
                    <td className="p-4 flex items-center gap-2 text-gray-300">
                      <FiMapPin className="text-cyan-400 flex-shrink-0" />
                      <span className="truncate">{crime.location}</span>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <div className="inline-flex gap-2 flex-wrap justify-center">
                        <button
                          className="flex items-center gap-1 bg-amber-600/80 hover:bg-amber-600 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-lg hover:shadow-amber-500/30 transform hover:scale-105 whitespace-nowrap"
                          onClick={() => setEditData(crime)}
                          title={t({ en: "Edit crime record", mr: "गुन्हा नोंद संपादित करा" })}
                        >
                          <FiEdit2 size={14} className="flex-shrink-0" />
                          <span className="hidden xs:inline">{t({ en: "Edit", mr: "संपादित" })}</span>
                        </button>
                        <button
                          className="flex items-center gap-1 bg-red-600/80 hover:bg-red-600 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-lg hover:shadow-red-500/30 transform hover:scale-105 whitespace-nowrap"
                          onClick={() => deleteCrime(crime._id)}
                          title={t({ en: "Delete crime record", mr: "गुन्हा नोंद हटवा" })}
                        >
                          <FiTrash2 size={14} className="flex-shrink-0" />
                          <span className="hidden xs:inline">{t({ en: "Delete", mr: "हटवा" })}</span>
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
      </div>
    </div>
  );
}

export default CrimeTable;

