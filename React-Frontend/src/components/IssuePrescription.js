import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import { 
  FaArrowLeft, 
  FaUserMd, 
  FaSearch,
  FaPrescription,
  FaFileMedical,
  FaPrint,
  FaSave,
  FaPlus,
  FaHistory,
  FaCalendarDay,
  FaPills,
  FaTrash
} from 'react-icons/fa';
import './IssuePrescription.css';
import LoginBackground from './LoginBackground.jpg';

const IssuePrescription = () => {
  const navigate = useNavigate();
  
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeLetter, setActiveLetter] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [medications, setMedications] = useState([
    { medication: '', dosage: '', duration: '', instructions: '' }
  ]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/Patient');
      setPatients(response.data);
      setFilteredPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  const filterByLetter = (letter) => {
    setActiveLetter(letter);
    const filtered = patients.filter(p => {
      const name = p.name || '';
      const parts = name.trim().split(' ');
      const first = parts[0] || '';
      const last = parts[parts.length - 1] || '';
      return first.toUpperCase().startsWith(letter) || last.toUpperCase().startsWith(letter);
    });
    setFilteredPatients(filtered);
    setSearchTerm('');
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    setActiveLetter(null);
    if (term === '') {
      setFilteredPatients(patients);
    } else {
      setFilteredPatients(
        patients.filter(p =>
          p.name?.toLowerCase().includes(term) || p.idNumber?.includes(term)
        )
      );
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setActiveLetter(null);
    setFilteredPatients(patients);
  };

  const selectPatient = async (patient) => {
    setSelectedPatient(patient);
    await fetchPatientPrescriptions(patient.patientID);
    setShowHistory(true);
  };

  const fetchPatientPrescriptions = async (patientId) => {
    try {
      const response = await api.get(`/Prescription/patient/${patientId}`);
      setPrescriptions(response.data);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setPrescriptions([]);
    }
  };

  const handleBackToSearch = () => {
    setSelectedPatient(null);
    setShowHistory(false);
    setPrescriptions([]);
    setMedications([{ medication: '', dosage: '', duration: '', instructions: '' }]);
  };

  const handlePrint = () => window.print();

  const addMedication = () => {
    setMedications([
      ...medications,
      { medication: '', dosage: '', duration: '', instructions: '' }
    ]);
  };

  const removeMedication = (index) => {
    if (medications.length === 1) {
      toast.info('At least one medication is required');
      return;
    }
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSubmitPrescription = async (e) => {
    e.preventDefault();

    for (let i = 0; i < medications.length; i++) {
      const m = medications[i];
      if (!m.medication.trim()) {
        toast.error(`Row ${i + 1}: please enter medication name`);
        return;
      }
      if (!m.dosage.trim()) {
        toast.error(`Row ${i + 1}: please enter dosage`);
        return;
      }
      if (!m.duration.trim()) {
        toast.error(`Row ${i + 1}: please enter duration`);
        return;
      }
    }

    setSubmitting(true);

    try {
      console.log('========================================');
      console.log('Starting Batch Prescription Creation');
      console.log('========================================');
      console.log(`Patient: ${selectedPatient.name} (ID: ${selectedPatient.patientID})`);

      const mrResponse = await api.get(`/MedicalRecord/patient/${selectedPatient.patientID}`);
      const records = mrResponse.data;

      if (!records || records.length === 0) {
        toast.error('No medical record found. Please create a consultation first.');
        setSubmitting(false);
        return;
      }

      const recordId = records[0].recordID;
      console.log(`Using record ID: ${recordId}`);

      const payload = medications.map(m => ({
        recordID: recordId,
        medication: m.medication.trim(),
        dosage: m.dosage.trim(),
        duration: m.duration.trim(),
        instructions: m.instructions?.trim() || null
      }));

      console.log(`Sending ${payload.length} prescriptions`);

      const response = await api.post('/Prescription/batch', payload);
      console.log('Batch response:', response.data);

      toast.success(`${payload.length} medication(s) prescribed successfully!`);

      await fetchPatientPrescriptions(selectedPatient.patientID);
      setMedications([{ medication: '', dosage: '', duration: '', instructions: '' }]);

    } catch (error) {
      console.error('Error:', error);
      const msg = error.response?.data?.error ||
                  error.response?.data ||
                  'Failed to issue prescription';
      toast.error(typeof msg === 'string' ? msg : 'Failed to issue prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoBack = () => navigate('/dashboard');

  const getInitials = (name) => {
    if (!name) return 'P';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  if (loading) {
    return (
      <div className="prescription-loading">
        <div className="loading-spinner"></div>
        <p>Loading patients...</p>
      </div>
    );
  }

  if (showHistory && selectedPatient) {
    return (
      <div className="issue-prescription-container" style={{ backgroundImage: `url(${LoginBackground})` }}>
        <div className="prescription-overlay">
          <div className="prescription-card full-width">
            <div className="prescription-header">
              <button className="back-btn" onClick={handleBackToSearch}>
                <FaArrowLeft /> Back to Patients
              </button>
              <div className="header-title">
                <h2>
                  <FaPrescription className="header-icon" />
                  Prescriptions for {selectedPatient.name}
                </h2>
                <p>ID: {selectedPatient.idNumber} | {selectedPatient.contact}</p>
              </div>
              <div className="header-actions">
                <button className="print-btn" onClick={handlePrint}>
                  <FaPrint /> Print
                </button>
              </div>
            </div>

            <div className="prescription-history">
              <div className="history-header">
                <h3>
                  <FaHistory className="section-icon" />
                  Prescription History
                </h3>
                <span className="history-count">{prescriptions.length} prescriptions</span>
              </div>
              
              {prescriptions.length === 0 ? (
                <div className="no-prescriptions">
                  <FaFileMedical className="no-icon" />
                  <p>No previous prescriptions found for this patient.</p>
                </div>
              ) : (
                <div className="prescriptions-list">
                  {prescriptions.map((p, index) => (
                    <div key={p.prescriptionID || index} className="prescription-item">
                      <div className="prescription-item-header">
                        <span className="prescription-date">
                          <FaCalendarDay />
                          {new Date(p.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                        <span className="prescription-status">Active</span>
                      </div>
                      <div className="prescription-item-body">
                        <div className="medication-info">
                          <FaPills className="medication-icon" />
                          <span className="medication-name">{p.medication}</span>
                          <span className="medication-dosage">{p.dosage}</span>
                        </div>
                        <p className="duration-text">Duration: {p.duration}</p>
                        {p.instructions && (
                          <p className="instructions-text">{p.instructions}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ============================================
                NEW PRESCRIPTION FORM — LABELED INPUTS
                ============================================ */}
            <div className="new-prescription-section">
              <div className="section-header">
                <h4>
                  <FaPlus className="section-icon" />
                  Issue New Prescription
                </h4>
                <span style={{ fontSize: '0.9rem', color: '#666' }}>
                  {medications.length} medication{medications.length > 1 ? 's' : ''}
                </span>
              </div>

              <form onSubmit={handleSubmitPrescription} className="prescription-form">
                {medications.map((med, index) => (
                  <div key={index} className="medication-card">
                    <div className="medication-card-header">
                      <strong>Medication #{index + 1}</strong>
                      {medications.length > 1 && (
                        <button
                          type="button"
                          className="remove-med-btn"
                          onClick={() => removeMedication(index)}
                        >
                          <FaTrash /> Remove
                        </button>
                      )}
                    </div>

                    {/* Row 1: Medication + Dosage */}
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor={`medication-${index}`} className="input-label">
                          Medication <span className="required-star">*</span>
                        </label>
                        <input
                          id={`medication-${index}`}
                          type="text"
                          value={med.medication}
                          onChange={(e) => updateMedication(index, 'medication', e.target.value)}
                          placeholder="e.g., Amoxicillin 500mg"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`dosage-${index}`} className="input-label">
                          Dosage <span className="required-star">*</span>
                        </label>
                        <input
                          id={`dosage-${index}`}
                          type="text"
                          value={med.dosage}
                          onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                          placeholder="e.g., 3 times daily"
                          required
                        />
                      </div>
                    </div>

                    {/* Row 2: Duration + Instructions */}
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor={`duration-${index}`} className="input-label">
                          Duration <span className="required-star">*</span>
                        </label>
                        <input
                          id={`duration-${index}`}
                          type="text"
                          value={med.duration}
                          onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                          placeholder="e.g., 7 days"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`instructions-${index}`} className="input-label">
                          Instructions
                        </label>
                        <input
                          id={`instructions-${index}`}
                          type="text"
                          value={med.instructions}
                          onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                          placeholder="e.g., Take with food"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="button-group">
                  <button
                    type="button"
                    onClick={addMedication}
                    className="print-btn-form"
                    style={{ background: '#fff', color: '#1E88E5', border: '1px solid #1E88E5' }}
                  >
                    <FaPlus /> Add Medication
                  </button>

                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="spinner"></span>
                    ) : (
                      <>
                        <FaSave /> Save {medications.length} Medication{medications.length > 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="issue-prescription-container" style={{ backgroundImage: `url(${LoginBackground})` }}>
      <div className="prescription-overlay">
        <div className="prescription-card full-width">
          <div className="prescription-header">
            <button className="back-btn" onClick={handleGoBack}>
              <FaArrowLeft /> Back to Dashboard
            </button>
            <div className="header-title">
              <h2>
                <FaPrescription className="header-icon" />
                Issue Prescription
              </h2>
              <p>Select a patient by name or ID number</p>
            </div>
          </div>

          <div className="search-section">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by name or ID number..."
                value={searchTerm}
                onChange={handleSearch}
              />
              {searchTerm && (
                <button className="clear-search" onClick={clearSearch}>X</button>
              )}
            </div>
            <div className="search-hint">
              <span>Showing: {filteredPatients.length} patients</span>
              {activeLetter && <span>Filtered by: <strong>{activeLetter}</strong></span>}
            </div>
          </div>

          <div className="alphabet-nav">
            <span className="alphabet-label">Search by First or Last Name:</span>
            {alphabet.map((letter) => (
              <button
                key={letter}
                className={`alphabet-btn ${activeLetter === letter ? 'active' : ''}`}
                onClick={() => filterByLetter(letter)}
              >
                {letter}
              </button>
            ))}
            <button className="alphabet-btn all-btn" onClick={clearSearch}>All</button>
          </div>

          <div className="patients-list">
            {filteredPatients.length === 0 ? (
              <div className="no-patients">
                <FaUserMd className="no-icon" />
                <p>No patients found</p>
                <span>Try a different letter or search term</span>
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <div
                  key={patient.patientID}
                  className="patient-item"
                  onClick={() => selectPatient(patient)}
                >
                  <div className="patient-avatar">{getInitials(patient.name)}</div>
                  <div className="patient-info">
                    <h4>{patient.name}</h4>
                    <div className="patient-details">
                      <span className="patient-id">ID: {patient.idNumber}</span>
                      <span className="patient-contact">{patient.contact}</span>
                    </div>
                  </div>
                  <div className="patient-arrow">→</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssuePrescription;