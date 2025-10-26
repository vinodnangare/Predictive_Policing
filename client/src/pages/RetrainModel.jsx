// src/pages/RetrainModel.jsx
import React, { useState } from "react";
import axios from "axios";

function RetrainModel() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRetrain = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      // Call backend endpoint to retrain model
      const response = await axios.post("/police/retrain"); // Adjust endpoint if needed
      if (response.data.success) {
        setMessage("Model retrained successfully!");
      } else {
        setError("Retraining failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Error retraining the model.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Retrain Crime Prediction Model</h1>
      <p className="mb-4 text-gray-600 text-center">
        Click the button below to retrain the AI model with the latest crime data.
      </p>

      <div className="flex justify-center">
        <button
          onClick={handleRetrain}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Retraining..." : "Retrain Model"}
        </button>
      </div>

      {message && (
        <p className="mt-6 text-green-600 font-semibold text-center">{message}</p>
      )}
      {error && (
        <p className="mt-6 text-red-600 font-semibold text-center">{error}</p>
      )}
    </div>
  );
}

export default RetrainModel;
