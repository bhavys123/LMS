// src/components/Toast.js
import React from 'react';
import { CheckCircle, AlertCircle, X } from "lucide-react";

const Toast = ({ message, type, onClose }) => (
  <div style={{
    position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000,
    background: type === 'error' ? '#ef4444' : '#10b981',
    color: 'white', padding: '12px 20px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', gap: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', animation: 'slideIn 0.3s ease'
  }}>
    {type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
    <span style={{fontWeight: 500, fontSize: '14px'}}>{message}</span>
    <button onClick={onClose} style={{background:'none', border:'none', color:'white', cursor:'pointer', opacity: 0.8}}><X size={16}/></button>
  </div>
);

export default Toast;