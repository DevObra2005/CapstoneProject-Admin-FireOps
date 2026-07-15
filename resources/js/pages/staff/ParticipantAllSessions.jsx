import { useState } from 'react'
import ParticipantSessionDetail from './ParticipantSessionDetails'


export default function ParticipantAllSessions({ participant, sessions, onBack }) {

  
    const ENVIRONMENTS = ['office', 'classroom', 'kitchen']

    // Find this participant's session for a given environment, if any
    const sessionFor = (env) => sessions.find(s => s.environment === env)

    // Default active tab = first environment that has a session.
    // If they haven't attempted anything, nothing is active.
    const firstAttempted = ENVIRONMENTS.find(env => sessionFor(env))
    const [activeEnv, setActiveEnv] = useState(firstAttempted || null)

    const activeSession = activeEnv ? sessionFor(activeEnv) : null

    // "office" → "Office"
    const envDisplay = (env) =>
        env.charAt(0).toUpperCase() + env.slice(1)

    // Initials for the avatar circle — "Mark Joemarie Obra" → "MO"
    const initials = participant.name
        ? participant.name
            .trim()
            .split(/\s+/)
            .map(w => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : '?'

    const registeredDate = participant.created_at
        ? new Date(participant.created_at).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
        })
        : null

    return (
        <div className="ev-page psd-page">

            {/* ── BACK BUTTON ────────────────────────────────────── */}
            <button className="ev-btn ev-btn-danger mb-3" onClick={onBack}>
                <i className="bi bi-arrow-left"></i> Back
            </button>

            {/* ── PARTICIPANT INFO CARD ─────────────────────────────── */}
            <div className="psd-info-card">

                <div className="psd-info-top">
                    <div className="psd-avatar">{initials}</div>
                    <div>
                        <div className="psd-info-name">{participant.name}</div>
                        <div className="psd-info-email">{participant.email}</div>
                    </div>
                </div>

                <div className="psd-info-grid">
                    <div className="psd-info-field">
                        <div className="psd-info-label">Organization Type</div>
                        <div className="psd-info-value">
                            <i className="bi bi-briefcase-fill"></i>
                            {participant.organization || '—'}
                        </div>
                    </div>
                    <div className="psd-info-field">
                        <div className="psd-info-label">Contact</div>
                        <div className="psd-info-value">
                            <i className="bi bi-telephone-fill"></i>
                            {participant.contact_number || '—'}
                        </div>
                    </div>
                    <div className="psd-info-field">
                        <div className="psd-info-label">Registered</div>
                        <div className="psd-info-value">
                            <i className="bi bi-calendar3"></i>
                            {registeredDate || '—'}
                        </div>
                    </div>
                </div>

            </div>

           
            <div className="psd-env-tabs">
                {ENVIRONMENTS.map(env => {
                    const session = sessionFor(env)
                    const attempted = !!session

                    return (
                        <button
                            key={env}
                            className={`psd-env-tab ${activeEnv === env ? 'active' : ''} ${!attempted ? 'disabled' : ''}`}
                            onClick={() => attempted && setActiveEnv(env)}
                            disabled={!attempted}
                        >
                            <i className="bi bi-building"></i>
                            {envDisplay(env)}

                            {attempted ? (
                                <span className={`psd-tab-badge ${session.phase2_passed ? 'passed' : 'failed'}`}>
                                    <i className={`bi ${session.phase2_passed
                                        ? 'bi-check'
                                        : 'bi-x'}`}>
                                    </i>
                                </span>
                            ) : (
                                <span className="psd-tab-unattempted">Not attempted</span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* ── ACTIVE SESSION DETAIL ────────────────────────────── */}
            {activeSession ? (
                <>
                    <div className="psd-active-meta">
                        <span className={`psd-pass-badge ${activeSession.phase2_passed ? 'passed' : 'failed'}`}>
                            <i className={`bi ${activeSession.phase2_passed
                                ? 'bi-check-circle-fill'
                                : 'bi-x-circle-fill'}`}>
                            </i>
                            {activeSession.phase2_passed ? 'Passed' : 'Failed'}
                        </span>
                        <span className="psd-active-date">
                            {new Date(activeSession.played_at).toLocaleDateString('en-US', {
                                month: 'long', day: 'numeric', year: 'numeric',
                            })}
                        </span>
                    </div>

                    <ParticipantSessionDetail
                        session={activeSession}
                        embedded
                    />
                </>
            ) : (
                <div className="ev-tab-empty">
                    <i className="bi bi-inbox"></i>
                    No simulation attempts yet.
                </div>
            )}

        </div>
    )
}