import React, { createContext, useState, useContext, useEffect } from 'react';
import api from './api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      console.log(`Login attempt: ${username}`);
      
      // FIXED: Use "/Auth/login" with capital "A"
      const response = await api.post('/Auth/login', {
        username,
        password
      });
      
      console.log('Login response:', response.data);
      
      const { token, userId, name, role } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('userData', JSON.stringify({ userId, name, role }));
      
      setUser({ userId, name, role });
      return { success: true };
    } catch (error) {
      console.error(' Login error:', error);
      if (error.code === 'ERR_NETWORK') {
        return { 
          success: false, 
          error: 'Cannot connect to server. Make sure the backend is running at https://localhost:7184' 
        };
      }
      return { 
        success: false, 
        error: error.response?.data || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};