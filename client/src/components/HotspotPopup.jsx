import React from 'react';

const HotspotPopup = ({ hotspot, index }) => {
  const h = hotspot;

  return (
    <div className="w-[300px] max-h-[70vh] overflow-hidden flex flex-col bg-white rounded-sm">
      <h3 className="font-bold text-sm sticky top-0 z-10 bg-white border-b border-red-200 p-2 text-red-700 flex items-center gap-2 shadow-sm">
        <span className="text-base">🔥</span>
        <span>Crime Hotspot #{index + 1}</span>
      </h3>
      <div className="px-2 py-1.5 overflow-y-auto custom-scrollbar flex-1">
        <div className="space-y-2.5">
          {/* Risk Level and Trend */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <h4 className="font-semibold text-xs">Risk Assessment</h4>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                h.prediction?.trend === 'increasing' ? 'bg-red-100 text-red-700' :
                h.prediction?.trend === 'decreasing' ? 'bg-green-100 text-green-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {h.prediction?.trend === 'increasing' ? '↗️ Increasing' :
                 h.prediction?.trend === 'decreasing' ? '↘️ Decreasing' :
                 '→ Stable'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-xl font-bold rounded-lg px-3 py-1 flex-1 text-center ${
                (h.prediction?.likelihood || 0) > 75 ? 'bg-red-100 text-red-700' :
                (h.prediction?.likelihood || 0) > 50 ? 'bg-orange-100 text-orange-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {h.prediction?.likelihood || 0}%
              </div>
              <div className="text-[10px] text-gray-500 font-medium">Risk<br/>Level</div>
            </div>
          </div>

          {/* Risk Factors */}
          <div>
            <h4 className="font-semibold text-xs mb-1">Risk Factors</h4>
            <div className="grid grid-cols-2 gap-1">
              {h.prediction?.riskFactors?.recentActivity && 
                <div className="text-[10px] bg-red-50 text-red-700 rounded p-1.5">
                  ⚠️ Recent Activity
                </div>
              }
              {h.prediction?.riskFactors?.highFrequency && 
                <div className="text-[10px] bg-orange-50 text-orange-700 rounded p-1.5">
                  📈 High Frequency
                </div>
              }
              {h.prediction?.riskFactors?.timePattern && 
                <div className="text-[10px] bg-yellow-50 text-yellow-700 rounded p-1.5">
                  ⏰ Time Pattern
                </div>
              }
              {h.prediction?.riskFactors?.multipleTypes && 
                <div className="text-[10px] bg-purple-50 text-purple-700 rounded p-1.5">
                  🔄 Multiple Types
                </div>
              }
            </div>
          </div>

          {/* Next Prediction */}
          <div>
            <h4 className="font-semibold text-xs mb-1">Predicted Next Incident</h4>
            <div className="bg-blue-50 rounded p-1.5 flex justify-between items-center">
              <div className="text-blue-700 text-xs font-medium truncate flex-1">{h.prediction?.nextPossibleDay || 'Unknown'}</div>
              <div className="text-[10px] text-blue-500 whitespace-nowrap ml-1">⏰ {h.prediction?.timeOfDay || 'Unknown'}</div>
            </div>
          </div>

          {/* Location Details */}
          <div>
            <h4 className="font-semibold text-xs mb-1">Area Information</h4>
            <div className="bg-gray-50 rounded p-1.5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Area:</span> 
                <span className="font-medium truncate ml-2 max-w-[60%]">{h.prediction?.areaInfo?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">District:</span>
                <span className="font-medium truncate ml-2 max-w-[60%]">{h.prediction?.areaInfo?.district}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">State:</span>
                <span className="font-medium truncate ml-2 max-w-[60%]">{h.prediction?.areaInfo?.state}</span>
              </div>
              {(() => {
                const distribution = h.prediction?.areaInfo?.crimeDistribution;
                if (!Array.isArray(distribution)) return null;
                
                return (
                  <div className="mt-1 pt-1 border-t border-gray-200">
                    <span className="text-gray-500 text-[10px]">Crime Distribution:</span>
                    <div className="mt-0.5">
                      {distribution.slice(0, 3).map((item, idx) => {
                        const location = typeof item === 'object' ? item.location : 
                                       Array.isArray(item) ? item[0] : 
                                       String(item);
                        const count = typeof item === 'object' ? item.count : 
                                    Array.isArray(item) ? item[1] : 
                                    0;
                        
                        return (
                          <div key={`dist-${idx}-${location}`} className="text-[10px] text-gray-600 flex justify-between">
                            <span className="truncate max-w-[60%]">{location}</span>
                            <span className="ml-1 whitespace-nowrap">{count} cases</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Crime Statistics */}
          <div>
            <h4 className="font-semibold text-xs mb-1">Crime Statistics</h4>
            <div className="grid grid-cols-3 gap-1">
              <div className="bg-gray-50 rounded p-1 text-center">
                <div className="text-sm font-bold text-gray-700">{h.prediction?.crimeCount || 0}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wide">Total</div>
              </div>
              <div className="bg-gray-50 rounded p-1 text-center">
                <div className="text-sm font-bold text-gray-700">{h.prediction?.recentCrimes || 0}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wide">Recent</div>
              </div>
              <div className="bg-gray-50 rounded p-1 text-center">
                <div className="text-sm font-bold text-gray-700">{h.prediction?.confidence || 0}%</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wide">Confidence</div>
              </div>
            </div>
          </div>

          {/* Common Crime Types */}
          <div>
            <h4 className="font-semibold text-xs mb-1">Crime Analysis</h4>
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {(() => {
                const breakdown = h.prediction?.typeBreakdown;
                if (!Array.isArray(breakdown)) return null;
                
                return breakdown.map((item, idx) => {
                  const type = typeof item === 'object' ? item.type : 
                             Array.isArray(item) ? item[0] : 
                             String(item);
                  const count = typeof item === 'object' ? item.count : 
                              Array.isArray(item) ? item[1] : 
                              0;
                  
                  return (
                    <div key={`type-${idx}-${type}`} className="flex justify-between items-center">
                      <span className="bg-gray-100 rounded px-1.5 py-0.5 text-[10px] truncate max-w-[70%]">
                        {type}
                      </span>
                      <span className="text-gray-600 text-[10px] whitespace-nowrap ml-1">
                        {count} incidents
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Meta Info */}
          <div className="text-[9px] text-gray-400 border-t pt-1.5 mt-1.5">
            <div className="flex items-center gap-1 truncate">
              <span className="flex-shrink-0">📍</span>
              <span className="truncate">{h.lat.toFixed(5)}, {h.lng.toFixed(5)}</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <span className="flex-shrink-0">🔄</span>
              <span className="truncate">Updated: {new Date(h.prediction?.lastUpdated).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotspotPopup;