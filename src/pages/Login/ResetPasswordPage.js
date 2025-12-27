// pages/ResetPasswordPage.js
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Assuming you use react-router-dom
import { useAuth } from '../context/AuthContext';
import { School } from 'lucide-react';

const ResetPasswordPage = () => {
    const { token } = useParams(); // Get token from URL
    const navigate = useNavigate();
    const { resetPassword } = useAuth();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError("Passwords do not match.");
        }
        setError('');
        setLoading(true);
        try {
            await resetPassword(token, password);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000); // Redirect to login after 3s
        } catch (err) {
            setError('Failed to reset password. The link may be invalid or expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: '450px' }}>
                <div style={{ padding: '40px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <School size={50} color="#3b82f6" />
                        <h2 style={{ fontSize: '24px', fontWeight: '700', marginTop: '10px' }}>Set a New Password</h2>
                    </div>

                    {success ? (
                        <div style={{ color: '#16a34a', background: '#dcfce7', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                            ✅ Password successfully reset! Redirecting to login...
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                />
                            </div>

                            {error && (
                                <div style={{ color: '#ef4444', background: '#fee2e2', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                                {loading ? "Resetting..." : "Reset Password"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;