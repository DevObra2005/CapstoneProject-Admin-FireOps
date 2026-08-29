import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../api/axios'
import ExcelImportTab from './ExcelImportTab'
import '../../../css/Staff/addparticipant.css'

export default function AddParticipantModal({ event, onClose, onSuccess }) {
    const [tab, setTab]           = useState('manual')
    const [saving, setSaving]     = useState(false)
    const [feedback, setFeedback] = useState(null)   // { type, message }
    const [errors, setErrors]     = useState({})     // field → message

    const [form, setForm] = useState({
        name: '',
        email: '',
        organization: '',
        contact_number: '',
    })

    // Escape closes the modal — but not mid-save, because the request
    // is already in flight and closing would leave the staff member
    // unsure whether it went through.
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape' && !saving) onClose()
        }
        window.addEventListener('keydown', onKeyDown)

        // Stop the page behind the modal from scrolling
        document.body.style.overflow = 'hidden'

        return () => {
            window.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = ''
        }
    }, [onClose, saving])

    const updateField = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
        // Clear that field's error as soon as the user edits it
        setErrors(prev => {
            if (!prev[field]) return prev
            const next = { ...prev }
            delete next[field]
            return next
        })
    }

    // ── LIVE VALIDATION ──────────────────────────────────────────────
    // These run on every render so the UI can show WHY the button is
    // disabled. Without them the user sees a dead button and no reason.
    // The server re-checks all of this — client-side rules are for
    // guidance only, never for security.

    // Deliberately loose. Strict email regexes reject valid addresses
    // (plus signs, new TLDs); Laravel does the authoritative check.
    const emailValid =
        form.email.trim() === '' || /^\S+@\S+\.\S+$/.test(form.email.trim())

    // Optional field — but if filled, must be a PH mobile number:
    // 11 digits starting 09. Matches the server regex exactly.
    const phoneValid =
        form.contact_number === '' || /^09\d{9}$/.test(form.contact_number)

    const canSubmit =
        form.name.trim() !== '' &&
        form.email.trim() !== '' &&
        emailValid &&
        form.organization !== '' &&
        phoneValid &&
        !saving

    const handleSubmit = async () => {
        setSaving(true)
        setFeedback(null)
        setErrors({})

        try {
            const res = await api.post(
                `/staff/events/${event.id}/participants`,
                {
                    name:           form.name.trim(),
                    email:          form.email.trim(),
                    organization:   form.organization,
                    contact_number: form.contact_number.trim() || null,
                }
            )

            const { status, email_sent, participant } = res.data

            // Three outcomes, three different messages. A single generic
            // "success" would hide the fact that no password was sent.
            let message
            if (status === 'created_new') {
                message = email_sent
                    ? `Account created. Login details sent to ${participant.email}.`
                    : `Account created, but the email could not be sent. Give ${participant.name} their password manually.`
            } else {
                message = email_sent
                    ? `${participant.name} already had an account and has been added to this event.`
                    : `${participant.name} was added to this event, but the notification email failed.`
            }

            setFeedback({
                type: email_sent ? 'success' : 'warning',
                message,
            })

            // Reset the form so staff can add the next person immediately
            setForm({ name: '', email: '', organization: '', contact_number: '' })

            // Refresh the list behind the modal
            onSuccess()

        } catch (err) {
            const status = err.response?.status

            if (status === 422) {
                // Laravel validation. err.response.data.errors is an object
                // of field → array of messages. We keep the first of each.
                const raw = err.response.data.errors || {}
                const mapped = {}
                Object.keys(raw).forEach(field => {
                    mapped[field] = raw[field][0]
                })
                setErrors(mapped)
                setFeedback({
                    type: 'error',
                    message: 'Please correct the highlighted fields.',
                })

            } else if (status === 409) {
                // Already registered for this event
                setFeedback({
                    type: 'warning',
                    message: err.response.data.message,
                })

            } else {
                setFeedback({
                    type: 'error',
                    message: 'Something went wrong. Please try again.',
                })
            }
        } finally {
            setSaving(false)
        }
    }

    // createPortal renders this outside the component tree, directly on
    // <body>. Without it, any ancestor with overflow:hidden or a
    // transform would clip or mis-position the modal.
    return createPortal(
        <div
            className="ap-backdrop"
            onClick={() => { if (!saving) onClose() }}
        >
            {/* stopPropagation keeps a click INSIDE the panel from
                bubbling up to the backdrop and closing the modal */}
            <div className="ap-panel" onClick={e => e.stopPropagation()}>

                <div className="ap-header">
                    <div className="ap-header-text">
                        <h5 className="ap-title">
                            <i className="bi bi-person-plus-fill"></i>
                            Add Participant
                        </h5>
                        <p className="ap-subtitle">{event.name}</p>
                    </div>
                    <button
                        className="ap-close"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close"
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="ap-tabs">
                    <button
                        className={`ap-tab ${tab === 'manual' ? 'ap-tab-active' : ''}`}
                        onClick={() => setTab('manual')}
                        disabled={saving}
                    >
                        <i className="bi bi-pencil-square"></i>
                        <span>Manual Entry</span>
                    </button>
                    <button
                        className={`ap-tab ${tab === 'excel' ? 'ap-tab-active' : ''}`}
                        onClick={() => setTab('excel')}
                        disabled={saving}
                    >
                        <i className="bi bi-file-earmark-spreadsheet"></i>
                        <span>Upload Excel</span>
                    </button>
                </div>

                <div className="ap-body">

                    {feedback && (
                        <div className={`ap-alert ap-alert-${feedback.type}`}>
                            <i className={`bi ${
                                feedback.type === 'success' ? 'bi-check-circle-fill' :
                                feedback.type === 'warning' ? 'bi-exclamation-triangle-fill' :
                                'bi-x-circle-fill'
                            }`}></i>
                            <span>{feedback.message}</span>
                        </div>
                    )}

                    {tab === 'manual' && (
                        <div className="ap-form">

                            <div className="ap-field">
                                <label className="ap-label">
                                    Full Name <span className="ap-required">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={`ap-input ${errors.name ? 'ap-input-error' : ''}`}
                                    placeholder="Juan Dela Cruz"
                                    value={form.name}
                                    onChange={e => updateField('name', e.target.value)}
                                    disabled={saving}
                                />
                                {errors.name && <div className="ap-error">{errors.name}</div>}
                            </div>

                            <div className="ap-field">
                                <label className="ap-label">
                                    Email Address <span className="ap-required">*</span>
                                </label>
                                <input
                                    type="email"
                                    autoComplete="off"
                                    className={`ap-input ${
                                        errors.email || !emailValid ? 'ap-input-error' : ''
                                    }`}
                                    placeholder="juan.delacruz@example.com"
                                    value={form.email}
                                    onChange={e => updateField('email', e.target.value)}
                                    disabled={saving}
                                />
                                {errors.email ? (
                                    <div className="ap-error">{errors.email}</div>
                                ) : !emailValid ? (
                                    <div className="ap-error">
                                        That doesn't look like a valid email address.
                                    </div>
                                ) : (
                                    <div className="ap-hint">
                                        Login details will be sent to this address.
                                    </div>
                                )}
                            </div>

                            <div className="ap-field-row">
                                <div className="ap-field">
                                    <label className="ap-label">
                                        Organization <span className="ap-required">*</span>
                                    </label>
                                    <select
                                        className={`ap-input ap-select ${
                                            errors.organization ? 'ap-input-error' : ''
                                        }`}
                                        value={form.organization}
                                        onChange={e => updateField('organization', e.target.value)}
                                        disabled={saving}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Employee">Employee</option>
                                        <option value="Student">Student</option>
                                    </select>
                                    {errors.organization && (
                                        <div className="ap-error">{errors.organization}</div>
                                    )}
                                </div>

                                <div className="ap-field">
                                    <label className="ap-label">Contact Number</label>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={11}
                                        className={`ap-input ${
                                            errors.contact_number || !phoneValid
                                                ? 'ap-input-error' : ''
                                        }`}
                                        placeholder="09171234567"
                                        value={form.contact_number}
                                        onChange={e => {
                                            // Strip everything that isn't a digit as the
                                            // user types. Blocks letters, spaces, dashes,
                                            // and pasted +63 prefixes before validation
                                            // ever sees them.
                                            const digitsOnly = e.target.value.replace(/\D/g, '')
                                            updateField('contact_number', digitsOnly)
                                        }}
                                        disabled={saving}
                                    />
                                    {errors.contact_number ? (
                                        <div className="ap-error">{errors.contact_number}</div>
                                    ) : !phoneValid ? (
                                        <div className="ap-error">
                                            Must be 11 digits starting with 09.
                                        </div>
                                    ) : (
                                        <div className="ap-hint">
                                            11 digits, starts with 09
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                    {tab === 'excel' && (
                        <ExcelImportTab event={event} onSuccess={onSuccess} />
                    )}

                </div>

                <div className="ap-footer">
                    <button
                        className="ap-btn ap-btn-ghost"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Close
                    </button>
                    {tab === 'manual' && (
                        <button
                            className="ap-btn ap-btn-primary"
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                        >
                            {saving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status"></span>
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-person-plus-fill"></i>
                                    Add Participant
                                </>
                            )}
                        </button>
                    )}
                </div>

            </div>
        </div>,
        document.body
    )
}