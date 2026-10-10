import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaSave,
  FaUserMd,
  FaCalendarDay,
  FaClock,
  FaStethoscope,
  FaNotesMedical,
  FaClipboardList,
  FaFileMedical
} from 'react-icons/fa';
import './NewConsultation.css';
import LoginBackground from './LoginBackground.jpg';

const NewConsultation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get('appointmentId');

  const [formData, setFormData] = useState({
    diagnosis: '',
    treatment: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentDetails();
    } else {
      navigate('/schedule-consultation');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      const response = await api.get(`/Appointment/${appointmentId}`);
      setAppointment(response.data);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast.error('Failed to fetch appointment details');
      navigate('/schedule-consultation');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // ============================================
  // SUBMIT: Save medical record
  // The backend automatically marks the appointment as Completed
  // in the same transaction, so no extra API call is needed.
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Guard against double-submit
    setLoading(true);

    try {
      const userData = JSON.parse(localStorage.getItem('userData'));
      const appId = parseInt(appointmentId);

      const consultationData = {
        patientID: appointment?.patientID,
        doctorID: userData?.userId,
        appointmentID: appId,
        diagnosis: formData.diagnosis,
        treatment: formData.treatment,
        visitDate: new Date().toISOString()
      };

      console.log('========================================');
      console.log('SAVING CONSULTATION');
      console.log('Appointment ID:', appId);
      console.log('Data:', consultationData);
      console.log('========================================');

      // The backend creates the medical record AND updates
      // appointment.status = "Completed" in one transaction.
      await api.post('/MedicalRecord', consultationData);

      console.log('Medical record created — appointment auto-marked Completed');

      toast.success('Consultation completed successfully!');
      navigate('/schedule-consultation');
    } catch (error) {
      console.error('Error saving consultation:', error);
      console.error('Error details:', error.response?.data);

      if (error.response?.status === 409) {
        // Appointment already has a medical record
        toast.warning(
          'This appointment has already been completed. Returning to your schedule...',
          { autoClose: 3000 }
        );
        setTimeout(() => navigate('/schedule-consultation'), 2000);
      } else if (error.response?.status === 400) {
        const msg = error.response?.data?.message || error.response?.data;
        toast.error(typeof msg === 'string' ? msg : 'Invalid consultation data');
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to create consultations.');
      } else {
        const msg =
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Failed to save consultation';
        toast.error(typeof msg === 'string' ? msg : 'Failed to save consultation');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/schedule-consultation');
  };

  if (fetching) {
    return (
      <div className="consultation-loading">
        <div className="loading-spinner"></div>
        <p>Loading appointment details...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="consultation-loading">
        <div className="loading-spinner"></div>
        <p>Appointment not found</p>
        <button className="back-btn" onClick={handleGoBack}>Go Back</button>
      </div>
    );
  }

  return (
    <div
      className="new-consultation-container"
      style={{ backgroundImage: `url(${LoginBackground})` }}
    >
      <div className="consultation-overlay">
        <div className="consultation-card">
          {/* Header */}
          <div className="consultation-header">
            <button className="back-btn" onClick={handleGoBack}>
              <FaArrowLeft />
              Back to Schedule
            </button>
            <div className="header-title">
              <h2>
                <FaStethoscope className="header-icon" />
                New Consultation
              </h2>
              <p>Record diagnosis and treatment for patient</p>
            </div>
          </div>

          {/* Appointment Summary */}
          <div className="appointment-summary">
            <div className="summary-header">
              <h3>
                <FaClipboardList className="section-icon" />
                Appointment Details
              </h3>
            </div>
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-icon patient-icon">
                  <FaUserMd />
                </div>
                <div className="summary-content">
                  <span className="summary-label">Patient</span>
                  <span className="summary-value">
                    {appointment.patient?.name || 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-icon date-icon">
                  <FaCalendarDay />
                </div>
                <div className="summary-content">
                  <span className="summary-label">Date</span>
                  <span className="summary-value">
                    {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-icon time-icon">
                  <FaClock />
                </div>
                <div className="summary-content">
                  <span className="summary-label">Time</span>
                  <span className="summary-value">{appointment.appointmentTime}</span>
                </div>
              </div>
              <div className="summary-item summary-full">
                <div className="summary-icon reason-icon">
                  <FaNotesMedical />
                </div>
                <div className="summary-content">
                  <span className="summary-label">Reason</span>
                  <span className="summary-value">
                    {appointment.reason || 'No reason provided'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Consultation Form */}
          <form onSubmit={handleSubmit} className="consultation-form">
            <div className="form-section">
              <div className="form-section-header">
                <FaFileMedical className="section-icon" />
                <h4>Consultation Notes</h4>
              </div>

              <div className="form-group">
                <label>Diagnosis *</label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleChange}
                  rows="3"
                  required
                  placeholder="Enter diagnosis details..."
                />
              </div>

              <div className="form-group">
                <label>Treatment Plan *</label>
                <textarea
                  name="treatment"
                  value={formData.treatment}
                  onChange={handleChange}
                  rows="3"
                  required
                  placeholder="Enter treatment plan..."
                />
              </div>

              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>

            <div className="button-group">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleGoBack}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <FaSave />
                    Complete Consultation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewConsultation;