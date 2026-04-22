import React, { useState, useEffect } from 'react';
import { FiDownload, FiFileText, FiCalendar } from 'react-icons/fi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { API_BASE } from '../utils/api';

function AutomatedReportGeneration() {
  const [reportType, setReportType] = useState('crimes');
  const [dateRange, setDateRange] = useState('month');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [crimeData, setCrimeData] = useState([]);
  const [caseData, setCaseData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch crimes
        const crimesResponse = await fetch(`${API_BASE}/police/crimes`);
        const crimes = await crimesResponse.json();
        
        // Filter crimes by date range
        const filteredCrimes = filterByDateRange(crimes, dateRange);
        
        // Format crime data for reports
        const formattedCrimes = filteredCrimes.map(crime => ({
          id: crime._id,
          type: crime.crimeType,
          date: new Date(crime.date).toISOString().split('T')[0],
          location: crime.district || crime.subdistrict || crime.location || 'Unknown',
          status: crime.status || 'Active',
          officer: crime.assignedOfficer || 'Unassigned',
          description: crime.description || 'No description'
        }));
        
        setCrimeData(formattedCrimes);
        
        // Generate case data from crimes
        const cases = generateCaseData(filteredCrimes);
        setCaseData(cases);
        
        // Fetch officers for performance data
        const officersResponse = await fetch(`${API_BASE}/police/officers`);
        const officers = await officersResponse.json();
        
        // Generate performance data
        const performance = generatePerformanceData(officers, filteredCrimes);
        setPerformanceData(performance);
        
        console.log('Report data loaded:', formattedCrimes.length, 'crimes');
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch report data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [dateRange]);

  const filterByDateRange = (crimes, range) => {
    const now = new Date();
    const ranges = {
      'week': 7,
      'month': 30,
      'quarter': 90,
      'year': 365
    };
    
    const daysToFilter = ranges[range] || 30;
    const cutoffDate = new Date(now.getTime() - daysToFilter * 24 * 60 * 60 * 1000);
    
    return crimes.filter(crime => new Date(crime.date) >= cutoffDate);
  };

  const generateCaseData = (crimes) => {
    // Group crimes by location/type to create cases
    const caseGroups = {};
    
    crimes.forEach(crime => {
      const key = `${crime.crimeType}-${crime.district || 'Unknown'}`;
      if (!caseGroups[key]) {
        caseGroups[key] = {
          crimes: [],
          type: crime.crimeType,
          location: crime.district || crime.subdistrict || 'Unknown'
        };
      }
      caseGroups[key].crimes.push(crime);
    });
    
    return Object.entries(caseGroups).map(([key, group], idx) => {
      const closedCount = group.crimes.filter(c => c.status === 'Closed').length;
      const closureRate = group.crimes.length > 0 ? Math.round((closedCount / group.crimes.length) * 100) : 0;
      
      return {
        id: `CASE${String(idx + 1).padStart(3, '0')}`,
        name: `${group.type} - ${group.location}`,
        status: closureRate === 100 ? 'Closed' : closureRate > 0 ? 'Under Investigation' : 'Active',
        closureRate: closureRate,
        crimeCount: group.crimes.length
      };
    });
  };

  const generatePerformanceData = (officers, crimes) => {
    return officers.map(officer => {
      const assignedCrimes = crimes.filter(c => c.assignedOfficerId === officer._id);
      const resolvedCases = assignedCrimes.filter(c => c.status === 'Closed').length;
      
      // Calculate performance score based on resolution rate
      const resolutionRate = assignedCrimes.length > 0 ? (resolvedCases / assignedCrimes.length) : 0;
      const performanceScore = Math.round(50 + (resolutionRate * 50)); // Base 50 + up to 50 for resolution
      
      return {
        officer: officer.name || 'Unknown Officer',
        badgeNumber: officer.badgeNumber,
        casesResolved: resolvedCases,
        casesAssigned: assignedCrimes.length,
        avgResponseTime: 'N/A', // Would need timestamps to calculate
        performanceScore: performanceScore
      };
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    let yPosition = margin;

    const addTitle = (text) => {
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(text, margin, yPosition);
      yPosition += 10;
    };

    const addHeader = (text) => {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(text, margin, yPosition);
      yPosition += 8;
    };

    const checkPageBreak = (height) => {
      if (yPosition + height > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };

    addTitle('Crime Report');
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Date Range: ${dateRange}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 12;

    if (reportType === 'crimes' || reportType === 'all') {
      checkPageBreak(20);
      addHeader('Crime Records');
      yPosition += 2;

      const tableData = crimeData.map(crime => [
        crime.id,
        crime.type,
        crime.date,
        crime.location,
        crime.status
      ]);

      doc.autoTable({
        head: [['ID', 'Type', 'Date', 'Location', 'Status']],
        body: tableData,
        startY: yPosition,
        margin: margin,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 58, 138] }
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    }

    if (reportType === 'cases' || reportType === 'all') {
      checkPageBreak(20);
      addHeader('Case Summary');
      yPosition += 2;

      const caseTableData = caseData.map(c => [
        c.id,
        c.name,
        c.status,
        `${c.closureRate}%`
      ]);

      doc.autoTable({
        head: [['Case ID', 'Name', 'Status', 'Closure %']],
        body: caseTableData,
        startY: yPosition,
        margin: margin,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 58, 138] }
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    }

    if (reportType === 'performance' || reportType === 'all') {
      checkPageBreak(20);
      addHeader('Officer Performance');
      yPosition += 2;

      const perfTableData = performanceData.map(p => [
        p.officer,
        p.casesResolved,
        p.avgResponseTime,
        p.performanceScore
      ]);

      doc.autoTable({
        head: [['Officer', 'Cases Resolved', 'Avg Response Time', 'Score']],
        body: perfTableData,
        startY: yPosition,
        margin: margin,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 58, 138] }
      });
    }

    doc.save(`${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (reportType === 'crimes' || reportType === 'all') {
      const crimeSheet = XLSX.utils.json_to_sheet(crimeData);
      XLSX.utils.book_append_sheet(workbook, crimeSheet, 'Crimes');
    }

    if (reportType === 'cases' || reportType === 'all') {
      const caseSheet = XLSX.utils.json_to_sheet(caseData);
      XLSX.utils.book_append_sheet(workbook, caseSheet, 'Cases');
    }

    if (reportType === 'performance' || reportType === 'all') {
      const perfSheet = XLSX.utils.json_to_sheet(performanceData);
      XLSX.utils.book_append_sheet(workbook, perfSheet, 'Performance');
    }

    XLSX.writeFile(workbook, `${reportType}-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownload = () => {
    if (selectedFormat === 'pdf') {
      generatePDF();
    } else {
      generateExcel();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-73px)] pt-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading report data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] pt-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6">
          Automated Report Generation 📄
        </h1>

        {/* Report Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Report Type */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6">
            <label className="block text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
              <FiFileText /> Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="crimes">Crime Records</option>
              <option value="cases">Case Closure Reports</option>
              <option value="performance">Performance Reports</option>
              <option value="all">Comprehensive Report</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6">
            <label className="block text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
              <FiCalendar /> Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* Format */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6">
            <label className="block text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
              <FiDownload /> Export Format
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel (XLSX)</option>
            </select>
          </div>
        </div>

        {/* Preview & Download */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Data Preview */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-blue-300 mb-4">Report Preview</h3>

            {/* Crime Records Preview */}
            {(reportType === 'crimes' || reportType === 'all') && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">Crime Records</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-gray-300">
                    <thead className="bg-blue-600/20 border-b border-blue-500/30">
                      <tr>
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Location</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crimeData.slice(0, 3).map(crime => (
                        <tr key={crime.id} className="border-b border-slate-600/30 hover:bg-slate-700/30">
                          <td className="px-4 py-2">{crime.id}</td>
                          <td className="px-4 py-2">{crime.type}</td>
                          <td className="px-4 py-2">{crime.date}</td>
                          <td className="px-4 py-2">{crime.location}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              crime.status === 'Active' ? 'bg-red-600/40 text-red-300' :
                              crime.status === 'Closed' ? 'bg-green-600/40 text-green-300' :
                              'bg-yellow-600/40 text-yellow-300'
                            }`}>
                              {crime.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-2">Showing 3 of {crimeData.length} records</p>
              </div>
            )}

            {/* Cases Preview */}
            {(reportType === 'cases' || reportType === 'all') && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">Case Closure Reports</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-gray-300">
                    <thead className="bg-blue-600/20 border-b border-blue-500/30">
                      <tr>
                        <th className="px-4 py-2 text-left">Case ID</th>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Closure %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {caseData.slice(0, 3).map(c => (
                        <tr key={c.id} className="border-b border-slate-600/30 hover:bg-slate-700/30">
                          <td className="px-4 py-2">{c.id}</td>
                          <td className="px-4 py-2">{c.name}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              c.status === 'Closed' ? 'bg-green-600/40 text-green-300' :
                              c.status === 'Active' ? 'bg-red-600/40 text-red-300' :
                              'bg-yellow-600/40 text-yellow-300'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-2">{c.closureRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-2">Showing 3 of {caseData.length} cases</p>
              </div>
            )}

            {/* Performance Preview */}
            {(reportType === 'performance' || reportType === 'all') && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Performance Reports</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-gray-300">
                    <thead className="bg-blue-600/20 border-b border-blue-500/30">
                      <tr>
                        <th className="px-4 py-2 text-left">Officer</th>
                        <th className="px-4 py-2 text-left">Cases Resolved</th>
                        <th className="px-4 py-2 text-left">Avg Response</th>
                        <th className="px-4 py-2 text-left">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceData.slice(0, 3).map((p, idx) => (
                        <tr key={idx} className="border-b border-slate-600/30 hover:bg-slate-700/30">
                          <td className="px-4 py-2">{p.officer}</td>
                          <td className="px-4 py-2">{p.casesResolved}</td>
                          <td className="px-4 py-2">{p.avgResponseTime}</td>
                          <td className="px-4 py-2 text-green-400 font-semibold">{p.performanceScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-2">Showing 3 of {performanceData.length} officers</p>
              </div>
            )}
          </div>

          {/* Download Panel */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg h-fit">
            <h3 className="text-xl font-bold text-blue-300 mb-6">Generate Report</h3>

            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
                <p className="text-gray-400 text-sm mb-2">Report Type</p>
                <p className="text-white font-semibold capitalize">{reportType}</p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
                <p className="text-gray-400 text-sm mb-2">Format</p>
                <p className="text-white font-semibold uppercase">{selectedFormat}</p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
                <p className="text-gray-400 text-sm mb-2">Date Range</p>
                <p className="text-white font-semibold capitalize">{dateRange}</p>
              </div>

              <button
                onClick={handleDownload}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 mt-6"
              >
                <FiDownload className="text-lg" />
                Generate & Download
              </button>

              <p className="text-xs text-gray-400 text-center mt-4">
                Report will be generated with current data and downloaded automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AutomatedReportGeneration;

