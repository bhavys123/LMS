import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
// Ensure lucide-react is installed
import { GraduationCap, Users, User, Shield, School } from "lucide-react";

const LoginPage = () => {
  const { login } = useAuth();
  const [role, setRole] = useState("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(role, identifier, password);
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'student', label: 'Student', icon: GraduationCap },
    { id: 'teacher', label: 'Teacher', icon: Users },
    { id: 'parent', label: 'Parent', icon: User },
    { id: 'admin', label: 'Admin', icon: Shield },
  ];

  return (
    <div className="login-page">
      <div className="login-card">
        {/* LEFT BRANDING */}
        <div className="login-left">
          <div className="login-brand-icon"><School size={60} color="white" /></div>
          <div className="login-brand-text">CampusConnect</div>
          <p className="login-brand-desc">
            The integrated Learning Management System for the modern campus environment.
          </p>
        </div>

        {/* RIGHT FORM */}
        <div className="login-right">
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px', color: '#1f2937' }}>Welcome Back</h2>
          <p style={{ color: '#6b7280', marginBottom: '30px' }}>Please select your role to continue</p>

          <div className="role-tabs">
            {roles.map((r) => (
              <div 
                key={r.id} 
                className={`role-tab ${role === r.id ? 'active' : ''}`}
                onClick={() => { setRole(r.id); setIdentifier(""); setError(""); }}
              >
                <r.icon size={20} className="role-icon" />
                <span style={{ fontSize: '13px' }}>{r.label}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">
                {role === 'student' ? 'Student ID' : 
                 role === 'teacher' ? 'Teacher ID' : 
                 role === 'parent' ? 'Registered Email' : 'Username'}
              </label>
              <input
                className="form-control"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your ID or Email"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div style={{ color: '#ef4444', background: '#fee2e2', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;