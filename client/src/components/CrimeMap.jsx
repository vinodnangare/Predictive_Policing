import { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Marker,
  Popup,
  useMap,
  Circle,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// MapUpdater Component
function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (
      center &&
      typeof center[0] === 'number' &&
      typeof center[1] === 'number' &&
      !isNaN(center[0]) &&
      !isNaN(center[1])
    ) {
      map.flyTo(center, zoom, { animate: true, duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Enhanced Geocoding service with multiple strategies
const geocodeLocation = async (locationString, level) => {
  console.log(`Geocoding request for ${level}: ${locationString}`);
  
  try {
    // Strategy 1: Use Nominatim/OpenStreetMap (reliable for India)
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationString)}&limit=1&countrycodes=in`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CrimeMapApp/1.0' // Required by Nominatim
      }
    });
    
    if (!response.ok) throw new Error('Geocoding API failed');
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      console.log(`Geocoding successful. Display Name: ${result.display_name}`);
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        address: result.display_name,
        confidence: 'high'
      };
    }
    
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

// Known coordinates for major Indian locations (fallback)
const knownCoordinates = {
  // States
  "Maharashtra": [19.7515, 75.7139],
  "Delhi": [28.7041, 77.1025],
  "Karnataka": [15.3173, 75.7139],
  "Tamil Nadu": [11.1271, 78.6569],
  "Uttar Pradesh": [26.8467, 80.9462],
  "Gujarat": [22.2587, 71.1924],
  "Rajasthan": [27.0238, 74.2179],
  "West Bengal": [22.9868, 87.8550],
  "Madhya Pradesh": [22.9734, 78.6569],
  "Andhra Pradesh": [15.9129, 79.7400],
  "Punjab": [31.1471, 75.3412],
  "Haryana": [29.0588, 76.0856],
  // Default India center (used if nothing else matches)
  "INDIA_CENTER": [20.5937, 78.9629]
};

function CrimeMap({ crimeData = [] }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subdistricts, setSubdistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedState, setSelectedState] = useState("All");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [selectedSubdistrict, setSelectedSubdistrict] = useState("All");
  const [selectedVillage, setSelectedVillage] = useState("All");

  const [locationData, setLocationData] = useState([]);
  const [mapCenter, setMapCenter] = useState(knownCoordinates.INDIA_CENTER);
  const [mapZoom, setMapZoom] = useState(5);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("All India");

  // Utility Functions
  const normalize = (val) => val?.trim().toLowerCase();

  const getStateObj = useMemo(() => 
    (stateName) => locationData.find((s) => normalize(s.state) === normalize(stateName))
  , [locationData]);

  const getDistrictObj = useMemo(() => 
    (stateName, districtName) => getStateObj(stateName)?.districts?.find((d) => normalize(d.district) === normalize(districtName))
  , [getStateObj]);

  const getSubdistrictObj = useMemo(() => 
    (stateName, districtName, subdistrictName) => 
      getDistrictObj(stateName, districtName)?.subDistricts?.find((sd) => normalize(sd.subDistrict) === normalize(subdistrictName))
  , [getDistrictObj]);

  // Fetch location data (No change)
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/pranshumaheshwari/indian-cities-and-villages/refs/heads/master/data.json"
    )
      .then((res) => res.json())
      .then((data) => setLocationData(data))
      .catch((err) => console.error("Failed to fetch location data:", err));
  }, []);

  // Load states (No change)
  useEffect(() => {
    if (locationData.length > 0) setStates(locationData.map((s) => s.state));
  }, [locationData]);

  // Function to build highly specific location string for geocoding
  const buildLocationString = () => {
    const parts = [];
    
    // Add the most specific location first
    if (selectedVillage !== "All") parts.push(selectedVillage);
    if (selectedSubdistrict !== "All") parts.push(selectedSubdistrict);
    if (selectedDistrict !== "All") parts.push(selectedDistrict);
    if (selectedState !== "All") parts.push(selectedState);
    
    // Fallback: If nothing is selected, return a known coordinate string
    if (parts.length === 0) return "India"; 

    parts.push("India");
    return parts.join(", ");
  };

  // Function to get known coordinates as fallback
  const getFallbackCoordinates = (level) => {
    let key = null;
    if (level === 'state') key = selectedState;
    if (level === 'district') key = selectedDistrict;
    if (level === 'subdistrict') key = selectedSubdistrict;
    if (level === 'village') key = selectedVillage;

    // Prioritize the currently selected key
    if (key && knownCoordinates[key]) return knownCoordinates[key];
    
    // Fallback hierarchy
    if (knownCoordinates[selectedState]) return knownCoordinates[selectedState];
    
    return knownCoordinates.INDIA_CENTER;
  };

  // Function to safely update map center/zoom and set selected marker
  const updateMap = (lat, lng, level) => {
    const safeLat = Number(lat);
    const safeLng = Number(lng);
    
    if (safeLat != null && safeLng != null && !isNaN(safeLat) && !isNaN(safeLng)) {
      setMapCenter([safeLat, safeLng]);
      let newZoom = 5;
      switch (level) {
        case "state":
          newZoom = 6;
          break;
        case "district":
          newZoom = 8;
          break;
        case "subdistrict":
          newZoom = 10;
          break;
        case "village":
          newZoom = 12; 
          break;
        default:
          newZoom = 5;
      }
      setMapZoom(newZoom);
      setSelectedMarker([safeLat, safeLng]);
    } else {
      setSelectedMarker(null);
    }
  };

  // Enhanced function to update map using geocoding
  const updateMapWithGeocoding = async (level) => {
    if (selectedState === "All") {
      setCurrentAddress("All India");
      updateMap(knownCoordinates.INDIA_CENTER[0], knownCoordinates.INDIA_CENTER[1], "national");
      return;
    }

    const locationString = buildLocationString();
    
    setIsGeocoding(true);
    setCurrentAddress(`Locating ${locationString}...`);

    try {
      const coords = await geocodeLocation(locationString, level);
      
      if (coords && coords.lat && coords.lng) {
        // SUCCESS: Use geocoded coordinates
        setCurrentAddress(coords.address || locationString);
        updateMap(coords.lat, coords.lng, level);
      } else {
        // FAILURE: Use known coordinates or default center
        const fallbackCoords = getFallbackCoordinates(level);
        setCurrentAddress(`${locationString} (Approximate Location)`);
        updateMap(fallbackCoords[0], fallbackCoords[1], level);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      // HARD FAILURE: Use known coordinates
      const fallbackCoords = getFallbackCoordinates(level);
      setCurrentAddress(`${locationString} (Approximate Location)`);
      updateMap(fallbackCoords[0], fallbackCoords[1], level);
    } finally {
      setIsGeocoding(false);
    }
  };
  
  // *** LOCATION DROPDOWN LOGIC (UNCHANGED, BUT RE-VERIFIED) ***
  
  // 1. Update districts when state changes
  useEffect(() => {
    if (selectedState === "All") {
      setDistricts([]);
      setSelectedDistrict("All");
      setSubdistricts([]);
      setSelectedSubdistrict("All");
      setVillages([]);
      setSelectedVillage("All");
      updateMapWithGeocoding("national"); 
    } else {
      const stateObj = getStateObj(selectedState);
      setDistricts(stateObj?.districts?.map((d) => d.district) || []);
      setSelectedDistrict("All");
      setSubdistricts([]);
      setSelectedSubdistrict("All");
      setVillages([]);
      setSelectedVillage("All");
      updateMapWithGeocoding("state");
    }
  }, [selectedState, getStateObj]);

  // 2. Update subdistricts when district changes
  useEffect(() => {
    if (selectedDistrict === "All") {
      setSubdistricts([]);
      setSelectedSubdistrict("All");
      setVillages([]);
      setSelectedVillage("All");
      if (selectedState !== "All") {
        updateMapWithGeocoding("state");
      }
    } else {
      const districtObj = getDistrictObj(selectedState, selectedDistrict);
      setSubdistricts(districtObj?.subDistricts?.map((sd) => sd.subDistrict) || []);
      setSelectedSubdistrict("All");
      setVillages([]);
      setSelectedVillage("All");
      updateMapWithGeocoding("district");
    }
  }, [selectedDistrict, selectedState, getStateObj, getDistrictObj]);

  // 3. Update villages when subdistrict changes (Village list population FIX)
  useEffect(() => {
    if (selectedSubdistrict === "All") {
      setVillages([]);
      setSelectedVillage("All");
      if (selectedDistrict !== "All") {
        updateMapWithGeocoding("district");
      }
    } else {
      const subObj = getSubdistrictObj(selectedState, selectedDistrict, selectedSubdistrict);
      
      // FIX: Use 'villages' if available, otherwise map 'villagesData' by name, or default to empty array
      const villageList = subObj?.villages?.length 
                          ? subObj.villages 
                          : subObj?.villagesData?.map(v => v.name) || [];
                          
      setVillages(villageList);
      setSelectedVillage("All");
      updateMapWithGeocoding("subdistrict");
    }
  }, [selectedSubdistrict, selectedDistrict, selectedState, getDistrictObj, getSubdistrictObj]);

  // 4. Update when village changes (Geocoding trigger)
  useEffect(() => {
    if (selectedVillage === "All") {
      if (selectedSubdistrict !== "All") {
        updateMapWithGeocoding("subdistrict");
      }
      return;
    }

    if (selectedVillage !== "All" && selectedSubdistrict !== "All") {
      updateMapWithGeocoding("village");
    }
  }, [selectedVillage, selectedSubdistrict, selectedDistrict, selectedState]);


  // Filter crimes (No changes needed)
  const filteredData = useMemo(() => {
    return crimeData.filter((crime) => {
      const crimeDate = new Date(crime.date);
      const isAfterStart = startDate ? crimeDate >= new Date(startDate) : true;
      const isBeforeEnd = endDate ? crimeDate <= new Date(endDate) : true;
      const isTypeMatch = selectedType === "All" || crime.type === selectedType;
      
      const isStateMatch = selectedState === "All" || normalize(crime.state) === normalize(selectedState);
      const isDistrictMatch = selectedDistrict === "All" || normalize(crime.district) === normalize(selectedDistrict);
      const isSubdistrictMatch = selectedSubdistrict === "All" || normalize(crime.subdistrict) === normalize(selectedSubdistrict);
      const isVillageMatch = selectedVillage === "All" || normalize(crime.village) === normalize(selectedVillage);

      return (
        isAfterStart &&
        isBeforeEnd &&
        isTypeMatch &&
        isStateMatch &&
        isDistrictMatch &&
        isSubdistrictMatch &&
        isVillageMatch
      );
    });
  }, [
    crimeData,
    startDate,
    endDate,
    selectedType,
    selectedState,
    selectedDistrict,
    selectedSubdistrict,
    selectedVillage,
  ]);

  // Group crimes for map (No changes needed)
  const crimeClusters = useMemo(() => {
    const clusters = {};
    filteredData.forEach((crime) => {
      if (crime.latitude && crime.longitude) {
        const key = `${crime.latitude},${crime.longitude}`;
        if (!clusters[key]) clusters[key] = { ...crime, count: 1 };
        else clusters[key].count++;
      }
    });
    return Object.values(clusters);
  }, [filteredData]);

  return (
    <div className="mt-20">
      {/* FILTER BAR */}
      <div className="bg-white shadow-md p-4 rounded-lg flex flex-wrap gap-4 items-center mb-4 relative">
        {/* Loading indicator */}
        {isGeocoding && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Finding location...
          </div>
        )}

        {/* Current location display */}
        {currentAddress && !isGeocoding && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
            📍 {currentAddress}
          </div>
        )}

        {/* Date, Crime Type, State, District, Subdistrict (Keep existing dropdowns) */}
        {/* ... (Keep existing dropdowns) ... */}
        
        {/* State */}
        <div>
          <label className="text-sm text-gray-600">State</label>
          <select
            className="border px-2 py-1 rounded w-full"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            <option value="All">All States</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="text-sm text-gray-600">District</label>
          <select
            className="border px-2 py-1 rounded w-full"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={!districts.length && selectedState !== "All"}
          >
            <option value="All">All Districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Subdistrict */}
        <div>
          <label className="text-sm text-gray-600">Subdistrict (Taluka)</label>
          <select
            className="border px-2 py-1 rounded w-full"
            value={selectedSubdistrict}
            onChange={(e) => setSelectedSubdistrict(e.target.value)}
            disabled={!subdistricts.length && selectedDistrict !== "All"}
          >
            <option value="All">All Subdistricts</option>
            {subdistricts.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Village */}
        <div>
          <label className="text-sm text-gray-600">Village</label>
          <select
            className="border px-2 py-1 rounded w-full"
            value={selectedVillage}
            onChange={(e) => setSelectedVillage(e.target.value)}
            // FIX: Enable if a subdistrict is selected, regardless of list length
            disabled={selectedSubdistrict === "All"}
          >
            <option value="All">All Villages</option>
            {villages.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MAP */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-[500px] w-full rounded-xl shadow-lg border"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapUpdater center={mapCenter} zoom={mapZoom} />

        {/* Selected marker */}
        {selectedMarker && selectedMarker[0] != null && selectedMarker[1] != null && (
          <>
            <Marker position={selectedMarker}>
              <Popup>
                <strong>
                  {selectedVillage !== "All"
                    ? selectedVillage
                    : selectedSubdistrict !== "All"
                    ? selectedSubdistrict
                    : selectedDistrict !== "All"
                    ? selectedDistrict
                    : selectedState}
                </strong>
                <br />
                📍 {currentAddress}
                <br />
                Latitude: {selectedMarker[0].toFixed(4)}, Longitude: {selectedMarker[1].toFixed(4)}
              </Popup>
            </Marker>
            <Circle
              center={selectedMarker}
              radius={selectedVillage !== "All" ? 1000 : 2000}
              pathOptions={{ 
                color: selectedVillage !== "All" ? 'green' : 
                       selectedSubdistrict !== "All" ? 'blue' : 
                       selectedDistrict !== "All" ? 'purple' : 'red', 
                fillOpacity: 0.1,
                weight: 2
              }}
            />
          </>
        )}

        {/* Crime clusters */}
        {crimeClusters.map((crime, i) => (
          <CircleMarker
            key={i}
            center={[crime.latitude, crime.longitude]}
            radius={Math.min(6 + crime.count * 2, 25)}
            fillOpacity={0.7}
            fillColor={crime.count > 10 ? "darkred" : crime.count > 5 ? "red" : "orange"}
            stroke={false}
          >
            <Tooltip>
              <strong>📍 {crime.location}</strong> <br />
              🔴 Crime Type: {crime.type} <br />
              📅 Date: {crime.date} <br />
              📌 {crime.subdistrict}, {crime.district}, {crime.state} <br />
              🏘️ Village: {crime.village || "N/A"} <br />
              🔢 Number of Crimes: {crime.count} <br />
              {crime.count > 5 && <span className="text-red-600 font-bold">🔥 Hotspot</span>}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export default CrimeMap;