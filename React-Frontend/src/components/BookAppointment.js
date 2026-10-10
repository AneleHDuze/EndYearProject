import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaUserMd,
  FaStethoscope,
  FaCalendarAlt,
  FaClock,
  FaNotesMedical,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';
import './BookAppointment.css';
import LoginBackground from './LoginBackground.jpg';

const BookAppointment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [isReschedule, setIsReschedule] = useState(false);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState(null);

  const [formData, setFormData] = useState({
    patientID: '',
    doctorID: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: ''
  });

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (location.state?.reschedule) {
      const { appointmentId, patientID, doctorID, appointmentDate, appointmentTime, reason } = location.state;
      setIsReschedule(true);
      setRescheduleAppointmentId(appointmentId);
      setFormData({
        patientID: patientID || '',
        doctorID: doctorID || '',
        appointmentDate: appointmentDate || '',
        appointmentTime: appointmentTime || '',
        reason: reason || ''
      });
      setSelectedTime(appointmentTime || '');
    }
  }, [location.state]);

  useEffect(() => {
    if (formData.doctorID && formData.appointmentDate) {
      checkAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.doctorID, formData.appointmentDate]);

  const fetchPatients = async () => {
    try {
      const response = await api.get('/Patient');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to fetch patients');
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/Doctor');
      setDoctors(response.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to fetch doctors');
    }
  };

  // ============================================
  // Normalize date to YYYY-MM-DD
  // ============================================
  const normalizeDate = (d) => {
    if (!d) return '';
    return String(d).substring(0, 10);
  };

  // ============================================
  // Normalize time to HH:mm:ss
  // ============================================
  const normalizeTime = (t) => {
    if (!t) return '';
    const cleanTime = String(t).split('.')[0];
    const parts = cleanTime.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${(parts[2] || '00').padStart(2, '0')}`;
  };

  // ============================================
  // Check which slots are already booked
  // ============================================
  const checkAvailability = async () => {
    if (!formData.doctorID || !formData.appointmentDate) return;

    setCheckingAvailability(true);
    try {
      const response = await api.get(`/Appointment/doctor/${formData.doctorID}`);
      const appointments = response.data;

      const targetDate = normalizeDate(formData.appointmentDate);

      const matching = appointments.filter(a => {
        const apptDate = normalizeDate(a.appointmentDate);
        return apptDate === targetDate && a.status !== 'Cancelled';
      });

      let slots = matching.map(a => normalizeTime(a.appointmentTime));

      if (isReschedule && rescheduleAppointmentId) {
        const current = appointments.find(a => a.appointmentID === rescheduleAppointmentId);
        if (current) {
          const currentTime = normalizeTime(current.appointmentTime);
          slots = slots.filter(t => t !== currentTime);
        }
      }

      setBookedSlots(slots);

      if (formData.appointmentTime && slots.includes(normalizeTime(formData.appointmentTime))) {
        setFormData(prev => ({ ...prev, appointmentTime: '' }));
        setSelectedTime('');
        toast.info('Your previously selected slot is now booked. Please pick another.');
      }
    } catch (error) {
      console.error('Error in checkAvailability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'appointmentDate' || name === 'doctorID') {
      setFormData({
        ...formData,
        [name]: value,
        appointmentTime: ''
      });
      setSelectedTime('');
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // ============================================
  // Is the slot booked?
  // ============================================
  const isTimeBooked = (time) => {
    return bookedSlots.includes(normalizeTime(time));
  };

  // ============================================
  // Is the slot in the past?
  //
  // Rules:
  //  - If no date is selected: don't block anything yet
  //  - If selected date is BEFORE today: block ALL slots
  //  - If selected date is AFTER today: block nothing
  //  - If selected date is TODAY: block slots earlier than the current time
  // ============================================
  const isTimePast = (time) => {
    // No date picked — do not block yet
    if (!formData.appointmentDate) return false;

    // Build today's date string using local time
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const selected = normalizeDate(formData.appointmentDate);

    // Selected date is in the past → block everything
    if (selected < todayStr) return true;

    // Selected date is in the future → block nothing
    if (selected > todayStr) return false;

    // Selected date is today → compare times
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    return normalizeTime(time) < nowTime;
  };

  // ============================================
  // Handle time slot click
  // ============================================
  const handleTimeSelect = (time) => {
    if (isTimePast(time)) {
      toast.error('This time has already passed. Please choose a later time.');
      return;
    }

    if (isTimeBooked(time)) {
      toast.error('This time slot is already booked. Please choose another time.');
      return;
    }

    if (selectedTime === time) {
      setSelectedTime('');
      setFormData({ ...formData, appointmentTime: '' });
      return;
    }

    setSelectedTime(time);
    setFormData({ ...formData, appointmentTime: time });
  };

  const handleGoBack = () => {
    if (isReschedule) {
      navigate('/manage-appointments');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.patientID) return toast.error('Please select a patient');
    if (!formData.doctorID) return toast.error('Please select a doctor');
    if (!formData.appointmentDate) return toast.error('Please select a date');
    if (!formData.appointmentTime) return toast.error('Please select a time');

    if (isTimePast(formData.appointmentTime)) {
      toast.error('This time has already passed. Please select a later time.');
      return;
    }

    if (isTimeBooked(formData.appointmentTime)) {
      toast.error('This time slot was just booked. Please select a different time.');
      return;
    }

    setLoading(true);

    try {
      if (isReschedule && rescheduleAppointmentId) {
        const rescheduleData = {
          newDate: formData.appointmentDate,
          newTime: formData.appointmentTime
        };
        await api.put(`/Appointment/reschedule/${rescheduleAppointmentId}`, rescheduleData);
        toast.success('Appointment rescheduled successfully!');
      } else {
        const appointmentData = {
          patientID: parseInt(formData.patientID),
          doctorID: parseInt(formData.doctorID),
          appointmentDate: formData.appointmentDate,
          appointmentTime: formData.appointmentTime,
          reason: formData.reason || null
        };
        await api.post('/Appointment/book', appointmentData);
        toast.success('Appointment booked successfully!');
      }

      setFormData({
        patientID: '',
        doctorID: '',
        appointmentDate: '',
        appointmentTime: '',
        reason: ''
      });
      setSelectedTime('');
      setBookedSlots([]);
      setIsReschedule(false);
      setRescheduleAppointmentId(null);
      navigate('/manage-appointments');
    } catch (error) {
      console.error('Booking error:', error);
      if (error.response?.status === 409) {
        toast.error('This time slot is already booked. Please select a different time.');
        checkAvailability();
      } else {
        toast.error(error.response?.data?.message || 'Booking failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 17 && minute > 0) continue;
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        const displayTime = `${hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
        slots.push({ value: time, display: displayTime });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div
      className="book-appointment-container"
      style={{ backgroundImage: `url(${LoginBackground})` }}
    >
      <div className="book-appointment-overlay">
        <div className="book-appointment-card">
          <div className="book-appointment-header">
            <button className="back-btn" onClick={handleGoBack}>
              <FaArrowLeft />
              {isReschedule ? 'Back to Manage Appointments' : 'Back to Dashboard'}
            </button>
            <div className="header-title">
              <h2>
                <FaCalendarAlt className="header-icon" />
                {isReschedule ? 'Reschedule Appointment' : 'Book Appointment'}
              </h2>
              <p>
                {isReschedule
                  ? 'Select a new time slot for this appointment'
                  : 'Schedule a new patient appointment'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>
                  <FaUserMd className="label-icon" /> Patient *
                </label>
                <select
                  name="patientID"
                  value={formData.patientID}
                  onChange={handleChange}
                  required
                  disabled={isReschedule}
                >
                  <option value="">Select Patient</option>
                  {patients.map((p) => (
                    <option key={p.patientID} value={p.patientID}>
                      {p.name} - {p.idNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  <FaStethoscope className="label-icon" /> Doctor *
                </label>
                <select
                  name="doctorID"
                  value={formData.doctorID}
                  onChange={handleChange}
                  required
                  disabled={isReschedule}
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((d) => (
                    <option key={d.doctorID} value={d.doctorID}>
                      {d.name} - {d.specialization}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  <FaCalendarAlt className="label-icon" /> Date *
                </label>
                <input
                  type="date"
                  name="appointmentDate"
                  value={formData.appointmentDate}
                  onChange={handleChange}
                  min={today}
                  required
                />
              </div>

              <div className="form-group time-selection">
                <label>
                  <FaClock className="label-icon" /> Select Time *
                </label>

                {!formData.doctorID || !formData.appointmentDate ? (
                  <div className="time-placeholder">
                    <FaClock className="placeholder-icon" />
                    <span>Please select a doctor and date first</span>
                  </div>
                ) : checkingAvailability ? (
                  <div className="time-loading">
                    <span className="loading-spinner-small"></span>
                    <span>Checking availability...</span>
                  </div>
                ) : (
                  <div className="time-grid">
                    {timeSlots.map((slot) => {
                      const booked = isTimeBooked(slot.value);
                      const past = isTimePast(slot.value);
                      const selected = selectedTime === slot.value;
                      const disabled = booked || past;

                      return (
                        <button
                          key={slot.value}
                          type="button"
                          className={`time-slot-btn ${booked ? 'booked' : ''} ${past ? 'past' : ''} ${selected ? 'selected' : ''}`}
                          onClick={() => handleTimeSelect(slot.value)}
                          disabled={disabled}
                          aria-disabled={disabled}
                          title={
                            booked
                              ? 'This time is already booked'
                              : past
                              ? 'This time has already passed'
                              : 'Available'
                          }
                        >
                          <span className="time-display">{slot.display}</span>

                          {booked ? (
                            <FaTimesCircle className="time-icon booked-icon" />
                          ) : past ? (
                            <FaClock className="time-icon past-icon" />
                          ) : selected ? (
                            <FaCheckCircle className="time-icon selected-icon" />
                          ) : (
                            <span className="time-available-dot"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {formData.doctorID && formData.appointmentDate && !checkingAvailability && (
                  <div
                    className={`availability-status ${
                      bookedSlots.length === 0
                        ? 'all-available'
                        : bookedSlots.length < 6
                        ? 'partial'
                        : 'most-booked'
                    }`}
                  >
                    <span className="status-text">
                      {bookedSlots.length === 0 ? (
                        <>All time slots available</>
                      ) : bookedSlots.length < 6 ? (
                        <>{bookedSlots.length} slots booked - Some time slots are taken</>
                      ) : (
                        <>{bookedSlots.length} slots booked - Most time slots are full</>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>
                <FaNotesMedical className="label-icon" /> Reason
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows="3"
                placeholder="Enter reason for appointment"
              />
            </div>

            <div className="button-group">
              <button type="button" className="cancel-btn" onClick={handleGoBack}>
                Cancel
              </button>
              <button
                type="submit"
                className="book-btn"
                disabled={loading || !formData.appointmentTime}
              >
                {loading ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <FaCalendarAlt />
                    {isReschedule ? 'Reschedule Appointment' : 'Book Appointment'}
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

export default BookAppointment;