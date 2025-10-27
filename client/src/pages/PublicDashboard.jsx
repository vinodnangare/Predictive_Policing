import { useEffect, useState } from "react";
import axios from "axios";
import CrimeMap from "../components/CrimeMap";
import Navbar from "../components/Navbar";

function PublicDashboard() {
  return (
    <div className="min-h-screen pt-16 bg-gray-100">
      <Navbar />
      <div className="p-6 max-w-6xl mx-auto">
        <header className="py-8">
          <h1 className="text-4xl font-bold text-gray-900">Predictive Policing — Public Dashboard</h1>
          <p className="text-gray-600 mt-2">Explore crime hotspots and public information.</p>
        </header>

        {/* Quick map preview */}
        <section className="mt-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-3">Crime Hotspots (Preview)</h2>
            <CrimeMap />
          </div>
        </section>
      </div>
    </div>
  );
}

export default PublicDashboard;
