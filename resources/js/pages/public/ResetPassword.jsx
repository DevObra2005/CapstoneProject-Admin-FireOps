import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios'
import '../../../css/resetpassword.css';

export default function ResetPassword() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email:                 '',
        token:                 '',
        password:              '',
        password_confirmation: '',
    });
    const [showPass,    setShowPass]    = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading,     setLoading]     = useState(false);
    const [success,     setSuccess]     = useState('');
    const [error,       setError]       = useState('');

    // Extract token and email from the URL automatically
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setForm(f => ({
            ...f,
            token: params.get('token') || '',
            email: params.get('email') || '',
        }));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.password_confirmation) {
            setError('Passwords do not match.'); return;
        }
        setLoading(true); setError(''); setSuccess('');
        try {
            const res = await api.post('/reset-password', form);
            setSuccess(res.data.message);
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rst-page">
            <div className="rst-card">

                <div className="rst-top-bar"></div>

                <div className="rst-body">
                    <div className="rst-icon">
                        <i className="bi bi-key"></i>
                    </div>

                    <h4 className="rst-title">Set a new password</h4>
                    <p className="rst-sub">
                        Your new password must be at least 8 characters long.
                    </p>

                    {success && (
                        <div className="rst-alert rst-alert-ok">
                            <i className="bi bi-check-circle-fill"></i>
                            {success} Redirecting to login…
                        </div>
                    )}

                    {error && (
                        <div className="rst-alert rst-alert-err">
                            <i className="bi bi-exclamation-circle-fill"></i>
                            {error}
                        </div>
                    )}

                    {!success && (
                        <form onSubmit={handleSubmit} className="rst-form">

                            <div className="rst-field">
                                <label className="rst-label">New password</label>
                                <div className="rst-pass-wrap">
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        className="rst-input"
                                        placeholder="Min. 8 characters"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        required
                                        minLength={8}
                                    />
                                    <button type="button" className="rst-eye" onClick={() => setShowPass(p => !p)}>
                                        <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <div className="rst-field">
                                <label className="rst-label">Confirm new password</label>
                                <div className="rst-pass-wrap">
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        className="rst-input"
                                        placeholder="Repeat your password"
                                        value={form.password_confirmation}
                                        onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
                                        required
                                        minLength={8}
                                    />
                                    <button type="button" className="rst-eye" onClick={() => setShowConfirm(p => !p)}>
                                        <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="rst-btn" disabled={loading}>
                                {loading
                                    ? <><span className="rst-spin"></span>Resetting…</>
                                    : 'Reset password'
                                }
                            </button>
                        </form>
                    )}

                    <a href="/login" className="rst-back">
                        <i className="bi bi-arrow-left"></i>
                        Back to login
                    </a>
                </div>

            </div>
        </div>
    );
}