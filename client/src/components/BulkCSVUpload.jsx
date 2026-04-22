import { useMemo, useState } from "react";
import { FiUpload, FiDownload, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { API_BASE } from "../utils/api";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

function BulkCSVUpload() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const acceptFile = (selectedFile) => {
    if (!selectedFile) return false;
    const name = String(selectedFile.name || "").toLowerCase();
    const mime = String(selectedFile.type || "").toLowerCase();
    return name.endsWith(".csv") || mime.includes("csv") || mime === "text/plain";
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (acceptFile(selectedFile)) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    } else {
      setError(t({ en: "Please select a valid CSV file", mr: "कृपया वैध CSV फाइल निवडा" }));
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError(t({ en: "Please select a CSV file first", mr: "कृपया आधी CSV फाइल निवडा" }));
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("csvFile", file);

    try {
      const response = await fetch(`${API_BASE}/api/upload-csv`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          added: data.added,
          failed: data.failed || 0,
          skippedDuplicates: data.skippedDuplicates ?? data.skipped ?? 0,
          total: data.total,
          geocoded: data.geocoded || 0,
          errors: Array.isArray(data.errors) ? data.errors : [],
        });
        setFile(null);
      } else {
        setError(data.error || t({ en: "Upload failed", mr: "अपलोड अयशस्वी" }));
      }
    } catch (err) {
      setError(t({ en: "Network error. Please check if the server is running.", mr: "नेटवर्क त्रुटी. सर्व्हर चालू आहे का तपासा." }));
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `Crime Type,Date,Time,Latitude,Longitude,State,District,Taluka,Village,Location,Description,FIR No,Police Station,Section
Assault,2026-04-18,21:52,19.0952,74.7496,Maharashtra,Ahilyanagar,Ahilyanagar,,Ahilyanagar,Physical assault reported,0207/2026,AHILYANAGAR CAM BNS 2023,115(2)

OR if you have City/Pincode instead of coordinates:

Crime Type,Date,Time,City,Pincode,State,District,Taluka,Village,Location,Description,FIR No,Police Station,Section
Theft,2026-04-18,14:30,Pune,411001,Maharashtra,Pune City,,,Pune Camp,Stolen bicycle from parking lot,0208/2026,Pune Camp PS,379`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crime_upload_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const containerClass = isDark
    ? "min-h-[calc(100vh-73px)] pt-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
    : "min-h-[calc(100vh-73px)] pt-4 bg-gradient-to-br from-slate-100 via-purple-50 to-white";

  const cardClass = isDark
    ? "bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30"
    : "bg-white border border-slate-300";

  const titleText = isDark ? "text-transparent" : "text-slate-900";
  const subtitleText = isDark ? "text-gray-300" : "text-slate-600";

  const statRow = useMemo(() => {
    if (!result?.success) return [];
    return [
      { label: t({ en: "Records Added", mr: "जोडलेल्या नोंदी" }), value: result.added, tone: "text-green-500" },
      { label: t({ en: "Skipped (duplicates)", mr: "वगळले (डुप्लिकेट)" }), value: result.skippedDuplicates, tone: "text-amber-500" },
      { label: t({ en: "Failed rows", mr: "अयशस्वी ओळी" }), value: result.failed, tone: "text-rose-500" },
      { label: t({ en: "Total processed", mr: "एकूण प्रक्रिया" }), value: result.total, tone: "text-cyan-600" },
      { label: t({ en: "Geocoded", mr: "जिओकोड" }), value: result.geocoded, tone: "text-sky-600" },
    ];
  }, [result, t]);

  return (
    <div className={containerClass}>
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-3 ${isDark ? "bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" : titleText}`}>
            {t({ en: "Bulk CSV Upload", mr: "बल्क CSV अपलोड" })}
          </h1>
          <p className={`text-lg ${subtitleText}`}>
            {t({ en: "Upload a CSV file to add multiple crime records at once", mr: "एकावेळी अनेक गुन्हे नोंदी जोडण्यासाठी CSV अपलोड करा" })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className={`${cardClass} rounded-xl p-8 shadow-lg`}>
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? "text-purple-300" : "text-slate-900"}`}>
              <FiUpload /> Upload CSV File
            </h2>

            {/* File Input */}
            <div className="mb-6">
              <label className={`block mb-3 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                {t({ en: "Select CSV File", mr: "CSV फाइल निवडा" })}
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className={`w-full px-4 py-3 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-white ${
                  isDark
                    ? "bg-slate-700/50 border border-slate-600 text-gray-300 file:bg-purple-600 hover:file:bg-purple-700"
                    : "bg-white border border-slate-300 text-slate-800 file:bg-purple-700 hover:file:bg-purple-800"
                }`}
              />
              {file && (
                <p className="mt-2 text-sm text-green-500 flex items-center gap-2">
                  <FiCheckCircle /> {file.name}
                </p>
              )}
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-6 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Processing...
                </>
              ) : (
                <>
                  <FiUpload /> Upload CSV
                </>
              )}
            </button>

            {/* Results */}
            {result && (
              <div className={`mt-6 p-4 rounded-lg ${isDark ? "bg-green-500/20 border border-green-500/50" : "bg-green-50 border border-green-200"}`}>
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="text-green-500 text-xl flex-shrink-0 mt-1" />
                  <div>
                    <h3 className={`font-semibold mb-2 ${isDark ? "text-green-300" : "text-green-700"}`}>
                      {t({ en: "Upload Successful!", mr: "अपलोड यशस्वी!" })}
                    </h3>
                    <p className={`text-sm mb-3 ${isDark ? "text-gray-300" : "text-slate-700"}`}>{result.message}</p>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {statRow.map((item) => (
                        <div
                          key={item.label}
                          className={`rounded-lg border px-3 py-2 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"}`}
                        >
                          <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? "text-slate-400" : "text-slate-600"}`}>{item.label}</p>
                          <p className={`mt-1 text-lg font-extrabold ${item.tone}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {result.errors?.length ? (
                      <div className={`mt-4 rounded-xl border p-3 ${isDark ? "border-amber-300/30 bg-amber-300/10" : "border-amber-200 bg-amber-50"}`}>
                        <p className={`text-sm font-semibold ${isDark ? "text-amber-200" : "text-amber-800"}`}>
                          {t({ en: "Row issues (first 20)", mr: "ओळ समस्या (पहिल्या २०)" })}
                        </p>
                        <ul className={`mt-2 space-y-1 text-xs ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                          {result.errors.map((msg, idx) => (
                            <li key={`${idx}-${msg}`} className="flex gap-2">
                              <span className="font-semibold">{idx + 1}.</span>
                              <span className="break-words">{msg}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className={`mt-6 p-4 rounded-lg ${isDark ? "bg-red-500/20 border border-red-500/50" : "bg-red-50 border border-red-200"}`}>
                <div className="flex items-center gap-3">
                  <FiAlertCircle className="text-red-500 text-xl flex-shrink-0" />
                  <div>
                    <h3 className={`font-semibold ${isDark ? "text-red-300" : "text-red-700"}`}>
                      {t({ en: "Error", mr: "त्रुटी" })}
                    </h3>
                    <p className={`text-sm ${isDark ? "text-gray-300" : "text-slate-700"}`}>{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions Section */}
          <div className={`${cardClass} rounded-xl p-8 shadow-lg`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-purple-300" : "text-slate-900"}`}>
              {t({ en: "Instructions", mr: "सूचना" })}
            </h2>

            <div className={`space-y-4 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
              <div>
                <h3 className={`font-semibold mb-2 ${isDark ? "text-pink-300" : "text-slate-900"}`}>
                  {t({ en: "CSV Format Requirements:", mr: "CSV फॉरमॅट आवश्यकता:" })}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{t({ en: "Required: Crime Type, Date", mr: "आवश्यक: गुन्ह्याचा प्रकार, दिनांक" })}</li>
                  <li>{t({ en: "Option 1: Latitude & Longitude", mr: "पर्याय १: अक्षांश आणि रेखांश" })}</li>
                  <li>{t({ en: "Option 2: City and/or Pincode (auto-geocoded)", mr: "पर्याय २: शहर आणि/किंवा पिनकोड (ऑटो-जीओकोड)" })}</li>
                  <li>{t({ en: "Date format: YYYY-MM-DD", mr: "दिनांक फॉरमॅट: YYYY-MM-DD" })}</li>
                  <li>{t({ en: "Time format: HH:MM", mr: "वेळ फॉरमॅट: HH:MM" })}</li>
                  <li>{t({ en: "Optional: FIR No, Police Station, Section", mr: "ऐच्छिक: FIR क्रमांक, पोलीस स्टेशन, कलम" })}</li>
                </ul>
              </div>

              <div>
                <h3 className={`font-semibold mb-2 ${isDark ? "text-pink-300" : "text-slate-900"}`}>
                  {t({ en: "Supported Crime Types:", mr: "समर्थित गुन्हे प्रकार:" })}
                </h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  {["Theft", "Assault", "Burglary", "Robbery", "Murder", "Kidnapping", "Fraud", "Drug Offense", "Cybercrime", "Vandalism", "Arson"].map(type => (
                    <span key={type} className={`px-3 py-1 rounded-full border ${isDark ? "bg-purple-600/30 border-purple-500/50" : "bg-purple-100 border-purple-200 text-slate-800"}`}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`p-3 rounded-lg ${isDark ? "bg-blue-500/10 border border-blue-500/30" : "bg-blue-50 border border-blue-200"}`}>
                <p className={`text-sm ${isDark ? "text-blue-300" : "text-blue-800"}`}>
                  <strong>{t({ en: "Tip:", mr: "टीप:" })}</strong>{" "}
                  {t({
                    en: "If using City/Pincode, records will be automatically geocoded. This may take longer (~1 sec per record).",
                    mr: "शहर/पिनकोड वापरल्यास नोंदी आपोआप जिओकोड होतील. यासाठी वेळ लागू शकतो (~१ सेकंद प्रति नोंद).",
                  })}
                </p>
              </div>

              <div className={`pt-4 border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                <button
                  onClick={downloadTemplate}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <FiDownload /> {t({ en: "Download Sample Template", mr: "नमुना टेम्पलेट डाउनलोड करा" })}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className={`mt-6 rounded-xl p-6 shadow-lg ${cardClass} ${isDark ? "border border-blue-500/30" : ""}`}>
          <h3 className={`text-xl font-bold mb-4 ${isDark ? "text-blue-300" : "text-slate-900"}`}>{t({ en: "Tips", mr: "टीप" })}</h3>
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 text-sm ${isDark ? "text-gray-300" : "text-slate-700"}`}>
            <div className="flex items-start gap-3">
              <FiCheckCircle className="text-green-500 flex-shrink-0 mt-0.5" />
              <p>{t({ en: "Use the template to ensure correct formatting", mr: "योग्य फॉरमॅटसाठी टेम्पलेट वापरा" })}</p>
            </div>
            <div className="flex items-start gap-3">
              <FiCheckCircle className="text-green-500 flex-shrink-0 mt-0.5" />
              <p>{t({ en: "Provide either coordinates OR city/pincode for each record", mr: "प्रत्येक नोंदीसाठी समन्वय किंवा शहर/पिनकोड द्या" })}</p>
            </div>
            <div className="flex items-start gap-3">
              <FiCheckCircle className="text-green-500 flex-shrink-0 mt-0.5" />
              <p>{t({ en: "After upload, retrain the model for updated predictions", mr: "अपलोड नंतर अद्ययावत अंदाजासाठी मॉडेल पुन्हा प्रशिक्षित करा" })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulkCSVUpload;

