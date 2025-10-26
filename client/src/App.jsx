// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PoliceLogin from "./pages/PoliceLogin";
import PoliceDashboard from "./pages/PoliceDashboard";
import PublicDashboard from "./pages/PublicDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import AddCrime from "./components/CrimeForm";
import CrimeMap from "./components/CrimeMap";
import ViewCrimes from "./components/CrimeTable";
import RetrainModel from "./pages/RetrainModel";


function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Public User Routes */}
        <Route path="/" element={<PublicDashboard />} />

        {/* Police Login */}
        <Route path="/police/login" element={<PoliceLogin />} />
     
        {/* Protected Police Dashboard */}
        <Route
          path="/police/dashboard"
          element={
            <ProtectedRoute>
              <PoliceDashboard />
            </ProtectedRoute>
          }
        />

       <Route path='/police/add-crime' element={
            <ProtectedRoute>
             <AddCrime />
            </ProtectedRoute>
          }
        />

        <Route path='/police/view-crimes' element={
            <ProtectedRoute>
             <ViewCrimes />
            </ProtectedRoute>
          }
        />
        <Route path='/police/hotspots' element={
            <ProtectedRoute>
             <CrimeMap />
            </ProtectedRoute>
          }
        />  
        <Route path="/police/train-model" element={
            <ProtectedRoute>
              <RetrainModel />
            </ProtectedRoute>
          }
        />

      </Routes>
      
    </Router>
  );
}

export default App;
