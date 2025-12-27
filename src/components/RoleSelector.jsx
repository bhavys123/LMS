// src/components/RoleSelector.jsx
import React from "react";

const roles = ["student", "teacher", "parent", "admin"];

const RoleSelector = ({ role, onChange }) => {
  return (
    <div>
      <div className="role-chips">
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            className={`role-chip ${role === r ? "active" : ""}`}
            onClick={() => onChange(r)}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>
      <p className="role-hint">
        You are logging in as: <strong>{role.toUpperCase()}</strong>
      </p>
    </div>
  );
};

export default RoleSelector;
