import CrimeMap from "../components/CrimeMap";
import AgencyBrand from "../components/AgencyBrand";
import LeadershipCouncil from "../components/LeadershipCouncil";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

function PublicDashboard() {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen pt-24 ${isDark ? "bg-gradient-to-br from-[#071325] via-[#091b2f] to-[#040b16]" : "bg-gradient-to-br from-[#f8fbff] via-[#f1f6fc] to-[#e9f0f8]"}`}>
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <header className={`mb-4 rounded-2xl border p-5 shadow-lg backdrop-blur sm:p-6 ${
          isDark
            ? "border-amber-300/20 bg-slate-900/80"
            : "border-amber-500/30 bg-white/90"
        }`}>
          <AgencyBrand compact className="mb-4" />
          <p className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
            isDark
              ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"
              : "border-cyan-500/35 bg-cyan-100 text-cyan-800"
          }`}>
            {t({ en: "Public View", mr: "सार्वजनिक दृश्य" })}
          </p>
          <h1 className={`mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl ${isDark ? "text-white" : "text-slate-900"}`}>
            {t({
              en: "Maharashtra Public Crime Intelligence Map",
              mr: "महाराष्ट्र सार्वजनिक गुन्हे बुद्धिमत्ता नकाशा",
            })}
          </h1>
          <p className={`mt-2 max-w-4xl text-sm sm:text-base ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            {t({
              en: "Access citizen-safe hotspot insights with district-level situational awareness and transparent public crime visibility.",
              mr: "जिल्हानिहाय परिस्थितीचे विश्लेषण आणि पारदर्शक गुन्हे माहितीच्या आधारे नागरिकांसाठी सुरक्षित हॉटस्पॉट निरीक्षण मिळवा.",
            })}
          </p>
        </header>

        <LeadershipCouncil />

        <section className={`rounded-2xl border p-3 shadow-2xl sm:p-4 ${
          isDark
            ? "border-slate-700/70 bg-slate-950/55"
            : "border-slate-300/70 bg-white/88"
        }`}>
          <CrimeMap isPublicView />
        </section>
      </div>
    </div>
  );
}

export default PublicDashboard;
