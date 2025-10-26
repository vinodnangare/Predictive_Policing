// src/components/EditCrimeModal.jsx
import { useState } from "react";
import axios from "axios";

// Read backend base URL from Vite env or fall back to localhost
const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function EditCrimeModal({ crime, onClose, onUpdate }) {
  const [formData, setFormData] = useState(crime);

  const handleUpdate = async () => {
    await axios.put(
      `${API}/police/crime/${crime._id}`,
      formData,
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );
    alert("Crime updated!");
    onUpdate();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg w-96">
        <h2 className="text-lg font-bold mb-3">Edit Crime</h2>
        <input
          className="border p-2 w-full mb-3"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
        />
        <input
          className="border p-2 w-full mb-3"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
        <input
          className="border p-2 w-full mb-3"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
        />
        <input
          className="border p-2 w-full mb-3"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
        <textarea
          className="border p-2 w-full mb-3"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <div className="flex justify-end space-x-3">
          <button onClick={handleUpdate} className="bg-blue-600 text-white px-4 py-2 rounded">
            Update
          </button>
          <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditCrimeModal;
