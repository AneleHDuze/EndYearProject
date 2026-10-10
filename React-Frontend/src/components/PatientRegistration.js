import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaUserMd,
  FaIdCard,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaVenusMars,
  FaNotesMedical
} from 'react-icons/fa';
import './PatientRegistration.css';
import LoginBackground from './LoginBackground.jpg';

const PatientRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    idNumber: '',
    contact: '',
    gender: '',
    dateOfBirth: '',
    email: '',
    medicalHistory: ''
  });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const genderOptions = ['Male', 'Female', 'Other'];

  // ============================================
  // Validate email format
  // ============================================
  const isValidEmail = (email) => {
    if (!email || email.trim() === '') return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // ============================================
  // Validate SA phone number format
  // Accepted: 10 digits starting with 0
  // ============================================
  const isValidPhone = (phone) => {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, '');
    return /^0\d{9}$/.test(digits);
  };

  // ============================================
  // Auto-generate Date of Birth from SA ID number
  // Format: YYMMDDSSSSSCCZ
  // Century rule: YY 00-25 -> 2000s, YY 26-99 -> 1900s
  // ============================================
  const parseDateOfBirthFromId = (idNumber) => {
    if (!idNumber || idNumber.length !== 13) return '';

    const yy = parseInt(idNumber.substring(0, 2), 10);
    const mm = parseInt(idNumber.substring(2, 4), 10);
    const dd = parseInt(idNumber.substring(4, 6), 10);

    if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return '';
    if (mm < 1 || mm > 12) return '';
    if (dd < 1 || dd > 31) return '';

    const year = yy <= 25 ? 2000 + yy : 1900 + yy;

    const testDate = new Date(year, mm - 1, dd);
    if (
      testDate.getFullYear() !== year ||
      testDate.getMonth() !== mm - 1 ||
      testDate.getDate() !== dd
    ) {
      return '';
    }

    const mmStr = String(mm).padStart(2, '0');
    const ddStr = String(dd).padStart(2, '0');
    return `${year}-${mmStr}-${ddStr}`;
  };

  // ============================================
  // Handle field changes with real-time validation
  // ============================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Clear any previous error for this field
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }

    // ID Number: digits only, max 13, auto-generate DOB
    if (name === 'idNumber') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 13) {
        const generatedDob = parseDateOfBirthFromId(numericValue);
        setFormData(prev => ({
          ...prev,
          idNumber: numericValue,
          dateOfBirth: generatedDob || prev.dateOfBirth
        }));
      }
      return;
    }

    // Contact: digits only, max 10, must start with 0
    if (name === 'contact') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 10) {
        const newErrors = { ...fieldErrors };

        if (numericValue.length > 0 && !numericValue.startsWith('0')) {
          newErrors.contact = 'Phone number must start with 0';
        } else if (numericValue.length === 10 && !isValidPhone(numericValue)) {
          newErrors.contact = 'Enter a valid 10-digit South African number';
        } else {
          delete newErrors.contact;
        }

        setFieldErrors(newErrors);
        setFormData(prev => ({ ...prev, contact: numericValue }));
      }
      return;
    }

    // Email: format check
    if (name === 'email') {
      setFormData(prev => ({ ...prev, email: value }));

      if (value.trim() !== '' && !isValidEmail(value)) {
        setFieldErrors(prev => ({
          ...prev,
          email: 'Please enter a valid email address (e.g., name@example.com)'
        }));
      } else {
        setFieldErrors(prev => {
          const { email, ...rest } = prev;
          return rest;
        });
      }
      return;
    }

    // All other fields
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenderSelect = (gender) => {
    setFormData(prev => ({ ...prev, gender }));
    if (fieldErrors.gender) {
      setFieldErrors(prev => ({ ...prev, gender: null }));
    }
  };

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  // ============================================
  // Submit with full validation
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Please enter patient name';
    }

    if (!formData.idNumber.trim()) {
      errors.idNumber = 'Please enter ID number';
    } else if (formData.idNumber.length !== 13) {
      errors.idNumber = 'ID number must be exactly 13 digits';
    }

    if (!formData.contact.trim()) {
      errors.contact = 'Please enter contact number';
    } else if (formData.contact.length !== 10) {
      errors.contact = 'Contact number must be exactly 10 digits';
    } else if (!formData.contact.startsWith('0')) {
      errors.contact = 'Contact number must start with 0';
    } else if (!isValidPhone(formData.contact)) {
      errors.contact = 'Enter a valid South African phone number';
    }

    if (formData.email.trim() !== '' && !isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address (e.g., name@example.com)';
    }

    if (!formData.gender) {
      errors.gender = 'Please select gender';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    setLoading(true);

    try {
      const patientData = {
        name: formData.name.trim(),
        idNumber: formData.idNumber.trim(),
        contact: formData.contact.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || null,
        email: formData.email.trim() || null,
        medicalHistory: formData.medicalHistory.trim() || null
      };

      console.log('Registering patient:', patientData);
      await api.post('Patient/register/', patientData);

      toast.success('Patient registered successfully!');

      setFormData({
        name: '',
        idNumber: '',
        contact: '',
        gender: '',
        dateOfBirth: '',
        email: '',
        medicalHistory: ''
      });
      setFieldErrors({});
    } catch (error) {
      console.error('Registration error:', error);
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 409 && data?.field) {
        setFieldErrors({ [data.field]: data.message });
        toast.error(data.message);
      } else if (typeof data === 'string') {
        toast.error(data);
      } else if (data?.message) {
        toast.error(data.message);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container" style={{ backgroundImage: `url(${LoginBackground})` }}>
      <div className="registration-overlay">
        <div className="registration-card">
          <div className="registration-header">
            <button className="back-btn" onClick={handleGoBack}>
              <FaArrowLeft />
              Back to Dashboard
            </button>
            <div className="header-title">
              <h2>
                <FaUserMd className="header-icon" />
                Patient Registration
              </h2>
              <p>Register a new patient in the system</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group">
              <label>
                <FaUserMd className="label-icon" />
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter patient's full name"
                required
                className={fieldErrors.name ? 'input-error' : ''}
              />
              {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            </div>

            {/* ID Number */}
            <div className="form-group">
              <label>
                <FaIdCard className="label-icon" />
                ID Number * (13 digits)
              </label>
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                placeholder="Enter 13-digit ID number"
                maxLength={13}
                required
                className={fieldErrors.idNumber ? 'input-error' : ''}
              />
              <small className="field-hint">
                {formData.idNumber.length}/13 digits
              </small>
              {fieldErrors.idNumber && <span className="field-error">{fieldErrors.idNumber}</span>}
            </div>

            {/* Contact */}
            <div className="form-group">
              <label>
                <FaPhone className="label-icon" />
                Contact Number * (10 digits, starts with 0)
              </label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                placeholder="e.g. 0721234567"
                maxLength={10}
                required
                className={fieldErrors.contact ? 'input-error' : ''}
              />
              <small className="field-hint">
                {formData.contact.length}/10 digits
              </small>
              {fieldErrors.contact && <span className="field-error">{fieldErrors.contact}</span>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label>
                <FaEnvelope className="label-icon" />
                Email
              </label>
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. patient@example.com"
                className={fieldErrors.email ? 'input-error' : ''}
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            {/* Gender */}
            <div className="form-group">
              <label>
                <FaVenusMars className="label-icon" />
                Gender *
              </label>
              <div className="gender-buttons">
                {genderOptions.map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    className={`gender-btn ${formData.gender === gender ? 'selected' : ''}`}
                    onClick={() => handleGenderSelect(gender)}
                  >
                    {gender}
                  </button>
                ))}
              </div>
              {fieldErrors.gender && <span className="field-error">{fieldErrors.gender}</span>}
            </div>

            {/* Date of Birth */}
            <div className="form-group">
              <label>
                <FaCalendarAlt className="label-icon" />
                Date of Birth
                <span className="label-note"> </span>
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                readOnly
              />
            </div>

            {/* Medical History */}
            <div className="form-group">
              <label>
                <FaNotesMedical className="label-icon" />
                Medical History
              </label>
              <textarea
                name="medicalHistory"
                value={formData.medicalHistory}
                onChange={handleChange}
                rows="2"
                placeholder="Enter any medical history "
              />
            </div>

            <div className="button-group">
              <button type="button" className="cancel-btn" onClick={handleGoBack}>
                Cancel
              </button>
              <button type="submit" className="register-btn" disabled={loading}>
                {loading ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <FaUserMd />
                    Register Patient
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

export default PatientRegistration;