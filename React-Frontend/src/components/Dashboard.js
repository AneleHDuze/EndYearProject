import React from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { title: 'Register Patient', path: '/register-patient', roles: ['Receptionist', ] },
    { title: 'Book Appointment', path: '/book-appointment', roles: ['Receptionist', ] },
    { title: 'Manage Appointments', path: '/manage-appointments', roles: ['Receptionist', ] },
    { title: 'Schedule Consultation', path: '/schedule-consultation', roles: ['Doctor'] },
    { title: 'New Consultation', path: '/new-consultation', roles: ['Doctor'] },
    { title: 'Issue Prescription', path: '/issue-prescription', roles: ['Doctor'] },
    { title: 'User Management', path: '/user-management', roles: ['Admin'] },
    { title: 'Generate Reports', path: '/generate-reports', roles: ['Admin'] },
  ];

  const visibleItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>🏥 Healthcare Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.name} ({user?.role})</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="dashboard-grid">
        {visibleItems.map((item, index) => (
          <div 
            key={index} 
            className="dashboard-card"
            onClick={() => navigate(item.path)}
          >
            <h3>{item.title}</h3>
            <p>Click to access</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;