// src/components/InputField.jsx
import React from "react";

const InputField = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
}) => {
  return (
    <div className="form-row">
      <label className="form-label">{label}</label>
      <input
        className="form-input"
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
};

export default InputField;
