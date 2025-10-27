// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const isAuthenticated = localStorage.getItem("policeAuth") === "true";

  if (!token || !isAuthenticated) {
    // Redirect to login but save the attempted path
    return <Navigate to="/police/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

export default ProtectedRoute;
