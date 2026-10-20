import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  FaHome,
  FaUsers,
  FaUserMd,
  FaProcedures,
  FaBell,
  FaSearch,
  FaArrowUp,
  FaArrowDown,
  FaUserCircle,
  FaCog,
  FaSignOutAlt,
  FaHospital,
  FaUserPlus,
  FaUserEdit,
  FaUserSlash,
  FaFileInvoice,
  FaChartLine,
  FaClipboardList,
  FaCalendarCheck,
  FaMoneyBillWave,
  FaShieldAlt,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBan,
  FaStethoscope,
  FaPhone,
  FaEnvelope,
  FaIdCard,
  FaVenusMars,
  FaCalendarAlt,
  FaNotesMedical,
  FaLock
} from 'react-icons/fa';
import './AdminDashboard.css';
import LoginBackground from './LoginBackground.jpg';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    role: '',
    department: '',
    email: '',
    phone: '',
    status: 'Active',
    specialization: '',
    availability: 'Available',
    username: '',
    password: '',
    contact: '',
    adminContact: ''
  });

  // ============================================
  // CONSTANTS
  // ============================================
  const roleOptions = ['Doctor', 'Receptionist', 'Admin'];

  const departmentOptions = [
    'Cardiology',
    'Pediatrics',
    'Orthopedics',
    'Neurology',
    'Dermatology',
    'Emergency',
    'General Medicine',
    'Radiology',
    'Pathology',
    'Psychiatry',
    'Urology',
    'Oncology',
    'Front Desk',
    'Administration'
  ];

  const specializationOptions = [
    'Cardiology',
    'Pediatrics',
    'Orthopedics',
    'Neurology',
    'Dermatology',
    'Emergency Medicine',
    'Internal Medicine',
    'Radiology',
    'Pathology',
    'Psychiatry',
    'Urology',
    'Oncology',
    'General Surgery',
    'Family Medicine'
  ];

  const statusOptions = ['Active', 'On Leave', 'Inactive'];
  const availabilityOptions = ['Available', 'Busy', 'Off Duty', 'On Call'];

  // ============================================
  // VALIDATION HELPERS
  // ============================================
  const isValidName = (name) => {
    if (!name) return false;
    return /^[a-zA-Z\s.'-]{2,100}$/.test(name.trim());
  };

  const isValidEmail = (email) => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const isValidPhone = (phone) => {
    if (!phone) return false;
    return /^0\d{9}$/.test(phone);
  };

  const isValidUsername = (username) => {
    if (!username) return false;
    return /^[a-zA-Z0-9_]{3,50}$/.test(username);
  };

  const isValidPassword = (password) => {
    if (!password) return false;
    return password.length >= 6;
  };

  const isValidRole = (role) => {
    return ['Doctor', 'Receptionist', 'Admin'].includes(role);
  };

  const isValidDepartment = (department) => {
    return departmentOptions.includes(department);
  };

  // ============================================
  // STATS (display only)
  // ============================================
  const stats = [
    {
      label: 'Total Staff',
      value: '247',
      change: '+5.2%',
      trend: 'up',
      icon: FaUsers,
      color: '#3b82f6',
      detail: '42 doctors, 89 nurses, 116 support'
    },
    {
      label: 'Departments',
      value: '14',
      change: '0',
      trend: 'up',
      icon: FaHospital,
      color: '#0d9488',
      detail: '7 active, 2 under review'
    },
    {
      label: 'Monthly Revenue',
      value: 'R12.8M',
      change: '+8.3%',
      trend: 'up',
      icon: FaMoneyBillWave,
      color: '#f59e0b',
      detail: '4.2% above target'
    },
    {
      label: 'Total Patients',
      value: '8,432',
      change: '+14.7%',
      trend: 'up',
      icon: FaProcedures,
      color: '#8b5cf6',
      detail: '3,218 new this month'
    },
    {
      label: 'System Uptime',
      value: '99.97%',
      change: '+0.02%',
      trend: 'up',
      icon: FaShieldAlt,
      color: '#10b981',
      detail: 'Last 30 days'
    },
    {
      label: 'Active Licenses',
      value: '342',
      change: '+12',
      trend: 'up',
      icon: FaFileInvoice,
      color: '#ef4444',
      detail: '94% utilization'
    },
  ];

  // ============================================
  // EMPLOYEES DATA (display-only preview)
  // ============================================
  const [employees, setEmployees] = useState([
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      role: 'Doctor',
      department: 'Cardiology',
      email: 'sarah.johnson@hospital.com',
      phone: '0821234567',
      status: 'Active',
      specialization: 'Cardiology',
      availability: 'Available',
      username: 'dr.sarah',
      password: '********'
    },
    {
      id: 2,
      name: 'Jane Doe',
      role: 'Receptionist',
      department: 'Front Desk',
      email: 'jane.doe@hospital.com',
      phone: '0821234568',
      status: 'Active',
      contact: '0821234568',
      username: 'jane.doe',
      password: '********'
    },
    {
      id: 3,
      name: 'John Smith',
      role: 'Admin',
      department: 'Administration',
      email: 'john.smith@hospital.com',
      phone: '0821234569',
      status: 'Active',
      adminContact: '0821234569',
      username: 'john.admin',
      password: '********'
    },
    {
      id: 4,
      name: 'Dr. Michael Chen',
      role: 'Doctor',
      department: 'Pediatrics',
      email: 'michael.chen@hospital.com',
      phone: '0821234570',
      status: 'Active',
      specialization: 'Pediatrics',
      availability: 'Available',
      username: 'dr.michael',
      password: '********'
    },
  ]);

  // ============================================
  // SYSTEM AUDIT LOG
  // ============================================
  const activities = [
    { id: 1, message: 'New user account created: Dr. Amara Singh (Neurology)', time: '5 min ago', type: 'user' },
    { id: 2, message: 'User permissions updated for Nurse Emily Rodriguez', time: '18 min ago', type: 'permission' },
    { id: 3, message: 'System backup completed successfully', time: '42 min ago', type: 'system' },
    { id: 4, message: 'New department added: Dermatology', time: '1 hour ago', type: 'department' },
    { id: 5, message: 'Security audit completed - no issues found', time: '2 hours ago', type: 'security' },
    { id: 6, message: 'Dr. Robert Thompson leave request approved', time: '3 hours ago', type: 'staff' },
  ];

  // ============================================
  // EMPLOYEE ACTIONS
  // ============================================
  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setEditMode(false);
    setFieldErrors({});
    setEmployeeFormData({
      name: '',
      role: '',
      department: '',
      email: '',
      phone: '',
      status: 'Active',
      specialization: '',
      availability: 'Available',
      username: '',
      password: '',
      contact: '',
      adminContact: ''
    });
    setShowEmployeeModal(true);
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setEditMode(true);
    setFieldErrors({});
    setEmployeeFormData({
      name: employee.name || '',
      role: employee.role || '',
      department: employee.department || '',
      email: employee.email || '',
      phone: employee.phone || '',
      status: employee.status || 'Active',
      specialization: employee.specialization || '',
      availability: employee.availability || 'Available',
      username: employee.username || '',
      password: '',
      contact: employee.contact || '',
      adminContact: employee.adminContact || ''
    });
    setShowEmployeeModal(true);
  };

  const handleDeleteEmployee = (id) => {
    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      setEmployees(employees.filter(emp => emp.id !== id));
    }
  };

  // ============================================
  // HANDLE CHANGE (real-time input sanitization)
  // ============================================
  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }

    // Phone: digits only, max 10
    if (name === 'phone' || name === 'contact' || name === 'adminContact') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 10) {
        setEmployeeFormData(prev => ({ ...prev, [name]: numericValue }));
      }
      return;
    }

    // Username: letters, digits, underscore only
    if (name === 'username') {
      const cleaned = value.replace(/[^a-zA-Z0-9_]/g, '');
      setEmployeeFormData(prev => ({ ...prev, [name]: cleaned }));
      return;
    }

    // All other fields
    setEmployeeFormData(prev => ({ ...prev, [name]: value }));
  };

  // ============================================
  // SAVE EMPLOYEE (with full validation)
  // ============================================
  const handleSaveEmployee = () => {
    setFieldErrors({});

    const {
      name, role, department, email, phone, status,
      specialization, availability, username, password
    } = employeeFormData;

    const errors = {};

    // Name
    if (!name.trim()) {
      errors.name = 'Please enter a full name';
    } else if (!isValidName(name)) {
      errors.name = 'Name must be 2-100 characters (letters, spaces, . \' -)';
    }

    // Role
    if (!role) {
      errors.role = 'Please select a role';
    } else if (!isValidRole(role)) {
      errors.role = 'Invalid role selected';
    }

    // Department
    if (!department) {
      errors.department = 'Please select a department';
    } else if (!isValidDepartment(department)) {
      errors.department = 'Invalid department selected';
    }

    // Email
    if (!email.trim()) {
      errors.email = 'Please enter an email address';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email (e.g., name@example.com)';
    }

    // Phone
    if (!phone.trim()) {
      errors.phone = 'Please enter a phone number';
    } else if (phone.length !== 10) {
      errors.phone = 'Phone number must be exactly 10 digits';
    } else if (!phone.startsWith('0')) {
      errors.phone = 'Phone number must start with 0';
    } else if (!isValidPhone(phone)) {
      errors.phone = 'Invalid South African phone number';
    }

    // Username
    if (!username.trim()) {
      errors.username = 'Please enter a username';
    } else if (!isValidUsername(username)) {
      errors.username = 'Username must be 3-50 characters (letters, numbers, _)';
    }

    // Password
    if (!editMode) {
      if (!password) {
        errors.password = 'Please enter a password';
      } else if (!isValidPassword(password)) {
        errors.password = 'Password must be at least 6 characters';
      }
    } else if (password && !isValidPassword(password)) {
      errors.password = 'Password must be at least 6 characters (or leave blank)';
    }

    // Specialization (Doctor only)
    if (role === 'Doctor' && !specialization) {
      errors.specialization = 'Please select a specialization';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // ---------- Build employee record ----------
    let employeeData = {
      id: selectedEmployee?.id || employees.length + 1,
      name,
      role,
      department,
      email,
      phone,
      status
    };

    if (role === 'Doctor') {
      employeeData = {
        ...employeeData,
        specialization: specialization || department,
        availability: availability || 'Available',
        username,
        password: password || '********'
      };
    } else if (role === 'Receptionist') {
      employeeData = {
        ...employeeData,
        contact: phone,
        username,
        password: password || '********'
      };
    } else if (role === 'Admin') {
      employeeData = {
        ...employeeData,
        adminContact: phone,
        username,
        password: password || '********'
      };
    }

    if (editMode) {
      setEmployees(employees.map(emp =>
        emp.id === employeeData.id ? employeeData : emp
      ));
    } else {
      setEmployees([...employees, employeeData]);
    }

    setShowEmployeeModal(false);
    setSelectedEmployee(null);
    setEditMode(false);
    setFieldErrors({});
  };

  // ============================================
  // BADGE COLOR HELPERS
  // ============================================
  const getStatusColor = (status) => {
    const colors = {
      'Active': '#10b981',
      'On Leave': '#f59e0b',
      'Inactive': '#ef4444'
    };
    return colors[status] || '#64748b';
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'Doctor': '#3b82f6',
      'Receptionist': '#10b981',
      'Admin': '#8b5cf6'
    };
    return colors[role] || '#64748b';
  };

  // ============================================
  // TIMER
  // ============================================
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============================================
  // ROLE-SPECIFIC FIELDS (with validation)
  // ============================================
  const renderRoleFields = () => {
    const { role, username, password, specialization, availability } = employeeFormData;

    if (role === 'Doctor') {
      return (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>
                <FaStethoscope className="label-icon" />
                Specialization *
              </label>
              <select
                name="specialization"
                value={specialization}
                onChange={handleFormChange}
                required
                className={fieldErrors.specialization ? 'input-error' : ''}
              >
                <option value="">Select Specialization</option>
                {specializationOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {fieldErrors.specialization && (
                <p className="field-hint field-hint-error">⚠ {fieldErrors.specialization}</p>
              )}
            </div>
            <div className="form-group">
              <label>
                <FaClock className="label-icon" />
                Availability
              </label>
              <select
                name="availability"
                value={availability}
                onChange={handleFormChange}
              >
                {availabilityOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <FaUserCircle className="label-icon" />
                Username *
              </label>
              <input
                name="username"
                type="text"
                value={username}
                onChange={handleFormChange}
                placeholder="3-50 chars, letters/numbers/_"
                required
                minLength={3}
                maxLength={50}
                className={fieldErrors.username ? 'input-error' : ''}
              />
              {fieldErrors.username && (
                <p className="field-hint field-hint-error">⚠ {fieldErrors.username}</p>
              )}
            </div>
            <div className="form-group">
              <label>
                <FaLock className="label-icon" />
                Password {editMode ? '(leave blank to keep)' : '*'}
              </label>
              <input
                name="password"
                type="password"
                value={password}
                onChange={handleFormChange}
                placeholder={editMode ? 'Leave blank to keep' : 'Min 6 characters'}
                required={!editMode}
                minLength={6}
                className={fieldErrors.password ? 'input-error' : ''}
              />
              {fieldErrors.password && (
                <p className="field-hint field-hint-error">⚠ {fieldErrors.password}</p>
              )}
            </div>
          </div>
        </>
      );
    }

    if (role === 'Receptionist' || role === 'Admin') {
      return (
        <div className="form-row">
          <div className="form-group">
            <label>
              <FaUserCircle className="label-icon" />
              Username *
            </label>
            <input
              name="username"
              type="text"
              value={username}
              onChange={handleFormChange}
              placeholder="3-50 chars, letters/numbers/_"
              required
              minLength={3}
              maxLength={50}
              className={fieldErrors.username ? 'input-error' : ''}
            />
            {fieldErrors.username && (
              <p className="field-hint field-hint-error">⚠ {fieldErrors.username}</p>
            )}
          </div>
          <div className="form-group">
            <label>
              <FaLock className="label-icon" />
              Password {editMode ? '(leave blank to keep)' : '*'}
            </label>
            <input
              name="password"
              type="password"
              value={password}
              onChange={handleFormChange}
              placeholder={editMode ? 'Leave blank to keep' : 'Min 6 characters'}
              required={!editMode}
              minLength={6}
              className={fieldErrors.password ? 'input-error' : ''}
            />
            {fieldErrors.password && (
              <p className="field-hint field-hint-error">⚠ {fieldErrors.password}</p>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="dashboard-wrapper" style={{ backgroundImage: `url(${LoginBackground})` }}>
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <h1>System Administration</h1>
            <p className="header-date">{formatDate()}</p>
          </div>
          <div className="header-right">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="notification-btn">
              <FaBell />
              <span className="notification-badge">3</span>
            </button>
            <div className="admin-profile">
              <FaUserCircle className="profile-avatar" />
              <div className="profile-info">
                <span className="profile-name">{user?.name || 'Admin'}</span>
                <span className="profile-role">System Administrator</span>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                <FaSignOutAlt />
              </button>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-header">
                <div className="stat-icon" style={{ backgroundColor: stat.color + '20', color: stat.color }}>
                  <stat.icon />
                </div>
                <span className="stat-change" style={{ color: stat.trend === 'up' ? '#10b981' : '#ef4444' }}>
                  {stat.trend === 'up' ? <FaArrowUp /> : <FaArrowDown />}
                  {stat.change}
                </span>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-detail">{stat.detail}</div>
            </div>
          ))}
        </div>

        {/* Employee Management */}
        <section className="employee-section">
          <div className="section-header">
            <h2>
              <FaUsers className="section-icon" />
              Employee Management
            </h2>
          </div>

          <div className="employee-table-wrapper">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div className="employee-cell">
                        <FaUserCircle className="emp-avatar" />
                        <div>
                          <div className="emp-name">{emp.name}</div>
                          <div className="emp-id">ID: {String(emp.id).padStart(4, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="role-badge"
                        style={{
                          backgroundColor: getRoleBadgeColor(emp.role) + '20',
                          color: getRoleBadgeColor(emp.role),
                          borderColor: getRoleBadgeColor(emp.role) + '30'
                        }}
                      >
                        {emp.role}
                      </span>
                    </td>
                    <td>{emp.department}</td>
                    <td>
                      <div className="emp-contact">
                        <div>{emp.phone}</div>
                        <div className="emp-email">{emp.email}</div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusColor(emp.status) + '20',
                          color: getStatusColor(emp.status)
                        }}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="edit-btn"
                          onClick={() => handleEditEmployee(emp)}
                          title="Edit Employee"
                        >
                          <FaUserEdit />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteEmployee(emp.id)}
                          title="Delete Employee"
                        >
                          <FaUserSlash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="dashboard-grid">
          {/* System Activity */}
          <section className="dashboard-card activity-card">
            <div className="card-header">
              <h2>
                <FaClock className="card-icon" />
                System Activity
              </h2>
              <span className="time-display">{formatTime()}</span>
            </div>
            <div className="activity-list">
              {activities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === 'user' && <FaUserCircle />}
                    {activity.type === 'permission' && <FaShieldAlt />}
                    {activity.type === 'system' && <FaCog />}
                    {activity.type === 'department' && <FaHospital />}
                    {activity.type === 'security' && <FaBan />}
                    {activity.type === 'staff' && <FaUserMd />}
                  </div>
                  <div className="activity-content">
                    <p>{activity.message}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Admin Actions */}
          <section className="dashboard-card admin-actions-card">
            <div className="card-header">
              <h2>
                <FaCog className="card-icon" />
                Admin Actions
              </h2>
            </div>
            <div className="admin-actions-grid">
              <button className="admin-action-btn" onClick={() => navigate('/user-management')}>
                <FaUsers />
                <span>User Management</span>
              </button>
              <button className="admin-action-btn" onClick={() => navigate('/generate-reports')}>
                <FaChartLine />
                <span>System Reports</span>
              </button>
            </div>
          </section>
        </div>

        {/* Quick Stats */}
        <section className="quick-stats">
          <h2>
            <FaChartLine className="section-icon" />
            System Overview
          </h2>
          <div className="quick-stats-grid">
            <div className="quick-stat-card">
              <div className="quick-stat-icon" style={{ background: '#0d9488', color: 'white' }}>
                <FaUsers />
              </div>
              <div className="quick-stat-content">
                <span className="quick-stat-number">247</span>
                <span className="quick-stat-label">Total Staff</span>
              </div>
            </div>
            <div className="quick-stat-card">
              <div className="quick-stat-icon" style={{ background: '#3b82f6', color: 'white' }}>
                <FaHospital />
              </div>
              <div className="quick-stat-content">
                <span className="quick-stat-number">14</span>
                <span className="quick-stat-label">Departments</span>
              </div>
            </div>
            <div className="quick-stat-card">
              <div className="quick-stat-icon" style={{ background: '#f59e0b', color: 'white' }}>
                <FaFileInvoice />
              </div>
              <div className="quick-stat-content">
                <span className="quick-stat-number">342</span>
                <span className="quick-stat-label">Active Licenses</span>
              </div>
            </div>
            <div className="quick-stat-card">
              <div className="quick-stat-icon" style={{ background: '#8b5cf6', color: 'white' }}>
                <FaShieldAlt />
              </div>
              <div className="quick-stat-content">
                <span className="quick-stat-number">99.97%</span>
                <span className="quick-stat-label">System Uptime</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Employee Modal (Edit only) */}
      {showEmployeeModal && (
        <div className="modal-overlay" onClick={() => setShowEmployeeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editMode ? 'Edit Employee' : 'Add New Employee'}</h2>

            <div className="modal-body">
              {/* Name and Role */}
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <FaUserCircle className="label-icon" />
                    Full Name *
                  </label>
                  <input
                    name="name"
                    type="text"
                    value={employeeFormData.name}
                    onChange={handleFormChange}
                    placeholder="Enter full name"
                    required
                    minLength={2}
                    maxLength={100}
                    className={fieldErrors.name ? 'input-error' : ''}
                  />
                  {fieldErrors.name && (
                    <p className="field-hint field-hint-error">⚠ {fieldErrors.name}</p>
                  )}
                </div>
                <div className="form-group">
                  <label>
                    <FaIdCard className="label-icon" />
                    Role *
                  </label>
                  <select
                    name="role"
                    value={employeeFormData.role}
                    onChange={handleFormChange}
                    required
                    className={fieldErrors.role ? 'input-error' : ''}
                  >
                    <option value="">Select Role</option>
                    {roleOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {fieldErrors.role && (
                    <p className="field-hint field-hint-error">⚠ {fieldErrors.role}</p>
                  )}
                </div>
              </div>

              {/* Department and Email */}
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <FaHospital className="label-icon" />
                    Department *
                  </label>
                  <select
                    name="department"
                    value={employeeFormData.department}
                    onChange={handleFormChange}
                    required
                    className={fieldErrors.department ? 'input-error' : ''}
                  >
                    <option value="">Select Department</option>
                    {departmentOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {fieldErrors.department && (
                    <p className="field-hint field-hint-error">⚠ {fieldErrors.department}</p>
                  )}
                </div>
                <div className="form-group">
                  <label>
                    <FaEnvelope className="label-icon" />
                    Email *
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={employeeFormData.email}
                    onChange={handleFormChange}
                    placeholder="e.g. name@example.com"
                    required
                    className={fieldErrors.email ? 'input-error' : ''}
                  />
                  {fieldErrors.email && (
                    <p className="field-hint field-hint-error">⚠ {fieldErrors.email}</p>
                  )}
                </div>
              </div>

              {/* Phone and Status */}
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <FaPhone className="label-icon" />
                    Phone *
                    <span className="label-note"> (10 digits, starts with 0)</span>
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    value={employeeFormData.phone}
                    onChange={handleFormChange}
                    placeholder="e.g. 0721234567"
                    required
                    maxLength={10}
                    minLength={10}
                    className={
                      fieldErrors.phone
                        ? 'input-error'
                        : employeeFormData.phone.length === 10 && isValidPhone(employeeFormData.phone)
                        ? 'input-valid'
                        : ''
                    }
                  />
                  <p className="field-hint field-hint-info">
                    {employeeFormData.phone.length}/10 digits
                  </p>
                  {employeeFormData.phone.length === 10 && isValidPhone(employeeFormData.phone) && (
                    <p className="field-hint field-hint-success">✓ Valid South African number</p>
                  )}
                  {fieldErrors.phone && (
                    <p className="field-hint field-hint-error">⚠ {fieldErrors.phone}</p>
                  )}
                </div>
                <div className="form-group">
                  <label>
                    <FaCheckCircle className="label-icon" />
                    Status
                  </label>
                  <select
                    name="status"
                    value={employeeFormData.status}
                    onChange={handleFormChange}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role-specific fields */}
              {renderRoleFields()}
            </div>

            <div className="modal-buttons">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowEmployeeModal(false);
                  setFieldErrors({});
                }}
              >
                Cancel
              </button>
              <button type="button" className="save-btn" onClick={handleSaveEmployee}>
                {editMode ? 'Update' : 'Add'} Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;