import React, { useState, useEffect } from 'react';
import { Camera, CameraOff, Shield, AlertTriangle, HardHat, Wind, Layers, Download, BarChart3, TrendingUp, PieChart } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

//const API_URL = 'http://localhost:5000';
const API_URL = 'http://15.207.163.30:3005';

export default function PPEDetectionApp() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [detections, setDetections] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    checkStatus();
    loadAnalytics();
    loadLogs();
    const interval = setInterval(() => {
      checkStatus();
      if (showDashboard) {
        loadAnalytics();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [showDashboard]);

  const checkStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/status`);
      const data = await response.json();
      setIsStreaming(data.is_streaming);
      setCurrentFilter(data.detection_filter);
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/analytics`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const startCamera = async () => {
    try {
      const response = await fetch(`${API_URL}/api/start-camera`, {
        method: 'POST'
      });
      const data = await response.json();
      setStatus(data.status);
      setIsStreaming(true);
    } catch (error) {
      setStatus('Error starting camera');
      console.error(error);
    }
  };

  const stopCamera = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stop-camera`, {
        method: 'POST'
      });
      const data = await response.json();
      setStatus(data.status);
      setIsStreaming(false);
    } catch (error) {
      setStatus('Error stopping camera');
      console.error(error);
    }
  };

  const setFilter = async (filter) => {
    try {
      const response = await fetch(`${API_URL}/api/set-filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filter })
      });
      const data = await response.json();
      setCurrentFilter(filter);
      setStatus(`Filter set to: ${filter}`);
    } catch (error) {
      setStatus('Error setting filter');
      console.error(error);
    }
  };

  const captureSnapshot = async () => {
    try {
      const response = await fetch(`${API_URL}/api/capture-snapshot`, {
        method: 'POST'
      });
      const data = await response.json();
      setDetections(data.detections || []);
      setStatus(`Snapshot captured: ${data.timestamp}`);
      loadLogs();
      loadAnalytics();
    } catch (error) {
      setStatus('Error capturing snapshot');
      console.error(error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/get-logs`);
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const exportToExcel = async () => {
    try {
      const response = await fetch(`${API_URL}/api/export-excel`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PPE_Detection_Log_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setStatus('Excel file downloaded successfully!');
    } catch (error) {
      setStatus('Error exporting to Excel');
      console.error(error);
    }
  };

  const filterButtons = [
    { id: 'all', label: 'All PPE', icon: Layers, color: 'bg-blue-500' },
    { id: 'helmet', label: 'Helmet', icon: HardHat, color: 'bg-green-500' },
    { id: 'mask', label: 'Mask', icon: Wind, color: 'bg-purple-500' },
    { id: 'vest', label: 'Safety Vest', icon: Shield, color: 'bg-orange-500' }
  ];

  // Prepare chart data
  const pieData = analytics?.class_distribution ? Object.entries(analytics.class_distribution).map(([name, value]) => ({
    name,
    value
  })) : [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const complianceData = [
    { name: 'Compliant', value: analytics?.compliance_count || 0, color: '#10b981' },
    { name: 'Violations', value: analytics?.violation_count || 0, color: '#ef4444' }
  ];

  const ppeStatsData = analytics?.ppe_statistics ? [
    { name: 'Helmet', count: analytics.ppe_statistics.helmet },
    { name: 'Mask', count: analytics.ppe_statistics.mask },
    { name: 'Vest', count: analytics.ppe_statistics.vest }
  ] : [];

  const confidenceData = analytics?.avg_confidence ? Object.entries(analytics.avg_confidence).map(([name, value]) => ({
    name,
    confidence: (value * 100).toFixed(1)
  })) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <Shield className="w-10 h-10 text-blue-400" />
            PPE Detection System
          </h1>
          <p className="text-gray-300">Real-time Personal Protective Equipment Monitoring & Analytics</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowDashboard(false)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              !showDashboard ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <Camera className="w-5 h-5" />
            Live Detection
          </button>
          <button
            onClick={() => {
              setShowDashboard(true);
              loadAnalytics();
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              showDashboard ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Analytics Dashboard
          </button>
        </div>

        {!showDashboard ? (
          <>
            {/* Camera Controls */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-white/20">
              <h2 className="text-xl font-semibold mb-4">Camera Controls</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={startCamera}
                  disabled={isStreaming}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                    isStreaming
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  Start Camera
                </button>
                <button
                  onClick={stopCamera}
                  disabled={!isStreaming}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                    !isStreaming
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <CameraOff className="w-5 h-5" />
                  Stop Camera
                </button>
                <button
                  onClick={captureSnapshot}
                  disabled={!isStreaming}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                    !isStreaming
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  📸 Capture Snapshot
                </button>
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700 transition"
                >
                  <Download className="w-5 h-5" />
                  Export to Excel
                </button>
              </div>
              {status && (
                <div className="mt-4 p-3 bg-blue-500/20 rounded-lg text-sm">
                  {status}
                </div>
              )}
            </div>

            {/* Detection Filters */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-white/20">
              <h2 className="text-xl font-semibold mb-4">Detection Filters</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filterButtons.map((filter) => {
                  const Icon = filter.icon;
                  const isActive = currentFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setFilter(filter.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg font-medium transition ${
                        isActive
                          ? `${filter.color} scale-105 shadow-lg`
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-xs text-center">{filter.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Video Feed */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-white/20">
              <h2 className="text-xl font-semibold mb-4">Live Video Feed</h2>
              <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                {isStreaming ? (
                  <img
                    src={`${API_URL}/api/video-feed`}
                    alt="Live Feed"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Camera is not active</p>
                    <p className="text-sm">Click "Start Camera" to begin</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Detections */}
            {detections.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-white/20">
                <h2 className="text-xl font-semibold mb-4">Last Snapshot Detections</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {detections.map((det, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 rounded-lg p-4 border border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{det.class}</span>
                        <span className="text-sm bg-blue-500/30 px-2 py-1 rounded">
                          {(det.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detection Logs */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Detection Logs</h2>
                <button
                  onClick={loadLogs}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
                >
                  Refresh Logs
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/20">
                    <tr>
                      <th className="text-left p-2">Timestamp</th>
                      <th className="text-left p-2">Class</th>
                      <th className="text-left p-2">Confidence</th>
                      <th className="text-left p-2">Snapshot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 10).map((log, idx) => (
                      <tr key={idx} className="border-b border-white/10 hover:bg-white/5">
                        <td className="p-2">{log.Timestamp}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 bg-blue-500/30 rounded text-xs">
                            {log.Class}
                          </span>
                        </td>
                        <td className="p-2">{(log.Confidence * 100).toFixed(1)}%</td>
                        <td className="p-2 text-xs text-gray-400">{log.Snapshot}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Analytics Dashboard */}
            {analytics ? (
              analytics.total_detections === 0 ? (
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-12 border border-white/20 text-center">
                  <BarChart3 className="w-24 h-24 mx-auto mb-6 text-gray-400 opacity-50" />
                  <h2 className="text-2xl font-bold mb-4">No Detection Data Available</h2>
                  <p className="text-gray-300 mb-6">
                    Start the camera and capture some snapshots to see analytics and visualizations.
                  </p>
                  <div className="flex flex-col gap-4 items-center">
                    <button
                      onClick={() => setShowDashboard(false)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
                    >
                      Go to Live Detection
                    </button>
                    <p className="text-sm text-gray-400">
                      Steps: Switch to Live Detection → Start Camera → Capture Snapshots → View Analytics
                    </p>
                  </div>
                </div>
              ) : (
              <>
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-md rounded-lg p-6 border border-blue-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Total Detections</h3>
                      <TrendingUp className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold">{analytics.total_detections}</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-md rounded-lg p-6 border border-green-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Compliance Rate</h3>
                      <Shield className="w-8 h-8 text-green-400" />
                    </div>
                    <p className="text-3xl font-bold">{analytics.compliance_rate}%</p>
                  </div>

                  <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-md rounded-lg p-6 border border-red-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Violation Rate</h3>
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-3xl font-bold">{analytics.violation_rate}%</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-md rounded-lg p-6 border border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Violations</h3>
                      <AlertTriangle className="w-8 h-8 text-purple-400" />
                    </div>
                    <p className="text-3xl font-bold">{analytics.violation_count}</p>
                  </div>
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Class Distribution Pie Chart */}
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Detection Distribution by Class
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Compliance vs Violations */}
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Compliance vs Violations
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={complianceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis dataKey="name" stroke="#fff" />
                        <YAxis stroke="#fff" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {complianceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* PPE Statistics Bar Chart */}
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <HardHat className="w-5 h-5" />
                      PPE Type Statistics
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={ppeStatsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis dataKey="name" stroke="#fff" />
                        <YAxis stroke="#fff" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Average Confidence by Class */}
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Average Confidence by Class
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={confidenceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis dataKey="name" stroke="#fff" />
                        <YAxis stroke="#fff" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                        />
                        <Bar dataKey="confidence" fill="#10b981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recent Trend Line Chart */}
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Recent Detection Trend (Last 10 Snapshots)
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.recent_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="timestamp" stroke="#fff" />
                      <YAxis stroke="#fff" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="detections"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Total Detections"
                      />
                      <Line
                        type="monotone"
                        dataKey="violations"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Violations"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Export Button */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-8 py-4 rounded-lg font-medium bg-green-600 hover:bg-green-700 transition text-lg"
                  >
                    <Download className="w-6 h-6" />
                    Export Complete Report to Excel
                  </button>
                </div>
              </>
            )
          ) : (
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-12 border border-white/20 text-center">
              <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-300">Loading analytics data...</p>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
