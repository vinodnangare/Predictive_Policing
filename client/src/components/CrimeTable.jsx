import { useEffect, useState } from "react";
import axios from "axios";

// Read backend base URL from Vite env or fall back to localhost
const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
import EditCrimeModal from "./EditCrimeModal";
import { FiEdit2, FiTrash2, FiAlertTriangle, FiMapPin, FiClock } from "react-icons/fi";

function CrimeTable() {
  const [crimeData, setCrimeData] = useState([]);
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCrimes = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/police/crimes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setCrimeData(res.data);
    } catch (err) {
      console.error("Failed to fetch crimes:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteCrime = async (id) => {
    if (confirm("⚠️ Are you sure you want to delete this crime record?")) {
      await axios.delete(`${API}/police/crime/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      fetchCrimes();
    }
  };

  useEffect(() => {
    fetchCrimes();
  }, []);

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg rounded-xl mt-8 border border-blue-200">
      <h2 className="text-2xl font-bold text-blue-800 mb-4 flex items-center gap-2">
        <FiAlertTriangle className="text-blue-600" /> All Crime Records
      </h2>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-10 text-blue-600 animate-pulse">
          <FiClock className="animate-spin mr-2" /> Loading crime records...
        </div>
      ) : crimeData.length === 0 ? (
        <div className="text-center py-10 text-gray-500 font-medium">
          🚫 No crime records found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-blue-200 rounded-lg overflow-hidden">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-blue-100">
              {crimeData.map((crime, index) => (
                <tr
                  key={crime._id}
                  className="hover:bg-blue-50 transition duration-200"
                >
                  <td className="p-3 font-semibold text-blue-900 flex items-center gap-2">
                    <FiAlertTriangle className="text-blue-500" />
                    {crime.type}
                  </td>
                  <td className="p-3 text-gray-700">{crime.date}</td>
                  <td className="p-3 text-gray-700">{crime.time}</td>
                  <td className="p-3 flex items-center gap-2 text-gray-700">
                    <FiMapPin className="text-blue-500" />
                    {crime.location}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      className="inline-flex items-center gap-1 bg-yellow-500 text-white px-3 py-1 rounded-md text-sm hover:bg-yellow-600 transition duration-200 shadow-sm hover:shadow-md mr-2"
                      onClick={() => setEditData(crime)}
                    >
                      <FiEdit2 /> Edit
                    </button>
                    <button
                      className="inline-flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 transition duration-200 shadow-sm hover:shadow-md"
                      onClick={() => deleteCrime(crime._id)}
                    >
                      <FiTrash2 /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editData && (
        <EditCrimeModal
          crime={editData}
          onClose={() => setEditData(null)}
          onUpdate={fetchCrimes}
        />
      )}
    </div>
  );
}

export default CrimeTable;
