import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../../css/login.css'

export default function Login() {
    
    const [email,       setEmail]       = useState('')
    const [password,    setPassword]    = useState('')
    const [showPass,    setShowPass]    = useState(false)
    const [error,       setError]       = useState('')
    const [loading,     setLoading]     = useState(false)

    
    const navigate = useNavigate()

    const handleLogin = async (e) => {
       
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
           
            const res = await axios.post('/api/login', { email, password })

            const token = res.data.token
            const role  = res.data.user.role

            if (token) {
               
                localStorage.setItem('token', token)
                localStorage.setItem('role',  role)

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

        } catch (err) {
         
            if (err.response) {
                setError(err.response.data.message || 'Invalid email or password.')
            } else {
                setError('Cannot connect to server. Is Laravel running?')
            }
        } finally {
         
            setLoading(false)
        }
    }

    return (
        <div className="login-wrapper p-5 p-md-0">
            <div className="login-card">

              
                <div className="login-left">

                    <div className="login-brand-name">FireOps Admin</div>
                    <div className="login-brand-sub">
                        A 3D Gamified Simulation-Based<br />
                        Training System for<br />
                        Natividad Fire Station
                    </div>

                    <div className="login-left-divider"></div>

                  
                    <div className="login-access-label">Access Levels</div>

                    <div className="login-access-row">
                        <div className="login-access-icon">
                            <i className="bi bi-shield-fill-check"></i>
                        </div>
                        <div>
                            <div className="login-access-title">Super Admin</div>
                            <div className="login-access-desc">Full system access — manage staff, view all data</div>
                        </div>
                    </div>

                    <div className="login-access-row">
                        <div className="login-access-icon">
                            <i className="bi bi-person-fill"></i>
                        </div>
                        <div>
                            <div className="login-access-title">Staff</div>
                            <div className="login-access-desc">Manage events and participants</div>
                        </div>
                    </div>

                 
                    <div className="login-left-footer">
                        Bureau of Fire Protection<br />
                        Natividad Station · 2026
                    </div>
                </div>

              
                <div className="login-right">

                    <div className="login-eyebrow">Admin Portal</div>
                    <div className="login-title">Sign in to your account</div>
                    <div className="login-subtitle">
                        Enter your credentials to access the dashboard
                    </div>

                    <form onSubmit={handleLogin}>

                    
                        <div className="login-field">
                            <label className="login-label">Email address</label>
                            <div className="login-input-wrap">
                                <input
                                    type="email"
                                    className={`login-input${error ? ' login-input-error' : ''}`}
                                    placeholder="Enter your email address"
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

                        
                        {error && (
                            <div className="login-error">
                                <i className="bi bi-exclamation-circle-fill"></i>
                                {error}
                            </div>
                        )}

                    
                        <button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                        >
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

                    <div className="login-note">
                        Access is restricted to authorized BFP personnel only
                    </div>

                </div>
            </div>
        </div>
    )
}