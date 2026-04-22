import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiEye, FiPlus, FiX, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { API_BASE } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const STATUS_OPTIONS = ['Open', 'Under Investigation', 'Solved', 'Closed', 'Cold Case'];
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

function CaseManagement() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [crimes, setCrimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editSeverity, setEditSeverity] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [officers, setOfficers] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const token = localStorage.getItem('token');

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Open':
        return t({ en: 'Open', mr: 'सुरू' });
      case 'Under Investigation':
        return t({ en: 'Under Investigation', mr: 'तपास सुरू' });
      case 'Solved':
        return t({ en: 'Solved', mr: 'निकाली' });
      case 'Closed':
        return t({ en: 'Closed', mr: 'बंद' });
      case 'Cold Case':
        return t({ en: 'Cold Case', mr: 'थंड प्रकरण' });
      default:
        return status || t({ en: 'Open', mr: 'सुरू' });
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'Low':
        return t({ en: 'Low', mr: 'कमी' });
      case 'Medium':
        return t({ en: 'Medium', mr: 'मध्यम' });
      case 'High':
        return t({ en: 'High', mr: 'उच्च' });
      case 'Critical':
        return t({ en: 'Critical', mr: 'गंभीर' });
      default:
        return severity || t({ en: 'Medium', mr: 'मध्यम' });
    }
  };

  useEffect(() => {
    fetchCrimes();
    fetchOfficers();
  }, []);

  const fetchCrimes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/police/crimes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCrimes(response.data || []);
      setError(null);
    } catch (err) {
      setError(t({ en: 'Failed to fetch crime data', mr: 'गुन्हा डेटा मिळवता आला नाही' }));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/police/officers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOfficers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch officers:', err);
    }
  };

  const assignOfficer = async () => {
    if (!selectedCase) return;
    if (!selectedOfficer) {
      toast.error(t({ en: 'Select an officer before assigning.', mr: 'नेमणुकीपूर्वी अधिकारी निवडा.' }));
      return;
    }
    
    try {
      setAssignLoading(true);
      const officer = officers.find(o => o._id === selectedOfficer);
      
      await axios.post(`${API_BASE}/police/assign-officer`, {
        crimeId: selectedCase._id,
        officerId: selectedOfficer,
        officerName: officer.name
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      const updatedCase = {
        ...selectedCase,
        assignedOfficer: officer.name,
        assignedOfficerId: selectedOfficer
      };
      setSelectedCase(updatedCase);
      
      setCrimes(crimes.map(c => c._id === selectedCase._id ? updatedCase : c));
      setSelectedOfficer('');
      toast.success(t({ en: 'Officer assigned successfully.', mr: 'अधिकारी यशस्वीरित्या नियुक्त झाला.' }));
    } catch (err) {
      toast.error(t({ en: 'Failed to assign officer.', mr: 'अधिकारी नियुक्त करता आला नाही.' }));
      console.error(err);
    } finally {
      setAssignLoading(false);
    }
  };

  const unassignOfficer = async () => {
    if (!selectedCase || !selectedCase.assignedOfficerId) return;
    
    if (!window.confirm(t({ en: 'Are you sure you want to unassign the current officer?', mr: 'सध्याच्या अधिकाऱ्याची नेमणूक काढायची आहे का?' }))) return;
    
    try {
      setAssignLoading(true);
      await axios.post(`${API_BASE}/police/unassign-officer`, {
        crimeId: selectedCase._id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      const updatedCase = {
        ...selectedCase,
        assignedOfficer: null,
        assignedOfficerId: null
      };
      setSelectedCase(updatedCase);
      setCrimes(crimes.map(c => c._id === selectedCase._id ? updatedCase : c));
      toast.success(t({ en: 'Officer unassigned successfully.', mr: 'अधिकाऱ्याची नेमणूक काढली.' }));
    } catch (err) {
      toast.error(t({ en: 'Failed to unassign officer.', mr: 'अधिकाऱ्याची नेमणूक काढता आली नाही.' }));
      console.error(err);
    } finally {
      setAssignLoading(false);
    }
  };

  const addNote = async () => {
    if (!editNote.trim() || !selectedCase) return;
    
    try {
      const updatedNotes = selectedCase.notes || [];
      updatedNotes.push({
        date: new Date(),
        officer: 'Current Officer',
        content: editNote
      });

      // Update crime in state
      const updatedCase = { ...selectedCase, notes: updatedNotes };
      const updatedCrimes = crimes.map(c => c._id === selectedCase._id ? updatedCase : c);
      setCrimes(updatedCrimes);
      setSelectedCase(updatedCase);
      setEditNote('');
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const updateCaseStatus = async () => {
    if (!selectedCase) return;
    
    try {
      const updatedData = {
        caseStatus: editStatus,
        severity: editSeverity,
        resolvedAt: editStatus === 'Solved' ? new Date() : null
      };

      const response = await axios.put(
        `${API_BASE}/police/crime/${selectedCase._id}`,
        updatedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedCase = response.data;
      const updatedCrimes = crimes.map(c => c._id === selectedCase._id ? updatedCase : c);
      setCrimes(updatedCrimes);
      setSelectedCase(updatedCase);
      toast.success(t({ en: 'Case status updated successfully.', mr: 'प्रकरण स्थिती यशस्वीरित्या अपडेट झाली.' }));
    } catch (err) {
      console.error(err);
      toast.error(t({ en: 'Failed to update case status.', mr: 'प्रकरण स्थिती अपडेट करता आली नाही.' }));
    }
  };

  const filteredCrimes = crimes.filter(crime => {
    const statusMatch = filterStatus === 'All' || crime.caseStatus === filterStatus;
    const severityMatch = filterSeverity === 'All' || crime.severity === filterSeverity;
    const searchMatch = searchTerm === '' || 
      crime.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crime.type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && severityMatch && searchMatch;
  });

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Open': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Under Investigation': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Solved': return 'bg-green-100 text-green-800 border-green-300';
      case 'Closed': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'Cold Case': return 'bg-slate-100 text-slate-800 border-slate-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-blue-400">
        <div className="w-12 h-12 border-4 border-blue-400/20 border-t-blue-400 rounded-full animate-spin mb-4"></div>
        <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{t({ en: 'Loading case data...', mr: 'प्रकरण डेटा लोड होत आहे...' })}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-73px)] pt-4 ${isDark ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100'}`}>
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            {t({ en: '📋 Case Management', mr: '📋 प्रकरण व्यवस्थापन' })}
          </h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{t({ en: 'Track, update, and manage active crime cases', mr: 'सक्रिय गुन्हे प्रकरणे ट्रॅक, अपडेट आणि व्यवस्थापित करा' })}</p>
        </div>

        {error && (
          <div className="mb-6 text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            ⚠️ {error}
          </div>
        )}

        {/* Filters */}
        <div className={`border border-blue-500/30 rounded-xl p-6 mb-8 shadow-lg ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-white to-slate-100'}`}>
          <h2 className="text-xl font-bold text-blue-300 mb-4">{t({ en: '🔍 Filters & Search', mr: '🔍 फिल्टर आणि शोध' })}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder={t({ en: 'Search by location or crime type...', mr: 'ठिकाण किंवा गुन्हा प्रकाराने शोधा...' })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`px-4 py-2 rounded-lg border border-blue-500/30 focus:outline-none focus:border-blue-400 ${isDark ? 'bg-slate-700/50 text-white placeholder-gray-400' : 'bg-white text-slate-800 placeholder-slate-500'}`}
            />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-4 py-2 rounded-lg border border-blue-500/30 focus:outline-none focus:border-blue-400 ${isDark ? 'bg-slate-700/50 text-white' : 'bg-white text-slate-800'}`}
            >
              <option value="All">{t({ en: 'All Statuses', mr: 'सर्व स्थिती' })}</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{getStatusLabel(status)}</option>
              ))}
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className={`px-4 py-2 rounded-lg border border-blue-500/30 focus:outline-none focus:border-blue-400 ${isDark ? 'bg-slate-700/50 text-white' : 'bg-white text-slate-800'}`}
            >
              <option value="All">{t({ en: 'All Severities', mr: 'सर्व तीव्रता' })}</option>
              {SEVERITY_OPTIONS.map((severity) => (
                <option key={severity} value={severity}>{getSeverityLabel(severity)}</option>
              ))}
            </select>

            <button
              onClick={fetchCrimes}
              className="px-4 py-2 bg-cyan-600/80 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-all"
            >
              {t({ en: 'Refresh', mr: 'रिफ्रेश' })}
            </button>

          </div>
        </div>

        {/* Cases Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCrimes.length === 0 ? (
            <div className={`col-span-full text-center py-16 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              <p className="text-2xl mb-2">{t({ en: '📭 No cases found', mr: '📭 कोणतेही प्रकरण आढळले नाही' })}</p>
              <p className="text-sm">{t({ en: 'Try adjusting your filters', mr: 'तुमचे फिल्टर बदलून पहा' })}</p>
            </div>
          ) : (
            filteredCrimes.map((crime) => (
              <div
                key={crime._id}
                className={`border border-blue-500/30 rounded-xl p-6 shadow-lg hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer hover:border-blue-400/60 ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-white to-slate-100'}`}
                onClick={() => {
                  setSelectedCase(crime);
                  setShowModal(true);
                  setEditStatus(crime.caseStatus || 'Open');
                  setEditSeverity(crime.severity || 'Medium');
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-blue-300">{crime.type}</h3>
                    <p className="text-sm text-gray-400 mt-1">📍 {crime.location}</p>
                  </div>
                  <FiEye size={20} className="text-cyan-400" />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(crime.caseStatus || 'Open')}`}>
                      {getStatusLabel(crime.caseStatus || 'Open')}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(crime.severity || 'Medium')}`}>
                      {getSeverityLabel(crime.severity || 'Medium')}
                    </span>
                  </div>
                </div>

                <div className={`text-xs space-y-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  <p>📅 {crime.date} {t({ en: 'at', mr: 'वेळी' })} {crime.time}</p>
                  {crime.assignedOfficer && <p>👮 {t({ en: 'Assigned:', mr: 'नियुक्त:' })} {crime.assignedOfficer}</p>}
                  {crime.notes && crime.notes.length > 0 && (
                    <p>📝 {crime.notes.length} {crime.notes.length > 1 ? t({ en: 'notes', mr: 'नोंदी' }) : t({ en: 'note', mr: 'नोंद' })}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Modal */}
        {showModal && selectedCase && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 pt-20">
            <div className={`border border-blue-500/30 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-white to-slate-100'}`}>
              <div className="sticky top-0 bg-gradient-to-r from-blue-600/80 to-blue-700/80 p-6 flex justify-between items-center border-b border-blue-500/30">
                <h2 className="text-2xl font-bold text-white">📋 {selectedCase.type}</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all"
                >
                  <FiX size={24} className="text-white" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Case Details */}
                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
                  <h3 className="text-lg font-bold text-blue-300 mb-4">{t({ en: 'Case Details', mr: 'प्रकरण तपशील' })}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">📍 {t({ en: 'Location', mr: 'ठिकाण' })}</p>
                      <p className="text-white font-semibold">{selectedCase.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">📅 {t({ en: 'Date & Time', mr: 'दिनांक व वेळ' })}</p>
                      <p className="text-white font-semibold">{selectedCase.date} {selectedCase.time}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">📝 {t({ en: 'Description', mr: 'वर्णन' })}</p>
                      <p className="text-white font-semibold col-span-2">{selectedCase.description}</p>
                    </div>
                  </div>
                </div>

                {/* Status & Severity */}
                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
                  <h3 className="text-lg font-bold text-blue-300 mb-4">{t({ en: 'Update Status', mr: 'स्थिती अपडेट करा' })}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className={`px-4 py-2 rounded-lg border border-blue-500/30 focus:outline-none focus:border-blue-400 ${isDark ? 'bg-slate-600 text-white' : 'bg-white text-slate-800'}`}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{getStatusLabel(status)}</option>
                      ))}
                    </select>

                    <select
                      value={editSeverity}
                      onChange={(e) => setEditSeverity(e.target.value)}
                      className={`px-4 py-2 rounded-lg border border-blue-500/30 focus:outline-none focus:border-blue-400 ${isDark ? 'bg-slate-600 text-white' : 'bg-white text-slate-800'}`}
                    >
                      {SEVERITY_OPTIONS.map((severity) => (
                        <option key={severity} value={severity}>{getSeverityLabel(severity)}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={updateCaseStatus}
                    className="mt-4 w-full px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <FiSave size={18} /> {t({ en: 'Update Status', mr: 'स्थिती अपडेट करा' })}
                  </button>
                </div>

                {/* Officer Assignment */}
                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
                  <h3 className="text-lg font-bold text-blue-300 mb-4">{t({ en: '👮 Assign Officer', mr: '👮 अधिकारी नियुक्त करा' })}</h3>
                  
                  {selectedCase.assignedOfficer ? (
                    <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-400">{t({ en: 'Currently Assigned', mr: 'सध्या नियुक्त' })}</p>
                          <p className="text-white font-bold text-lg">{selectedCase.assignedOfficer}</p>
                        </div>
                        <button
                          onClick={unassignOfficer}
                          disabled={assignLoading}
                          className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-sm font-semibold transition-all disabled:opacity-50"
                        >
                          {assignLoading ? t({ en: 'Removing...', mr: 'काढत आहे...' }) : t({ en: 'Remove', mr: 'काढा' })}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm mb-4">{t({ en: 'No officer assigned yet', mr: 'अजून कोणताही अधिकारी नियुक्त नाही' })}</p>
                  )}

                  <div className="space-y-3">
                    {officers.length === 0 ? (
                      <div className="bg-slate-600/40 border border-slate-500/40 rounded-lg p-4">
                        <p className="text-gray-300 text-sm mb-3">{t({ en: 'No officers found. Create officers to enable assignment.', mr: 'कोणतेही अधिकारी आढळले नाहीत. नेमणुकीसाठी अधिकारी तयार करा.' })}</p>
                        <button
                          onClick={() => navigate('/police/officers')}
                          className="w-full px-4 py-2 bg-cyan-600/80 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-all"
                        >
                          {t({ en: 'Go to Officers', mr: 'अधिकारी पृष्ठावर जा' })}
                        </button>
                      </div>
                    ) : (
                      <select
                        value={selectedOfficer}
                        onChange={(e) => setSelectedOfficer(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg border border-blue-500/30 focus:outline-none focus:border-blue-400 ${isDark ? 'bg-slate-600 text-white' : 'bg-white text-slate-800'}`}
                        disabled={assignLoading}
                      >
                        <option value="">{t({ en: 'Select an officer...', mr: 'अधिकारी निवडा...' })}</option>
                        {officers.map(officer => (
                          <option key={officer._id} value={officer._id}>
                            {officer.name} - {officer.badgeNumber} ({officer.rank})
                          </option>
                        ))}
                      </select>
                    )}
                    
                    <button
                      onClick={assignOfficer}
                      disabled={!selectedOfficer || assignLoading || officers.length === 0}
                      className="w-full px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {assignLoading ? t({ en: 'Assigning...', mr: 'नियुक्त करत आहे...' }) : t({ en: '👮 Assign Officer', mr: '👮 अधिकारी नियुक्त करा' })}
                    </button>
                  </div>
                </div>

                {/* Case Notes */}
                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
                  <h3 className="text-lg font-bold text-blue-300 mb-4">{t({ en: '📝 Case Notes', mr: '📝 प्रकरण नोंदी' })}</h3>
                  
                  <div className="space-y-3 mb-4">
                    {selectedCase.notes && selectedCase.notes.length > 0 ? (
                      selectedCase.notes.map((note, idx) => (
                        <div key={idx} className="bg-slate-600/50 p-3 rounded-lg border border-slate-500/30">
                          <p className="text-xs text-gray-400">{note.officer} - {new Date(note.date).toLocaleString()}</p>
                          <p className="text-white mt-1">{note.content}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-sm">{t({ en: 'No notes yet', mr: 'अजून नोंदी नाहीत' })}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t({ en: 'Add a note...', mr: 'नोंद जोडा...' })}
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addNote()}
                      className={`flex-1 px-4 py-2 rounded-lg border border-blue-500/30 focus:outline-none focus:border-blue-400 ${isDark ? 'bg-slate-600 text-white placeholder-gray-400' : 'bg-white text-slate-800 placeholder-slate-500'}`}
                    />
                    <button
                      onClick={addNote}
                      className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all flex items-center gap-1"
                    >
                      <FiPlus size={18} /> {t({ en: 'Add', mr: 'जोडा' })}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CaseManagement;

