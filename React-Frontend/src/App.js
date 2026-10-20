import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './AuthContext';
import PrivateRoute from './utils/PrivateRoute';

// Auth
import LoginScreen from './components/LoginScreen';

// Dashboards
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import ReceptionistDashboard from './components/ReceptionistDashboard';

// Receptionist 
import PatientRegistration from './components/PatientRegistration';
import BookAppointment from './components/BookAppointment';
import ManageAppointments from './components/ManageAppointments';

// Doctor features
import ScheduleConsultation from './components/ScheduleConsultation';
import NewConsultation from './components/NewConsultation';
import IssuePrescription from './components/IssuePrescription';

// Admin features
import UserManagement from './components/UserManagement';
import GenerateReports from './components/GenerateReports';

// Error pages
import NotFound from './components/NotFound';
import Forbidden from './components/Forbidden';

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/forbidden" element={<Forbidden />} />

      {/* Root — auth-aware redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Dashboard (role-based) */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            {user?.role === 'Doctor' ? (
              <DoctorDashboard />
            ) : user?.role === 'Admin' ? (
              <AdminDashboard />
            ) : user?.role === 'Receptionist' ? (
              <ReceptionistDashboard />
            ) : (
              <Dashboard />
            )}
          </PrivateRoute>
        }
      />

      {/* Receptionist */}
      <Route path="/register-patient" element={<PrivateRoute roles={['Receptionist']}><PatientRegistration /></PrivateRoute>} />
      <Route path="/book-appointment" element={<PrivateRoute roles={['Receptionist',]}><BookAppointment /></PrivateRoute>} />
      <Route path="/manage-appointments" element={<PrivateRoute roles={['Receptionist']}><ManageAppointments /></PrivateRoute>} />

      {/* Doctor */}
      <Route path="/schedule-consultation" element={<PrivateRoute roles={['Doctor']}><ScheduleConsultation /></PrivateRoute>} />
      <Route path="/new-consultation" element={<PrivateRoute roles={['Doctor']}><NewConsultation /></PrivateRoute>} />
      <Route path="/issue-prescription" element={<PrivateRoute roles={['Doctor']}><IssuePrescription /></PrivateRoute>} />

      {/* Admin */}
      <Route path="/user-management" element={<PrivateRoute roles={['Admin']}><UserManagement /></PrivateRoute>} />
      <Route path="/generate-reports" element={<PrivateRoute roles={['Admin']}><GenerateReports /></PrivateRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </Router>
    </AuthProvider>
  );
}

export default App;