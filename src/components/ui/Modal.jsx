import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ children, title, onClose }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <div className="modal-header">
        <h3 className="modal-title">{title}</h3>
        <button onClick={onClose} className="close-btn">
          <X size={24} />
        </button>
      </div>
      <div className="modal-body">
        {children}
      </div>
    </div>
  </div>
);

export default Modal;