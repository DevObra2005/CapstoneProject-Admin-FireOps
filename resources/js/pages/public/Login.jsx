import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import '../../../css/login.css'
import fireopsLogo from '/public/Images/FireOps_Logo.png'

export default function Login() {

    const [email,    setEmail]    = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [error,    setError]    = useState('')
    const [loading,  setLoading]  = useState(false)

    const navigate = useNavigate()

    const handleLogin = async (e) => {

        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await api.post('/login', { email, password })

            const token = res.data.token
            const role  = res.data.user.role

            if (token) {
                localStorage.setItem('token', token)
                localStorage.setItem('role',  role)
                localStorage.setItem('first_name', res.data.user.first_name)
                localStorage.setItem('last_name',  res.data.user.last_name)

                if (role === 'superadmin') {
                    navigate('/dashboard')
                } else if (role === 'staff') {
                    navigate('/staff/dashboard')
                } else {
                    setError('Unauthorized role.')
                }
            } else {
                setError('Login failed: No token received.')
            }

        } catch (error) {

            if (error.response) {
                const errors = error.response.data.errors

                if (errors?.email && errors?.password) {
                    setError('Please enter your email and password.')
                } else if (errors?.email) {
                    setError(errors.email[0])
                } else if (errors?.password) {
                    setError(errors.password[0])
                } else {
                    setError(error.response.data.message || 'Invalid email or password.')
                }
            } else {
                setError('Cannot connect to server. Is Laravel running?')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-wrapper">

            {/* Decorative halo rings */}
            <div className="login-halo"></div>
            <div className="login-halo-2"></div>

            <div className="login-card">

                {/* ── CREST HEADER ─────────────────────────── */}
                <div className="login-crest">
                    <div className="login-crest-row">
                        <div className="login-crest-mark">
                            <img src={fireopsLogo} alt="FireOps" />
                        </div>
                        <div>
                            <div className="login-crest-name">FireOps</div>
                            <span className="login-crest-org">
                                Bureau of Fire Protection · Natividad Station
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── BODY ─────────────────────────────────── */}
                <div className="login-body">

                    <div className="login-title">Sign in to your account</div>
                    <div className="login-subtitle">
                        Enter your credentials to access the administration panel.
                    </div>

                    <form onSubmit={handleLogin}>

                        <div className="login-field">
                            <label className="login-label">Email address</label>
                            <div className="login-input-wrap">
                                <input
                                    type="email"
                                    className={`login-input${error ? ' login-input-error' : ''}`}
                                    placeholder="name@bfp.gov.ph"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                                <span className="login-input-icon">
                                    <i className="bi bi-envelope"></i>
                                </span>
                            </div>
                        </div>

                        <div className="login-field">
                            <label className="login-label">Password</label>
                            <div className="login-input-wrap">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    className={`login-input${error ? ' login-input-error' : ''}`}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="login-eye-btn"
                                    onClick={() => setShowPass(prev => !prev)}
                                    aria-label={showPass ? 'Hide password' : 'Show password'}
                                >
                                    <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        <div className="login-forgot">
                            <a href="/forgot-password" className="login-forgot-link">
                                Forgot password?
                            </a>
                        </div>

                        {error && (
                            <div className="login-error">
                                <i className="bi bi-exclamation-circle-fill"></i>
                                {error}
                            </div>
                        )}

                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="login-spinner"></span>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-box-arrow-in-right"></i>
                                    Sign In
                                </>
                            )}
                        </button>

                    </form>

                    <div className="login-divider">
                        <span></span>
                        <small>Restricted access</small>
                        <span></span>
                    </div>

                    <div className="login-note">
                        <i className="bi bi-info-circle-fill"></i>
                        <span>
                            This system is for authorized BFP personnel only.
                            All sign-in activity is logged and monitored.
                        </span>
                    </div>

                </div>
            </div>
        </div>
    )
}