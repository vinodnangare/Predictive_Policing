// src/pages/RetrainModel.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { API_BASE } from "../utils/api";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

function RetrainModel() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [details, setDetails] = useState(null); // holds metrics / hotspots summary
  const navigate = useNavigate();

  const handleRetrain = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    setDetails(null);
    
    try {
      // Call backend endpoint to retrain model
      const apiResponse = await fetch(`${API_BASE}/train-model`, {
        method: 'POST',
      });
      const response = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(response?.error || response?.details || 'Training request failed');
      }

      console.log('Training response:', response);
      
      if (response?.success && response?.data?.hotspots) {
        const hotspots = response.data.hotspots;
        console.log('Hotspots to display:', hotspots);
        
        // Store hotspots in localStorage as backup
        localStorage.setItem('lastTrainedHotspots', JSON.stringify(hotspots));
        
        setMessage(t({ en: "Model retrained successfully!", mr: "मॉडेल यशस्वीरित्या पुन्हा प्रशिक्षित झाले!" }));
        toast.success(t({ en: "Model retrained successfully.", mr: "मॉडेल यशस्वीरित्या पुन्हा प्रशिक्षित झाले." }));
        setDetails({
          hotspotsCount: hotspots.length,
          trainedAt: new Date().toISOString(),
          metrics: response.data.metrics || null,
        });
        
        // Navigate to police dashboard with data
        navigate('/police/dashboard', { 
          state: { 
            hotspots,
            timestamp: new Date().toISOString()
          }
        });
      } else if (response?.raw) {
        setMessage(t({ en: "Model retrained (raw response). Check results.", mr: "मॉडेल पुन्हा प्रशिक्षित (raw प्रतिसाद). निकाल तपासा." }));
        toast.success(t({ en: "Model retraining completed.", mr: "मॉडेल प्रशिक्षण पूर्ण झाले." }));
        setDetails({ raw: response.raw });
      } else {
        toast.error(t({ en: "Retraining failed: no hotspot data returned.", mr: "पुन्हा प्रशिक्षण अयशस्वी: हॉटस्पॉट डेटा मिळाला नाही." }));
        setError(t({ en: "Retraining failed: No valid hotspots data received.", mr: "पुन्हा प्रशिक्षण अयशस्वी: वैध हॉटस्पॉट डेटा मिळाला नाही." }));
      }
    } catch (err) {
      console.error('Training error:', err);
      toast.error(err.message || t({ en: "Error retraining the model. Please try again.", mr: "मॉडेल पुन्हा प्रशिक्षित करताना त्रुटी. कृपया पुन्हा प्रयत्न करा." }));
      setError(
        err.message || 
        t({ en: "Error retraining the model. Please try again.", mr: "मॉडेल पुन्हा प्रशिक्षित करताना त्रुटी. कृपया पुन्हा प्रयत्न करा." })
      );
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-73px)] pt-4 ${
        isDark
          ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
          : "bg-gradient-to-br from-slate-100 via-blue-50 to-white"
      }`}
    >
      <div className="max-w-4xl mx-auto p-6 sm:p-10">
        {/* Header */}
        <div className="mb-10">
          <h1
            className={`text-4xl sm:text-5xl font-bold mb-3 ${
              isDark ? "bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent" : "text-slate-900"
            }`}
          >
            {t({ en: "Retrain AI Model", mr: "AI मॉडेल पुन्हा प्रशिक्षित करा" })}
          </h1>
          <p className={`text-lg ${isDark ? "text-gray-300" : "text-slate-600"}`}>
            {t({
              en: "Enhance the crime prediction model with the latest incident data for improved accuracy.",
              mr: "अचूकता वाढवण्यासाठी नवीनतम घटना डेटासह गुन्हे अंदाज मॉडेल सुधारा.",
            })}
          </p>
        </div>

        {/* Main Card */}
        <div
          className={`rounded-2xl p-8 sm:p-10 shadow-2xl border ${
            isDark ? "bg-gradient-to-br from-slate-800 to-slate-900 border-blue-500/30" : "bg-white border-slate-300"
          }`}
        >
          {/* Info Section */}
          <div className={`mb-8 rounded-xl p-6 border ${isDark ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"}`}>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-blue-300" : "text-blue-900"}`}>
              {t({ en: "Training Information", mr: "प्रशिक्षण माहिती" })}
            </h3>
            <ul className={`space-y-2 text-sm ${isDark ? "text-gray-300" : "text-slate-700"}`}>
              <li>{t({ en: "✓ Processes all crime records in the database", mr: "✓ डेटाबेसमधील सर्व गुन्हे नोंदी प्रक्रिया करतो" })}</li>
              <li>{t({ en: "✓ Analyzes spatial and temporal patterns", mr: "✓ स्थानिक आणि कालानुक्रमिक पॅटर्नचे विश्लेषण करतो" })}</li>
              <li>{t({ en: "✓ Generates new crime hotspot predictions", mr: "✓ नवीन गुन्हे हॉटस्पॉट अंदाज तयार करतो" })}</li>
              <li>{t({ en: "✓ Typical duration: 2-5 minutes", mr: "✓ साधारण वेळ: २-५ मिनिटे" })}</li>
            </ul>
          </div>

          {/* Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={handleRetrain}
              disabled={loading}
              className="relative group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-10 rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none text-lg"
            >
              <span className="relative z-10 flex items-center gap-2 justify-center">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t({ en: "Retraining...", mr: "पुन्हा प्रशिक्षण..." })}
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    {t({ en: "Retrain Model", mr: "मॉडेल पुन्हा प्रशिक्षित करा" })}
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Status Messages */}
          {message && (
            <div className="mb-6 bg-green-500/10 border border-green-500/50 rounded-xl p-4 text-green-300 font-semibold text-center">
              ✅ {message}
            </div>
          )}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-300 font-semibold text-center">
              ❌ {error}
            </div>
          )}

          {/* Details Card */}
          {details && (
            <div className={`rounded-xl p-6 space-y-4 border ${isDark ? "bg-slate-700/50 border-slate-600/50" : "bg-slate-50 border-slate-200"}`}>
              <h3 className={`font-bold text-lg mb-4 ${isDark ? "text-blue-300" : "text-slate-900"}`}>
                {t({ en: "Training Results", mr: "प्रशिक्षण निकाल" })}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {details.hotspotsCount != null && (
                  <div className={`rounded-lg p-4 border ${isDark ? "bg-slate-800/80 border-blue-500/20" : "bg-white border-slate-200"}`}>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>{t({ en: "Hotspots Generated", mr: "निर्मित हॉटस्पॉट्स" })}</p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? "text-blue-400" : "text-blue-700"}`}>{details.hotspotsCount}</p>
                  </div>
                )}
                {details.trainedAt && (
                  <div className={`rounded-lg p-4 border ${isDark ? "bg-slate-800/80 border-blue-500/20" : "bg-white border-slate-200"}`}>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>{t({ en: "Trained At", mr: "प्रशिक्षण वेळ" })}</p>
                    <p className={`text-sm font-semibold mt-1 ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>{new Date(details.trainedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              
              {details.metrics && (
                <div className={`rounded-lg p-4 border ${isDark ? "bg-slate-800/80 border-blue-500/20" : "bg-white border-slate-200"}`}>
                  <p className={`text-sm mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>{t({ en: "Metrics", mr: "मेट्रिक्स" })}</p>
                  <pre className={`text-xs overflow-x-auto font-mono max-h-40 ${isDark ? "text-gray-300" : "text-slate-700"}`}>{JSON.stringify(details.metrics, null, 2)}</pre>
                </div>
              )}
              
              {details.raw && (
                <div className={`rounded-lg p-4 border ${isDark ? "bg-slate-800/80 border-blue-500/20" : "bg-white border-slate-200"}`}>
                  <p className={`text-sm mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>{t({ en: "Raw Output", mr: "Raw आउटपुट" })}</p>
                  <pre className={`text-xs overflow-x-auto font-mono max-h-40 ${isDark ? "text-gray-300" : "text-slate-700"}`}>{details.raw}</pre>
                </div>
              )}
              
              {details.error && (
                <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                  <p className="text-red-300 text-sm mb-2 font-semibold">{t({ en: "Error Details", mr: "त्रुटी तपशील" })}</p>
                  <pre className="text-xs text-red-300 overflow-x-auto font-mono max-h-40">{JSON.stringify(details.error, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RetrainModel;

