import { useState } from "react";
import axios from "axios";

// Ensure no trailing slash in the API URL
const API = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
import { FiMapPin, FiCalendar, FiClock, FiFileText, FiShield, FiLoader } from "react-icons/fi";

function CrimeForm({ onCrimeAdded }) {
  const [crime, setCrime] = useState({
    type: "",
    date: "",
    time: "",
    location: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post(`${API}/police/add-crime`, crime, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json'
        },
      });
      alert("✅ Crime added successfully!");
      setCrime({ type: "", date: "", time: "", location: "", description: "" });
      onCrimeAdded?.();
    } catch (err) {
      console.error("Error details:", err.response || err);
      alert("❌ Failed to add crime record. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg rounded-xl max-w-lg mx-auto border border-blue-200">
      <h2 className="text-2xl font-bold text-blue-800 mb-5 flex items-center gap-2">
        <FiShield className="text-blue-600" /> Add Crime Record
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Crime Type */}
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">Crime Type</label>
          <select
            value={crime.type}
            onChange={(e) => setCrime({ ...crime, type: e.target.value })}
            required
            className="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white"
          >
            <option value="">Select Crime Type</option>
            <option>Theft</option>
            <option>Assault</option>
            <option>Cyber Crime</option>
            <option>Robbery</option>
            <option>Homicide</option>
            <option>Kidnapping</option>
          </select>
        </div>

        {/* Date */}
        <div className="relative">
          <FiCalendar className="absolute left-3 top-3.5 text-blue-500" />
          <input
            type="date"
            value={crime.date}
            onChange={(e) => setCrime({ ...crime, date: e.target.value })}
            required
            className="w-full pl-10 p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
          />
        </div>

        {/* Time */}
        <div className="relative">
          <FiClock className="absolute left-3 top-3.5 text-blue-500" />
          <input
            type="time"
            value={crime.time}
            onChange={(e) => setCrime({ ...crime, time: e.target.value })}
            required
            className="w-full pl-10 p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
          />
        </div>

        {/* Location */}
        <div className="relative">
          <FiMapPin className="absolute left-3 top-3.5 text-blue-500" />
          <input
            type="text"
            placeholder="Enter location or address"
            value={crime.location}
            onChange={(e) => setCrime({ ...crime, location: e.target.value })}
            required
            className="w-full pl-10 p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
          />
        </div>

        {/* Description */}
        <div className="relative">
          <FiFileText className="absolute left-3 top-3.5 text-blue-500" />
          <textarea
            placeholder="Enter detailed description"
            value={crime.description}
            onChange={(e) => setCrime({ ...crime, description: e.target.value })}
            required
            rows={4}
            className="w-full pl-10 p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-white shadow-md transition-all duration-300 
            ${
              loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
            }`}
        >
          {loading ? (
            <>
              <FiLoader className="animate-spin" /> Submitting...
            </>
          ) : (
            "Submit Crime"
          )}
        </button>
      </form>
    </div>
  );
}

export default CrimeForm;
