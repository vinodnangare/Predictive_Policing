import { useEffect, useState } from "react";
import axios from "axios";
import CrimeMap from "../components/CrimeMap";
import Navbar from "../components/Navbar";

function PublicDashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="content-container p-6">
        {/* Your content here */}
      </div>
    </div>
  );
}

export default PublicDashboard;
