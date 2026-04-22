import { useMemo, useState, useEffect } from "react";
import {
  FiMapPin,
  FiCalendar,
  FiClock,
  FiFileText,
  FiShield,
  FiLoader,
  FiHash,
  FiHome,
} from "react-icons/fi";
import { apiPost } from "../utils/api";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import districtsCatalog from "../data/districts";

const LOCATION_DATA_URL =
  "https://raw.githubusercontent.com/pranshumaheshwari/indian-cities-and-villages/refs/heads/master/data.json";

const EMPTY_FORM = {
  type: "",
  date: "",
  time: "",
  location: "",
  latitude: "",
  longitude: "",
  description: "",
  state: "Maharashtra",
  district: "",
  subdistrict: "",
  village: "",
  firNo: "",
  section: "",
  policeStation: "",
};

const CRIME_TYPES = [
  "Theft",
  "Assault",
  "Cyber Crime",
  "Robbery",
  "Homicide",
  "Kidnapping",
  "Burglary",
  "Fraud",
  "Drug Offense",
  "Vandalism",
];

const normalize = (value) => String(value ?? "").trim().toLowerCase();

function CrimeForm({ onCrimeAdded }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const [crime, setCrime] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [locationData, setLocationData] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const fallbackStates = useMemo(
    () => (districtsCatalog?.states || []).map((item) => item.state),
    []
  );

  useEffect(() => {
    let cancelled = false;

    const loadHierarchy = async () => {
      try {
        setLocationLoading(true);
        const response = await fetch(LOCATION_DATA_URL);
        const json = await response.json();
        if (!cancelled && Array.isArray(json)) {
          setLocationData(json);
        }
      } catch (error) {
        console.error("Failed to fetch hierarchy data:", error);
      } finally {
        if (!cancelled) {
          setLocationLoading(false);
        }
      }
    };

    loadHierarchy();
    return () => {
      cancelled = true;
    };
  }, []);

  const stateOptions = useMemo(() => {
    const remoteStates = locationData.map((item) => item.state).filter(Boolean);
    const values = remoteStates.length > 0 ? remoteStates : fallbackStates;
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [locationData, fallbackStates]);

  const selectedStateObj = useMemo(() => {
    return locationData.find((item) => normalize(item.state) === normalize(crime.state));
  }, [locationData, crime.state]);

  const districtOptions = useMemo(() => {
    if (!crime.state) return [];

    if (selectedStateObj?.districts?.length) {
      return selectedStateObj.districts
        .map((item) => item?.district)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
    }

    const fallbackState = (districtsCatalog?.states || []).find(
      (item) => normalize(item.state) === normalize(crime.state)
    );
    return (fallbackState?.districts || []).slice().sort((a, b) => a.localeCompare(b));
  }, [crime.state, selectedStateObj]);

  const selectedDistrictObj = useMemo(() => {
    return selectedStateObj?.districts?.find(
      (item) => normalize(item?.district) === normalize(crime.district)
    );
  }, [selectedStateObj, crime.district]);

  const subdistrictOptions = useMemo(() => {
    return (selectedDistrictObj?.subDistricts || [])
      .map((item) => item?.subDistrict)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [selectedDistrictObj]);

  const selectedSubdistrictObj = useMemo(() => {
    return selectedDistrictObj?.subDistricts?.find(
      (item) => normalize(item?.subDistrict) === normalize(crime.subdistrict)
    );
  }, [selectedDistrictObj, crime.subdistrict]);

  const villageOptions = useMemo(() => {
    const villages = selectedSubdistrictObj?.villages?.length
      ? selectedSubdistrictObj.villages
      : selectedSubdistrictObj?.villagesData?.map((item) => item.name) || [];
    return villages.filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [selectedSubdistrictObj]);

  const updateField = (field, value) => {
    setCrime((prev) => ({ ...prev, [field]: value }));
  };

  const requestLocation = (options = {}) => {
    if (!("geolocation" in navigator)) {
      toast.error(t({ en: "Geolocation is not supported by your browser.", mr: "तुमच्या ब्राउझरमध्ये जिओलोकेशन समर्थित नाही." }));
      return;
    }

    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCrime((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        toast.success(t({ en: "Current coordinates captured.", mr: "सध्याचे समन्वय यशस्वीरित्या मिळाले." }));
        setGeolocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        const hints = {
          1: t({ en: "Permission denied. Please allow location access.", mr: "परवानगी नाकारली. कृपया लोकेशन परवानगी द्या." }),
          2: t({ en: "Position unavailable. Check location services.", mr: "स्थान उपलब्ध नाही. लोकेशन सेवा तपासा." }),
          3: t({ en: "Request timed out. Try again.", mr: "विनंतीची वेळ संपली. पुन्हा प्रयत्न करा." }),
        };
        toast.error(hints[error.code] || t({ en: "Please enter coordinates manually.", mr: "कृपया समन्वय स्वतः भरा." }));
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, ...options }
    );
  };

  const handlePermissionAndLocate = async () => {
    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: "geolocation" });
        if (status.state === "denied") {
          toast.error(
            t({
              en: "Location permission is blocked. Please allow it in browser settings.",
              mr: "लोकेशन परवानगी ब्लॉक आहे. कृपया ब्राउझर सेटिंगमध्ये परवानगी द्या.",
            })
          );
          return;
        }
      } catch (error) {
        console.warn("Permission query failed:", error);
      }
    }

    requestLocation();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const fallbackLocation = [crime.village, crime.subdistrict, crime.district, crime.state]
      .filter(Boolean)
      .join(", ");

    const payload = {
      ...crime,
      location: crime.location.trim() || fallbackLocation,
      latitude: crime.latitude === "" ? "" : Number(crime.latitude),
      longitude: crime.longitude === "" ? "" : Number(crime.longitude),
      firNo: crime.firNo.trim() || undefined,
      section: crime.section.trim() || undefined,
      policeStation: crime.policeStation.trim() || undefined,
      village: crime.village.trim() || undefined,
      district: crime.district.trim() || undefined,
      subdistrict: crime.subdistrict.trim() || undefined,
      state: crime.state.trim() || undefined,
    };

    if (!payload.type || !payload.date || !payload.time) {
      toast.error(t({ en: "Please fill all mandatory fields.", mr: "कृपया सर्व आवश्यक फील्ड भरा." }));
      return;
    }

    if (!payload.location) {
      toast.error(
        t({
          en: "Provide location details or select state/district/taluka/village.",
          mr: "ठिकाण माहिती द्या किंवा राज्य/जिल्हा/तालुका/गाव निवडा.",
        })
      );
      return;
    }

    if ((payload.latitude === "" && payload.longitude !== "") || (payload.latitude !== "" && payload.longitude === "")) {
      toast.error(t({ en: "Latitude and longitude must be entered together.", mr: "अक्षांश आणि रेखांश दोन्ही एकत्र भरणे आवश्यक आहे." }));
      return;
    }

    try {
      setLoading(true);
      const response = await apiPost("/api/add-crime", payload);

      if (response?.geocoded) {
        toast.success(t({ en: "Crime added with location enrichment.", mr: "स्थान माहिती समृद्ध करून गुन्हा नोंदवला गेला." }));
      } else {
        toast.success(t({ en: "Crime added successfully.", mr: "गुन्हा यशस्वीरित्या नोंदवला गेला." }));
      }

      setCrime((prev) => ({ ...EMPTY_FORM, state: prev.state || "Maharashtra" }));
      onCrimeAdded?.();
    } catch (error) {
      const message = String(error?.message || "");
      if (message.toLowerCase().includes("duplicate")) {
        toast(t({ en: "Duplicate crime skipped.", mr: "डुप्लिकेट गुन्हा वगळला गेला." }), { icon: "⚠️" });
      } else {
        toast.error(t({ en: "Failed to add crime record.", mr: "गुन्हा नोंदवण्यात अयशस्वी." }));
      }
    } finally {
      setLoading(false);
    }
  };

  const containerClass = isDark
    ? "min-h-[calc(100vh-73px)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    : "min-h-[calc(100vh-73px)] bg-gradient-to-br from-slate-100 via-cyan-50 to-white";

  const cardClass = isDark
    ? "bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700"
    : "bg-white border border-slate-300";

  const inputClass = isDark
    ? "w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
    : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30";

  return (
    <div className={`${containerClass} pt-4 pb-8 px-4 sm:px-6 lg:px-8`}>
      <div className={`max-w-5xl mx-auto rounded-2xl shadow-2xl p-6 sm:p-8 ${cardClass}`}>
        <h2 className="mb-6 flex items-center gap-3 text-3xl font-bold">
          <FiShield className={isDark ? "text-cyan-300" : "text-cyan-700"} />
          <span className={isDark ? "text-cyan-100" : "text-slate-900"}>
            {t({ en: "Add Crime Record", mr: "गुन्हा नोंद जोडा" })}
          </span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "Crime Type", mr: "गुन्ह्याचा प्रकार" })}
              </label>
              <select
                value={crime.type}
                onChange={(e) => updateField("type", e.target.value)}
                required
                className={inputClass}
              >
                <option value="">{t({ en: "Select type", mr: "प्रकार निवडा" })}</option>
                {CRIME_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "Date", mr: "दिनांक" })}
              </label>
              <div className="relative">
                <FiCalendar className={`absolute left-3 top-3.5 ${isDark ? "text-cyan-300" : "text-cyan-700"}`} />
                <input
                  type="date"
                  value={crime.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  required
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "Time", mr: "वेळ" })}
              </label>
              <div className="relative">
                <FiClock className={`absolute left-3 top-3.5 ${isDark ? "text-cyan-300" : "text-cyan-700"}`} />
                <input
                  type="time"
                  value={crime.time}
                  onChange={(e) => updateField("time", e.target.value)}
                  required
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "State", mr: "राज्य" })}
              </label>
              <select
                value={crime.state}
                onChange={(e) =>
                  setCrime((prev) => ({
                    ...prev,
                    state: e.target.value,
                    district: "",
                    subdistrict: "",
                    village: "",
                  }))
                }
                className={inputClass}
              >
                <option value="">{t({ en: "Select state", mr: "राज्य निवडा" })}</option>
                {stateOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "District", mr: "जिल्हा" })}
              </label>
              <select
                value={crime.district}
                onChange={(e) =>
                  setCrime((prev) => ({
                    ...prev,
                    district: e.target.value,
                    subdistrict: "",
                    village: "",
                  }))
                }
                disabled={!districtOptions.length}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">{t({ en: "Select district", mr: "जिल्हा निवडा" })}</option>
                {districtOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "Taluka", mr: "तालुका" })}
              </label>
              <select
                value={crime.subdistrict}
                onChange={(e) =>
                  setCrime((prev) => ({
                    ...prev,
                    subdistrict: e.target.value,
                    village: "",
                  }))
                }
                disabled={!subdistrictOptions.length}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">{t({ en: "Select taluka", mr: "तालुका निवडा" })}</option>
                {subdistrictOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "Village (Optional)", mr: "गाव (ऐच्छिक)" })}
              </label>
              <select
                value={crime.village}
                onChange={(e) => updateField("village", e.target.value)}
                disabled={!villageOptions.length}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">{t({ en: "Select village", mr: "गाव निवडा" })}</option>
                {villageOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "FIR No (Optional)", mr: "FIR क्रमांक (ऐच्छिक)" })}
              </label>
              <div className="relative">
                <FiHash className={`absolute left-3 top-3.5 ${isDark ? "text-cyan-300" : "text-cyan-700"}`} />
                <input
                  type="text"
                  value={crime.firNo}
                  onChange={(e) => updateField("firNo", e.target.value)}
                  placeholder="0207/2026"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "Section (Optional)", mr: "कलम (ऐच्छिक)" })}
              </label>
              <input
                type="text"
                value={crime.section}
                onChange={(e) => updateField("section", e.target.value)}
                placeholder="BNS 2023 - 115(2)"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "Police Station (Optional)", mr: "पोलीस स्टेशन (ऐच्छिक)" })}
              </label>
              <div className="relative">
                <FiHome className={`absolute left-3 top-3.5 ${isDark ? "text-cyan-300" : "text-cyan-700"}`} />
                <input
                  type="text"
                  value={crime.policeStation}
                  onChange={(e) => updateField("policeStation", e.target.value)}
                  placeholder={t({ en: "Enter police station", mr: "पोलीस स्टेशन भरा" })}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "Location / Address", mr: "ठिकाण / पत्ता" })}
              </label>
              <div className="relative">
                <FiMapPin className={`absolute left-3 top-3.5 ${isDark ? "text-cyan-300" : "text-cyan-700"}`} />
                <input
                  type="text"
                  value={crime.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder={t({ en: "Enter exact location", mr: "अचूक ठिकाण भरा" })}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "Latitude", mr: "अक्षांश" })}
              </label>
              <input
                type="number"
                step="0.000001"
                value={crime.latitude}
                onChange={(e) => updateField("latitude", e.target.value)}
                placeholder="19.0952"
                className={inputClass}
              />
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
                {t({ en: "Longitude", mr: "रेखांश" })}
              </label>
              <input
                type="number"
                step="0.000001"
                value={crime.longitude}
                onChange={(e) => updateField("longitude", e.target.value)}
                placeholder="74.7496"
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handlePermissionAndLocate}
            disabled={geolocating}
            className={`w-full rounded-lg border px-4 py-3 font-medium transition-colors ${
              isDark
                ? "border-cyan-500/60 text-cyan-200 hover:bg-slate-700"
                : "border-cyan-600 text-cyan-700 hover:bg-cyan-50"
            }`}
          >
            {geolocating ? (
              <span className="inline-flex items-center gap-2">
                <FiLoader className="animate-spin" />
                {t({ en: "Getting current location...", mr: "सध्याचे स्थान घेत आहे..." })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <FiMapPin />
                {t({ en: "Get Current Coordinates", mr: "सध्याचे समन्वय घ्या" })}
              </span>
            )}
          </button>

          <div>
            <label className={`mb-1.5 block text-sm font-medium ${isDark ? "text-cyan-200" : "text-slate-700"}`}>
              {t({ en: "Description", mr: "वर्णन" })}
            </label>
            <div className="relative">
              <FiFileText className={`absolute left-3 top-3.5 ${isDark ? "text-cyan-300" : "text-cyan-700"}`} />
              <textarea
                rows={4}
                required
                value={crime.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder={t({ en: "Enter case description", mr: "प्रकरणाचे वर्णन भरा" })}
                className={`${inputClass} pl-10 resize-none`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {locationLoading && (
              <p className={`text-sm ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>
                {t({ en: "Loading state/district/taluka/village data...", mr: "राज्य/जिल्हा/तालुका/गाव माहिती लोड होत आहे..." })}
              </p>
            )}
            {!locationLoading && locationData.length === 0 && (
              <p className={`text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                {t({
                  en: "Detailed taluka/village dataset is currently unavailable. States and districts are still available.",
                  mr: "तपशीलवार तालुका/गाव डेटासेट सध्या उपलब्ध नाही. राज्य आणि जिल्हा पर्याय उपलब्ध आहेत.",
                })}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-lg px-4 py-3 font-semibold text-white transition-all ${
                loading
                  ? "cursor-not-allowed bg-cyan-700"
                  : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
              }`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <FiLoader className="animate-spin" />
                  {t({ en: "Submitting...", mr: "सबमिट होत आहे..." })}
                </span>
              ) : (
                t({ en: "Submit Crime", mr: "गुन्हा सबमिट करा" })
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CrimeForm;
