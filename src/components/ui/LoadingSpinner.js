// src/components/ui/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '150px', // Ensure it takes up some vertical space
      padding: '20px',
      color: '#4a5568', // Tailwind gray-700
      fontSize: '1.1rem',
      fontWeight: '500',
    }}>
      {/* Simple CSS-based spinner. You can replace this with an SVG or an icon */}
      <div style={{
        border: '4px solid #f3f3f3', // Light gray border
        borderTop: '4px solid var(--primary, #3b82f6)', // Blue spinner (or your primary color)
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
        marginBottom: '15px',
      }}></div>
      <p>{message}</p>

      {/* Basic CSS for the spin animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;