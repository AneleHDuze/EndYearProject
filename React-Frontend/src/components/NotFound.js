import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: 'Arial' }}>
      <h1 style={{ fontSize: '72px', color: '#1E88E5', margin: 0 }}>404</h1>
      <h2 style={{ color: '#333' }}>Page Not Found</h2>
      <p style={{ color: '#666' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
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
        Back to Login
      </Link>
    </div>
  );
}