import '../../../css/Staff/participantsessiondetails.css'


export default function ParticipantSessionDetail({ session, onBack, embedded = false }) {

    // ── STEP NAME FORMATTER ───────────────────────────────────────
    // Database stores "TPASS_Aim" — UI shows "Aim at base"
    // Think of it like a translation dictionary
    //
    // KEEP THE LEGACY NAMES. Old attempt rows still carry them, and a
    // rename in Unity does not rewrite history — those records would
    // otherwise render as raw enum values in a report someone reads.
    const formatStepName = (stepName) => {
        const names = {
            // Office / Classroom — TPASS
            'SoundAlarm':       'Sound the Alarm',
            'GrabExtinguisher': 'Grab Extinguisher',
            'TPASS_Twist':      'Twist the pin',
            'TPASS_Pull':       'Pull the pin',
            'TPASS_Aim':        'Aim at base',
            'TPASS_Squeeze':    'Squeeze handle',
            'TPASS_Sweep':      'Sweep side to side',

            // Kitchen — WCTL
            'GrabTowel':        'Grab the Towel',
            'WCTL_Wet':         'Wet the Towel',
            'WCTL_Cover':       'Cover the Fire',
            'WCTL_TurnOff':     'Turn off LPG valve',

            // Shared
            'Evacuate':         'Evacuate via Exit Door',

            // Legacy — kept so older records still read correctly
            'GrabWetBlanket':   'Grab Wet Blanket',
            'WCTL_Leave':       'Leave and evacuate',
            'WetBlanket':       'Cover with Wet Blanket',
            'TurnOffLPG':       'Turn Off the LPG',
        }
        return names[stepName] || stepName
    }

    // ── WHAT THEY ACTUALLY TAPPED ─────────────────────────────────
    // chosen_action is inconsistent by design: sometimes a scene object
    // ("ExitDoor", "FireAlarm"), sometimes a STEP NAME when the player
    // tapped a button out of order ("TPASS_Squeeze" during Aim).
    //
    // Run it through formatStepName first — that turns a step name into
    // readable text and passes anything else through unchanged. Then
    // tidy the object names that carry Unity's asset suffixes, which
    // mean nothing to an instructor reading a report.
    const formatAction = (raw) => {
        const objects = {
            'ExitDoor':                  'the exit door',
            'FireAlarm':                 'the alarm panel',
            'FireExtinguisher_ABC_NEW':  'the fire extinguisher',
            'TPASS_Sweep':               'Sweep',

            // Kitchen. towel_rig is the GameObject name, which leaks
            // through whenever actionName is left blank on
            // KitchenInteractable — worth setting there, but mapped here
            // so existing records read properly either way.
            'towel_rig':                 'the towel',
            'TowelOnSink':               'the towel',
            'TowelOnTimba':              'the towel',
            'DryTowel':                  'the towel (still dry)',
        }
        if (objects[raw]) return objects[raw]

        const asStep = formatStepName(raw)
        return asStep !== raw ? asStep : raw
    }

    // ── FAIL REASON LABEL ─────────────────────────────────────────
    // Failed runs are stored now, so the UI has to explain WHY.
    // "timeout"   → clock ran out before they finished
    // "low_score" → finished in time, too many wrong actions
    const failReasonLabel = (reason) => {
        const map = {
            'timeout':   'Ran out of time',
            'low_score': 'Too many mistakes',
        }
        return map[reason] || 'Not passed'
    }

    // ── GROUP STEPS BY STEP NAME ──────────────────────────────────
    const groupedSteps = (session.steps || []).reduce((groups, step) => {
        const key = step.step_name
        if (!groups[key]) groups[key] = []
        groups[key].push(step)
        return groups
    }, {})

    // ── STEP ORDER ────────────────────────────────────────────────
    //
    // THESE ARRAYS MUST MATCH THE UNITY ENUMS. They are not just for
    // sorting — orderedStepKeys FILTERS by them, so a step name missing
    // from the list is dropped from the report entirely.
    //
    // WHAT WENT WRONG BEFORE: kitchenOrder still described the old
    // sequence. It listed 'SoundAlarm' (a step Kitchen no longer has),
    // 'GrabWetBlanket' (renamed to GrabTowel in Unity) and 'WCTL_Leave'
    // (never in the enum). So every Kitchen report silently discarded the
    // grab step and numbered Wet as step 1.
    //
    // The data was in the database the whole time. Nothing errored. It
    // simply was not drawn, which reads exactly like "the step is not
    // being recorded".
    //
    // Office / Classroom — SimulationInteractable.SimStep (1..8)
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

    // Kitchen — KitchenStep (1..5). No alarm step: a home LPG fire starts
    // with smothering, not with raising an alarm.
    const kitchenOrder = [
        'GrabTowel',
        'WCTL_Wet',
        'WCTL_Cover',
        'WCTL_TurnOff',
        'Evacuate',
    ]

    const stepOrder = session.environment === 'kitchen'
        ? kitchenOrder
        : officeClassroomOrder

    // ── ORDERED KEYS, WITH NOTHING SILENTLY DROPPED ───────────────
    // Known steps first, in sequence order. Then ANY step name the array
    // does not recognise, appended rather than discarded.
    //
    // That second part is the real fix. Filtering alone is why the grab
    // step vanished, and the same thing would happen again the next time
    // an enum is renamed and this file is not updated in the same commit.
    //
    // Now a mismatch shows up as an out-of-order row with a raw enum name
    // — visibly wrong, which is what you want. A missing row is invisible.
    const knownKeys = stepOrder.filter(key => groupedSteps[key])
    const unknownKeys = Object.keys(groupedSteps).filter(key => !stepOrder.includes(key))
    const orderedStepKeys = [...knownKeys, ...unknownKeys]

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

    /* Green scale for passing tiers. "Failed" is stored in the database
       now, so it needs its own colour — without it a failed run's score
       fell through to var(--muted) and read as "no data" rather than
       as a failure. */
    const scoreColor = (label) => {
        const map = {
            'Excellent': 'var(--pass)',
            'Good':      'var(--pass-mid)',
            'Passed':    'var(--pass-light)',
            'Failed':    'var(--fail)',
        }
        return map[label] || 'var(--muted)'
    }

    // ── BODY ─────────────────────────────────────────────────────
    const body = (
        <>
            {/* ── FAIL BANNER ─────────────────────────────────────── */}
            {/* Only on a failed run. The score cards below still show
                real numbers, so without this a 42% run looks like any
                other result — just with a lower figure. */}
            {!session.passed && (
                <div className="psd-fail-banner">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <span>
                        <strong>{failReasonLabel(session.fail_reason)}</strong>
                        {session.fail_reason === 'low_score' &&
                            ` — scored ${session.percentage_score}%, below the 50% needed to pass.`}
                        {session.fail_reason === 'timeout' &&
                            ' — the timer expired before all steps were completed.'}
                    </span>
                </div>
            )}

            {/* ── SCORE SUMMARY CARDS ─────────────────────────────── */}
            <div className="psd-score-grid">

               <div className="psd-score-card">
                    <div className="psd-score-label">Time Remaining</div>
                    <div className="psd-score-value">
                        <i className="bi bi-stopwatch me-2" style={{ color: 'var(--green)' }}></i>
                        {session.phase2_score}s
                    </div>
                </div>

                <div className="psd-score-card">
                    <div className="psd-score-label">Total Penalties</div>
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
                        <i className="bi bi-building me-2" style={{ color: 'var(--green)' }}></i>
                        {envDisplay}
                    </div>
                </div>

            </div>

            {/* ── PHASE 1 ──────────────────────────────────────────── */}
            <div className="psd-card">
                <div className="psd-section-label">
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
                    <i className="bi bi-lightning-fill" style={{ color: 'var(--green)' }}></i>
                    Phase 2 — Simulation Steps
                </div>

                {orderedStepKeys.length === 0 ? (
                    /* A timeout can end a run before ANY step was completed,
                       so the steps array is legitimately empty. Without this
                       the section renders as a bare heading with nothing
                       under it, which looks like a loading bug. */
                    <div className="ev-tab-empty">
                        <i className="bi bi-hourglass-bottom"></i>
                        No steps completed before the run ended.
                    </div>
                ) : (
                    <div className="psd-steps-list">
                        {orderedStepKeys.map((stepKey, index) => (

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

                                {/* Individual Actions */}
                                {groupedSteps[stepKey].map((action, actionIndex) => (
                                    <div key={actionIndex} className="psd-attempt-row">

                                        <i className={`bi ${action.was_correct
                                            ? 'bi-check-circle-fill'
                                            : 'bi-x-circle-fill'}`}
                                            style={{
                                                color: action.was_correct ? 'var(--pass)' : 'var(--fail)',
                                                fontSize: 13,
                                                flexShrink: 0,
                                            }}
                                        />

                                        <span className="psd-attempt-label">
                                            {action.was_correct ? 'Chose ' : 'Tapped '}
                                            <span className={`psd-attempt-action m-2 ${action.was_correct ? 'correct' : 'wrong'}`}>
                                                {formatAction(action.chosen_action)}
                                            </span>
                                        </span>

                                        {action.penalty_seconds > 0 && (
                                            <span className="psd-attempt-penalty">
                                                -{action.penalty_seconds}s
                                            </span>
                                        )}

                                    </div>
                                ))}

                            </div>
                        ))}
                    </div>
                )}

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
                            {envDisplay} Session
                            {session.attempt_number ? ` · Attempt ${session.attempt_number}` : ''}
                            {' · '}{playedDate}
                        </p>
                    </div>
                </div>

                <button className="ev-btn ev-btn-danger mb-3" onClick={onBack}>
                        <i className="bi bi-arrow-left"></i> Back
                </button>

                {/* Reads `passed`, NOT `phase2_passed`. phase2_passed only
                    means "the timer did not hit zero" — a low-score failure
                    has it set to true and would show a green Passed badge
                    on a run that failed. */}
                <span className={`psd-pass-badge ${session.passed ? 'passed' : 'failed'}`}>
                    <i className={`bi ${session.passed
                        ? 'bi-check-circle-fill'
                        : 'bi-x-circle-fill'}`}>
                    </i>
                    {session.passed ? 'Passed' : 'Failed'}
                </span>
            </div>

            {body}

        </div>
    )
}