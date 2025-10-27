// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  // Check both token and auth state
  const isAuthenticated = localStorage.getItem("policeAuth") === "true" && localStorage.getItem("token");

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/police/login" replace />;
  }

  // If authenticated, render the protected component
  return children;
}

export default ProtectedRoute;
