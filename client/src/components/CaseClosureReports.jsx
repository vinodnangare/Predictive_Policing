import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiFilter, FiCalendar, FiFileText } from 'react-icons/fi';
import { apiGet } from '../utils/api';
import { normalizeCrimeList } from '../utils/crime';

function CaseClosureReports() {
  const [selectedCase, setSelectedCase] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true);
        const crimes = normalizeCrimeList(await apiGet('/api/crimes?limit=2000'));
        
        // Group crimes by type and location to create cases
        const caseGroups = {};
        crimes.forEach((crime) => {
          const key = `${crime.type}-${crime.district || crime.subdistrict || 'Unknown'}`;
          if (!caseGroups[key]) {
            caseGroups[key] = {
              crimes: [],
              type: crime.type,
              location: crime.district || crime.subdistrict || 'Unknown',
              officer: crime.assignedOfficer || 'Unassigned',
              firstDate: crime.date
            };
          }
          caseGroups[key].crimes.push(crime);
          
          // Track earliest date
          if (new Date(crime.date) < new Date(caseGroups[key].firstDate)) {
            caseGroups[key].firstDate = crime.date;
          }
        });
        
        // Convert to case objects
        const generatedCases = Object.entries(caseGroups).map(([key, group], idx) => {
          const closedCrimes = group.crimes.filter(c => ['Closed', 'Solved'].includes(c.caseStatus));
          const allClosed = closedCrimes.length === group.crimes.length;
          const someClosed = closedCrimes.length > 0;
          
          const status = allClosed ? 'Closed' : (someClosed ? 'Active' : 'Active');
          const outcome = allClosed ? 'Convicted' : 'Under Investigation';
          
          const openDate = new Date(group.firstDate);
          const closureDate = allClosed ? new Date(Math.max(...closedCrimes.map(c => new Date(c.date)))) : null;
          const daysToResolve = closureDate ? Math.floor((closureDate - openDate) / (1000 * 60 * 60 * 24)) : null;
          
          return {
            id: `CASE${String(idx + 1).padStart(3, '0')}`,
            name: `${group.type} - ${group.location}`,
            caseType: group.type,
            status,
            openDate: openDate.toISOString().split('T')[0],
            closureDate: closureDate ? closureDate.toISOString().split('T')[0] : null,
            outcome,
            officer: group.officer,
            description: `${group.crimes.length} ${group.type} incidents in ${group.location} area`,
            suspects: ['Investigation ongoing'],
            arrests: closedCrimes.length,
            evidenceCount: group.crimes.length * 2,
            daysToResolve,
            communityImpact: group.crimes.length > 5 ? 'High' : group.crimes.length > 2 ? 'Medium' : 'Low',
            notes: allClosed ? 'Case closed with resolution.' : 'Ongoing investigation.'
          };
        });
        
        setCases(generatedCases);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch cases:', error);
        setLoading(false);
      }
    };
    
    fetchCases();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchCases, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredCases = statusFilter === 'all' 
    ? cases 
    : cases.filter(c => c.status === statusFilter);

  const closedCases = cases.filter(c => c.status === 'Closed');
  const avgClosureTime = closedCases.length > 0
    ? Math.round(closedCases.reduce((sum, c) => sum + (c.daysToResolve || 0), 0) / closedCases.length)
    : 0;

  const convictionRate = closedCases.length > 0
    ? Math.round((closedCases.filter(c => c.outcome === 'Convicted').length / closedCases.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen pt-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading case closure data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="content-container p-6 sm:p-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6">
          Case Closure Reports 📋
        </h1>

        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 border border-emerald-500/30 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Closed Cases</p>
            <p className="text-4xl font-bold text-emerald-300">{closedCases.length}</p>
            <p className="text-xs text-gray-400 mt-2">{Math.round((closedCases.length / cases.length) * 100)}% of total</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Active Cases</p>
            <p className="text-4xl font-bold text-blue-300">{cases.filter(c => c.status === 'Active').length}</p>
            <p className="text-xs text-gray-400 mt-2">Under investigation</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-700/20 border border-cyan-500/30 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Avg Resolution Time</p>
            <p className="text-4xl font-bold text-cyan-300">{avgClosureTime} days</p>
            <p className="text-xs text-gray-400 mt-2">From open to close</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Conviction Rate</p>
            <p className="text-4xl font-bold text-purple-300">{convictionRate}%</p>
            <p className="text-xs text-gray-400 mt-2">Cases resulting in conviction</p>
          </div>
        </div>

        {/* Filter & Case List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cases List */}
          <div className="lg:col-span-1 bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2">
              <FiFilter /> Filter Cases
            </h3>

            {/* Status Filter */}
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-semibold mb-3">Status</label>
              <div className="space-y-2">
                {['all', 'Closed', 'Active'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-all ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'
                    }`}
                  >
                    {status === 'all' ? 'All Cases' : status}
                    <span className="float-right text-xs">
                      {status === 'all' 
                        ? cases.length 
                        : cases.filter(c => c.status === status).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cases List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCases.map(caseItem => (
                <div
                  key={caseItem.id}
                  onClick={() => setSelectedCase(caseItem)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedCase?.id === caseItem.id
                      ? 'bg-blue-600/50 border border-blue-400'
                      : 'bg-slate-700/50 border border-slate-600/30 hover:bg-slate-700/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-white text-sm">{caseItem.id}</h4>
                      <p className="text-xs text-gray-400">{caseItem.name}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      caseItem.status === 'Closed'
                        ? 'bg-emerald-600/40 text-emerald-300'
                        : 'bg-yellow-600/40 text-yellow-300'
                    }`}>
                      {caseItem.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Case Details */}
          <div className="lg:col-span-2">
            {selectedCase ? (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{selectedCase.name}</h2>
                    <p className="text-gray-400">{selectedCase.id}</p>
                  </div>
                  <span className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full ${
                    selectedCase.status === 'Closed'
                      ? 'bg-emerald-600/40 text-emerald-300'
                      : 'bg-yellow-600/40 text-yellow-300'
                  }`}>
                    <FiCheckCircle /> {selectedCase.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Case Type</p>
                    <p className="text-white font-semibold">{selectedCase.caseType}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Officer in Charge</p>
                    <p className="text-white font-semibold">{selectedCase.officer}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Opened</p>
                    <p className="text-white font-semibold">{selectedCase.openDate}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Outcome</p>
                    <p className={`font-semibold ${
                      selectedCase.outcome === 'Convicted' ? 'text-emerald-400' :
                      selectedCase.outcome === 'Dismissed' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {selectedCase.outcome}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                  <p className="text-gray-400 text-sm mb-2">Case Description</p>
                  <p className="text-white">{selectedCase.description}</p>
                </div>

                {/* Case Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600/30">
                    <p className="text-gray-400 text-xs mb-1">Arrests Made</p>
                    <p className="text-2xl font-bold text-blue-400">{selectedCase.arrests}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600/30">
                    <p className="text-gray-400 text-xs mb-1">Evidence Items</p>
                    <p className="text-2xl font-bold text-cyan-400">{selectedCase.evidenceCount}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600/30">
                    <p className="text-gray-400 text-xs mb-1">Days to Resolve</p>
                    <p className="text-2xl font-bold text-emerald-400">{selectedCase.daysToResolve || '-'}</p>
                  </div>
                </div>

                {/* Suspects & Details */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-3 font-semibold">Associated Suspects</p>
                    <div className="space-y-2">
                      {selectedCase.suspects.map((suspect, idx) => (
                        <span key={idx} className="block text-sm text-gray-300 bg-slate-600/50 rounded px-2 py-1">
                          {suspect}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-3 font-semibold">Community Impact</p>
                    <p className="text-sm text-white">{selectedCase.communityImpact}</p>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                  <p className="text-gray-400 text-sm mb-2 font-semibold">Case Notes</p>
                  <p className="text-white text-sm">{selectedCase.notes}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition font-semibold text-sm flex items-center justify-center gap-2">
                    <FiFileText /> View Full Report
                  </button>
                  <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition font-semibold text-sm">
                    Export Details
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600/30 rounded-xl p-12 shadow-lg flex items-center justify-center min-h-96">
                <p className="text-gray-400 text-center">Select a case to view detailed closure report</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CaseClosureReports;
