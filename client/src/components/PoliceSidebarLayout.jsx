import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AgencyBrand from "./AgencyBrand";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiBookOpen,
  FiChevronLeft,
  FiChevronRight,
  FiCompass,
  FiDatabase,
  FiFilePlus,
  FiFileText,
  FiHome,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiShield,
  FiTarget,
  FiTrendingUp,
  FiUploadCloud,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";

const navSections = [
  {
    title: { en: "Command Center", mr: "कमांड सेंटर" },
    items: [
      { label: { en: "Dashboard", mr: "डॅशबोर्ड" }, path: "/police/dashboard", icon: FiHome },
      { label: { en: "Live Feed", mr: "लाईव्ह फीड" }, path: "/police/live-feed", icon: FiActivity },
      { label: { en: "Crime Alerts", mr: "गुन्हे अलर्ट" }, path: "/police/crime-alerts", icon: FiAlertTriangle },
    ],
  },
  {
    title: { en: "Operations", mr: "ऑपरेशन्स" },
    items: [
      { label: { en: "View Crimes", mr: "गुन्हे नोंदी" }, path: "/police/view-crimes", icon: FiDatabase },
      { label: { en: "Cases", mr: "प्रकरणे" }, path: "/police/cases", icon: FiBookOpen },
      { label: { en: "Officers", mr: "अधिकारी" }, path: "/police/officers", icon: FiUsers },
      { label: { en: "Advanced Search", mr: "प्रगत शोध" }, path: "/police/search", icon: FiSearch },
      { label: { en: "Bulk Upload", mr: "बल्क अपलोड" }, path: "/police/bulk-upload", icon: FiUploadCloud },
    ],
  },
  {
    title: { en: "Intelligence", mr: "गुप्त माहिती" },
    items: [
      { label: { en: "Analytics", mr: "विश्लेषण" }, path: "/police/analytics", icon: FiTrendingUp },
      { label: { en: "Time Analytics", mr: "वेळ-आधारित विश्लेषण" }, path: "/police/time-analytics", icon: FiBarChart2 },
      { label: { en: "Trend Predictions", mr: "कलाचा अंदाज" }, path: "/police/trend-predictions", icon: FiCompass },
      { label: { en: "Hotspots", mr: "हॉटस्पॉट्स" }, path: "/police/hotspots", icon: FiTarget },
      { label: { en: "Suspect Match", mr: "संशयित जुळणी" }, path: "/police/suspect-matching", icon: FiZap },
      { label: { en: "Report Generation", mr: "अहवाल निर्मिती" }, path: "/police/report-generation", icon: FiFileText },
      { label: { en: "Officer Performance", mr: "अधिकारी कार्यक्षमता" }, path: "/police/performance", icon: FiUsers },
      { label: { en: "Train Model", mr: "मॉडेल प्रशिक्षण" }, path: "/police/train-model", icon: FiShield },
    ],
  },
];

const quickActions = [
  {
    title: { en: "New Incident", mr: "नवीन घटना" },
    subtitle: { en: "Capture a fresh crime report", mr: "नवीन गुन्हा अहवाल नोंदवा" },
    path: "/police/add-crime",
    icon: FiFilePlus,
    className: "from-cyan-500 to-teal-500",
  },
  {
    title: { en: "Watch Alerts", mr: "अलर्ट पहा" },
    subtitle: { en: "Open real-time emergency stream", mr: "रिअल-टाइम आपत्कालीन प्रवाह उघडा" },
    path: "/police/crime-alerts",
    icon: FiAlertTriangle,
    className: "from-amber-500 to-orange-500",
  },
];

const pageTitleMap = {
  "/police/dashboard": { en: "Operations Dashboard", mr: "ऑपरेशन्स डॅशबोर्ड" },
  "/police/add-crime": { en: "Add Crime Report", mr: "गुन्हा अहवाल जोडा" },
  "/police/view-crimes": { en: "Crime Records", mr: "गुन्हे नोंदी" },
  "/police/officers": { en: "Officer Management", mr: "अधिकारी व्यवस्थापन" },
  "/police/cases": { en: "Case Management", mr: "प्रकरण व्यवस्थापन" },
  "/police/search": { en: "Advanced Search", mr: "प्रगत शोध" },
  "/police/analytics": { en: "Crime Analytics", mr: "गुन्हे विश्लेषण" },
  "/police/performance": { en: "Officer Performance", mr: "अधिकारी कार्यक्षमता" },
  "/police/train-model": { en: "Model Training", mr: "मॉडेल प्रशिक्षण" },
  "/police/hotspots": { en: "Hotspot Intelligence", mr: "हॉटस्पॉट गुप्त माहिती" },
  "/police/suspect-matching": { en: "Suspect Matching", mr: "संशयित जुळणी" },
  "/police/report-generation": { en: "Automated Reports", mr: "स्वयंचलित अहवाल" },
  "/police/live-feed": { en: "Live Crime Feed", mr: "लाईव्ह गुन्हे फीड" },
  "/police/crime-alerts": { en: "Real-Time Alerts", mr: "रिअल-टाइम अलर्ट" },
  "/police/trend-predictions": { en: "Trend Predictions", mr: "कलाचा अंदाज" },
  "/police/time-analytics": { en: "Time-Based Analytics", mr: "वेळ-आधारित विश्लेषण" },
  "/police/bulk-upload": { en: "Bulk Data Upload", mr: "बल्क डेटा अपलोड" },
};

function PoliceSidebarLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isDark } = useTheme();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle = useMemo(
    () => t(pageTitleMap[location.pathname] || { en: "Police Command Center", mr: "पोलीस कमांड सेंटर" }),
    [location.pathname, t]
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("policeAuth");
    toast.success(t({ en: "Logged out successfully.", mr: "यशस्वीरित्या लॉगआउट झाले." }));
    navigate("/police/login", { replace: true });
  };

  return (
    <div className={`min-h-screen overflow-x-hidden ${isDark ? "bg-[#08131f] text-slate-100" : "bg-[#eaf1f9] text-slate-800"}`}>
      {isSidebarOpen && (
        <button
          type="button"
          aria-label={t({ en: "Close sidebar overlay", mr: "साइडबार बंद करा" })}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r px-3 pb-4 pt-4 backdrop-blur transition-transform duration-300 md:translate-x-0 ${
          isDark
            ? "border-white/10 bg-[#0b1e30]/95 shadow-2xl shadow-black/30"
            : "border-slate-300/70 bg-[#f4f8fd]/95 shadow-2xl shadow-slate-300/35"
        } ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "md:w-24" : "md:w-80"}`}
      >
        <button
          type="button"
          className={`absolute -right-3 top-5 hidden h-10 w-10 items-center justify-center rounded-full border shadow-lg transition md:inline-flex ${
            isDark
              ? "border-cyan-300/40 bg-[#0a1a2a] text-cyan-100 shadow-black/40 hover:bg-[#102a40]"
              : "border-cyan-700/30 bg-white text-cyan-800 shadow-slate-300/50 hover:bg-slate-100"
          }`}
          onClick={() => setIsCollapsed((prev) => !prev)}
          title={
            isCollapsed
              ? t({ en: "Expand sidebar", mr: "साइडबार विस्तृत करा" })
              : t({ en: "Collapse sidebar", mr: "साइडबार संकुचित करा" })
          }
        >
          {isCollapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
        </button>

        <div className={`mb-4 flex items-center justify-between gap-2 rounded-2xl border px-3 py-3 shadow-lg ${
          isDark
            ? "border-amber-300/25 bg-gradient-to-r from-[#122743] to-[#0e2137] shadow-black/30"
            : "border-amber-400/30 bg-gradient-to-r from-[#f9fbff] to-[#eef4fb] shadow-slate-300/55"
        }`}>
          <button
            type="button"
            onClick={() => navigate("/police/dashboard")}
            className="flex min-w-0 cursor-pointer items-center gap-3 text-left"
            title={t({ en: "Open police dashboard", mr: "पोलीस डॅशबोर्ड उघडा" })}
          >
            {isCollapsed ? (
              <img
                src="/branding/maharashtra_police.png"
                alt="Maharashtra Police"
                className="h-12 w-12 rounded-full border border-amber-300/50 bg-slate-900/80 p-1.5 object-cover"
                loading="lazy"
              />
            ) : (
              <AgencyBrand compact showSubtitle={false} className="max-w-full" />
            )}
          </button>

          <button
            type="button"
            className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition md:hidden ${
              isDark
                ? "text-slate-300 hover:bg-white/10 hover:text-white"
                : "text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
            }`}
            onClick={() => setIsSidebarOpen(false)}
          >
            <FiX size={20} />
          </button>
        </div>

        {!isCollapsed && (
          <div className="mb-4 flex flex-wrap gap-2">
            <LanguageToggle compact />
            <ThemeToggle compact />
          </div>
        )}

        {!isCollapsed && (
          <div className="mb-4 space-y-2">
            <div className={`rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${
              isDark
                ? "border-amber-300/20 bg-amber-300/10 text-amber-100/90"
                : "border-amber-400/25 bg-amber-100/80 text-amber-900"
            }`}>
              {t({ en: "State Command Network", mr: "राज्य कमांड नेटवर्क" })}
            </div>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className={`w-full cursor-pointer rounded-2xl bg-gradient-to-r px-3 py-3 text-left transition hover:brightness-110 ${action.className}`}
                >
                  <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                    <Icon size={18} />
                    {t(action.title)}
                  </span>
                  <span className="block text-xs text-white/90">{t(action.subtitle)}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
          {navSections.map((section) => (
            <div key={section.title.en} className="mb-4">
              {!isCollapsed && (
                <p className={`mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {t(section.title)}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                          isActive
                            ? isDark
                              ? "bg-gradient-to-r from-cyan-500/20 to-teal-500/15 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]"
                              : "bg-gradient-to-r from-cyan-100 to-teal-100 text-cyan-900 shadow-[inset_0_0_0_1px_rgba(14,165,183,0.25)]"
                            : isDark
                              ? "text-slate-300 hover:bg-white/8 hover:text-white"
                              : "text-slate-700 hover:bg-slate-200/70 hover:text-slate-900"
                        }`
                      }
                      title={t(item.label)}
                    >
                      <Icon className="shrink-0" size={20} />
                      {!isCollapsed && <span className="truncate">{t(item.label)}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-3 shrink-0 border-t bg-gradient-to-t pt-3 ${isDark ? "border-white/10 from-[#081a2a] to-transparent" : "border-slate-300/70 from-[#e8f0fa] to-transparent"}`}>
          <button
            type="button"
            onClick={handleLogout}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              isDark
                ? "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
                : "bg-rose-100 text-rose-800 hover:bg-rose-200"
            }`}
          >
            <FiLogOut size={18} />
            {!isCollapsed && <span>{t({ en: "Logout", mr: "लॉगआउट" })}</span>}
          </button>
        </div>
      </aside>

      <div className={`transition-[margin-left] duration-300 ${isCollapsed ? "md:ml-24" : "md:ml-80"}`}>
        <header className={`sticky top-0 z-20 border-b px-4 py-3 backdrop-blur sm:px-6 lg:px-8 ${
          isDark
            ? "border-amber-300/15 bg-[#07101a]/90"
            : "border-slate-300/70 bg-[#f9fbff]/90"
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition md:hidden ${
                  isDark
                    ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    : "border-slate-300/70 bg-white text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => setIsSidebarOpen(true)}
              >
                <FiMenu size={20} />
              </button>

              <div className="min-w-0">
                <p className={`truncate text-base font-semibold sm:text-lg ${isDark ? "text-slate-100" : "text-slate-900"}`}>{pageTitle}</p>
                <p className={`truncate text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  {t({
                    en: "Live command stream with AI-assisted operational insights",
                    mr: "AI-सहाय्यित कार्यवाही विश्लेषणासह लाईव्ह कमांड प्रवाह",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageToggle compact className="hidden sm:inline-flex" />
              <ThemeToggle compact className="hidden sm:inline-flex" />
              <img
                src="/branding/satyamev_jayate.jpg"
                alt="Satyamev Jayate"
                className="hidden h-12 w-12 rounded-full border border-amber-300/45 bg-slate-900/80 p-1.5 object-cover sm:block"
                loading="lazy"
              />
              <span className={`hidden rounded-full border px-2.5 py-1 text-xs font-semibold sm:inline ${
                isDark
                  ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                  : "border-emerald-500/30 bg-emerald-100 text-emerald-800"
              }`}>
                {t({ en: "System Healthy", mr: "प्रणाली स्थिर" })}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
            <LanguageToggle compact />
            <ThemeToggle compact />
          </div>
        </header>

        <main className="police-theme-scope min-h-[calc(100vh-73px)] overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default PoliceSidebarLayout;
