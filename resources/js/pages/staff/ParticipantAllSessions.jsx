import { useState } from 'react'
import ParticipantSessionDetail from './ParticipantSessionDetails'


export default function ParticipantAllSessions({ participant, sessions, onBack }) {

    const ENVIRONMENTS = ['office', 'classroom', 'kitchen']

    // Icon + protocol tag per environment, so the tabs read the same way
    // as the environment cards on the event page.
    const ENV_META = {
        office:    { icon: 'bi-building-fill',    tag: 'TPASS' },
        classroom: { icon: 'bi-mortarboard-fill', tag: 'TPASS' },
        kitchen:   { icon: 'bi-fire',             tag: 'WCTL'  },
    }

    // ── GROUP ATTEMPTS BY ENVIRONMENT ─────────────────────────────
    // This used to be sessions.find(...), which returns only the FIRST
    // match. That was correct when the database held one row per
    // environment — but every attempt is stored now, so .find() would
    // silently show one arbitrary run and hide the rest.
    //
    // Sorted newest first: attempt 3, then 2, then 1.
    const attemptsFor = (env) =>
        (sessions || [])
            .filter(s => s.environment === env)
            .sort((a, b) => (b.attempt_number || 0) - (a.attempt_number || 0))

    // Which attempt to show when a tab is first opened: the passing run
    // if there is one, otherwise the most recent try.
    const defaultAttempt = (attempts) => {
        if (!attempts.length) return null
        const passes = attempts.filter(a => a.passed)
        if (passes.length) {
            return passes.reduce((best, a) =>
                a.percentage_score > best.percentage_score ? a : best
            )
        }
        return attempts[0]
    }

    const firstAttempted = ENVIRONMENTS.find(env => attemptsFor(env).length > 0)
    const [activeEnv, setActiveEnv] = useState(firstAttempted || null)

    // Which attempt is selected, per environment. Keyed by env so
    // switching tabs and coming back keeps your place.
    const [selectedIds, setSelectedIds] = useState({})

    const activeAttempts = activeEnv ? attemptsFor(activeEnv) : []

    const activeSession = (() => {
        if (!activeAttempts.length) return null
        const chosenId = selectedIds[activeEnv]
        const found = activeAttempts.find(a => a.id === chosenId || a.session_id === chosenId)
        return found || defaultAttempt(activeAttempts)
    })()

    const selectAttempt = (env, session) => {
        setSelectedIds(prev => ({ ...prev, [env]: session.id ?? session.session_id }))
    }

    // "office" → "Office"
    const envDisplay = (env) =>
        env.charAt(0).toUpperCase() + env.slice(1)

    const shortDate = (value) =>
        value
            ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '—'

    // Short outcome for the attempt pills and the summary chip.
    //
    // 'wrong_decision' is OFFICE ONLY and is the one reason the server
    // does not work out for itself — Unity sends it when the player
    // clears the far fire and the doorway fire spreads across the exit.
    // That run can end with a decent score and time still on the clock,
    // so without this case it fell through to the bare 'Failed' and the
    // most instructive failure in the simulation was the least described.
    const outcomeLabel = (s) => {
        if (s.passed) return s.score_label
        if (s.fail_reason === 'timeout') return 'Timed out'
        if (s.fail_reason === 'low_score') return 'Too many mistakes'
        if (s.fail_reason === 'wrong_decision') return 'Wrong decision'
        return 'Failed'
    }
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

            {/* ── ENVIRONMENT TABS ─────────────────────────────────── */}
            <div className="psd-env-tabs">
                {ENVIRONMENTS.map(env => {
                    const attempts = attemptsFor(env)
                    const attempted = attempts.length > 0
                    const anyPassed = attempts.some(a => a.passed)
                    const meta = ENV_META[env]

                    return (
                        <button
                            key={env}
                            className={`psd-env-tab ${activeEnv === env ? 'active' : ''} ${!attempted ? 'disabled' : ''}`}
                            onClick={() => attempted && setActiveEnv(env)}
                            disabled={!attempted}
                        >
                            <i className={`bi ${meta.icon}`}></i>

                            <span className="psd-tab-name">{envDisplay(env)}</span>

                            {attempted ? (
                                <>
                                    {/* Reads `passed`, NOT `phase2_passed`.
                                        phase2_passed only means "the timer did
                                        not hit zero" — a low-score failure has
                                        it set to true and would show a green
                                        check on a run that failed. */}
                                    <span className={`psd-tab-badge ${anyPassed ? 'passed' : 'failed'}`}>
                                        <i className={`bi ${anyPassed ? 'bi-check' : 'bi-x'}`}></i>
                                    </span>
                                    <span className="psd-tab-count">
                                        {attempts.length} {attempts.length === 1 ? 'try' : 'tries'}
                                    </span>
                                </>
                            ) : (
                                <span className="psd-tab-unattempted">Not attempted</span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* ── ATTEMPT HISTORY + ACTIVE DETAIL ──────────────────── */}
            {activeSession ? (
                <>
                    {/* Attempt list — only when there is more than one.
                        A single attempt needs no picker; the row would
                        just repeat what the detail below already says. */}
                   {activeAttempts.length > 1 && (
                        <div className="psd-attempt-bar">
                            <span className="psd-attempt-bar-label">Attempt</span>

                            <div className="psd-attempt-pills">
                                {/* Oldest → newest reads as a progression, which is
                                    the point of the list. The array is sorted newest
                                    first for the default selection, so reverse a copy
                                    here rather than mutating it. */}
                                {[...activeAttempts].reverse().map(s => {
                                    const id = s.id ?? s.session_id
                                    const isActive = (activeSession.id ?? activeSession.session_id) === id

                                    return (
                                        <button
                                            key={id}
                                            className={`psd-attempt-pill ${isActive ? 'active' : ''} ${s.passed ? 'passed' : 'failed'}`}
                                            onClick={() => selectAttempt(activeEnv, s)}
                                            title={s.passed
                                                ? `${outcomeLabel(s)} — ${s.percentage_score}%`
                                                : `${outcomeLabel(s)} — ${s.total_penalties}s in penalties`}
                                        >
                                            {s.attempt_number ?? '—'}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Score ONLY on a pass. A failed run's percentage is not
                                an achievement — a timeout at 19% just means the clock
                                ran out. Penalties explain the run instead. */}
                            <span className={`psd-attempt-bar-meta ${activeSession.passed ? 'passed' : 'failed'}`}>
                                {outcomeLabel(activeSession)}
                                <span className="psd-attempt-bar-sub">
                                    {activeSession.passed
                                        ? `${activeSession.percentage_score}%`
                                        : `${activeSession.total_penalties}s penalties`}
                                </span>
                            </span>
                        </div>
                    )}

                    <div className="psd-active-meta">
                        <span className={`psd-pass-badge ${activeSession.passed ? 'passed' : 'failed'}`}>
                            <i className={`bi ${activeSession.passed
                                ? 'bi-check-circle-fill'
                                : 'bi-x-circle-fill'}`}>
                            </i>
                            {activeSession.passed ? 'Passed' : 'Failed'}
                        </span>

                        {activeSession.attempt_number && (
                            <span className="psd-active-attempt">
                                Attempt {activeSession.attempt_number}
                            </span>
                        )}

                        <span className="psd-active-date">
                            {new Date(activeSession.played_at).toLocaleDateString('en-US', {
                                month: 'long', day: 'numeric', year: 'numeric',
                            })}
                        </span>
                    </div>

                    <ParticipantSessionDetail
                        key={activeSession.id ?? activeSession.session_id}
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