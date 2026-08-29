import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/axios'
import '../../../css/participantchangepassword.css';


export default function ParticipantChangePassword() {
    const [searchParams] = useSearchParams()

    // The email arrives pre-filled from the link in the credentials
    // email, so the participant only types passwords.
    const [form, setForm] = useState({
        email:                     searchParams.get('email') || '',
        current_password:          '',
        new_password:              '',
        new_password_confirmation: '',
    })

    const [saving, setSaving]   = useState(false)
    const [errors, setErrors]   = useState({})
    const [alert, setAlert]     = useState(null)   // { type, message }
    const [done, setDone]       = useState(false)
    const [showPw, setShowPw]   = useState(false)

    const updateField = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
        setErrors(prev => {
            if (!prev[field]) return prev
            const next = { ...prev }
            delete next[field]
            return next
        })
    }

    const handleSubmit = async () => {
        setSaving(true)
        setAlert(null)
        setErrors({})

        try {
            const res = await api.post('/participant/change-password', form)
            setAlert({ type: 'success', message: res.data.message })
            setDone(true)

        } catch (err) {
            const status = err.response?.status

            if (status === 422 && err.response.data.errors) {
                const raw = err.response.data.errors
                const mapped = {}
                Object.keys(raw).forEach(f => { mapped[f] = raw[f][0] })
                setErrors(mapped)
                setAlert({ type: 'error', message: 'Please correct the highlighted fields.' })

            } else if (status === 429) {
                // Thrown by the throttle middleware
                setAlert({
                    type: 'error',
                    message: 'Too many attempts. Please wait a minute and try again.',
                })

            } else if (err.response?.data?.message) {
                setAlert({ type: 'error', message: err.response.data.message })

            } else {
                setAlert({ type: 'error', message: 'Something went wrong. Please try again.' })
            }
        } finally {
            setSaving(false)
        }
    }

    const canSubmit =
        form.email.trim() !== '' &&
        form.current_password !== '' &&
        form.new_password.length >= 8 &&
        form.new_password === form.new_password_confirmation &&
        !saving

    return (
        <div className="pcp-page">
            <div className="pcp-card">

                <div className="pcp-bar"></div>

                <div className="pcp-header">
                    <span className="pcp-badge">
                        Bureau of Fire Protection — Natividad Station
                    </span>
                    <h1 className="pcp-title">Change your password</h1>
                    <p className="pcp-sub">
                        Replace the auto-generated password with one you'll remember.
                    </p>
                </div>

                <div className="pcp-body">

                    {alert && (
                        <div className={`pcp-alert pcp-alert-${alert.type}`}>
                            <i className={`bi ${
                                alert.type === 'success'
                                    ? 'bi-check-circle-fill'
                                    : 'bi-exclamation-triangle-fill'
                            } me-2`}></i>
                            {alert.message}
                        </div>
                    )}

                    {done ? (
                        <div className="pcp-done">
                            <i className="bi bi-shield-check"></i>
                            <p>
                                You can now open the FireOps app on your Android device
                                and sign in with your new password.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="pcp-field">
                                <label className="pcp-label">Email address</label>
                                <input
                                    type="email"
                                    className={`pcp-input ${errors.email ? 'pcp-input-error' : ''}`}
                                    value={form.email}
                                    onChange={e => updateField('email', e.target.value)}
                                    disabled={saving}
                                    autoComplete="username"
                                />
                                {errors.email && <div className="pcp-error">{errors.email}</div>}
                            </div>

                            <div className="pcp-field">
                                <label className="pcp-label">Current password</label>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    className={`pcp-input ${errors.current_password ? 'pcp-input-error' : ''}`}
                                    placeholder="The password from your email"
                                    value={form.current_password}
                                    onChange={e => updateField('current_password', e.target.value)}
                                    disabled={saving}
                                    autoComplete="current-password"
                                />
                                {errors.current_password && (
                                    <div className="pcp-error">{errors.current_password}</div>
                                )}
                            </div>

                            <div className="pcp-divider"></div>

                            <div className="pcp-field">
                                <label className="pcp-label">New password</label>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    className={`pcp-input ${errors.new_password ? 'pcp-input-error' : ''}`}
                                    placeholder="At least 8 characters"
                                    value={form.new_password}
                                    onChange={e => updateField('new_password', e.target.value)}
                                    disabled={saving}
                                    autoComplete="new-password"
                                />
                                {errors.new_password ? (
                                    <div className="pcp-error">{errors.new_password}</div>
                                ) : (
                                    <div className="pcp-hint">Minimum 8 characters.</div>
                                )}
                            </div>

                            <div className="pcp-field">
                                <label className="pcp-label">Confirm new password</label>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    className="pcp-input"
                                    placeholder="Type it again"
                                    value={form.new_password_confirmation}
                                    onChange={e => updateField('new_password_confirmation', e.target.value)}
                                    disabled={saving}
                                    autoComplete="new-password"
                                />
                                {form.new_password_confirmation !== '' &&
                                 form.new_password !== form.new_password_confirmation && (
                                    <div className="pcp-error">Passwords do not match.</div>
                                )}
                            </div>

                            <label className="pcp-show">
                                <input
                                    type="checkbox"
                                    checked={showPw}
                                    onChange={e => setShowPw(e.target.checked)}
                                    disabled={saving}
                                />
                                Show passwords
                            </label>

                            <button
                                className="pcp-btn"
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        Changing...
                                    </>
                                ) : 'Change password'}
                            </button>
                        </>
                    )}

                </div>

                <div className="pcp-footer">
                    FireOps — BFP Natividad Station
                </div>

            </div>
        </div>
    )
}