import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const LanguageContext = createContext(null);

const STORAGE_KEY = "uiLanguage";

const getInitialLanguage = () => {
  if (typeof window === "undefined") return "en";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "mr" || stored === "en") return stored;

  const browserLang = (window.navigator.language || "").toLowerCase();
  return browserLang.startsWith("mr") ? "mr" : "en";
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      isMarathi: language === "mr",
      setLanguage,
      t: (labels) => labels?.[language] ?? labels?.en ?? "",
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}
