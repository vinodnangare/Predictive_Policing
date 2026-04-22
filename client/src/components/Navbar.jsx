// src/components/Navbar.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiLogIn, FiLogOut, FiMenu, FiX, FiHome } from "react-icons/fi";
import { logout, checkAuth } from "../utils/auth";
import AgencyBrand from "./AgencyBrand";
import LanguageToggle from "./LanguageToggle";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "./ThemeToggle";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isLoggedIn = checkAuth();
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const navigate = useNavigate();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/public-dashboard');
  };

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
      isScrolled
        ? isDark
          ? "bg-gradient-to-r from-[#081a2e] via-[#102845] to-[#081a2e] shadow-2xl shadow-black/45"
          : "bg-gradient-to-r from-[#f9fbff] via-[#edf4fc] to-[#f9fbff] shadow-xl shadow-slate-300/45"
        : isDark
          ? "bg-gradient-to-r from-[#081a2e]/90 via-[#102845]/88 to-[#081a2e]/90 shadow-xl"
          : "bg-gradient-to-r from-[#f9fbff]/94 via-[#edf4fc]/92 to-[#f9fbff]/94 shadow-lg shadow-slate-200/60"
    } backdrop-blur-md border-b ${isDark ? "border-amber-300/25 text-white" : "border-slate-300/70 text-slate-900"}`}>
      <div className="max-w-[96rem] mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center gap-3">
        <Link to="/public-dashboard" className="min-w-0">
          <AgencyBrand compact showSubtitle={false} className="max-w-[22rem] sm:max-w-[30rem]" />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-1 text-sm font-medium">
          <span className={`mr-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${isDark ? "border-cyan-300/35 bg-cyan-500/15 text-cyan-100" : "border-cyan-700/20 bg-cyan-50 text-cyan-900"}`}>
            {t({ en: "Citizen Portal", mr: "नागरिक पोर्टल" })}
          </span>
          <Link
            to="/public-dashboard"
            className="group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:bg-cyan-500/20"
          >
            <FiHome size={20} className="group-hover:text-cyan-300 transition-colors" />
            <span className={`transition-colors ${isDark ? "group-hover:text-cyan-200" : "group-hover:text-cyan-800"}`}>
              {t({ en: "Public Dashboard", mr: "सार्वजनिक डॅशबोर्ड" })}
            </span>
          </Link>

          <LanguageToggle compact className="ml-2" />
          <ThemeToggle compact className="ml-1" />

          {!isLoggedIn ? (
            <Link
              to="/police/login"
              className="ml-3 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-lg hover:from-amber-400 hover:to-amber-500 shadow-lg hover:shadow-amber-700/45 transition-all duration-300"
            >
              <FiLogIn size={20} />
              <span className="font-semibold">{t({ en: "Police Login", mr: "पोलीस लॉगिन" })}</span>
            </Link>
          ) : (
            <>
              <Link
                to="/police/dashboard"
                className="group px-4 py-2 rounded-lg transition-all duration-300 hover:bg-emerald-500/20"
              >
                <span className="group-hover:text-emerald-300 transition-colors">
                  {t({ en: "Police Panel", mr: "पोलीस पॅनेल" })}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="ml-3 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-red-700 rounded-lg hover:from-rose-500 hover:to-red-600 shadow-lg hover:shadow-red-700/45 transition-all duration-300"
              >
                <FiLogOut size={20} />
                <span>{t({ en: "Logout", mr: "लॉगआउट" })}</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          {menuOpen ? (
            <FiX
              size={30}
              className="cursor-pointer text-white hover:text-cyan-400 transition-colors duration-300"
              onClick={() => setMenuOpen(false)}
            />
          ) : (
            <FiMenu
              size={30}
              className="cursor-pointer text-white hover:text-cyan-400 transition-colors duration-300"
              onClick={() => setMenuOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <div
        className={`md:hidden backdrop-blur-lg overflow-hidden transition-all duration-300 ${
          isDark
            ? "bg-gradient-to-b from-[#102845]/95 to-[#081a2e]/95 border-t border-amber-300/20"
            : "bg-gradient-to-b from-[#eff5fc]/96 to-[#f8fbff]/98 border-t border-slate-300/70"
        } ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className={`px-5 py-4 ${isDark ? "border-b border-white/10" : "border-b border-slate-300/65"}`}>
          <AgencyBrand showSubtitle={false} className="max-w-full" />
          <div className="mt-3 flex flex-wrap gap-2">
            <LanguageToggle className="w-fit" />
            <ThemeToggle className="w-fit" />
          </div>
        </div>

        <div className={`flex flex-col text-sm font-medium divide-y ${isDark ? "divide-blue-700/30" : "divide-slate-300/65"}`}>
          <Link
            to="/public-dashboard"
            onClick={() => setMenuOpen(false)}
            className="px-6 py-4 flex items-center gap-2 hover:bg-cyan-700/30 transition-all duration-200"
          >
            <FiHome size={20} className="text-cyan-400" />
            <span>{t({ en: "Public Dashboard", mr: "सार्वजनिक डॅशबोर्ड" })}</span>
          </Link>

          {!isLoggedIn ? (
            <Link
              to="/police/login"
              onClick={() => setMenuOpen(false)}
              className="px-6 py-4 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all duration-300"
            >
              <FiLogIn size={20} />
              <span className="font-semibold">{t({ en: "Police Login", mr: "पोलीस लॉगिन" })}</span>
            </Link>
          ) : (
            <>
              <Link
                to="/police/dashboard"
                onClick={() => setMenuOpen(false)}
                className="px-6 py-4 flex items-center gap-2 hover:bg-emerald-600/30 transition-all duration-200"
              >
                <span className="text-lg">👮‍♂️</span>
                <span>{t({ en: "Police Panel", mr: "पोलीस पॅनेल" })}</span>
              </Link>

              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="px-6 py-4 w-full text-left flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-300"
              >
                <FiLogOut size={20} />
                <span>{t({ en: "Logout", mr: "लॉगआउट" })}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
