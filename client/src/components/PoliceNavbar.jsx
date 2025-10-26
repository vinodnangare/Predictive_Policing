import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiMenu, FiX, FiLogOut } from "react-icons/fi";

function PoliceNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("policeAuth");
    navigate("/police/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/police/dashboard" },
    { name: "Add Crime", path: "/police/add-crime" },
    { name: "View Crimes", path: "/police/view-crimes" },
    { name: "Train AI Model", path: "/police/train-model" },
    { name: "Crime Hotspots", path: "/police/hotspots" },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-blue-800/70 backdrop-blur-md border-b border-blue-600/40 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <h2
          onClick={() => navigate("/police/dashboard")}
          className="text-xl font-bold tracking-wide flex items-center gap-2 cursor-pointer bg-gradient-to-r from-blue-300 via-blue-100 to-blue-400 bg-clip-text text-transparent hover:scale-105 hover:brightness-110 transition-transform duration-300"
        >
          🛡️ CrimePredictor <span className="hidden sm:inline">– Police Panel</span>
        </h2>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          {menuOpen ? (
            <FiX
              size={28}
              className="cursor-pointer hover:rotate-90 transition-transform duration-300"
              onClick={() => setMenuOpen(false)}
            />
          ) : (
            <FiMenu
              size={28}
              className="cursor-pointer hover:scale-110 transition-transform duration-300"
              onClick={() => setMenuOpen(true)}
            />
          )}
        </div>

        {/* Desktop Menu */}
        <ul className="hidden md:flex space-x-6 items-center">
          {navItems.map((item, i) => (
            <li key={i}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-900 to-blue-700 shadow-lg"
                      : "hover:bg-blue-600/70 hover:shadow-md"
                  }`
                }
              >
                {item.name}
                <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-blue-300 transition-all duration-300 group-hover:w-full"></span>
              </NavLink>
            </li>
          ))}
          <button
            onClick={handleLogout}
            className="ml-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-md hover:from-red-700 hover:to-red-800 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <FiLogOut /> Logout
          </button>
        </ul>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="flex flex-col bg-blue-900/90 backdrop-blur-lg text-white shadow-md border-t border-blue-700/40">
          {navItems.map((item, i) => (
            <NavLink
              key={i}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-6 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-800"
                    : "hover:bg-blue-700 hover:pl-8"
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="w-full text-left px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-300 flex items-center gap-2"
          >
            <FiLogOut /> Logout
          </button>
        </ul>
      </div>
    </nav>
  );
}

export default PoliceNavbar;
