import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const HotspotPopup = ({ hotspot, index }) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const h = hotspot;

  // Theme-aware color classes
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const headerBg = isDark ? 'bg-slate-800 border-red-500/40' : 'bg-red-50 border-red-200';
  const headerText = isDark ? 'text-red-300' : 'text-red-700';
  const textMain = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgAlt = isDark ? 'bg-slate-800' : 'bg-slate-50';
  const borderAlt = isDark ? 'border-slate-700' : 'border-slate-200';

  return (
    <div className={`w-[320px] max-h-[75vh] overflow-hidden flex flex-col ${bg} rounded-xl shadow-xl border ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
      {/* Header */}
      <h3 className={`font-bold text-sm sticky top-0 z-10 ${headerBg} border-b ${headerText} p-3 flex items-center gap-2 shadow-sm`}>
        <span className="text-base">🔥</span>
        <span>{t({ en: `Crime Hotspot #${index + 1}`, mr: `गुन्हे हॉटस्पॉट #${index + 1}` })}</span>
      </h3>

      {/* Content */}
      <div className={`px-3 py-2 overflow-y-auto flex-1 ${isDark ? 'scrollbar-dark' : 'scrollbar-light'}`}>
        <div className="space-y-3">
          {/* Risk Level and Trend */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className={`font-semibold text-xs ${textMain}`}>
                {t({ en: 'Risk Assessment', mr: 'जोखीम मूल्यांकन' })}
              </h4>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                h.prediction?.trend === 'increasing' ? (isDark ? 'bg-red-500/30 text-red-300' : 'bg-red-100 text-red-700') :
                h.prediction?.trend === 'decreasing' ? (isDark ? 'bg-green-500/30 text-green-300' : 'bg-green-100 text-green-700') :
                (isDark ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-700')
              }`}>
                {h.prediction?.trend === 'increasing' ? '↗️ ' + t({ en: 'Increasing', mr: 'वाढत आहे' }) :
                 h.prediction?.trend === 'decreasing' ? '↘️ ' + t({ en: 'Decreasing', mr: 'कमी होत आहे' }) :
                 '→ ' + t({ en: 'Stable', mr: 'स्थिर' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-xl font-bold rounded-lg px-3 py-2 flex-1 text-center ${
                (h.prediction?.likelihood || 0) > 75 ? (isDark ? 'bg-red-500/30 text-red-300' : 'bg-red-100 text-red-700') :
                (h.prediction?.likelihood || 0) > 50 ? (isDark ? 'bg-orange-500/30 text-orange-300' : 'bg-orange-100 text-orange-700') :
                (isDark ? 'bg-yellow-500/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
              }`}>
                {h.prediction?.likelihood || 0}%
              </div>
              <div className={`text-[10px] ${textSub} font-medium`}>
                {t({ en: 'Risk\nLevel', mr: 'जोखीम\nस्तर' })}
              </div>
            </div>
          </div>

          {/* Risk Factors */}
          <div>
            <h4 className={`font-semibold text-xs mb-2 ${textMain}`}>
              {t({ en: 'Risk Factors', mr: 'जोखीम कारक' })}
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {h.prediction?.riskFactors?.recentActivity && 
                <div className={`text-[10px] rounded p-1.5 ${
                  isDark ? 'bg-red-500/30 text-red-300' : 'bg-red-50 text-red-700'
                }`}>
                  ⚠️ {t({ en: 'Recent Activity', mr: 'हाल ही की क्रियाकलाप' })}
                </div>
              }
              {h.prediction?.riskFactors?.highFrequency && 
                <div className={`text-[10px] rounded p-1.5 ${
                  isDark ? 'bg-orange-500/30 text-orange-300' : 'bg-orange-50 text-orange-700'
                }`}>
                  📈 {t({ en: 'High Frequency', mr: 'उच्च वारंवारता' })}
                </div>
              }
              {h.prediction?.riskFactors?.timePattern && 
                <div className={`text-[10px] rounded p-1.5 ${
                  isDark ? 'bg-yellow-500/30 text-yellow-300' : 'bg-yellow-50 text-yellow-700'
                }`}>
                  ⏰ {t({ en: 'Time Pattern', mr: 'वेळ पॅटर्न' })}
                </div>
              }
              {h.prediction?.riskFactors?.multipleTypes && 
                <div className={`text-[10px] rounded p-1.5 ${
                  isDark ? 'bg-purple-500/30 text-purple-300' : 'bg-purple-50 text-purple-700'
                }`}>
                  🔄 {t({ en: 'Multiple Types', mr: 'अनेक प्रकार' })}
                </div>
              }
            </div>
          </div>

          {/* Next Prediction */}
          <div>
            <h4 className={`font-semibold text-xs mb-1 ${textMain}`}>
              {t({ en: 'Predicted Next Incident', mr: 'अनुमानित पुढील घटना' })}
            </h4>
            <div className={`rounded p-2 flex justify-between items-center text-xs ${
              isDark ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className={`font-medium truncate flex-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                {h.prediction?.nextPossibleDay || t({ en: 'Unknown', mr: 'अज्ञात' })}
              </div>
              <div className={`whitespace-nowrap ml-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                ⏰ {h.prediction?.timeOfDay || t({ en: 'Unknown', mr: 'अज्ञात' })}
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div>
            <h4 className={`font-semibold text-xs mb-1 ${textMain}`}>
              {t({ en: 'Area Information', mr: 'क्षेत्र माहिती' })}
            </h4>
            <div className={`rounded p-2 space-y-1 text-xs ${bgAlt}`}>
              <div className="flex justify-between">
                <span className={textSub}>{t({ en: 'Area:', mr: 'क्षेत्र:' })}</span> 
                <span className={`font-medium truncate ml-2 max-w-[50%] ${textMain}`}>
                  {h.prediction?.areaInfo?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={textSub}>{t({ en: 'District:', mr: 'जिल्हा:' })}</span>
                <span className={`font-medium truncate ml-2 max-w-[50%] ${textMain}`}>
                  {h.prediction?.areaInfo?.district}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={textSub}>{t({ en: 'State:', mr: 'राज्य:' })}</span>
                <span className={`font-medium truncate ml-2 max-w-[50%] ${textMain}`}>
                  {h.prediction?.areaInfo?.state}
                </span>
              </div>
              {(() => {
                const distribution = h.prediction?.areaInfo?.crimeDistribution;
                if (!Array.isArray(distribution)) return null;
                
                return (
                  <div className={`mt-2 pt-2 border-t ${borderAlt}`}>
                    <span className={`text-[10px] ${textSub}`}>
                      {t({ en: 'Crime Distribution:', mr: 'गुन्हे वितरण:' })}
                    </span>
                    <div className="mt-1">
                      {distribution.slice(0, 3).map((item, idx) => {
                        const location = typeof item === 'object' ? item.location : 
                                       Array.isArray(item) ? item[0] : 
                                       String(item);
                        const count = typeof item === 'object' ? item.count : 
                                    Array.isArray(item) ? item[1] : 
                                    0;
                        
                        return (
                          <div key={`dist-${idx}-${location}`} className={`text-[10px] flex justify-between ${textSub}`}>
                            <span className="truncate max-w-[60%]">{location}</span>
                            <span className="ml-1 whitespace-nowrap">{count} {t({ en: 'cases', mr: 'प्रकरणे' })}</span>
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
            <h4 className={`font-semibold text-xs mb-1 ${textMain}`}>
              {t({ en: 'Crime Statistics', mr: 'गुन्हे आंकडे' })}
            </h4>
            <div className="grid grid-cols-3 gap-1">
              <div className={`rounded p-1.5 text-center ${bgAlt}`}>
                <div className={`text-sm font-bold ${textMain}`}>{h.prediction?.crimeCount || 0}</div>
                <div className={`text-[9px] ${textSub} uppercase tracking-wide`}>
                  {t({ en: 'Total', mr: 'एकूण' })}
                </div>
              </div>
              <div className={`rounded p-1.5 text-center ${bgAlt}`}>
                <div className={`text-sm font-bold ${textMain}`}>{h.prediction?.recentCrimes || 0}</div>
                <div className={`text-[9px] ${textSub} uppercase tracking-wide`}>
                  {t({ en: 'Recent', mr: 'हाल ही' })}
                </div>
              </div>
              <div className={`rounded p-1.5 text-center ${bgAlt}`}>
                <div className={`text-sm font-bold ${textMain}`}>{h.prediction?.confidence || 0}%</div>
                <div className={`text-[9px] ${textSub} uppercase tracking-wide`}>
                  {t({ en: 'Confidence', mr: 'आत्मविश्वास' })}
                </div>
              </div>
            </div>
          </div>

          {/* Common Crime Types */}
          <div>
            <h4 className={`font-semibold text-xs mb-1 ${textMain}`}>
              {t({ en: 'Crime Analysis', mr: 'गुन्हे विश्लेषण' })}
            </h4>
            <div className={`space-y-1 max-h-24 overflow-y-auto pr-1`}>
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
                    <div key={`type-${idx}-${type}`} className="flex justify-between items-center text-[10px]">
                      <span className={`rounded px-2 py-0.5 truncate max-w-[70%] ${bgAlt}`}>
                        {type}
                      </span>
                      <span className={`whitespace-nowrap ml-1 ${textSub}`}>
                        {count} {t({ en: 'incidents', mr: 'घटना' })}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Meta Info */}
          <div className={`text-[9px] ${textSub} border-t ${borderAlt} pt-2 mt-2`}>
            <div className="flex items-center gap-1 truncate">
              <span className="flex-shrink-0">📍</span>
              <span className="truncate">{h.lat.toFixed(5)}, {h.lng.toFixed(5)}</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <span className="flex-shrink-0">🔄</span>
              <span className="truncate">{t({ en: 'Updated:', mr: 'अपडेट केले:' })} {new Date(h.prediction?.lastUpdated).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotspotPopup;