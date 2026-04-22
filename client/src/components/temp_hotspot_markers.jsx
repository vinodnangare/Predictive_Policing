        {/* Hotspot markers */}
        {hotspots.map((h, i) => {
          if (!h || !h.lat || !h.lng) return null;
          
          // Create unique ID based on position and index
          const hotspotId = `hotspot-${h.lat}-${h.lng}-${i}`;
          
          return (
            <React.Fragment key={hotspotId}>
              <Marker 
                position={[h.lat, h.lng]}
                icon={new L.Icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41]
                })}
              >
                <Popup>
                  <HotspotPopup hotspot={h} index={i} />
                </Popup>
              </Marker>
              <Circle
                center={[h.lat, h.lng]}
                radius={2000}
                pathOptions={{ 
                  color: h.prediction?.likelihood > 75 ? '#ef4444' :
                         h.prediction?.likelihood > 50 ? '#f97316' :
                         '#eab308',
                  fillColor: h.prediction?.likelihood > 75 ? '#ef4444' : 
                            h.prediction?.likelihood > 50 ? '#f97316' : 
                            '#eab308',
                  fillOpacity: 0.2 + ((h.prediction?.likelihood || 0) / 300),
                  weight: 2
                }}
              />
            </React.Fragment>
          );
        })}