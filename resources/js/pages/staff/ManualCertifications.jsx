import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import api from '../../api/axios'
import '../../../css/Staff/certifications.css'
import '../../../css/Staff/manualcertifications.css'

// ─────────────────────────────────────────────────────────────
// MANUAL CERTIFICATIONS
//
// Staff issue a certificate to a person or a whole organization
// (e.g. a school after a fire safety seminar), then email it,
// print it, or both.
//
// Reuses the table/toolbar styles from certifications.css so it
// looks like the rest of the staff panel. Only the form modal,
// the live preview, and the status pills are new (mc-* classes).
// ─────────────────────────────────────────────────────────────

const PER_PAGE = 10
const MESSAGE_MAX = 350   // must match 'max:350' in ManualCertificateController

// Pre-filled so staff don't retype the signatory every time.
// Change these when the fire marshal changes.
const DEFAULT_MARSHAL = 'SFO4 Froilan P Esperon'
const DEFAULT_TITLE   = 'Acting Municipal Fire Marshal'

const MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December']

/* Today's date as "YYYY-MM-DD" in the computer's LOCAL time.
   toISOString() would use UTC, which is 8 hours behind the
   Philippines — before 8:00 AM it would pre-fill YESTERDAY. */
const todayLocal = () => {
    const d = new Date()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
}

const emptyForm = () => ({
    recipient_name:     '',
    message:            'For having satisfactorily completed the **Fire Safety Awareness Training** conducted by BFP Natividad.',
    given_date:         todayLocal(),
    fire_marshal_name:  DEFAULT_MARSHAL,
    fire_marshal_title: DEFAULT_TITLE,
    recipient_email:    '',
    send_email:         true,
})

/* "Natividad National High School" → "NN" */
const initials = (name) => {
    const parts = (name || '').trim().split(/\s+/)
    if (!parts[0]) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/* A date-only string like "2026-09-26" is read by JavaScript as
   UTC midnight, which can shift the day in some timezones.
   Adding "T00:00" makes it local midnight instead. */
const formatDate = (d) => {
    const value = /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00` : d
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

/* 1 → "1st", 22 → "22nd", 24 → "24th" */
const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/* Turns **text** into <b>text</b> as React elements.
   No innerHTML, so typed HTML can never run. Same rule as the PDF. */
const renderBold = (text) =>
    (text || '').split(/(\*\*.+?\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**') && part.length > 4
            ? <b key={i}>{part.slice(2, -2)}</b>
            : <span key={i}>{part}</span>
    )

/* First Laravel error for a field, if any */
const fieldError = (errors, field) => errors?.[field]?.[0]

export default function ManualCertifications() {

    // ── List state ─────────────────────────────────────────
    const [certs, setCerts]     = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState('')
    const [search, setSearch]   = useState('')
    const [page, setPage]       = useState(1)
    const [notice, setNotice]   = useState(null)   // { type, text }

    // ── Create modal state ─────────────────────────────────
    const [showForm, setShowForm] = useState(false)
    const [form, setForm]         = useState(emptyForm)
    const [errors, setErrors]     = useState({})
    const [saving, setSaving]     = useState(false)

    // ── Send modal state ───────────────────────────────────
    const [sendTarget, setSendTarget] = useState(null)   // the certificate being sent
    const [sendEmail, setSendEmail]   = useState('')
    const [sendError, setSendError]   = useState('')
    const [sending, setSending]       = useState(false)

    const [pdfLoadingId, setPdfLoadingId] = useState(null)

    useEffect(() => { fetchCerts() }, [])
    useEffect(() => { setPage(1) }, [search])

    // Notices disappear on their own after 5 seconds
    useEffect(() => {
        if (!notice) return
        const t = setTimeout(() => setNotice(null), 5000)
        return () => clearTimeout(t)
    }, [notice])

    const fetchCerts = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await api.get('/staff/manual-certificates')
            setCerts(res.data)
        } catch (err) {
            console.error('Manual certificates fetch failed:', err)
            setError('Could not load certificates. Refresh the page to try again.')
        } finally {
            setLoading(false)
        }
    }

    // ── Filtering + pagination ─────────────────────────────
    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase()
        if (!term) return certs
        return certs.filter(c =>
            `${c.recipient_name} ${c.recipient_email ?? ''}`
                .toLowerCase()
                .includes(term)
        )
    }, [certs, search])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
    const pageRows   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
    const sentCount  = certs.filter(c => c.emailed_at).length

    // ── Create ─────────────────────────────────────────────
    const openForm = () => {
        setForm(emptyForm())
        setErrors({})
        setShowForm(true)
    }

    const updateField = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
        setErrors(prev => {
            if (!prev[field]) return prev
            const next = { ...prev }
            delete next[field]
            return next
        })
    }

    const handleCreate = async () => {
        setSaving(true)
        setErrors({})
        try {
            const payload = {
                ...form,
                // Don't send an empty string as an email — Laravel would
                // reject "" as an invalid address even when it's optional.
                recipient_email: form.recipient_email.trim() || null,
            }
            const res = await api.post('/staff/manual-certificates', payload)

            // Add to the top of the list without refetching
            setCerts(prev => [res.data.certificate, ...prev])
            setShowForm(false)
            setNotice({
                type: res.data.email_sent === false ? 'warn' : 'ok',
                text: res.data.message,
            })
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {})
            } else {
                setErrors({ _general: [err.response?.data?.message || 'Could not save the certificate. Try again.'] })
            }
        } finally {
            setSaving(false)
        }
    }

    // ── View / Print ───────────────────────────────────────
    // The PDF route needs the Bearer token, which only axios sends.
    // So we download it through axios as a "blob" (raw file data),
    // turn it into a temporary local URL, and open that.
    const handleViewPdf = async (cert) => {
        // Open the tab FIRST, while we're still inside the click.
        // Browsers block window.open() that happens after an await.
        const tab = window.open('', '_blank')
        setPdfLoadingId(cert.id)
        try {
            const res = await api.get(`/staff/manual-certificates/${cert.id}/pdf`, {
                responseType: 'blob',
            })
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
            if (tab) {
                tab.location.href = url
            } else {
                window.location.href = url   // popup blocked: open in this tab
            }
            // Free the memory after the new tab has had time to load it
            setTimeout(() => URL.revokeObjectURL(url), 60_000)
        } catch (err) {
            tab?.close()
            setNotice({ type: 'err', text: 'Could not open the PDF. Try again.' })
        } finally {
            setPdfLoadingId(null)
        }
    }

    // ── Send / Resend ──────────────────────────────────────
    const openSend = (cert) => {
        setSendTarget(cert)
        setSendEmail(cert.recipient_email || '')
        setSendError('')
    }

    const handleSend = async () => {
        setSending(true)
        setSendError('')
        try {
            const res = await api.post(`/staff/manual-certificates/${sendTarget.id}/send`, {
                recipient_email: sendEmail.trim(),
            })
            setCerts(prev => prev.map(c => c.id === sendTarget.id ? res.data.certificate : c))
            setSendTarget(null)
            setNotice({ type: 'ok', text: res.data.message })
        } catch (err) {
            if (err.response?.status === 429) {
                setSendError('Too many sends in a short time. Wait a minute and try again.')
            } else {
                setSendError(
                    fieldError(err.response?.data?.errors, 'recipient_email')
                    || err.response?.data?.message
                    || 'The email could not be sent. Try again.'
                )
            }
        } finally {
            setSending(false)
        }
    }

    // ════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════

    if (loading) {
        return (
            <div className="db-page">
                <div className="db-loading">
                    <i className="bi bi-arrow-repeat db-spin"></i>
                    Loading certificates...
                </div>
            </div>
        )
    }

    return (
        <div className="db-page">

            {/* ── HEADER ───────────────────────────────────── */}
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div>
                    <h4 className="db-title mb-0">Manual Certifications</h4>
                    <p className="db-sub mb-0">
                        Issue certificates to people or organizations, then email or print them
                    </p>
                </div>
                <button className="mc-btn mc-btn-primary" onClick={openForm}>
                    <i className="bi bi-plus-lg"></i>
                    New certificate
                </button>
            </div>

            {notice && (
                <div className={`mc-notice mc-notice-${notice.type}`} role="status">
                    <i className={`bi ${
                        notice.type === 'ok'   ? 'bi-check-circle-fill' :
                        notice.type === 'warn' ? 'bi-exclamation-triangle-fill' :
                                                 'bi-x-circle-fill'
                    }`}></i>
                    {notice.text}
                </div>
            )}

            {/* ── TOOLBAR ──────────────────────────────────── */}
            <div className="cf-toolbar mb-2">
                <label className="cf-search">
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Search by recipient or email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </label>
            </div>

            {/* ── LIST ─────────────────────────────────────── */}
            <div className="db-panel cf-panel">
                <div className="cf-panel-head">
                    <div className="db-panel-title">
                        <i className="bi bi-envelope-paper-fill"></i>
                        Issued certificates
                    </div>
                    <span className="db-panel-badge">
                        {certs.length} issued, {sentCount} emailed
                    </span>
                </div>

                {error ? (
                    <div className="cf-empty">
                        <i className="bi bi-exclamation-circle"></i>
                        <div>{error}</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="cf-empty">
                        <i className="bi bi-inbox"></i>
                        <div>
                            {certs.length === 0
                                ? 'No certificates yet. Click "New certificate" to issue the first one.'
                                : 'No certificates match your search.'}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="cf-table-wrap">
                            <table className="cf-tbl">
                                <thead>
                                    <tr>
                                        <th style={{ width: '34%' }}>Recipient</th>
                                        <th style={{ width: '14%' }}>Date given</th>
                                        <th style={{ width: '18%' }}>Email</th>
                                        <th style={{ width: '14%' }}>Issued by</th>
                                        <th className="c" style={{ width: '20%' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map(cert => (
                                        <tr key={cert.id}>
                                            <td>
                                                <div className="cf-who">
                                                    <div className="cf-avatar">{initials(cert.recipient_name)}</div>
                                                    <div className="cf-who-text">
                                                        <div className="cf-who-name">{cert.recipient_name}</div>
                                                        <div className="cf-who-mail">
                                                            {cert.recipient_email || 'Print only'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="mc-cell">{formatDate(cert.given_date)}</td>

                                            <td>
                                                {cert.emailed_at ? (
                                                    <span className="mc-pill mc-pill-sent" title={cert.recipient_email}>
                                                        <i className="bi bi-check2"></i>
                                                        Sent {formatDate(cert.emailed_at)}
                                                    </span>
                                                ) : (
                                                    <span className="mc-pill mc-pill-none">
                                                        Not sent
                                                    </span>
                                                )}
                                            </td>

                                            <td className="mc-cell">{cert.issued_by}</td>

                                            <td className="c">
                                                <div className="mc-actions">
                                                    <button
                                                        className="mc-btn mc-btn-ghost"
                                                        onClick={() => handleViewPdf(cert)}
                                                        disabled={pdfLoadingId === cert.id}
                                                    >
                                                        <i className={`bi ${pdfLoadingId === cert.id ? 'bi-arrow-repeat db-spin' : 'bi-printer'}`}></i>
                                                        View / Print
                                                    </button>
                                                    <button
                                                        className="mc-btn mc-btn-ghost"
                                                        onClick={() => openSend(cert)}
                                                    >
                                                        <i className="bi bi-send"></i>
                                                        {cert.emailed_at ? 'Resend' : 'Send'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="cf-foot">
                            <span>Showing {pageRows.length} of {filtered.length} certificates</span>
                            <div className="cf-pager">
                                <button className="cf-pg" disabled={page === 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}>
                                    <i className="bi bi-chevron-left"></i>
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                    <button key={n} className={`cf-pg ${page === n ? 'active' : ''}`}
                                            onClick={() => setPage(n)}>
                                        {n}
                                    </button>
                                ))}
                                <button className="cf-pg" disabled={page === totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── CREATE MODAL ─────────────────────────────── */}
            {/* createPortal renders the modal into <body>, outside the page.
                A parent with transform/filter would otherwise trap a
                position:fixed overlay inside it. */}
            {showForm && createPortal(
                <div className="mc-overlay" onMouseDown={(e) => e.target === e.currentTarget && !saving && setShowForm(false)}>
                    <div className="mc-modal" role="dialog" aria-modal="true" aria-labelledby="mc-form-title">

                        <div className="mc-modal-head">
                            <div>
                                <h5 id="mc-form-title" className="mb-0">New certificate</h5>
                                <div className="mc-modal-sub">The preview updates as you type</div>
                            </div>
                            <button className="mc-close" onClick={() => setShowForm(false)} disabled={saving} aria-label="Close">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="mc-modal-body">

                            {/* ── Form ── */}
                            <div className="mc-form">
                                {errors._general && (
                                    <div className="mc-notice mc-notice-err mb-2">
                                        <i className="bi bi-x-circle-fill"></i>
                                        {errors._general[0]}
                                    </div>
                                )}

                                <Field label="Recipient name" error={fieldError(errors, 'recipient_name')}
                                       hint="A person or a whole organization">
                                    <input
                                        className="mc-input"
                                        value={form.recipient_name}
                                        onChange={e => updateField('recipient_name', e.target.value)}
                                        placeholder="Natividad National High School"
                                        autoFocus
                                    />
                                </Field>

                                <Field label="Certificate message" error={fieldError(errors, 'message')}
                                       hint={`Wrap words in **double asterisks** to make them bold · ${form.message.length}/${MESSAGE_MAX}`}>
                                    <textarea
                                        className="mc-input mc-textarea"
                                        value={form.message}
                                        onChange={e => updateField('message', e.target.value)}
                                        maxLength={MESSAGE_MAX}
                                    />
                                </Field>

                                <Field label="Date given" error={fieldError(errors, 'given_date')}>
                                    <input
                                        type="date"
                                        className="mc-input"
                                        value={form.given_date}
                                        onChange={e => updateField('given_date', e.target.value)}
                                    />
                                </Field>

                                <div className="mc-row">
                                    <Field label="Fire marshal" error={fieldError(errors, 'fire_marshal_name')}>
                                        <input
                                            className="mc-input"
                                            value={form.fire_marshal_name}
                                            onChange={e => updateField('fire_marshal_name', e.target.value)}
                                        />
                                    </Field>
                                    <Field label="Position" error={fieldError(errors, 'fire_marshal_title')}>
                                        <input
                                            className="mc-input"
                                            value={form.fire_marshal_title}
                                            onChange={e => updateField('fire_marshal_title', e.target.value)}
                                        />
                                    </Field>
                                </div>

                                <div className="mc-divider"></div>

                                <label className="mc-check">
                                    <input
                                        type="checkbox"
                                        checked={form.send_email}
                                        onChange={e => updateField('send_email', e.target.checked)}
                                    />
                                    Email the certificate after saving
                                </label>

                                {form.send_email && (
                                    <Field label="Send to" error={fieldError(errors, 'recipient_email')}>
                                        <input
                                            type="email"
                                            className="mc-input"
                                            value={form.recipient_email}
                                            onChange={e => updateField('recipient_email', e.target.value)}
                                            placeholder="school@deped.gov.ph"
                                        />
                                    </Field>
                                )}
                            </div>

                            {/* ── Live preview ── */}
                            <div className="mc-preview-wrap">
                                <CertificatePreview form={form} />
                            </div>
                        </div>

                        <div className="mc-modal-foot">
                            <button className="mc-btn mc-btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>
                                Cancel
                            </button>
                            <button className="mc-btn mc-btn-primary" onClick={handleCreate} disabled={saving}>
                                {saving ? (
                                    <><i className="bi bi-arrow-repeat db-spin"></i> Saving...</>
                                ) : form.send_email ? (
                                    <><i className="bi bi-send-fill"></i> Save and send</>
                                ) : (
                                    <><i className="bi bi-check2"></i> Save certificate</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── SEND MODAL ───────────────────────────────── */}
            {sendTarget && createPortal(
                <div className="mc-overlay" onMouseDown={(e) => e.target === e.currentTarget && !sending && setSendTarget(null)}>
                    <div className="mc-modal mc-modal-sm" role="dialog" aria-modal="true" aria-labelledby="mc-send-title">
                        <div className="mc-modal-head">
                            <div>
                                <h5 id="mc-send-title" className="mb-0">
                                    {sendTarget.emailed_at ? 'Resend certificate' : 'Send certificate'}
                                </h5>
                                <div className="mc-modal-sub">{sendTarget.recipient_name}</div>
                            </div>
                            <button className="mc-close" onClick={() => setSendTarget(null)} disabled={sending} aria-label="Close">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="mc-form mc-send-body">
                            <Field label="Send to" error={sendError}>
                                <input
                                    type="email"
                                    className="mc-input"
                                    value={sendEmail}
                                    onChange={e => { setSendEmail(e.target.value); setSendError('') }}
                                    placeholder="school@deped.gov.ph"
                                    autoFocus
                                />
                            </Field>
                        </div>

                        <div className="mc-modal-foot">
                            <button className="mc-btn mc-btn-ghost" onClick={() => setSendTarget(null)} disabled={sending}>
                                Cancel
                            </button>
                            <button
                                className="mc-btn mc-btn-primary"
                                onClick={handleSend}
                                disabled={sending || !sendEmail.trim()}
                            >
                                {sending
                                    ? <><i className="bi bi-arrow-repeat db-spin"></i> Sending...</>
                                    : <><i className="bi bi-send-fill"></i> Send</>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

/* ── Small form field wrapper: label, input, hint or error ── */
function Field({ label, hint, error, children }) {
    return (
        <div className="mc-field">
            <label className="mc-label">{label}</label>
            {children}
            {error
                ? <div className="mc-error">{error}</div>
                : hint && <div className="mc-hint">{hint}</div>}
        </div>
    )
}

/* ── Live preview: same layout as the PDF, drawn in HTML ──
   Uses the SAME background and logo files as the PDF template,
   served from /public, so what staff see is what gets printed. */
function CertificatePreview({ form }) {
    const name = form.recipient_name.trim() || 'Recipient name'
    // Same shrink rule as the PDF: 30pt, smaller for long names.
    // 30pt on a 297mm-wide page = 3.56% of the width = 3.56cqw
    const nameSize = Math.min(3.56, 3.56 * 30 / Math.max(name.length, 1))

    const date = form.given_date ? new Date(form.given_date + 'T00:00') : null

    // Same rules as the PDF: one paragraph (line breaks become spaces),
    // 12pt up to 220 characters, then shrinking gradually to 10pt.
    // 1pt on a 297mm-wide page = 0.1188cqw
    const message  = form.message.replace(/\s*\n\s*/g, ' ').trim()
    const bodyPt   = message.length <= 220 ? 12 : Math.max(10, 12 * Math.sqrt(220 / message.length))
    const bodySize = bodyPt * 0.1188

    return (
        <div className="mc-cert" aria-label="Certificate preview">
            <img className="mc-cert-bg" src="/Images/certificates/manual-certificate-bg.png" alt="" />

            <div className="mc-cert-content">
                <div className="mc-cert-logos">
                    {[1, 2, 3, 4, 5].map(i => (
                        <img
                            key={i}
                            src={`/Images/certificates/logo${i}.png`}
                            alt=""
                            // Missing logo files just disappear, like in the PDF
                            onError={e => { e.currentTarget.style.display = 'none' }}
                        />
                    ))}
                </div>

                <div className="mc-cert-agency">
                    Republic of the Philippines<br />
                    Department of the Interior and Local Government<br />
                    <b>BUREAU OF FIRE PROTECTION</b><br />
                    <b>REGION I</b><br />
                    <b>NATIVIDAD FIRE STATION - PANGASINAN</b>
                </div>

                <div className="mc-cert-award">Award this</div>
                <div className="mc-cert-title">CERTIFICATE</div>
                <div className="mc-cert-to">to</div>

                <div className="mc-cert-name" style={{ fontSize: `${nameSize}cqw` }}>{name}</div>

                <div className="mc-cert-body" style={{ fontSize: `${bodySize}cqw` }}>{renderBold(message)}</div>

                <div className="mc-cert-given">
                    {date ? (
                        <>Given this <b>{ordinal(date.getDate())}</b> day of <b>{MONTHS[date.getMonth()]} {date.getFullYear()}</b> at Natividad Fire Station, Natividad, Pangasinan.</>
                    ) : (
                        <>Given this ___ day of ________ at Natividad Fire Station, Natividad, Pangasinan.</>
                    )}
                </div>

                <div className="mc-cert-signer">
                    <div className="mc-cert-sname">{form.fire_marshal_name || 'Fire marshal'}</div>
                    <div className="mc-cert-stitle">
                        {form.fire_marshal_title || 'Position'}<br />BFP Natividad
                    </div>
                </div>
            </div>
        </div>
    )
}