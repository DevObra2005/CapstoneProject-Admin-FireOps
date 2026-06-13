import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import '../../../css/staff/register.css'

export default function Register() {
    
    const { token } = useParams()

  
    const [step,    setStep]    = useState('validating')
    const [event,   setEvent]   = useState(null)
    const [message, setMessage] = useState('')
    const [form,    setForm]    = useState({
        name: '', email: '', department: '', contact_number: ''
    })
    const [errors,  setErrors]  = useState({})
    const [loading, setLoading] = useState(false)
    const [coords,  setCoords]  = useState(null)

   
    useEffect(() => {
        axios.get(`/api/events/validate/${token}`)
            .then(res => {
                setEvent(res.data)
                setStep('locating')
                requestLocation()
            })
            .catch(err => {
                setMessage(err.response?.data?.message || 'Invalid or expired QR code.')
                setStep('error')
            })
    }, [token])

    
    const requestLocation = () => {
        if (!navigator.geolocation) {
            setMessage('Your browser does not support location access.')
            setStep('error')
            return
        }
        navigator.geolocation.getCurrentPosition(
            pos => {
                setCoords({
                    latitude:  pos.coords.latitude,
                    longitude: pos.coords.longitude,
                })
                setStep('form')
            },
            () => {
                setMessage('Location access denied. You must be physically at the venue to register.')
                setStep('error')
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
    }

   
    const handleChange = (name, value) => {
        if (name === 'contact_number') {
            value = value.replace(/\D/g, '').slice(0, 11)
        }
        setForm(prev => ({ ...prev, [name]: value }))
        setErrors(prev => ({ ...prev, [name]: null }))
    }

   
    const validate = () => {
        const e = {}
        if (!form.name.trim())  e.name  = ['Full name is required.']
        if (!form.email.trim()) e.email = ['Email address is required.']
        if (form.contact_number && !/^\d{11}$/.test(form.contact_number))
            e.contact_number = ['Must be exactly 11 digits.']
        return e
    }

    const handleSubmit = async ev => {
        ev.preventDefault()

     
        const clientErrors = validate()
        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors)
            return
        }

        setLoading(true)
        setErrors({})

        try {
          
            await axios.post('/api/register-participant', {
                event_id: event.event_id,
                ...form,
                ...coords,
            })
            setStep('success')
        } catch (err) {
       
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {})
            } else {
                setMessage(err.response?.data?.message || 'Registration failed.')
                setStep('error')
            }
        } finally {
            setLoading(false)
        }
    }

   
    const formatDate = d => {
        if (!d) return ''
        return new Date(d).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        })
    }

   
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

    // ── Status screens ────────────────────────────────────────────────────────
    if (step === 'validating') return (
        <div className="reg-status-page">
            <div className="reg-status-box">
                <div className="reg-status-spinner"></div>
                <div className="reg-status-title">Checking your link</div>
                <div className="reg-status-sub">Validating QR code, please wait...</div>
            </div>
        </div>
    )

    if (step === 'locating') return (
        <div className="reg-status-page">
            <div className="reg-status-box">
                <span className="reg-status-icon">📍</span>
                <div className="reg-status-title">Getting your location</div>
                <div className="reg-status-sub">
                    Please allow location access when prompted.
                    This confirms you are physically at the event venue.
                </div>
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
                <div className="reg-success-title">Registered successfully</div>
                <p className="reg-success-sub">
                    You're joined for <strong>{event?.name}</strong>. Enjoy the FireOps Gamified Training Simulation!
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

    // ── Main registration form ────────────────────────────────────────────────
    return (
        <div className="reg-page">
            <div className="reg-card">

                {/* LEFT PANEL — branding + event context */}
                <div className="reg-left">

                    {/* Brand */}
                    <div className="reg-brand">
                        <div className="reg-flame">🔥</div>
                        <div>
                            <div className="reg-brand-name">FireOps</div>
                            <div className="reg-brand-sub">
                                Bureau of Fire Protection<br />
                                Natividad Station
                            </div>
                        </div>
                    </div>

                    {/* Event info */}
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
                        </div>
                    </div>

                    {/* Download — visible on desktop, hidden on mobile */}
                    <div className="reg-left-footer">
                        <div className="reg-dl-label">
                            Train with the FireOps<br />simulation app
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
                        Fill in your details to register as a participant
                    </div>

                    <form onSubmit={handleSubmit} className="reg-form">
                        <div className="reg-section-divider">
                            <span>Participant information</span>
                        </div>

                        {/* Row 1 */}
                        <div className="reg-grid">
                            {field('name',  'Full name',  'Juan Dela Cruz',  'text',  true)}
                            {field('email', 'Email',      'juan@bfp.gov.ph', 'email', true)}
                        </div>

                        {/* Row 2 */}
                        <div className="reg-grid">
                            {field('department',     'Department',   'e.g. Operations')}
                            {field('contact_number', 'Contact no.',  '09XXXXXXXXX')}
                        </div>

                        <button
                            type="submit"
                            className="reg-submit"
                            disabled={loading}
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

                        <div className="reg-submit-note">
                            Your location is verified to confirm attendance at the venue
                        </div>

                        {/* Download link shown only on mobile */}
                        <a
                            href="/downloads/FireOps.apk"
                            download
                            className="reg-dl-btn reg-mobile-dl"
                            style={{ marginTop: 16, justifyContent: 'center' }}
                        >
                            <i className="bi bi-android2"></i>
                            Download FireOps app
                        </a>
                    </form>
                </div>

            </div>
        </div>
    )
}