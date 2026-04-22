import React from "react";
import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

function ThemeToggle({ compact = false, className = "" }) {
  const { theme, setTheme, isDark } = useTheme();
  const { t } = useLanguage();

  const baseClass = compact
    ? "h-8 px-2.5 text-[11px]"
    : "h-9 px-3 text-xs";

  const buttonClass = (active) =>
    `${baseClass} rounded-md font-semibold tracking-wide transition inline-flex items-center gap-1.5 ${
      active
        ? isDark
          ? "bg-cyan-400 text-slate-950 shadow"
          : "bg-cyan-600 text-white shadow"
        : isDark
          ? "text-slate-200 hover:bg-white/10"
          : "text-slate-700 hover:bg-slate-200/70"
    }`;

  return (
    <div className={`inline-flex items-center gap-1 rounded-lg border p-1 ${isDark ? "border-white/20 bg-[#0b1f34]/75" : "border-slate-300/75 bg-white/85"} ${className}`}>
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={buttonClass(theme === "light")}
        aria-label={t({ en: "Switch to light mode", mr: "लाईट मोड सुरू करा" })}
      >
        <FiSun size={14} />
        {t({ en: "Light", mr: "लाईट" })}
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={buttonClass(theme === "dark")}
        aria-label={t({ en: "Switch to dark mode", mr: "डार्क मोड सुरू करा" })}
      >
        <FiMoon size={14} />
        {t({ en: "Dark", mr: "डार्क" })}
      </button>

      <span className="sr-only">
        {isDark
          ? t({ en: "Dark mode active", mr: "डार्क मोड सक्रिय" })
          : t({ en: "Light mode active", mr: "लाईट मोड सक्रिय" })}
      </span>
    </div>
  );
}

export default ThemeToggle;
