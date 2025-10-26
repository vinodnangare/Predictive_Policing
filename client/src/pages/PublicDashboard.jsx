import { useEffect, useState } from "react";
import axios from "axios";
import CrimeMap from "../components/CrimeMap";

function PublicDashboard() {
  const [crimeData, setCrimeData] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/public/crimes").then(res => setCrimeData(res.data));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Crime Hotspots in Your Area</h1>
      <CrimeMap crimeData={crimeData} />
    </div>
  );
}

export default PublicDashboard;
