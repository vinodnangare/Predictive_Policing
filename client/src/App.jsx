// src/App.jsx
// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import PoliceLogin from "./pages/PoliceLogin";
import PoliceDashboard from "./pages/PoliceDashboard";
import PublicDashboard from "./pages/PublicDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import PoliceSidebarLayout from "./components/PoliceSidebarLayout";
import AddCrime from "./components/CrimeForm";
import CrimeMap from "./components/CrimeMap";
import ViewCrimes from "./components/CrimeRecords";
import RetrainModel from "./pages/RetrainModel";
import CrimeAnalytics from "./components/CrimeAnalytics";
import CaseManagement from "./components/CaseManagement";
import AdvancedSearch from "./components/AdvancedSearch";
import OfficerPerformance from "./components/OfficerPerformance";
// Newly added feature components
import SuspectMatching from "./components/SuspectMatching";
import AutomatedReportGeneration from "./components/AutomatedReportGeneration";
import LiveCrimeFeed from "./components/LiveCrimeFeed";
import RealTimeCrimeAlerts from "./components/RealTimeCrimeAlerts";
import CrimeTrendPredictions from "./components/CrimeTrendPredictions";
import TimeBasedAnalytics from "./components/TimeBasedAnalytics";
import BulkCSVUpload from "./components/BulkCSVUpload";
import OfficerManagement from "./components/OfficerManagement";

function AppContent() {
  const location = useLocation();
  const [isPoliceLoggedIn, setIsPoliceLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in as police officer
    const policeAuth = localStorage.getItem("policeAuth") === "true";
    setIsPoliceLoggedIn(policeAuth);
  }, [location]);

  const isPoliceRoute = location.pathname.startsWith("/police");
  const shouldShowPublicNavbar = !isPoliceRoute;

  return (
    <>
      {shouldShowPublicNavbar && <Navbar />}
      <Routes>
        {/* Entry Route */}
        <Route
          path="/"
          element={
            isPoliceLoggedIn ? <Navigate to="/police/dashboard" replace /> : <Navigate to="/public-dashboard" replace />
          }
        />

        <Route path="/public-dashboard" element={<PublicDashboard />} />

        {/* Police Login */}
        <Route path="/police/login" element={<PoliceLogin />} />

        {/* Protected Police Application */}
        <Route
          path="/police"
          element={
            <ProtectedRoute>
              <PoliceSidebarLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PoliceDashboard />} />
          <Route path="add-crime" element={<AddCrime />} />
          <Route path="view-crimes" element={<ViewCrimes />} />
          <Route path="hotspots" element={<CrimeMap />} />
          <Route path="train-model" element={<RetrainModel />} />
          <Route path="analytics" element={<CrimeAnalytics />} />
          <Route path="cases" element={<CaseManagement />} />
          <Route path="search" element={<AdvancedSearch />} />
          <Route path="performance" element={<OfficerPerformance />} />
          <Route path="suspect-matching" element={<SuspectMatching />} />
          <Route path="report-generation" element={<AutomatedReportGeneration />} />
          <Route path="live-feed" element={<LiveCrimeFeed />} />
          <Route path="crime-alerts" element={<RealTimeCrimeAlerts />} />
          <Route path="trend-predictions" element={<CrimeTrendPredictions />} />
          <Route path="time-analytics" element={<TimeBasedAnalytics />} />
          <Route path="bulk-upload" element={<BulkCSVUpload />} />
          <Route path="officers" element={<OfficerManagement />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
