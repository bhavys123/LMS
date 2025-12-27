// src/components/ui/ErrorMessage.js
import React from 'react';
import { AlertTriangle } from 'lucide-react'; // Assuming you have lucide-react for icons

const ErrorMessage = ({ message = "An unexpected error occurred." }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      margin: '20px auto',
      backgroundColor: '#fee2e2', // Tailwind red-100
      color: '#ef4444',         // Tailwind red-500
      border: '1px solid #fca5a5', // Tailwind red-300
      borderRadius: '8px',
      maxWidth: '500px',
      textAlign: 'center',
      gap: '10px', // Space between icon and text
    }}>
      <AlertTriangle size={24} style={{ flexShrink: 0 }} /> {/* Icon for error */}
      <p style={{ margin: 0, fontSize: '1rem' }}>{message}</p>
    </div>
  );
};

export default ErrorMessage;