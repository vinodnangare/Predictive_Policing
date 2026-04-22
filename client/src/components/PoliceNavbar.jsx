import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FiMenu, FiX, FiLogOut, FiHome } from "react-icons/fi";

function PoliceNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
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
    localStorage.removeItem("policeAuth");
    navigate("/police/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/police/dashboard" },
    { name: "Add Crime", path: "/police/add-crime" },
    { name: "View Crimes", path: "/police/view-crimes" },
    { name: "Officers", path: "/police/officers" },
    { name: "Cases", path: "/police/cases" },
    { name: "Search", path: "/police/search" },
    { name: "Analytics", path: "/police/analytics" },
    { name: "Performance", path: "/police/performance" },
    { name: "Train Model", path: "/police/train-model" },
    { name: "Hotspots", path: "/police/hotspots" },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
      isScrolled
        ? 'bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 shadow-2xl shadow-blue-900/50'
        : 'bg-gradient-to-r from-slate-900/80 via-blue-900/80 to-slate-900/80 shadow-lg'
    } backdrop-blur-md border-b border-blue-500/20 text-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <div
          onClick={() => navigate("/police/dashboard")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg group-hover:shadow-lg group-hover:shadow-blue-500/50 transition-all duration-300 transform group-hover:scale-110">
            <span className="text-white text-lg">🛡️</span>
          </div>
          <div className="flex flex-col">
            <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-blue-300 via-blue-200 to-cyan-400 bg-clip-text text-transparent">CrimePredictor</span>
            <span className="text-xs text-cyan-400 font-semibold hidden sm:block">Police Panel</span>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          {menuOpen ? (
            <FiX
              size={28}
              className="cursor-pointer text-white hover:text-cyan-400 transition-colors duration-300 transform hover:rotate-90 duration-300"
              onClick={() => setMenuOpen(false)}
            />
          ) : (
            <FiMenu
              size={28}
              className="cursor-pointer text-white hover:text-cyan-400 transition-colors duration-300 transform hover:scale-110 duration-300"
              onClick={() => setMenuOpen(true)}
            />
          )}
        </div>

        {/* Desktop Menu */}
        <ul className="hidden md:flex space-x-2 items-center">
          {navItems.map((item, i) => (
            <li key={i}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `group relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg shadow-blue-500/50 text-white"
                      : "text-gray-200 hover:bg-blue-600/40 hover:text-cyan-300"
                  }`
                }
              >
                {item.name}
                {!({ isActive: false }).isActive && (
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400 group-hover:w-full transition-all duration-300"></span>
                )}
              </NavLink>
            </li>
          ))}
          <button
            onClick={handleLogout}
            className="ml-6 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-red-500/50 transition-all duration-300 transform hover:scale-105 font-medium"
          >
            <FiLogOut size={18} />
            <span>Logout</span>
          </button>
        </ul>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
          menuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="flex flex-col bg-gradient-to-b from-blue-900/95 to-slate-900/95 backdrop-blur-lg text-white border-t border-blue-500/20 divide-y divide-blue-700/30">
          <li>
            <NavLink
              to="/police/dashboard"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-4 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-700 to-blue-600 text-cyan-300"
                    : "hover:bg-blue-800/60 hover:pl-8"
                }`
              }
            >
              <FiHome size={18} />
              Dashboard
            </NavLink>
          </li>
          {navItems.slice(1).map((item, i) => (
            <li key={i}>
              <NavLink
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-6 py-4 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-700 to-blue-600 text-cyan-300"
                      : "hover:bg-blue-800/60 hover:pl-8"
                  }`
                }
              >
                {item.name}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
              className="w-full text-left px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-300 flex items-center gap-3 font-medium"
            >
              <FiLogOut size={18} />
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default PoliceNavbar;
