import { useNavigate } from "react-router-dom";
import PoliceNavbar from "../components/PoliceNavbar";
import { FiFilePlus, FiDatabase, FiBarChart2, FiMapPin } from "react-icons/fi";

function PoliceDashboard() {
  const navigate = useNavigate();

  return (
    // add top padding so content is not hidden behind the fixed navbar
    <div className="min-h-screen pt-16 bg-gray-100">
      <PoliceNavbar />
      {/* Add content-container class to the main content div */}
      <div className="content-container p-6">
        {/* Page Heading */}
        <h1 className="text-3xl font-bold text-gray-900">Welcome Officer 👮‍♂️</h1>
        <p className="text-gray-600 mt-2">
          Manage crime records, track analytics, train AI models, and monitor real-time crime hotspots.
        </p>

        {/* Stats Cards / Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          
          {/* Add Crime Report */}
          <div
            className="bg-white shadow-lg hover:shadow-xl p-6 rounded-lg cursor-pointer transition transform hover:scale-105"
            onClick={() => navigate("/police/add-crime")}
          >
            <FiFilePlus className="text-blue-600 text-3xl mb-3" />
            <h2 className="font-semibold text-lg">Add Crime Report</h2>
            <p className="text-gray-600 text-sm">Record new crime incidents quickly.</p>
          </div>

          {/* View Crime Records */}
          <div
            className="bg-white shadow-lg hover:shadow-xl p-6 rounded-lg cursor-pointer transition transform hover:scale-105"
            onClick={() => navigate("/police/view-crimes")}
          >
            <FiDatabase className="text-green-600 text-3xl mb-3" />
            <h2 className="font-semibold text-lg">View Crime Records</h2>
            <p className="text-gray-600 text-sm">Access, edit, and analyze crime reports.</p>
          </div>

          {/* AI Model Training */}
          <div
            className="bg-white shadow-lg hover:shadow-xl p-6 rounded-lg cursor-pointer transition transform hover:scale-105"
            onClick={() => navigate("/police/train-model")}
          >
            <FiBarChart2 className="text-purple-600 text-3xl mb-3" />
            <h2 className="font-semibold text-lg">Train AI Model</h2>
            <p className="text-gray-600 text-sm">Retrain the model with latest crime data.</p>
          </div>

          {/* Crime Hotspot Map */}
          <div
            className="bg-white shadow-lg hover:shadow-xl p-6 rounded-lg cursor-pointer transition transform hover:scale-105"
            onClick={() => navigate("/police/hotspots")}
          >
            <FiMapPin className="text-red-600 text-3xl mb-3" />
            <h2 className="font-semibold text-lg">Crime Hotspot Map</h2>
            <p className="text-gray-600 text-sm">View AI-predicted crime-prone areas.</p>
          </div>
        </div>

        {/* Future Analytics Section (Optional Placeholder) */}
        <div className="mt-10 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">📊 Crime Analytics Overview</h3>
          <p className="text-gray-600">
            Upcoming: Graphs showing crime trends by area, month, and type will be displayed here.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PoliceDashboard;
