import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import { 
  FaArrowLeft, 
  FaChartLine, 
  FaFileAlt, 
  FaDownload,
  FaCalendarAlt,
  FaUserMd,
  FaHospital,
  FaPills,
  FaClipboardList,
  FaUsers,
  FaMoneyBillWave,
  FaHeartbeat,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaStethoscope,
  FaFileMedical,
  FaBed,
  FaAmbulance,
  FaSyringe,
  FaFilter
} from 'react-icons/fa';
import './GenerateReports.css';
import LoginBackground from './LoginBackground.jpg';

const GenerateReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  const [formData, setFormData] = useState({
    reportType: '',
    department: '',
    doctorID: '',
    startDate: '',
    endDate: ''
  });

  // ============================================
  // REPORT TYPES
  // ============================================
  const reportTypes = [
    { value: 'Appointment Report', icon: FaCalendarAlt, color: '#3b82f6' },
    { value: 'Patient Report', icon: FaUsers, color: '#10b981' },
    { value: 'Revenue Report', icon: FaMoneyBillWave, color: '#f59e0b' },
    { value: 'Prescription Report', icon: FaPills, color: '#ef4444' },
    { value: 'Doctor Performance Report', icon: FaUserMd, color: '#8b5cf6' },
    { value: 'Department Report', icon: FaHospital, color: '#06b6d4' },
    { value: 'Bed Occupancy Report', icon: FaBed, color: '#ec4899' },
    { value: 'Emergency Report', icon: FaAmbulance, color: '#dc2626' }
  ];

  const departments = [
    'Cardiology', 'Pediatrics', 'Orthopedics', 'Neurology',
    'Dermatology', 'Emergency', 'General Medicine',
    'Radiology', 'Pathology', 'Psychiatry'
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  // ============================================
  // FETCH ALL DATA FOR STATS
  // ============================================
  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [reportsRes, doctorsRes, patientsRes, appointmentsRes, prescriptionsRes] = await Promise.all([
        api.get('/Report').catch(() => ({ data: [] })),
        api.get('/Doctor').catch(() => ({ data: [] })),
        api.get('/Patient').catch(() => ({ data: [] })),
        api.get('/Appointment').catch(() => ({ data: [] })),
        api.get('/Prescription').catch(() => ({ data: [] }))
      ]);

      setReports(reportsRes.data || []);
      setDoctors(doctorsRes.data || []);
      setPatients(patientsRes.data || []);
      setAppointments(appointmentsRes.data || []);
      setPrescriptions(prescriptionsRes.data || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const response = await api.post('/Report/generate', formData);
      toast.success('Report generated successfully!');
      setReports([response.data, ...reports]);
      setFormData({
        reportType: '',
        department: '',
        doctorID: '',
        startDate: '',
        endDate: ''
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error.response?.data || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const response = await api.get(`/Report/${id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded!');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const handleGoBack = () => navigate('/dashboard');

  // ============================================
  // HOSPITAL STATS (Hardcoded for realism)
  // ============================================
  const hospitalStats = [
    {
      label: 'Bed Occupancy',
      value: '84.6%',
      detail: '320/378 beds',
      icon: FaBed,
      color: '#3b82f6'
    },
    {
      label: 'Avg Wait Time',
      value: '14.2 min',
      detail: 'Target: <15 min',
      icon: FaClock,
      color: '#10b981'
    },
    {
      label: 'Patient Satisfaction',
      value: '94.7%',
      detail: '1,247 reviews',
      icon: FaHeartbeat,
      color: '#ef4444'
    },
    {
      label: 'Monthly Revenue',
      value: 'R12.8M',
      detail: '4.2% above target',
      icon: FaMoneyBillWave,
      color: '#f59e0b'
    },
    {
      label: 'Emergency Cases',
      value: '42',
      detail: 'Last 24 hours',
      icon: FaAmbulance,
      color: '#dc2626'
    },
    {
      label: 'Surgeries Today',
      value: '18',
      detail: '12 scheduled, 6 emergency',
      icon: FaSyringe,
      color: '#8b5cf6'
    }
  ];

  // ============================================
  // DATABASE STATS (Live from API)
  // ============================================
  const databaseStats = [
    {
      label: 'Total Patients',
      value: patients.length,
      icon: FaUsers,
      color: '#0d9488'
    },
    {
      label: 'Active Doctors',
      value: doctors.length,
      icon: FaUserMd,
      color: '#3b82f6'
    },
    {
      label: 'Total Appointments',
      value: appointments.length,
      icon: FaCalendarAlt,
      color: '#8b5cf6'
    },
    {
      label: 'Prescriptions Issued',
      value: prescriptions.length,
      icon: FaPills,
      color: '#ef4444'
    },
    {
      label: 'Scheduled',
      value: appointments.filter(a => a.status === 'Scheduled').length,
      icon: FaCheckCircle,
      color: '#10b981'
    },
    {
      label: 'Completed',
      value: appointments.filter(a => a.status === 'Completed').length,
      icon: FaCheckCircle,
      color: '#059669'
    }
  ];

  if (loading) {
    return (
      <div className="reports-loading">
        <div className="loading-spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="generate-reports-container" style={{ backgroundImage: `url(${LoginBackground})` }}>
      <div className="reports-overlay">

        {/* Header */}
        <div className="reports-header">
          <div className="header-left">
            <button className="back-btn" onClick={handleGoBack}>
              <FaArrowLeft /> Back to Dashboard
            </button>
            <div className="header-title">
              <h2><FaChartLine className="header-icon" /> Generate Reports</h2>
              <p>Analyze hospital performance and generate detailed reports</p>
            </div>
          </div>
        </div>

        {/* ============================================
            SECTION 1: HOSPITAL STATS (Hardcoded for realism)
            ============================================ */}
        <section className="stats-section">
          <div className="section-title">
            <FaHospital className="section-icon" />
            <h3>Hospital Performance Overview</h3>
          </div>
          <div className="hospital-stats-grid">
            {hospitalStats.map((stat, index) => (
              <div key={index} className="hospital-stat-card">
                <div className="stat-icon-wrap" style={{ background: stat.color + '20', color: stat.color }}>
                  <stat.icon />
                </div>
                <div className="stat-content">
                  <span className="stat-number">{stat.value}</span>
                  <span className="stat-label">{stat.label}</span>
                  <span className="stat-detail">{stat.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================
            SECTION 2: DATABASE STATS (Live)
            ============================================ */}
        <section className="stats-section">
          <div className="section-title">
            <FaFileMedical className="section-icon" />
            <h3>Live Database Statistics</h3>
          </div>
          <div className="database-stats-grid">
            {databaseStats.map((stat, index) => (
              <div key={index} className="database-stat-card">
                <div className="db-stat-icon" style={{ background: stat.color + '20', color: stat.color }}>
                  <stat.icon />
                </div>
                <div className="db-stat-content">
                  <span className="db-stat-value">{stat.value}</span>
                  <span className="db-stat-label">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================
            SECTION 3: REPORT GENERATOR FORM
            ============================================ */}
        <section className="report-form-section">
          <div className="section-title">
            <FaFileAlt className="section-icon" />
            <h3>Generate New Report</h3>
          </div>

          <form onSubmit={handleSubmit} className="report-form">
            {/* Report Type Selection */}
            <div className="form-group full-width">
              <label><FaFilter className="label-icon" /> Report Type *</label>
              <div className="report-type-grid">
                {reportTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      className={`report-type-btn ${formData.reportType === type.value ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, reportType: type.value })}
                      style={{ 
                        borderColor: formData.reportType === type.value ? type.color : 'transparent',
                        background: formData.reportType === type.value ? type.color + '15' : 'rgba(255,255,255,0.04)'
                      }}
                    >
                      <Icon style={{ color: type.color }} />
                      <span>{type.value.replace(' Report', '')}</span>
                    </button>
                  );
                })}
              </div>
              {/* Hidden select for form validation */}
              <select
                name="reportType"
                value={formData.reportType}
                onChange={handleChange}
                required
                style={{ display: 'none' }}
              >
                <option value="">Select</option>
                {reportTypes.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><FaHospital className="label-icon" /> Department</label>
                <select name="department" value={formData.department} onChange={handleChange}>
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label><FaUserMd className="label-icon" /> Doctor</label>
                <select name="doctorID" value={formData.doctorID} onChange={handleChange}>
                  <option value="">All Doctors</option>
                  {doctors.map(doctor => (
                    <option key={doctor.doctorID} value={doctor.doctorID}>
                      {doctor.name} - {doctor.specialization}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><FaCalendarAlt className="label-icon" /> Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label><FaCalendarAlt className="label-icon" /> End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="generate-btn" 
              disabled={generating || !formData.reportType}
            >
              {generating ? (
                <><span className="spinner"></span> Generating...</>
              ) : (
                <><FaChartLine /> Generate Report</>
              )}
            </button>
          </form>
        </section>

        {/* ============================================
            SECTION 4: RECENT REPORTS
            ============================================ */}
        <section className="reports-list-section">
          <div className="section-title">
            <FaClipboardList className="section-icon" />
            <h3>Recent Reports</h3>
          </div>

          {reports.length === 0 ? (
            <div className="no-reports">
              <FaFileAlt className="no-icon" />
              <p>No reports generated yet</p>
              <span>Generate your first report above</span>
            </div>
          ) : (
            <div className="reports-grid">
              {reports.map((report) => (
                <div key={report.reportID} className="report-card">
                  <div className="report-card-header">
                    <div className="report-type-badge">
                      <FaFileAlt />
                      {report.type || 'Report'}
                    </div>
                    <span className="report-date">
                      {new Date(report.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="report-card-body">
                    <h4>{report.type || 'Hospital Report'}</h4>
                    <p className="report-generated-by">
                      <strong>Generated by:</strong> {report.admin?.name || 'Admin'}
                    </p>
                    <p className="report-time">
                      <strong>Time:</strong> {new Date(report.generatedAt).toLocaleString()}
                    </p>
                    {report.summary && (
                      <p className="report-summary">
                        <strong>Summary:</strong> {report.summary.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                  <div className="report-card-footer">
                    <button 
                      className="download-btn"
                      onClick={() => handleDownload(report.reportID)}
                    >
                      <FaDownload /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default GenerateReports;