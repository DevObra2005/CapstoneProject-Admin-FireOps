import { useState, useEffect, useMemo } from 'react'
import api from '../../api/axios'
import '../../../css/Staff/certifications.css'

const ENVS = ['office', 'classroom', 'kitchen']
const PER_PAGE = 10

/* Build initials for the avatar circle — "Juan Dela Cruz" → "JD" */
const initials = (name) => {
    const parts = (name || '').trim().split(/\s+/)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })

export default function Certifications() {

    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState('')
    const [period, setPeriod]   = useState('all')

    const [search, setSearch]     = useState('')
    const [eventId, setEventId]   = useState('all')
    const [progress, setProgress] = useState('all')
    const [page, setPage]         = useState(1)

    useEffect(() => {
        fetchCertifications()
    }, [period])

    /* Reset to page 1 whenever a filter changes, otherwise you can
       end up stranded on page 5 of a 2-page result set. */
    useEffect(() => {
        setPage(1)
    }, [search, eventId, progress, period])

    const fetchCertifications = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await api.get('/staff/certifications', {
                params: { period }
            })
            setData(res.data)
        } catch (err) {
            console.error('Certifications fetch failed:', err)
            setError('Failed to load certifications.')
        } finally {
            setLoading(false)
        }
    }

    /* ── GROUPING ─────────────────────────────────────────────
       The API returns one row per certificate. The table shows
       one row per participant + event pair, so we fold the flat
       list into groups keyed by "participantId-eventId".
       Think of it like Laravel's ->groupBy() but in JS.
       ───────────────────────────────────────────────────────── */
    const rows = useMemo(() => {
        if (!data?.certificates) return []

        const groups = {}

        data.certificates.forEach(cert => {
            const key = `${cert.participant_id}-${cert.event_id}`

            if (!groups[key]) {
                groups[key] = {
                    key,
                    participantId:    cert.participant_id,
                    participantName:  cert.participant_name,
                    participantEmail: cert.participant_email,
                    eventId:          cert.event_id,
                    eventName:        cert.event_name,
                    issuedAt:         cert.issued_at,
                    envs:             {},
                }
            }

            groups[key].envs[cert.environment] = {
                certificateId: cert.id,
                score:         cert.percentage_score,
                label:         cert.score_label,
            }

            // Keep the earliest issue date for the group
            if (cert.issued_at < groups[key].issuedAt) {
                groups[key].issuedAt = cert.issued_at
            }
        })

        return Object.values(groups)
            .map(g => ({ ...g, earned: Object.keys(g.envs).length }))
            .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    }, [data])

    /* Unique event list for the dropdown */
    const events = useMemo(() => {
        if (!data?.certificates) return []
        const seen = new Map()
        data.certificates.forEach(c => seen.set(c.event_id, c.event_name))
        return [...seen].map(([id, name]) => ({ id, name }))
    }, [data])

    /* ── FILTERING ────────────────────────────────────────── */
    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase()

        return rows.filter(r => {
            if (term) {
                const haystack = `${r.participantName} ${r.participantEmail}`.toLowerCase()
                if (!haystack.includes(term)) return false
            }
            if (eventId !== 'all' && String(r.eventId) !== String(eventId)) return false
            if (progress === 'complete' && r.earned !== 3) return false
            if (progress === 'partial'  && r.earned === 3) return false
            return true
        })
    }, [rows, search, eventId, progress])

    /* ── PAGINATION ───────────────────────────────────────── */
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
    const pageRows   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

    /* ── ACTIONS ──────────────────────────────────────────── */
    const handleView = (row) => {
        console.log('View certificates for', row.key)
    }

    const handleResend = async (row) => {
        try {
            await api.post('/staff/certifications/resend', {
                participant_id: row.participantId,
                event_id:       row.eventId,
            })
            alert('Certificates resent.')
        } catch (err) {
            console.error('Resend failed:', err)
        }
    }

    if (loading) {
        return (
            <div className="db-page">
                <div className="db-loading">
                    <i className="bi bi-arrow-repeat db-spin"></i>
                    Loading certifications...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="db-page">
                <div className="cf-empty">
                    <i className="bi bi-exclamation-circle"></i>
                    <div>{error}</div>
                </div>
            </div>
        )
    }

    return (
        <div className="db-page">

            {/* ── HEADER ───────────────────────────────────── */}
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div>
                    <h4 className="db-title mb-0">Certifications</h4>
                    <p className="db-sub mb-0">
                        Participants who passed a simulation and the certificates they've earned
                    </p>
                </div>
                <div className="db-toggle">
                    <button
                        className={`db-tog-btn ${period === 'all' ? 'active' : ''}`}
                        onClick={() => setPeriod('all')}
                    >
                        All time
                    </button>
                    <button
                        className={`db-tog-btn ${period === '30days' ? 'active' : ''}`}
                        onClick={() => setPeriod('30days')}
                    >
                        Last 30 days
                    </button>
                </div>
            </div>

            {/* ── OVERVIEW ─────────────────────────────────── */}
            <div className="db-section-label">Overview</div>
            <div className="row g-2 mb-2">
                <div className="col-12 col-md-4">
                    <div className="db-kpi-card fill">
                        <div className="db-kpi-line red"></div>
                        <div className="d-flex align-items-start justify-content-between mb-2 mt-1">
                            <div className="db-kpi-icon r"><i className="bi bi-award-fill"></i></div>
                            <span className="db-kpi-tag r">Issued</span>
                        </div>
                        <div className="db-kpi-val">{data?.overview?.total_issued ?? 0}</div>
                        <div className="db-kpi-sub">Total certificates issued</div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="db-kpi-card">
                        <div className="db-kpi-line green"></div>
                        <div className="d-flex align-items-start justify-content-between mb-2 mt-1">
                            <div className="db-kpi-icon g"><i className="bi bi-people-fill"></i></div>
                            <span className="db-kpi-tag g">Certified</span>
                        </div>
                        <div className="db-kpi-val">{data?.overview?.participants_certified ?? 0}</div>
                        <div className="db-kpi-sub">Participants with at least one certificate</div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="db-kpi-card">
                        <div className="db-kpi-line blue"></div>
                        <div className="d-flex align-items-start justify-content-between mb-2 mt-1">
                            <div className="db-kpi-icon b"><i className="bi bi-patch-check-fill"></i></div>
                            <span className="db-kpi-tag b">Complete</span>
                        </div>
                        <div className="db-kpi-val">{data?.overview?.completed_all ?? 0}</div>
                        <div className="db-kpi-sub">Finished all three environments</div>
                    </div>
                </div>
            </div>

            {/* ── ROSTER ───────────────────────────────────── */}
            <div className="db-section-label">Roster</div>

            <div className="cf-toolbar mb-2">
                <label className="cf-search">
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Search by name or email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </label>

                <select
                    className="cf-select"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                >
                    <option value="all">All events</option>
                    {events.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                </select>

                <select
                    className="cf-select"
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                >
                    <option value="all">All participants</option>
                    <option value="complete">Completed all three</option>
                    <option value="partial">Still in progress</option>
                </select>
            </div>

            <div className="db-panel cf-panel">

                <div className="cf-panel-head">
                    <div className="db-panel-title">
                        <i className="bi bi-award-fill"></i>
                        Certified participants
                    </div>
                    <span className="db-panel-badge">
                        {data?.overview?.total_issued ?? 0} certificates issued
                    </span>
                </div>

                {filtered.length === 0 ? (
                    <div className="cf-empty">
                        <i className="bi bi-inbox"></i>
                        <div>
                            {rows.length === 0
                                ? 'No certificates issued yet.'
                                : 'No certificates match these filters.'}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="cf-table-wrap">
                            <table className="cf-tbl">
                                <thead>
                                    <tr>
                                        <th style={{ width: '26%' }}>Participant</th>
                                        <th style={{ width: '20%' }}>Event</th>
                                        <th className="c" style={{ width: '10%' }}>Office</th>
                                        <th className="c" style={{ width: '10%' }}>Classroom</th>
                                        <th className="c" style={{ width: '10%' }}>Kitchen</th>
                                        <th className="c" style={{ width: '14%' }}>Progress</th>

                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map(row => (
                                        <tr key={row.key}>
                                            <td>
                                                <div className="cf-who">
                                                    <div className="cf-avatar">{initials(row.participantName)}</div>
                                                    <div className="cf-who-text">
                                                        <div className="cf-who-name">{row.participantName}</div>
                                                        <div className="cf-who-mail">{row.participantEmail}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="cf-event">
                                                    <i className="bi bi-calendar-event-fill"></i>
                                                    <span>{row.eventName}</span>
                                                </div>
                                                <div className="cf-event-date">{formatDate(row.issuedAt)}</div>
                                            </td>

                                            {ENVS.map(env => (
                                                <td className="c" key={env}>
                                                    {row.envs[env] ? (
                                                        <div className="cf-score">
                                                            {row.envs[env].score}%
                                                            <small>{row.envs[env].label}</small>
                                                        </div>
                                                    ) : (
                                                        <span className="cf-none">—</span>
                                                    )}
                                                </td>
                                            ))}

                                            <td className="c">
                                                <div className="cf-prog">
                                                    <div className="cf-dots">
                                                        {ENVS.map(env => (
                                                            <i
                                                                key={env}
                                                                className={`cf-dot ${row.envs[env] ? 'on' : ''}`}
                                                            ></i>
                                                        ))}
                                                    </div>
                                                    <span className={`cf-count ${row.earned === 3 ? 'full' : ''}`}>
                                                        {row.earned} of 3
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="cf-foot">
                            <span>
                                Showing {pageRows.length} of {filtered.length} records
                            </span>
                            <div className="cf-pager">
                                <button
                                    className="cf-pg"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                    <button
                                        key={n}
                                        className={`cf-pg ${page === n ? 'active' : ''}`}
                                        onClick={() => setPage(n)}
                                    >
                                        {n}
                                    </button>
                                ))}
                                <button
                                    className="cf-pg"
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── LEGEND ───────────────────────────────────── */}
            <div className="cf-legend">
                <span><i className="cf-sw on"></i> Certificate earned</span>
                <span><i className="cf-sw"></i> Not yet completed</span>
                <span><i className="bi bi-eye"></i> Opens per-certificate list with download &amp; resend</span>
            </div>

        </div>
    )
}