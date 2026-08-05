import React, { useState } from 'react';
import api from '../../api/axios'
import '../../../css/forgotpassword.css';

export default function ForgotPassword() {
    const [email,   setEmail]   = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error,   setError]   = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError(''); setSuccess('');
        try {
            const res = await api.post('/forgot-password', { email });
            setSuccess(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fp-page">
            <div className="fp-card">

                <div className="fp-top-bar"></div>

                <div className="fp-body d-flex flex-column align-items-center text-center">

                    <div className="fp-icon mb-4">
                        <i className="bi bi-shield-lock"></i>
                    </div>

                    <h4 className="fp-title mb-2">Forgot your password?</h4>
                    <p className="fp-sub mb-4">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>

                    {success && (
                        <div className="fp-alert fp-alert-ok w-100 d-flex align-items-start gap-2 mb-4 text-start">
                            <i className="bi bi-check-circle-fill"></i>
                            {success}
                        </div>
                    )}

                    {error && (
                        <div className="fp-alert fp-alert-err w-100 d-flex align-items-start gap-2 mb-4 text-start">
                            <i className="bi bi-exclamation-circle-fill"></i>
                            {error}
                        </div>
                    )}

                    {!success && (
                        <form onSubmit={handleSubmit} className="w-100 text-start">
                            <div className="mb-3">
                                <label className="fp-label d-block mb-1">Email address</label>
                                <input
                                    type="email"
                                    className="fp-input w-100"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="fp-btn w-100 d-flex align-items-center justify-content-center gap-2 mt-1"
                                disabled={loading}
                            >
                                {loading
                                    ? <><span className="fp-spin"></span>Sending…</>
                                    : 'Send reset link'
                                }
                            </button>
                        </form>
                    )}

                    <a href="/login" className="fp-back d-inline-flex align-items-center gap-2 mt-4">
                        <i className="bi bi-arrow-left"></i>
                        Back to login
                    </a>

                </div>
            </div>
        </div>
    );
}