import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/api';

function OfficerManagement() {
  const [officers, setOfficers] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    badgeNumber: '',
    rank: 'Officer',
    department: '',
    phone: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/police/officers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOfficers(res.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load officers');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const addOfficer = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name || !form.email || !form.password || !form.badgeNumber) {
      setError('Please fill name, email, password and badge number');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/police/officers`, form, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      setSuccess('Officer added successfully');
      setForm({ name: '', email: '', password: '', badgeNumber: '', rank: 'Officer', department: '', phone: '', isActive: true });
      setOfficers(prev => [res.data.officer, ...prev]);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to add officer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] pt-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            👮 Officer Management
          </h1>
          <p className="text-gray-300">Create and manage police officers</p>
        </div>

        {(error || success) && (
          <div className={`mb-6 ${error ? 'text-red-300 bg-red-500/10 border-red-500/30' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'} border rounded-xl p-4`}>
            {error || success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Officer Form */}
          <form onSubmit={addOfficer} className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-blue-300 mb-4">Add New Officer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white placeholder-gray-400" />
              <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white placeholder-gray-400" />
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" className="px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white placeholder-gray-400" />
              <input name="badgeNumber" value={form.badgeNumber} onChange={handleChange} placeholder="Badge Number" className="px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white placeholder-gray-400" />
              <input name="rank" value={form.rank} onChange={handleChange} placeholder="Rank" className="px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white placeholder-gray-400" />
              <input name="department" value={form.department} onChange={handleChange} placeholder="Department" className="px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white placeholder-gray-400" />
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="px-4 py-2 rounded-lg bg-slate-700/50 border border-blue-500/30 text-white placeholder-gray-400" />
              <label className="flex items-center gap-2 text-gray-300">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                Active
              </label>
            </div>
            <button type="submit" disabled={loading} className="mt-4 w-full px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all">
              {loading ? 'Adding...' : 'Add Officer'}
            </button>
          </form>

          {/* Officers List */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-blue-300 mb-4">All Officers</h2>
            {officers.length === 0 ? (
              <p className="text-gray-400">No officers found</p>
            ) : (
              <div className="space-y-3">
                {officers.map((o) => (
                  <div key={o._id} className="p-4 rounded-lg bg-slate-700/40 border border-slate-600/40">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{o.name} <span className="text-gray-400">({o.badgeNumber})</span></p>
                        <p className="text-gray-400 text-sm">{o.rank} • {o.department}</p>
                        <p className="text-gray-500 text-xs">{o.email} • {o.phone}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${o.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-gray-100 text-gray-800 border-gray-300'}`}>{o.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    {Array.isArray(o.assignedCases) && o.assignedCases.length > 0 && (
                      <p className="text-xs text-gray-400 mt-2">Assigned cases: {o.assignedCases.length}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OfficerManagement;

