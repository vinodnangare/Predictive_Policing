import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

function AgencyBrand({ compact = false, showSubtitle = true, className = "" }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const badgeClass = compact
    ? `h-[60px] w-[60px] rounded-full border p-1.5 object-cover shadow-lg ${
        isDark
          ? "border-amber-300/55 bg-slate-900/85 shadow-black/40"
          : "border-amber-500/50 bg-white/95 shadow-slate-300/65"
      }`
    : `h-[92px] w-[92px] rounded-full border p-2 object-cover shadow-xl ${
        isDark
          ? "border-amber-300/60 bg-slate-900/85 shadow-black/45"
          : "border-amber-500/50 bg-white/95 shadow-slate-300/70"
      }`;

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <div className="flex shrink-0 items-center gap-3">
        <img
          src="/branding/satyamev_jayate.jpg"
          alt="Satyamev Jayate"
          className={badgeClass}
          loading="lazy"
        />
        <img
          src="/branding/maharashtra_police.png"
          alt="Maharashtra Police"
          className={badgeClass}
          loading="lazy"
        />
      </div>

      <div className="min-w-0">
        <p className={`truncate text-[12px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-amber-200/95" : "text-amber-700"}`}>
          {t({
            en: "Government of Maharashtra",
            mr: "महाराष्ट्र शासन",
          })}
        </p>
        <p className={`${compact ? "text-xl" : "text-3xl"} truncate font-semibold leading-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {t({
            en: "Maharashtra Police Command",
            mr: "महाराष्ट्र पोलीस कमांड",
          })}
        </p>
        {showSubtitle && (
          <p className={`${compact ? "text-[13px]" : "text-base"} truncate ${isDark ? "text-cyan-100/85" : "text-slate-700"}`}>
            {t({
              en: "Satyamev Jayate • Predictive Policing Suite",
              mr: "सत्यमेव जयते • प्रेडिक्टिव्ह पोलिसिंग प्रणाली",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

export default AgencyBrand;
