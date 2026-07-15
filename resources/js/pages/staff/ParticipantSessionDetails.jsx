import '../../../css/Staff/participantsessiondetails.css'


export default function ParticipantSessionDetail({ session, onBack, embedded = false }) {

    // ── STEP NAME FORMATTER ───────────────────────────────────────
    // Database stores "TPASS_Aim" — UI shows "A — Aim at base"
    // Think of it like a translation dictionary
    const formatStepName = (stepName) => {
        const names = {
            'SoundAlarm':       'Sound the Alarm',
            'GrabExtinguisher': 'Grab Extinguisher',
            'GrabWetBlanket':   'Grab Wet Blanket',
            'TPASS_Twist':      'T — Twist the seal',
            'TPASS_Pull':       'P — Pull the pin',
            'TPASS_Aim':        'A — Aim at base',
            'TPASS_Squeeze':    'S — Squeeze handle',
            'TPASS_Sweep':      'S — Sweep side to side',
            'WCTL_Wet':         'W — Wet the blanket',
            'WCTL_Cover':       'C — Cover the fire',
            'WCTL_TurnOff':     'T — Turn off LPG valve',
            'WCTL_Leave':       'L — Leave and evacuate',
            'Evacuate':         'Evacuate via Exit Door',
        }
        return names[stepName] || stepName
    }

    // ── GROUP STEPS BY STEP NAME ──────────────────────────────────
    // session.steps[] has one row per action (including wrong attempts)
    // We group them so all attempts for the same step are together
    //
    // reduce() builds an object as it loops:
    // { SoundAlarm: [{...}, {...}], GrabExtinguisher: [{...}] }
    const groupedSteps = session.steps.reduce((groups, step) => {
        const key = step.step_name
        if (!groups[key]) groups[key] = []
        groups[key].push(step)
        return groups
    }, {})

    // ── STEP ORDER ────────────────────────────────────────────────
    // Defines the correct display order per environment
    // JavaScript objects don't guarantee key order
    // so we control the order manually with these arrays
    const officeClassroomOrder = [
        'SoundAlarm',
        'GrabExtinguisher',
        'TPASS_Twist',
        'TPASS_Pull',
        'TPASS_Aim',
        'TPASS_Squeeze',
        'TPASS_Sweep',
        'Evacuate',
    ]

    const kitchenOrder = [
        'SoundAlarm',
        'GrabWetBlanket',
        'WCTL_Wet',
        'WCTL_Cover',
        'WCTL_TurnOff',
        'WCTL_Leave',
        'Evacuate',
    ]

    // Pick correct order based on environment
    const stepOrder = session.environment === 'kitchen'
        ? kitchenOrder
        : officeClassroomOrder

    // Only show steps that exist in the recorded session data
    // filter() keeps only keys that exist in groupedSteps
    const orderedStepKeys = stepOrder.filter(key => groupedSteps[key])

    // ── HELPERS ───────────────────────────────────────────────────
    // Did this step have ANY wrong attempts?
    // some() returns true if at least one item matches
    const stepHadError = (stepKey) =>
        groupedSteps[stepKey].some(s => !s.was_correct)

    // Total penalty seconds for one step
    // reduce() adds up all penalty_seconds for that step's attempts
    const stepTotalPenalty = (stepKey) =>
        groupedSteps[stepKey].reduce((sum, s) => sum + s.penalty_seconds, 0)

    // ── FORMATTERS ────────────────────────────────────────────────
    // "office" → "Office"
    const envDisplay = session.environment.charAt(0).toUpperCase()
        + session.environment.slice(1)

    // ISO date → "June 20, 2026"
    const playedDate = new Date(session.played_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    })

    // Returns color based on score label
    const scoreColor = (label) => {
        const map = {
            'Excellent': '#22c55e',  // green
            'Good':      '#3b82f6',  // blue
            'Passed':    '#f59e0b',  // amber
        };
        return map[label] || '#64748b';
    }
    // ── BODY ─────────────────────────────────────────────────────
    // This is the reusable part: score cards + phase 1 + phase 2.
    // Used both standalone (own page) and embedded (inside
    // ParticipantAllSessions, under a pill-selected tab).
    const body = (
        <>
            {/* ── SCORE SUMMARY CARDS ─────────────────────────────── */}
            {/* Shows: Timer Start | Total Penalties | Final Score | Environment */}
            <div className="psd-score-grid">

               <div className="psd-score-card">
                    <div className="psd-score-label">Time Remaining</div>
                    <div className="psd-score-value">
                        <i className="bi bi-stopwatch me-2 text-danger"></i>
                        {session.phase2_score}s
                    </div>
                </div>

                <div className="psd-score-card">
                    <div className="psd-score-label">Total Penalties</div>
                    <div className="psd-score-value red">
                        <i className="bi bi-dash-circle-fill me-2"></i>
                        {session.total_penalties}s
                    </div>
                </div>

                <div className="psd-score-card">
                    <div className="psd-score-label">Final Score</div>
                    <div className="psd-score-value" style={{ color: scoreColor(session.score_label) }}>
                        <i className="bi bi-trophy-fill me-2"></i>
                        {session.percentage_score}%
                    </div>
                    <div className="psd-score-sublabel" style={{ color: scoreColor(session.score_label) }}>
                        {session.score_label}
                    </div>
                </div>

                <div className="psd-score-card">
                    <div className="psd-score-label">Environment</div>
                    <div className="psd-score-value">
                        <i className="bi bi-building me-2 text-danger"></i>
                        {envDisplay}
                    </div>
                </div>

            </div>

            {/* ── PHASE 1 ──────────────────────────────────────────── */}
            <div className="psd-card">
                <div className="psd-section-label">
                    <i className="bi bi-search text-danger"></i>
                    Phase 1 — Hazard Identification
                </div>
                <div className="psd-phase1-ok">
                    <i className="bi bi-check-circle-fill"></i>
                    All hazards identified — simulation unlocked
                </div>
            </div>

            {/* ── PHASE 2 STEPS ────────────────────────────────────── */}
            <div className="psd-card">
                <div className="psd-section-label">
                    <i className="bi bi-lightning-fill text-danger"></i>
                    Phase 2 — Simulation Steps
                </div>

                <div className="psd-steps-list">
                    {orderedStepKeys.map((stepKey, index) => (

                        <div
                            key={stepKey}
                            className="psd-step-block"
                            style={{
                                border: `1px solid ${stepHadError(stepKey)
                                    ? 'rgba(192,57,43,0.3)'
                                    : 'rgba(34,197,94,0.2)'}`,
                            }}
                        >

                            {/* Step Header */}
                            <div className="psd-step-header">

                                {/* Step number circle — red if error, green if ok */}
                                <div className={`psd-step-number ${stepHadError(stepKey) ? 'error' : 'ok'}`}>
                                    {index + 1}
                                </div>

                                {/* Human-readable step name from our dictionary */}
                                <span className="psd-step-name">
                                    {formatStepName(stepKey)}
                                </span>

                                {/* Total penalty badge for this step */}
                                <span className={`psd-step-penalty ${stepTotalPenalty(stepKey) > 0 ? 'has-penalty' : 'no-penalty'}`}>
                                    {stepTotalPenalty(stepKey) > 0
                                        ? `-${stepTotalPenalty(stepKey)}s`
                                        : 'No penalty'}
                                </span>

                            </div>

                            {/* Individual Attempts */}
                            {/* One row per action — including wrong attempts */}
                            {groupedSteps[stepKey].map((attempt, attemptIndex) => (
                                <div key={attemptIndex} className="psd-attempt-row">

                                    {/* Green check or red X icon */}
                                    <i className={`bi ${attempt.was_correct
                                        ? 'bi-check-circle-fill'
                                        : 'bi-x-circle-fill'}`}
                                        style={{
                                            color: attempt.was_correct ? '#22c55e' : '#c0392b',
                                            fontSize: 13,
                                            flexShrink: 0,
                                        }}
                                    />

                                    {/* Label + action name */}
                                    <span className="psd-attempt-label">
                                        {attempt.was_correct ? 'Correct: ' : 'Wrong: '}
                                        <span className={`psd-attempt-action ${attempt.was_correct ? 'correct' : 'wrong'}`}>
                                            {attempt.chosen_action}
                                        </span>
                                    </span>

                                    {/* Penalty per attempt — only shown if penalized */}
                                    {attempt.penalty_seconds > 0 && (
                                        <span className="psd-attempt-penalty">
                                            -{attempt.penalty_seconds}s
                                        </span>
                                    )}

                                </div>
                            ))}

                        </div>
                    ))}
                </div>

            </div>
        </>
    )

    // ── EMBEDDED MODE ────────────────────────────────────────────
    // Used inside ParticipantAllSessions — no page header, no back
    // button, no own page wrapper. The parent already shows the
    // participant name, pass/fail badge, and date for this pill.
    if (embedded) {
        return body
    }

    // ── STANDALONE MODE ──────────────────────────────────────────
    // Original full-page behavior, kept for backward compatibility
    // in case this component is ever used on its own elsewhere.
    return (
        <div className="ev-page psd-page">

            {/* ── HEADER ─────────────────────────────────────────── */}
            <div className="ev-page-header">
                <div>
                    <div>
                        <h4 className="ev-page-title">{session.participant_name}</h4>
                        <p className="ev-page-sub">
                            {envDisplay} Session · {playedDate}
                        </p>
                    </div>
                </div>

                <button className="ev-btn ev-btn-danger mb-3" onClick={onBack}>
                        <i className="bi bi-arrow-left"></i> Back
                </button>

                <span className={`psd-pass-badge ${session.phase2_passed ? 'passed' : 'failed'}`}>
                    <i className={`bi ${session.phase2_passed
                        ? 'bi-check-circle-fill'
                        : 'bi-x-circle-fill'}`}>
                    </i>
                    {session.phase2_passed ? 'Passed' : 'Failed'}
                </span>
            </div>

            {body}

        </div>
    )
}