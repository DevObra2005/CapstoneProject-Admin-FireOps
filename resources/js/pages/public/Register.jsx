import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api/axios'
import '../../../css/staff/register.css'
import fireopsLogo from '/public/Images/FireOps_Logo.png';

export default function Register() {

    const { token } = useParams()

    // ── Step state machine ─────────────────────────────────────────────────
    // Controls which screen the user sees
    // validating → form → success (or error)
    // Unlike before, we removed 'locating' as a blocking step
    // GPS now runs in the BACKGROUND while the form is already visible
    const [step,    setStep]    = useState('validating')
    const [event,   setEvent]   = useState(null)
    const [message, setMessage] = useState('')

    // ── Form state ─────────────────────────────────────────────────────────
    const [form, setForm] = useState({
        name:             '',
        email:            '',
        organization:     '',
        contact_number:   '',
        password:         '',
        confirm_password: '',
    })

    const [errors,  setErrors]  = useState({})
    const [loading, setLoading] = useState(false)

    // Shown above the submit button when validation fails, so the user
    // isn't left staring at a form that appears to do nothing when the
    // failing field is scrolled out of view on a phone.
    const [formAlert, setFormAlert] = useState(null)

    // ── Password visibility toggles ────────────────────────────────────────
    const [showPass,    setShowPass]    = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    // ── Geolocation state ──────────────────────────────────────────────────
    const [gpsStatus,  setGpsStatus]  = useState('requesting')
    const [coords,     setCoords]     = useState(null)   // { latitude, longitude }
    const [distance,   setDistance]   = useState(null)   // distance in meters from venue

    // ── Step 1: Validate QR token ──────────────────────────────────────────
    useEffect(() => {
        api.get(`/events/validate/${token}`)
            .then(res => {
                setEvent(res.data)
                setStep('form')       // Show form immediately — don't wait for GPS
                requestGPS(res.data)  // Start GPS in background
            })
            .catch(err => {
                setMessage(err.response?.data?.message || 'Invalid or expired QR code.')
                setStep('error')
            })
    }, [token])

    // ── Step 2: Request GPS in background ─────────────────────────────────
    const requestGPS = (eventData) => {
        if (!navigator.geolocation) {
            setGpsStatus('denied')
            return
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude
                const lng = pos.coords.longitude
                setCoords({ latitude: lat, longitude: lng })

                if (eventData.latitude && eventData.longitude) {
                    const dist = haversine(
                        eventData.latitude, eventData.longitude,
                        lat, lng
                    )
                    setDistance(Math.round(dist))

                    if (dist <= eventData.radius_meters) {
                        setGpsStatus('granted')
                    } else {
                        setGpsStatus('far')
                    }
                } else {
                    setGpsStatus('granted')
                }
            },

            (err) => {
                if (err.code === 1) {
                    setGpsStatus('denied')
                } else {
                    setGpsStatus('failed')
                }
            },

            {
                enableHighAccuracy: true,
                timeout:            15000,
                maximumAge:         0,
            }
        )
    }

    // ── Haversine formula ──────────────────────────────────────────────────
    const haversine = (lat1, lon1, lat2, lon2) => {
        const R  = 6371000
        const φ1 = lat1 * Math.PI / 180
        const φ2 = lat2 * Math.PI / 180
        const Δφ = (lat2 - lat1) * Math.PI / 180
        const Δλ = (lon2 - lon1) * Math.PI / 180
        const a  = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                   Math.cos(φ1) * Math.cos(φ2) *
                   Math.sin(Δλ/2) * Math.sin(Δλ/2)
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    }

    // ── handleChange ───────────────────────────────────────────────────────
    const handleChange = (name, value) => {
        if (name === 'contact_number') {
            value = value.replace(/\D/g, '').slice(0, 11)
        }
        setForm(prev => ({ ...prev, [name]: value }))
        setErrors(prev => ({ ...prev, [name]: null }))
        setFormAlert(null)
    }

    // ── validate() ─────────────────────────────────────────────────────────
    // Client-side validation — runs BEFORE the API call.
    // These rules MIRROR the server rules in ParticipantController::store().
    // If they drift apart, users get 422s they can't understand, because
    // the form told them the value was fine.
    const validate = () => {
        const e = {}

        if (!form.name.trim())
            e.name = ['Full name is required.']

        if (!form.email.trim())
            e.email = ['Email address is required.']
        else if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
            e.email = ['Please enter a valid email address.']

        // REQUIRED on the server — the participants.organization column
        // is NOT NULL, so a blank value is rejected with a 422.
        if (!form.organization)
            e.organization = ['Please select your organization type.']

        if (!form.password)
            e.password = ['Password is required.']
        else if (form.password.length < 6)
            e.password = ['Password must be at least 6 characters.']

        if (!form.confirm_password)
            e.confirm_password = ['Please confirm your password.']
        else if (form.password !== form.confirm_password)
            e.confirm_password = ['Passwords do not match.']

        // Optional field, but if filled it must match the server regex
        // /^09\d{9}$/ exactly. A plain 11-digit check would let through
        // numbers like 12345678901 that the API then rejects.
        if (form.contact_number && !/^09\d{9}$/.test(form.contact_number))
            e.contact_number = ['Must be 11 digits starting with 09.']

        return e
    }

    // ── handleSubmit ───────────────────────────────────────────────────────
    const handleSubmit = async ev => {
        ev.preventDefault()

        const clientErrors = validate()
        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors)
            setFormAlert('Please check the highlighted fields above.')
            return
        }

        setLoading(true)
        setErrors({})
        setFormAlert(null)

        try {
            await api.post(`/register/${token}`, {
                name:           form.name,
                email:          form.email,
                organization:   form.organization,
                contact_number: form.contact_number || null,
                password:       form.password,
                latitude:       coords?.latitude  ?? null,
                longitude:      coords?.longitude ?? null,
            })
            setStep('success')

        } catch (err) {
            const status = err.response?.status
            const msg    = err.response?.data?.message

            if (status === 422) {
                // Validation errors from Laravel. Shown inline per field,
                // plus a summary line so the user isn't left wondering why
                // nothing happened when the bad field is off-screen.
                setErrors(err.response.data.errors || {})
                setFormAlert(msg || 'Please check the highlighted fields above.')

            } else if (status === 401) {
                setMessage(msg)
                setStep('error')

            } else if (status === 409) {
                setMessage(msg || 'You are already registered for this event.')
                setStep('error')

            } else if (status === 403) {
                setMessage(msg || 'Registration is not available.')
                setStep('error')

            } else {
                setMessage(msg || 'Registration failed. Please try again.')
                setStep('error')
            }
        } finally {
            setLoading(false)
        }
    }

    // ── formatDate() ───────────────────────────────────────────────────────
    const formatDate = d => {
        if (!d) return ''
        return new Date(d).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
        })
    }

    // ── field() helper ─────────────────────────────────────────────────────
    const field = (name, label, placeholder, type = 'text', required = false) => (
        <div className="reg-field" key={name}>
            <label className="reg-label">
                {label}
                {required && <span className="reg-req">*</span>}
                {name === 'contact_number' && (
                    <span className="reg-count">{form.contact_number.length}/11</span>
                )}
            </label>
            <input
                type={type}
                className={`reg-input${errors[name] ? ' reg-input-error' : ''}`}
                value={form[name]}
                placeholder={placeholder}
                inputMode={name === 'contact_number' ? 'numeric' : undefined}
                maxLength={name === 'contact_number' ? 11 : undefined}
                autoComplete={
                    name === 'name'  ? 'name'  :
                    name === 'email' ? 'email' : 'off'
                }
                onChange={e => handleChange(name, e.target.value)}
            />
            {errors[name] && (
                <span className="reg-err">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    {errors[name][0]}
                </span>
            )}
        </div>
    )

    // ── passwordField() helper ─────────────────────────────────────────────
    const passwordField = (name, label, show, onToggle, required = false) => (
        <div className="reg-field" key={name}>
            <label className="reg-label">
                {label}
                {required && <span className="reg-req">*</span>}
            </label>
            <div className="reg-input-wrap">
                <input
                    type={show ? 'text' : 'password'}
                    className={`reg-input reg-input-pass${errors[name] ? ' reg-input-error' : ''}`}
                    value={form[name]}
                    placeholder={show ? 'mypassword123' : '••••••••'}
                    autoComplete={name === 'password' ? 'new-password' : 'new-password'}
                    onChange={e => handleChange(name, e.target.value)}
                />
                <button
                    type="button"
                    className="reg-eye"
                    onClick={onToggle}
                    tabIndex={-1}
                >
                    <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
            </div>
            {errors[name] && (
                <span className="reg-err">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    {errors[name][0]}
                </span>
            )}
        </div>
    )

    // ── GPS status indicator ───────────────────────────────────────────────
    const gpsIndicator = () => {
        const indicators = {
            requesting: {
                icon:  'bi-broadcast',
                color: '#3d5166',
                text:  'Getting your location...',
                sub:   'Please allow location access when prompted.',
            },
            granted: {
                icon:  'bi-geo-alt-fill',
                color: '#4a9d5a',
                text:  `Location confirmed${distance !== null ? ` · ${distance}m from venue` : ''}`,
                sub:   'You are within the registration zone.',
            },
            far: {
                icon:  'bi-exclamation-circle-fill',
                color: '#c0392b',
                text:  `You are ${distance}m away — too far to register`,
                sub:   `Must be within ${event?.radius_meters}m of the venue.`,
            },
            denied: {
                icon:  'bi-geo-alt',
                color: '#c0392b',
                text:  'Location access denied',
                sub:   'Please enable location in your browser settings and refresh.',
            },
            failed: {
                icon:  'bi-wifi-off',
                color: '#c0392b',
                text:  'Could not get your location',
                sub:   'GPS unavailable. Please try again or move outdoors.',
            },
        }

        const curr = indicators[gpsStatus]

        return (
            <div className="reg-gps-box" style={{ borderColor: curr.color + '33' }}>
                <i className={`bi ${curr.icon} reg-gps-icon`} style={{ color: curr.color }}></i>
                <div>
                    <div className="reg-gps-text" style={{ color: curr.color }}>
                        {curr.text}
                    </div>
                    <div className="reg-gps-sub">{curr.sub}</div>
                </div>
                {gpsStatus === 'failed' && (
                    <button
                        type="button"
                        className="reg-gps-retry"
                        onClick={() => {
                            setGpsStatus('requesting')
                            requestGPS(event)
                        }}
                    >
                        Retry
                    </button>
                )}
            </div>
        )
    }

    // ── canSubmit ──────────────────────────────────────────────────────────
    const canSubmit = gpsStatus === 'granted' && !loading

    // ════════════════════════════════════════════════════════════════════════
    // STATUS SCREENS
    // ════════════════════════════════════════════════════════════════════════

    if (step === 'validating') return (
        <div className="reg-status-page">
            <div className="reg-status-box">
                <div className="reg-status-spinner"></div>
                <div className="reg-status-title">Checking your link</div>
                <div className="reg-status-sub">Validating QR code, please wait...</div>
            </div>
        </div>
    )

    if (step === 'error') return (
        <div className="reg-status-page">
            <div className="reg-status-box">
                <span className="reg-status-icon">✕</span>
                <div className="reg-status-title">Cannot register</div>
                <div className="reg-status-sub">{message}</div>
            </div>
        </div>
    )

    if (step === 'success') return (
        <div className="reg-status-page">
            <div className="reg-success-box">
                <div className="reg-success-check">
                    <i className="bi bi-check-lg"></i>
                </div>
                <div className="reg-success-title">Registered successfully!</div>
                <p className="reg-success-sub">
                    You're registered for <strong>{event?.name}</strong>.
                    Use your email and password to log in to FireOps.
                </p>
                <div className="reg-success-divider"></div>
                <p className="reg-success-dl-label">
                    Experience the 3D fire safety simulation
                </p>
                <a href="/downloads/FireOps.apk" download className="reg-success-dl-btn">
                    <i className="bi bi-android2"></i>
                    Download FireOps app
                </a>
                <p className="reg-success-note">Android APK · Free · v1.0</p>
            </div>
        </div>
    )

    // ════════════════════════════════════════════════════════════════════════
    // MAIN REGISTRATION FORM
    // ════════════════════════════════════════════════════════════════════════
    return (
        <div className="reg-page">
            <div className="reg-card">

                {/* LEFT PANEL — branding + event context */}
                <div className="reg-left">
                    <div className="reg-brand">
                        <img src={fireopsLogo} alt="Logo" 
                        style={{
                            width:'50px',
                            height: '50px',
                            objectFit: 'contain',
                        }
                         }/> 
                        <div>
                            <div className="reg-brand-name">FireOps</div>
                            <div className="reg-brand-sub">
                                Bureau of Fire Protection<br />
                                Natividad Station
                            </div>
                        </div>
                    </div>

                    <div className="reg-ev-card">
                        <div className="reg-ev-section-label">Event</div>
                        <div className="reg-ev-name">{event?.name}</div>
                        <div className="reg-open-pill">
                            <span className="reg-open-dot"></span>
                            Registration open
                        </div>
                        <div className="reg-ev-meta">
                            <div className="reg-ev-meta-row">
                                <i className="bi bi-calendar3 reg-ev-meta-icon"></i>
                                <span className="reg-ev-meta-val">{formatDate(event?.date)}</span>
                            </div>
                            {event?.location_name && (
                                <div className="reg-ev-meta-row">
                                    <i className="bi bi-geo-alt reg-ev-meta-icon"></i>
                                    <span className="reg-ev-meta-val">{event.location_name}</span>
                                </div>
                            )}
                            {event?.radius_meters && (
                                <div className="reg-ev-meta-row">
                                    <i className="bi bi-broadcast reg-ev-meta-icon"></i>
                                    <span className="reg-ev-meta-val">
                                        {event.radius_meters}m registration radius
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Location notice — explains WHY GPS is needed */}
                    <div className="reg-location-notice">
                        <i className="bi bi-shield-lock-fill reg-notice-icon"></i>
                        <div>
                            <div className="reg-notice-title">Location required</div>
                            <div className="reg-notice-body">
                                This event requires you to be physically present at the venue.
                                Your location is used only to verify attendance — it is not stored or shared.
                            </div>
                        </div>
                    </div>

                    <div className="reg-left-footer">
                        <div className="reg-dl-label">
                            Train with the FireOps<br />Simulation app
                        </div>
                        <a href="/downloads/FireOps.apk" download className="reg-dl-btn">
                            <i className="bi bi-android2"></i>
                            Download FireOps
                        </a>
                    </div>
                </div>

                {/* RIGHT PANEL — the form */}
                <div className="reg-right">
                    <div className="reg-form-title">Event Registration</div>
                    <div className="reg-form-sub">
                        Fill in your details below. Your account will be used to log in to FireOps.
                    </div>

                    <form onSubmit={handleSubmit} className="reg-form">

                        {/* SECTION 1 — Personal info */}
                        <div className="reg-section-divider">
                            <span>Personal information</span>
                        </div>
                        <div className="reg-grid">
                            {field('name',  'Full name',  'Juan Dela Cruz',  'text',  true)}
                            {field('email', 'Email',      'juan@fireops.com', 'email', true)}
                        </div>
                        <div className="reg-grid">
                           <div className="reg-field">
                            <label className="reg-label">
                                Organization Type
                                <span className="reg-req">*</span>
                            </label>
                            <select
                                className={`reg-input${errors.organization ? ' reg-input-error' : ''}`}
                                value={form.organization}
                                onChange={e => handleChange('organization', e.target.value)}
                            >
                                <option value="">-- Select type --</option>
                                <option value="Employee">Employee</option>
                                <option value="Student">Student</option>
                            </select>
                            {errors.organization && (
                                <span className="reg-err">
                                    <i className="bi bi-exclamation-triangle-fill"></i>
                                    {errors.organization[0]}
                                </span>
                            )}
                        </div>
                            {field('contact_number', 'Contact no.',  '09XXXXXXXXX')}
                        </div>

                        {/* SECTION 2 — Account credentials */}
                        <div className="reg-section-divider" style={{ marginTop: 8 }}>
                            <span>FireOps login credentials</span>
                        </div>

                       
                        <div className="reg-cred-note">
                            <i className="bi bi-info-circle"></i>
                            Create a password to log in to the FireOps mobile app after registration.
                        </div>

                        <div className="reg-grid">
                            {passwordField(
                                'password', 'Password',
                                showPass, () => setShowPass(p => !p),
                                true
                            )}
                            {passwordField(
                                'confirm_password', 'Confirm password',
                                showConfirm, () => setShowConfirm(p => !p),
                                true
                            )}
                        </div>

                        {/* GPS status indicator */}
                        {gpsIndicator()}

                        {/* Validation summary — only when something failed */}
                        {formAlert && (
                            <div className="reg-form-alert">
                                <i className="bi bi-exclamation-triangle-fill"></i>
                                {formAlert}
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            type="submit"
                            className="reg-submit"
                            disabled={!canSubmit}
                        >
                            {loading ? (
                                <>
                                    <span className="reg-spinner"></span>
                                    Registering...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check2-circle"></i>
                                    Register for this event
                                </>
                            )}
                        </button>

                        {/* Mobile download link */}
                        <a href="/downloads/FireOps.apk" download className="reg-dl-btn reg-mobile-dl" style={{ marginTop: 16, justifyContent: 'center' }}>

                            <i className="bi bi-android2"></i>
                            Download FireOps app
                        </a>
                    </form>
                </div>
            </div>
        </div>
    )
}