import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiAlertCircle, FiCheckCircle, FiLink2, FiPlus, FiSearch, FiUserPlus } from 'react-icons/fi';
import { apiGet, apiPost } from '../utils/api';
import { normalizeCrimeList } from '../utils/crime';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const EMPTY_FORM = {
  name: '',
  aliases: '',
  age: '',
  height: '',
  gender: '',
  riskLevel: 'Medium',
  status: 'Active',
  primaryType: '',
  lastSeenDate: '',
  lastSeenLocation: '',
  description: '',
};

function SuspectMatching() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [selectedSuspect, setSelectedSuspect] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchResults, setMatchResults] = useState([]);
  const [suspects, setSuspects] = useState([]);
  const [crimes, setCrimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingSuspect, setSavingSuspect] = useState(false);
  const [linkingCrimeId, setLinkingCrimeId] = useState('');
  const [newSuspect, setNewSuspect] = useState(EMPTY_FORM);

  const toISODate = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toISOString().slice(0, 10);
  };

  const buildMatches = useCallback((suspect, allCrimes) => {
    if (!suspect || !Array.isArray(allCrimes)) return [];

    const linkedCrimeIds = new Set((suspect.linkedCrimes || []).map((id) => String(id)));
    const suspectName = String(suspect.name || '').toLowerCase();
    const aliases = Array.isArray(suspect.aliases) ? suspect.aliases : [];
    const aliasTokens = aliases
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 2);
    const primaryType = String(suspect.primaryType || '').toLowerCase();
    const lastSeenLocation = String(suspect.lastSeenLocation || '').toLowerCase();

    return allCrimes
      .map((crime) => {
        const crimeId = String(crime._id || crime.id || '');
        const crimeType = String(crime.type || '').toLowerCase();
        const crimeLocation = String(crime.district || crime.subdistrict || crime.location || '').toLowerCase();
        const description = String(crime.description || '').toLowerCase();
        const listedSuspects = Array.isArray(crime.suspects) ? crime.suspects.map((item) => String(item).toLowerCase()) : [];
        const isLinked = linkedCrimeIds.has(crimeId);

        let score = isLinked ? 98 : 0;
        if (primaryType && crimeType && crimeType === primaryType) score += 35;
        if (lastSeenLocation && crimeLocation && (crimeLocation.includes(lastSeenLocation) || lastSeenLocation.includes(crimeLocation))) {
          score += 30;
        }
        if (suspectName && description.includes(suspectName)) score += 20;
        if (aliasTokens.some((token) => description.includes(token))) score += 18;
        if (listedSuspects.includes(suspectName)) score += 30;

        const parsedDate = new Date(crime.timestamp || crime.date || crime.createdAt || null);
        if (!Number.isNaN(parsedDate.getTime())) {
          const ageDays = Math.max(0, Math.floor((Date.now() - parsedDate.getTime()) / (1000 * 60 * 60 * 24)));
          score += Math.max(0, 12 - Math.min(12, Math.floor(ageDays / 5)));
        }

        if (!isLinked && score < 42) {
          return null;
        }

        const status = score >= 80 ? 'High' : score >= 62 ? 'Medium' : 'Low';

        return {
          _id: crimeId,
          type: crime.type || t({ en: 'Unknown', mr: 'अज्ञात' }),
          date: toISODate(crime.date || crime.timestamp),
          location: crime.district || crime.subdistrict || crime.location || t({ en: 'Unknown', mr: 'अज्ञात' }),
          description: crime.description || t({ en: 'Crime incident reported', mr: 'गुन्हा घटना नोंदवली' }),
          similarity: score.toFixed(1),
          status,
          isLinked,
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.similarity) - Number(a.similarity))
      .slice(0, 20);
  }, [t]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [suspectData, crimesData] = await Promise.all([
        apiGet('/api/suspects?limit=1000').catch(() => []),
        apiGet('/api/crimes?limit=3000').catch(() => []),
      ]);

      const normalizedCrimes = normalizeCrimeList(crimesData || []);
      const serverSuspects = Array.isArray(suspectData) ? suspectData : [];

      setCrimes(normalizedCrimes);
      setSuspects(serverSuspects);

      if (selectedSuspect?._id) {
        const freshSelected = serverSuspects.find((item) => String(item._id) === String(selectedSuspect._id));
        if (freshSelected) {
          setSelectedSuspect(freshSelected);
          setMatchResults(buildMatches(freshSelected, normalizedCrimes));
        } else {
          setSelectedSuspect(null);
          setMatchResults([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch suspect module data:', error);
      toast.error(t({ en: 'Failed to load suspect module data.', mr: 'संशयित मॉड्युल डेटा लोड करता आला नाही.' }));
    } finally {
      setLoading(false);
    }
  }, [buildMatches, selectedSuspect?._id, t]);

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSuspectSelect = (suspect) => {
    setSelectedSuspect(suspect);
    setMatchResults(buildMatches(suspect, crimes));
  };

  const handleCreateSuspect = async (event) => {
    event.preventDefault();
    if (!newSuspect.name.trim()) {
      toast.error(t({ en: 'Suspect name is required.', mr: 'संशयिताचे नाव आवश्यक आहे.' }));
      return;
    }

    try {
      setSavingSuspect(true);
      await apiPost('/api/suspects', {
        ...newSuspect,
        aliases: newSuspect.aliases
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        age: newSuspect.age ? Number(newSuspect.age) : undefined,
        lastSeenDate: newSuspect.lastSeenDate || undefined,
      });

      toast.success(t({ en: 'Suspect added successfully.', mr: 'संशयित यशस्वीरित्या जोडला गेला.' }));
      setNewSuspect(EMPTY_FORM);
      setShowAddForm(false);
      await fetchData();
    } catch (error) {
      console.error('Failed to create suspect:', error);
      toast.error(error.message || t({ en: 'Failed to add suspect.', mr: 'संशयित जोडता आला नाही.' }));
    } finally {
      setSavingSuspect(false);
    }
  };

  const handleLinkCrime = async (crimeId) => {
    if (!selectedSuspect?._id || !crimeId) return;

    try {
      setLinkingCrimeId(crimeId);
      await apiPost(`/api/suspects/${selectedSuspect._id}/link-crime`, { crimeId });
      toast.success(t({ en: 'Crime linked to suspect.', mr: 'गुन्हा संशयिताशी जोडला गेला.' }));
      await fetchData();
    } catch (error) {
      console.error('Failed to link crime:', error);
      toast.error(error.message || t({ en: 'Failed to link crime.', mr: 'गुन्हा जोडता आला नाही.' }));
    } finally {
      setLinkingCrimeId('');
    }
  };

  const filteredSuspects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return suspects;

    return suspects.filter((suspect) => {
      const aliases = Array.isArray(suspect.aliases) ? suspect.aliases.join(' ').toLowerCase() : '';
      return String(suspect.name || '').toLowerCase().includes(term) || aliases.includes(term);
    });
  }, [searchTerm, suspects]);

  const themeSurface = isDark
    ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-blue-500/30'
    : 'bg-gradient-to-br from-white to-slate-100 border-slate-300';

  if (loading) {
    return (
      <div className={`min-h-[calc(100vh-73px)] pt-4 flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100'}`}>
        <div className={`${isDark ? 'text-white' : 'text-slate-800'} text-xl`}>{t({ en: 'Loading suspect data...', mr: 'संशयित डेटा लोड होत आहे...' })}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-73px)] pt-4 ${isDark ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100'}`}>
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {t({ en: 'Suspect Matching 🔍', mr: 'संशयित जुळणी 🔍' })}
          </h1>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white font-semibold transition"
          >
            <FiUserPlus />
            {showAddForm ? t({ en: 'Close Form', mr: 'फॉर्म बंद करा' }) : t({ en: 'Add Suspect', mr: 'संशयित जोडा' })}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleCreateSuspect} className={`mb-6 border rounded-xl p-5 shadow-lg ${themeSurface}`}>
            <h3 className="text-xl font-bold text-blue-300 mb-4">{t({ en: 'Create New Suspect', mr: 'नवीन संशयित तयार करा' })}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={newSuspect.name}
                onChange={(e) => setNewSuspect((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t({ en: 'Name *', mr: 'नाव *' })}
                className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-300'}`}
              />
              <input
                value={newSuspect.aliases}
                onChange={(e) => setNewSuspect((prev) => ({ ...prev, aliases: e.target.value }))}
                placeholder={t({ en: 'Aliases (comma separated)', mr: 'उपनावे (स्वल्पविरामाने)' })}
                className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-300'}`}
              />
              <input
                value={newSuspect.age}
                onChange={(e) => setNewSuspect((prev) => ({ ...prev, age: e.target.value }))}
                placeholder={t({ en: 'Age', mr: 'वय' })}
                type="number"
                min="1"
                className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-300'}`}
              />
              <input
                value={newSuspect.height}
                onChange={(e) => setNewSuspect((prev) => ({ ...prev, height: e.target.value }))}
                placeholder={t({ en: 'Height', mr: 'उंची' })}
                className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-300'}`}
              />
              <input
                value={newSuspect.gender}
                onChange={(e) => setNewSuspect((prev) => ({ ...prev, gender: e.target.value }))}
                placeholder={t({ en: 'Gender', mr: 'लिंग' })}
                className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-300'}`}
              />
              <select
                value={newSuspect.riskLevel}
                onChange={(e) => setNewSuspect((prev) => ({ ...prev, riskLevel: e.target.value }))}
                className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-300'}`}
              >
                <option value="Low">{t({ en: 'Low Risk', mr: 'कमी जोखीम' })}</option>
                <option value="Medium">{t({ en: 'Medium Risk', mr: 'मध्यम जोखीम' })}</option>
                <option value="High">{t({ en: 'High Risk', mr: 'उच्च जोखीम' })}</option>
                <option value="Critical">{t({ en: 'Critical Risk', mr: 'गंभीर जोखीम' })}</option>
              </select>
              <input
                value={newSuspect.primaryType}
                onChange={(e) => setNewSuspect((prev) => ({ ...prev, primaryType: e.target.value }))}
                placeholder={t({ en: 'Primary Crime Type', mr: 'मुख्य गुन्हा प्रकार' })}
                className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-300'}`}
              />
              <input
                value={newSuspect.lastSeenDate}
                onChange={(e) => setNewSuspect((prev) => ({ ...prev, lastSeenDate: e.target.value }))}
                type="date"
                className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-300'}`}
              />
              <input
                value={newSuspect.lastSeenLocation}
                onChange={(e) => setNewSuspect((prev) => ({ ...prev, lastSeenLocation: e.target.value }))}
                placeholder={t({ en: 'Last Seen Location', mr: 'शेवटचे पाहिलेले ठिकाण' })}
                className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-300'}`}
              />
              <textarea
                value={newSuspect.description}
                onChange={(e) => setNewSuspect((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t({ en: 'Description', mr: 'वर्णन' })}
                rows={2}
                className={`md:col-span-3 px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-300'}`}
              />
            </div>
            <div className="mt-4">
              <button
                type="submit"
                disabled={savingSuspect}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-white font-semibold disabled:opacity-60"
              >
                <FiPlus />
                {savingSuspect ? t({ en: 'Saving...', mr: 'जतन होत आहे...' }) : t({ en: 'Save Suspect', mr: 'संशयित जतन करा' })}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Suspects List */}
          <div className={`border rounded-xl p-6 shadow-lg ${themeSurface}`}>
            <h3 className="text-xl font-bold text-blue-300 mb-4">{t({ en: 'Suspects Database', mr: 'संशयित डेटाबेस' })}</h3>

            {/* Search Box */}
            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t({ en: 'Search suspects...', mr: 'संशयित शोधा...' })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full border rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
              />
            </div>

            {/* Suspects List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredSuspects.length > 0 ? filteredSuspects.map((suspect) => (
                <div
                  key={suspect._id}
                  onClick={() => handleSuspectSelect(suspect)}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedSuspect?._id === suspect._id
                      ? 'bg-blue-600/50 border border-blue-400'
                      : isDark
                        ? 'bg-slate-700/50 border border-slate-600/30 hover:bg-slate-700/70'
                        : 'bg-slate-100 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{suspect.name}</h4>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{suspect.age ? `${suspect.age} ${t({ en: 'years old', mr: 'वर्षे' })}` : t({ en: 'Age not set', mr: 'वय सेट नाही' })}</p>
                    </div>
                    <span className="text-xs bg-red-600/40 text-red-300 px-2 py-1 rounded">
                      {(suspect.linkedCrimes || []).length} {t({ en: 'linked', mr: 'जोडले' })}
                    </span>
                  </div>
                  <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{suspect.description || t({ en: 'No description provided', mr: 'वर्णन उपलब्ध नाही' })}</p>
                </div>
              )) : (
                <div className={`text-center text-sm py-5 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  {t({ en: 'No suspects found. Add one using the button above.', mr: 'संशयित सापडले नाहीत. वरच्या बटणाने संशयित जोडा.' })}
                </div>
              )}
            </div>
          </div>

          {/* Details & Matches */}
          <div className="lg:col-span-2 space-y-6">
            {selectedSuspect ? (
              <>
                {/* Selected Suspect Details */}
                <div className={`border rounded-xl p-6 shadow-lg ${themeSurface}`}>
                  <h3 className="text-xl font-bold text-blue-300 mb-4">{t({ en: 'Selected Suspect', mr: 'निवडलेला संशयित' })}</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Name', mr: 'नाव' })}</p>
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSuspect.name}</p>
                    </div>
                    <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Age', mr: 'वय' })}</p>
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSuspect.age || 'N/A'}</p>
                    </div>
                    <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Height', mr: 'उंची' })}</p>
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSuspect.height || 'N/A'}</p>
                    </div>
                    <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Last Seen', mr: 'शेवटचे पाहिले' })}</p>
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSuspect.lastSeenDate ? toISODate(selectedSuspect.lastSeenDate) : 'N/A'}</p>
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                    <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Description', mr: 'वर्णन' })}</p>
                    <p className={isDark ? 'text-white' : 'text-slate-800'}>{selectedSuspect.description || t({ en: 'No description provided', mr: 'वर्णन उपलब्ध नाही' })}</p>
                  </div>
                </div>

                {/* Matching Crimes */}
                <div className={`border rounded-xl p-6 shadow-lg ${themeSurface}`}>
                  <h3 className="text-xl font-bold text-blue-300 mb-4">
                    {t({ en: 'Matched Crimes', mr: 'जुळलेले गुन्हे' })} ({matchResults.length})
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {matchResults.length > 0 ? (
                      matchResults.map((match, idx) => (
                        <div
                          key={match._id || idx}
                          className={`p-4 rounded-lg border ${
                            match.status === 'High'
                              ? 'bg-red-600/10 border-red-500/30'
                              : 'bg-yellow-600/10 border-yellow-500/30'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{match.type} - {match.date}</h4>
                              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{match.location}</p>
                            </div>
                            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
                              match.status === 'High'
                                ? 'bg-red-600/40 text-red-300'
                                : match.status === 'Medium'
                                  ? 'bg-yellow-600/40 text-yellow-300'
                                  : 'bg-emerald-600/40 text-emerald-300'
                            }`}>
                              {match.status === 'High' ? <FiAlertCircle /> : <FiCheckCircle />}
                              {match.similarity}%
                            </span>
                          </div>
                          <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{match.description}</p>
                          <button
                            type="button"
                            onClick={() => handleLinkCrime(match._id)}
                            disabled={match.isLinked || linkingCrimeId === match._id}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition ${
                              match.isLinked
                                ? 'bg-emerald-700/40 text-emerald-300 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            <FiLink2 size={13} />
                            {match.isLinked
                              ? t({ en: 'Already Linked', mr: 'आधीच जोडले' })
                              : linkingCrimeId === match._id
                                ? t({ en: 'Linking...', mr: 'जोडत आहे...' })
                                : t({ en: 'Link to Suspect', mr: 'संशयिताशी जोडा' })}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className={`text-center py-4 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'No matching crimes found', mr: 'जुळणारे गुन्हे आढळले नाहीत' })}</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className={`col-span-2 border rounded-xl p-12 shadow-lg flex items-center justify-center min-h-96 ${themeSurface}`}>
                <p className={`text-center ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{t({ en: 'Select a suspect to view matching crimes', mr: 'जुळणारे गुन्हे पाहण्यासाठी संशयित निवडा' })}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuspectMatching;

