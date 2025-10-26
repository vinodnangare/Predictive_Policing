// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem("policeAuth"); // Same key used in login

  return isAuthenticated ? children : <Navigate to="/police/login" replace />;
}

export default ProtectedRoute;
