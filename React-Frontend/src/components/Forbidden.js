import React from 'react';
import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: 'Arial' }}>
      <h1 style={{ fontSize: '72px', color: '#E53935', margin: 0 }}>403</h1>
      <h2 style={{ color: '#333' }}>Access Denied</h2>
      <p style={{ color: '#666' }}>
        You don't have permission to access this page.
      </p>
      <Link
        to="/dashboard"
        style={{
          display: 'inline-block',
          marginTop: '20px',
          padding: '12px 24px',
          background: '#1E88E5',
          color: '#fff',
          borderRadius: '6px',
          textDecoration: 'none',
        }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}