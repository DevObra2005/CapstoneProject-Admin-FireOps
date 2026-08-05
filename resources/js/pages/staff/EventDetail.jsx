import { useState, useEffect } from 'react'
import api from '../../api/axios'
import ParticipantCardList from './ParticipantCardList'
import ParticipantAllSessions from './ParticipantAllSessions'

export default function EventDetail({ event, onBack, onEdit, onDelete, onQR, onToggle }) {
    const [participants, setParticipants] = useState([])
    const [loadingP, setLoadingP]         = useState(true)
    const [toggling, setToggling]         = useState(false)
    const [search, setSearch]             = useState('')
    const [results, setResults]           = useState([])
    const [loadingR, setLoadingR]         = useState(true)
    const [selectedParticipant, setSelectedParticipant] = useState(null)

    useEffect(() => {
        const fetchParticipants = async () => {
            try {
                const res = await api.get(`/staff/events/${event.id}/participants`)
                setParticipants(Array.isArray(res.data) ? res.data : [])
            } catch {
                setParticipants([])
            } finally {
                setLoadingP(false)
            }
        }
        fetchParticipants()
    }, [event.id])

    useEffect(() => {
        const fetchResults = async () => {
            try {
               const res = await api.get(`/staff/events/${event.id}/results`)
                setResults(Array.isArray(res.data) ? res.data : [])
            } catch {
                setResults([])
            } finally {
                setLoadingR(false)
            }
        }
        fetchResults()
    }, [event.id])

    const handleToggleClick = async () => {
        setToggling(true)
        try {
            await onToggle(event)
        } finally {
            setToggling(false)
        }
    }

    const filteredParticipants = participants.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase())
    )

    const sessionsForParticipant = (participant) =>
        results.filter(r => r.participant_email === participant.email)

    const uniqueCompletedEmails = new Set(results.map(r => r.participant_email))
    const totalCompleted = uniqueCompletedEmails.size

    const totalFailed = participants.filter(
        p => !uniqueCompletedEmails.has(p.email)
    ).length

    const avgScore = totalCompleted > 0
        ? Math.round(
            [...uniqueCompletedEmails].reduce((sum, email) => {
                const personSessions = results.filter(r => r.participant_email === email)
                const bestScore = Math.max(...personSessions.map(s => s.percentage_score))
                return sum + bestScore
            }, 0) / totalCompleted
        )
        : 0

    const ENVIRONMENTS = ['office', 'classroom', 'kitchen']
    const envStats = ENVIRONMENTS.map(env => {
        const envResults = results.filter(r => r.environment === env)
        const envPassed  = envResults.filter(r => r.phase2_passed)
        const envAvg     = envPassed.length > 0
            ? Math.round(envPassed.reduce((sum, r) => sum + r.percentage_score, 0) / envPassed.length)
            : 0
        return {
            env,
            label: env.charAt(0).toUpperCase() + env.slice(1),
            attempted: envResults.length,
            passed: envPassed.length,
            avgScore: envAvg,
        }
    })

    const stepFailCounts = {}
    results.forEach(session => {
        session.steps.forEach(step => {
            if (!step.was_correct) {
                stepFailCounts[step.step_name] =
                    (stepFailCounts[step.step_name] || 0) + 1
            }
        })
    })
    const sortedSteps = Object.entries(stepFailCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
    const maxFails = sortedSteps.length > 0 ? sortedSteps[0][1] : 1

    const formatStepName = (stepName) => {
        const names = {
            'SoundAlarm':       'Sound Alarm',
            'GrabExtinguisher': 'Grab Extinguisher',
            'GrabWetBlanket':   'Grab Wet Blanket',
            'TPASS_Twist':      'TPASS — Twist',
            'TPASS_Pull':       'TPASS — Pull',
            'TPASS_Aim':        'TPASS — Aim',
            'TPASS_Squeeze':    'TPASS — Squeeze',
            'TPASS_Sweep':      'TPASS — Sweep',
            'WCTL_Wet':         'WCTL — Wet',
            'WCTL_Cover':       'WCTL — Cover',
            'WCTL_TurnOff':     'WCTL — Turn Off',
            'WCTL_Leave':       'WCTL — Leave',
            'Evacuate':         'Evacuate',
        }
        return names[stepName] || stepName
    }

    return (
        <>
        {selectedParticipant && (
            <ParticipantAllSessions
                participant={selectedParticipant}
                sessions={sessionsForParticipant(selectedParticipant)}
                onBack={() => setSelectedParticipant(null)}
            />
        )}
        {!selectedParticipant && (
        <div className="ev-page">

            {/* Header */}
            <div className="ev-page-header">
                <div className="ev-header-left">
                    <div>
                        <h4 className="ev-page-title">{event.name}</h4>
                        <p className="ev-page-sub">Event Details</p>
                    </div>
                </div>
                <div className="ev-header-actions">
                    <button className="ev-btn ev-btn-back" onClick={onBack}>
                        <i className="bi bi-arrow-left"></i> Back to event
                    </button>
                    <button className="ev-btn ev-btn-qr" onClick={() => onQR(event)}>
                        <i className="bi bi-qr-code-scan"></i> QR Code
                    </button>
                    <button className="ev-btn ev-btn-ghost" onClick={() => onEdit(event)}>
                        <i className="bi bi-pencil-fill"></i> Edit
                    </button>
                    <button className="ev-btn ev-btn-danger" onClick={() => onDelete(event.id)}>
                        <i className="bi bi-trash-fill"></i> Delete
                    </button>
                    <button
                        className={`ev-btn ${event.is_open ? 'ev-btn-danger' : 'ev-btn-success'}`}
                        onClick={handleToggleClick}
                        disabled={toggling}
                    >
                        {toggling ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                {event.is_open ? 'Closing...' : 'Opening...'}
                            </>
                        ) : (
                            <>
                                <i className={`bi ${event.is_open ? 'bi-lock-fill' : 'bi-unlock-fill'}`}></i>
                                {event.is_open ? ' Close Registration' : ' Open Registration'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Info Cards */}
            <div className="ev-detail-grid">
                <div className="ev-detail-card">
                    <div className="ev-detail-label">Date</div>
                    <div className="ev-detail-value">
                        <i className="bi bi-calendar3 me-2 ev-icon-accent"></i>
                        {new Date(event.date).toLocaleDateString('en-US', {
                            month: 'long', day: 'numeric', year: 'numeric',
                        })}
                    </div>
                </div>
                <div className="ev-detail-card">
                    <div className="ev-detail-label">Venue</div>
                    <div className="ev-detail-value">
                        <i className="bi bi-geo-alt-fill me-2 ev-icon-accent"></i>
                        {event.location_name || '—'}
                    </div>
                </div>
                <div className="ev-detail-card">
                    <div className="ev-detail-label">Registration Radius</div>
                    <div className="ev-detail-value">
                        <i className="bi bi-broadcast me-2 ev-icon-accent"></i>
                        {event.radius_meters}m from venue
                    </div>
                </div>
                <div className="ev-detail-card">
                    <div className="ev-detail-label">Total Registered</div>
                    <div className="ev-detail-value">
                        <i className="bi bi-people-fill me-2 ev-icon-accent"></i>
                        {event.participants_count ?? participants.length} participants
                    </div>
                </div>
            </div>

            {event.description && (
                <div className="ev-detail-card ev-description-card">
                    <div className="ev-detail-label ev-description-label">Description</div>
                    <p className="ev-description-text">{event.description}</p>
                </div>
            )}

            {/* Overview */}
            <div className="ev-overview-card">
                <div className="ev-overview-section-title">
                    <i className="bi bi-bar-chart-fill ev-icon-accent"></i>
                    Event Overview
                </div>
                <div className="ev-stats-grid">
                    <div className="ev-stat-card">
                        <div className="ev-stat-number ev-stat-green">{totalCompleted}</div>
                        <div className="ev-stat-label">
                            <i className="bi bi-check-circle-fill ev-icon-green"></i>
                            Completed
                        </div>
                        <div className="ev-stat-sub">Passed at least one simulation</div>
                    </div>

                    <div className="ev-stat-card">
                        <div className="ev-stat-number ev-stat-yellow">{avgScore}%</div>
                        <div className="ev-stat-label">
                            <i className="bi bi-stopwatch-fill ev-icon-yellow"></i>
                            Avg Score
                        </div>
                        <div className="ev-stat-sub">avg percentage score</div>
                    </div>
                </div>

                <div className="ev-overview-divider"></div>
                <div className="ev-overview-section-title">
                    <i className="bi bi-building ev-icon-accent"></i>
                    By Environment
                </div>

                {/* ── ENVIRONMENT CARDS — dashboard style ── */}
                <div className="row g-2 mb-2">
                    {[
                        { key: 'office',    label: 'Office',    icon: 'bi-building-fill',    tag: 'TPASS' },
                        { key: 'classroom', label: 'Classroom', icon: 'bi-mortarboard-fill', tag: 'TPASS' },
                        { key: 'kitchen',   label: 'Kitchen',   icon: 'bi-fire',             tag: 'WCTL'  },
                    ].map(env => {
                        const stat = envStats.find(e => e.env === env.key)
                        return (
                            <div key={env.key} className="col-12 col-md-4">
                                <div className="db-env-card">
                                    <div className="d-flex align-items-center justify-content-between mb-3 ps-2">
                                        <div className="db-env-title">
                                            <i className={`bi ${env.icon}`}></i>
                                            {env.label}
                                        </div>
                                        <span className="db-env-tag">{env.tag}</span>
                                    </div>
                                    <div className="ps-2">
                                        <div className="d-flex align-items-center justify-content-between py-2 border-bottom border-dark">
                                            <span className="db-env-row-lbl">
                                                <i className="bi bi-people-fill me-2"></i>
                                                Participants passed
                                            </span>
                                            <span className="db-env-row-val">{stat?.passed ?? 0}</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between py-2">
                                            <span className="db-env-row-lbl">
                                                <i className="bi bi-graph-up me-2"></i>
                                                Avg simulation score
                                            </span>
                                            <span className="db-env-row-val">
                                                {stat?.avgScore > 0 ? `${stat.avgScore}%` : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="ev-overview-divider"></div>
                <div className="ev-overview-section-title">
                    <i className="bi bi-exclamation-triangle-fill ev-icon-accent"></i>
                    Most Failed Steps
                </div>
                {sortedSteps.length > 0 ? (
                    <div className="ev-hbar-list">
                        {sortedSteps.map(([stepName, count]) => (
                            <div key={stepName} className="ev-hbar-row">
                                <div className="ev-hbar-label">{formatStepName(stepName)}</div>
                                <div className="ev-hbar-track">
                                    <div className="ev-hbar-fill" style={{
                                        width: `${(count / maxFails) * 100}%`,
                                        opacity: 0.4 + (count / maxFails) * 0.6,
                                    }} />
                                </div>
                                <div className="ev-hbar-count">{count}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="ev-hbar-empty">
                        <i className="bi bi-bar-chart"></i>
                        No simulation data yet — bars will appear once
                        participants complete the simulation.
                    </div>
                )}
            </div>

            {/* Registered Participants */}
            <div>
                <div className="ev-participants-header">
                    <h6 className="ev-participants-title">
                        <i className="bi bi-people-fill me-2 ev-icon-accent"></i>
                        Registered Participants
                    </h6>
                    <input
                        type="text"
                        className="ev-participants-search"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <ParticipantCardList
                    participants={filteredParticipants}
                    loading={loadingP}
                    onRowClick={(participant) => setSelectedParticipant(participant)}
                />
            </div>

        </div>
        )}
        </>
    )
}