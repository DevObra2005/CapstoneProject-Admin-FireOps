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
            'TPASS_Twist':      'T — Twist the pin',
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
    const groupedSteps = session.steps.reduce((groups, step) => {
        const key = step.step_name
        if (!groups[key]) groups[key] = []
        groups[key].push(step)
        return groups
    }, {})

    // ── STEP ORDER ────────────────────────────────────────────────
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

    const stepOrder = session.environment === 'kitchen'
        ? kitchenOrder
        : officeClassroomOrder

    const orderedStepKeys = stepOrder.filter(key => groupedSteps[key])

    // ── HELPERS ───────────────────────────────────────────────────
    const stepHadError = (stepKey) =>
        groupedSteps[stepKey].some(s => !s.was_correct)

    const stepTotalPenalty = (stepKey) =>
        groupedSteps[stepKey].reduce((sum, s) => sum + s.penalty_seconds, 0)

    // ── FORMATTERS ────────────────────────────────────────────────
    const envDisplay = session.environment.charAt(0).toUpperCase()
        + session.environment.slice(1)

    const playedDate = new Date(session.played_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    })

    /* CHANGED — green scale: every tier is a pass, so all stay green.
       Deep green = Excellent, mid = Good, pale = Passed. */
    const scoreColor = (label) => {
        const map = {
            'Excellent': 'var(--pass)',
            'Good':      'var(--pass-mid)',
            'Passed':    'var(--pass-light)',
        }
        return map[label] || 'var(--muted)'
    }

    // ── BODY ─────────────────────────────────────────────────────
    const body = (
        <>
            {/* ── SCORE SUMMARY CARDS ─────────────────────────────── */}
            <div className="psd-score-grid">

               <div className="psd-score-card">
                    <div className="psd-score-label">Time Remaining</div>
                    <div className="psd-score-value">
                        {/* CHANGED — brand red instead of Bootstrap red */}
                        <i className="bi bi-stopwatch me-2" style={{ color: 'var(--green)' }}></i>
                        {session.phase2_score}s
                    </div>
                </div>

                <div className="psd-score-card">
                    <div className="psd-score-label">Total Penalties</div>
                    {/* CHANGED — no penalties is a good thing, so show it green */}
                    <div
                        className="psd-score-value"
                        style={{ color: session.total_penalties > 0 ? 'var(--fail)' : 'var(--pass)' }}
                    >
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
                        {/* CHANGED — brand red */}
                        <i className="bi bi-building me-2" style={{ color: 'var(--green)' }}></i>
                        {envDisplay}
                    </div>
                </div>

            </div>

            {/* ── PHASE 1 ──────────────────────────────────────────── */}
            <div className="psd-card">
                <div className="psd-section-label">
                    {/* CHANGED — brand red */}
                    <i className="bi bi-search" style={{ color: 'var(--green)' }}></i>
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
                    {/* CHANGED — brand red */}
                    <i className="bi bi-lightning-fill" style={{ color: 'var(--green)' }}></i>
                    Phase 2 — Simulation Steps
                </div>

                <div className="psd-steps-list">
                    {orderedStepKeys.map((stepKey, index) => (

                        /* CHANGED — border moved to CSS classes (was hardcoded green/red inline) */
                        <div
                            key={stepKey}
                            className={`psd-step-block ${stepHadError(stepKey) ? 'error' : 'ok'}`}
                        >

                            {/* Step Header */}
                            <div className="psd-step-header">

                                <div className={`psd-step-number ${stepHadError(stepKey) ? 'error' : 'ok'}`}>
                                    {index + 1}
                                </div>

                                <span className="psd-step-name">
                                    {formatStepName(stepKey)}
                                </span>

                                <span className={`psd-step-penalty ${stepTotalPenalty(stepKey) > 0 ? 'has-penalty' : 'no-penalty'}`}>
                                    {stepTotalPenalty(stepKey) > 0
                                        ? `-${stepTotalPenalty(stepKey)}s`
                                        : 'No penalty'}
                                </span>

                            </div>

                            {/* Individual Attempts */}
                            {groupedSteps[stepKey].map((attempt, attemptIndex) => (
                                <div key={attemptIndex} className="psd-attempt-row">

                                    {/* CHANGED — theme variables instead of hardcoded hex */}
                                    <i className={`bi ${attempt.was_correct
                                        ? 'bi-check-circle-fill'
                                        : 'bi-x-circle-fill'}`}
                                        style={{
                                            color: attempt.was_correct ? 'var(--pass)' : 'var(--fail)',
                                            fontSize: 13,
                                            flexShrink: 0,
                                        }}
                                    />

                                    <span className="psd-attempt-label">
                                        {attempt.was_correct ? 'Correct: ' : 'Wrong: '}
                                        <span className={`psd-attempt-action ${attempt.was_correct ? 'correct' : 'wrong'}`}>
                                            {attempt.chosen_action}
                                        </span>
                                    </span>

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
    if (embedded) {
        return body
    }

    // ── STANDALONE MODE ──────────────────────────────────────────
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