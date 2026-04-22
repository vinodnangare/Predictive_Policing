import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

function LanguageToggle({ compact = false, className = "" }) {
  const { language, setLanguage } = useLanguage();
  const { isDark } = useTheme();

  const baseClass = compact
    ? "h-8 px-2.5 text-[11px]"
    : "h-9 px-3 text-xs";

  const buttonClass = (active) =>
    `${baseClass} rounded-md font-semibold tracking-wide transition ${
      active
        ? isDark
          ? "bg-amber-400 text-slate-950 shadow"
          : "bg-amber-500 text-white shadow"
        : isDark
          ? "text-slate-200 hover:bg-white/10"
          : "text-slate-700 hover:bg-slate-200/70"
    }`;

  return (
    <div className={`inline-flex items-center gap-1 rounded-lg border p-1 ${isDark ? "border-white/20 bg-[#0b1f34]/75" : "border-slate-300/75 bg-white/85"} ${className}`}>
      <button
        type="button"
        onClick={() => setLanguage("mr")}
        className={buttonClass(language === "mr")}
        aria-label="Switch to Marathi"
      >
        मराठी
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={buttonClass(language === "en")}
        aria-label="Switch to English"
      >
        English
      </button>
    </div>
  );
}

export default LanguageToggle;
