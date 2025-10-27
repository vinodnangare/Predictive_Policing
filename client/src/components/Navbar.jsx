// src/components/Navbar.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiLogIn, FiLogOut, FiShield, FiMenu, FiX } from "react-icons/fi";
import { logout, checkAuth } from "../utils/auth";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const isLoggedIn = checkAuth();

  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    // navigate to public dashboard using client-side routing
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white shadow-lg backdrop-blur-md border-b border-blue-800/30 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-2xl font-bold tracking-wide bg-gradient-to-r from-blue-300 via-blue-400 to-blue-500 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300"
        >
          <FiShield className="text-blue-400" />
          <span className="hidden sm:inline">Crime Predictor</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link
            to="/"
            className="relative hover:text-blue-400 transition-colors duration-200 after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-blue-400 hover:after:w-full after:transition-all after:duration-300"
          >
            Public Dashboard
          </Link>

          {!isLoggedIn ? (
            <Link
              to="/police/login"
              className="flex items-center gap-1 bg-blue-600 px-3 py-2 rounded-md hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-blue-500/30"
            >
              <FiLogIn /> Police Login
            </Link>
          ) : (
            <>
              <Link
                to="/police/dashboard"
                className="relative hover:text-blue-400 transition-colors duration-200 after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-blue-400 hover:after:w-full after:transition-all after:duration-300"
              >
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 px-3 py-2 rounded-md hover:from-red-700 hover:to-red-800 shadow-md hover:shadow-red-500/30 transition-all duration-300"
              >
                <FiLogOut /> Logout
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          {menuOpen ? (
            <FiX
              size={26}
              className="cursor-pointer hover:rotate-90 transition-transform duration-300"
              onClick={() => setMenuOpen(false)}
            />
          ) : (
            <FiMenu
              size={26}
              className="cursor-pointer hover:scale-110 transition-transform duration-300"
              onClick={() => setMenuOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <div
        className={`md:hidden bg-gradient-to-b from-blue-900 to-gray-900 border-t border-blue-800/30 overflow-hidden transition-all duration-300 ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col text-sm font-medium">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="px-6 py-3 hover:bg-blue-800/60 transition-all duration-200"
          >
            Public Dashboard
          </Link>

          {!isLoggedIn ? (
            <Link
              to="/police/login"
              onClick={() => setMenuOpen(false)}
              className="px-6 py-3 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-all duration-300"
            >
              <FiLogIn /> Police Login
            </Link>
          ) : (
            <>
              <Link
                to="/police/dashboard"
                onClick={() => setMenuOpen(false)}
                className="px-6 py-3 hover:bg-blue-800/60 transition-all duration-200"
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="px-6 py-3 flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-300"
              >
                <FiLogOut /> Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
