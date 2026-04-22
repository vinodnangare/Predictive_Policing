import React from "react";
import { FiShield, FiUsers } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

const chiefMinister = {
  key: "devendra-fadnavis",
  name: {
    en: "Shri Devendra Fadnavis",
    mr: "श्री. देवेंद्र फडणवीस",
  },
  role: {
    en: "Hon. Chief Minister, Maharashtra",
    mr: "मा. मुख्यमंत्री, महाराष्ट्र राज्य",
  },
  image: "/branding/devendra_fadavnis.jpeg",
};

const stateLeadership = [
  {
    key: "eknath-shinde",
    name: {
      en: "Shri Eknath Shinde",
      mr: "श्री. एकनाथ शिंदे",
    },
    role: {
      en: "Hon. Deputy Chief Minister",
      mr: "मा. उपमुख्यमंत्री",
    },
    image: "/branding/eknath_shinde.jpeg",
  },
  {
    key: "sunetra-pawar",
    name: {
      en: "Shrimati Sunetra Ajit Pawar",
      mr: "श्रीमती. सुनेत्रा अजित पवार",
    },
    role: {
      en: "Hon. Deputy Chief Minister, Maharashtra",
      mr: "मा. उपमुख्यमंत्री, महाराष्ट्र राज्य",
    },
    image: "/branding/sunentra_pawar.jpeg",
  },
];

const policeCommand = [
  {
    key: "sadanand-date",
    name: {
      en: "Shri Sadanand Date (IPS)",
      mr: "श्री. सदानंद दाते (भा.पो.से.)",
    },
    role: {
      en: "Hon. Director General of Police, Maharashtra",
      mr: "मा. पोलीस महासंचालक, महाराष्ट्र राज्य",
    },
    image: "/branding/sadanand%20hate.jpeg",
  },
  {
    key: "sunil-fulhari",
    name: {
      en: "Shri Sunil Fulhari (IPS)",
      mr: "श्री. सुनील फुलहरी (भा.पो.से.)",
    },
    role: {
      en: "Hon. Special Inspector General of Police, Kolhapur Range",
      mr: "मा. विशेष पोलीस महानिरीक्षक, कोल्हापूर परिक्षेत्र",
    },
    image: "/branding/sunil%20fulhari.jpeg",
  },
];

function LeaderCard({ leader, highlight = false }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  return (
    <article
      className={`group rounded-2xl border p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 ${
        isDark
          ? `bg-slate-900/65 shadow-black/25 hover:border-amber-300/40 hover:bg-slate-900/80 ${
              highlight ? "border-amber-300/35" : "border-slate-600/45"
            }`
          : `bg-white/92 shadow-slate-300/55 hover:border-amber-500/45 hover:bg-white ${
              highlight ? "border-amber-500/35" : "border-slate-300/80"
            }`
      }`}
    >
      <div
        className={`mx-auto mb-3 overflow-hidden rounded-full border-4 shadow-xl ${
          isDark
            ? "border-amber-300/45 bg-slate-800 shadow-black/35"
            : "border-amber-500/45 bg-slate-100 shadow-slate-300/60"
        } ${
          highlight ? "h-36 w-36" : "h-28 w-28"
        }`}
      >
        <img
          src={leader.image}
          alt={t(leader.name)}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <h3 className={`${highlight ? "text-2xl" : "text-xl"} text-center font-semibold ${isDark ? "text-amber-200" : "text-amber-800"}`}>
        {t(leader.name)}
      </h3>
      <p className={`mt-1 text-center text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-slate-700"}`}>{t(leader.role)}</p>
    </article>
  );
}

function LeadershipCouncil() {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  return (
    <section className={`relative mb-5 overflow-hidden rounded-3xl border p-5 shadow-2xl sm:p-7 ${
      isDark
        ? "border-amber-300/20 bg-gradient-to-br from-[#13243a]/96 via-[#0f1f33]/94 to-[#0a1728]/96 shadow-black/35"
        : "border-amber-500/25 bg-gradient-to-br from-[#f8fbff] via-[#f1f6fc] to-[#eaf1f9] shadow-slate-300/50"
    }`}>
      <div className="pointer-events-none absolute -left-10 top-10 h-28 w-28 rounded-full bg-cyan-200/10" />
      <div className="pointer-events-none absolute -right-8 top-16 h-24 w-24 rounded-full bg-emerald-200/10" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
            isDark
              ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
              : "border-amber-500/35 bg-amber-100 text-amber-800"
          }`}>
            <FiShield size={14} />
            {t({ en: "Administrative Leadership", mr: "प्रशासकीय नेतृत्व" })}
          </p>
          <h2 className={`text-2xl font-bold sm:text-3xl ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            {t({
              en: "Maharashtra Public Safety Leadership Council",
              mr: "महाराष्ट्र सार्वजनिक सुरक्षा नेतृत्व परिषद",
            })}
          </h2>
          <p className={`mt-2 max-w-3xl text-sm sm:text-base ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            {t({
              en: "A coordinated state-government and police leadership forum focused on responsive, disciplined, and citizen-centered law-and-order delivery.",
              mr: "राज्य शासन आणि पोलीस नेतृत्व यांच्या समन्वयातून कायदा व सुव्यवस्था अधिक प्रतिसादक्षम, शिस्तबद्ध आणि नागरिक-केंद्रित करण्याचे ध्येय.",
            })}
          </p>
        </div>

        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
          isDark
            ? "border-cyan-300/30 bg-cyan-500/12 text-cyan-100"
            : "border-cyan-500/30 bg-cyan-100 text-cyan-800"
        }`}>
          <FiUsers size={14} />
          {t({ en: "Core Leadership Council", mr: "मुख्य नेतृत्व परिषद" })}
        </div>
      </div>

      <div className="relative z-10">
        <div className="mx-auto mb-6 max-w-lg">
          <LeaderCard leader={chiefMinister} highlight />
        </div>

        <div className="mb-5">
          <p className={`mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] ${isDark ? "text-cyan-100/90" : "text-cyan-800"}`}>
            {t({ en: "State Leadership", mr: "राज्य नेतृत्व" })}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {stateLeadership.map((leader) => (
              <LeaderCard key={leader.key} leader={leader} />
            ))}
          </div>
        </div>

        <div>
          <p className={`mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] ${isDark ? "text-cyan-100/90" : "text-cyan-800"}`}>
            {t({ en: "Police Command", mr: "पोलीस कमांड" })}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {policeCommand.map((leader) => (
              <LeaderCard key={leader.key} leader={leader} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default LeadershipCouncil;
