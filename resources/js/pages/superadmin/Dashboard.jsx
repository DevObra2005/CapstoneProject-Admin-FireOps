import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Chart, registerables } from 'chart.js'
import '../../../css/Superadmin/dashboard.css'

Chart.register(...registerables)

const formatStepName = (name) => {
    const map = {
        'SoundAlarm':       'Sound alarm',
        'GrabExtinguisher': 'Grab extinguisher',
        'GrabWetBlanket':   'Grab wet blanket',
        'TPASS_Twist':      'TPASS — Twist',
        'TPASS_Pull':       'TPASS — Pull',
        'TPASS_Aim':        'TPASS — Aim',
        'TPASS_Squeeze':    'TPASS — Squeeze',
        'TPASS_Sweep':      'TPASS — Sweep',
        'WCTL_Wet':         'WCTL — Wet',
        'WCTL_Cover':       'WCTL — Cover',
        'WCTL_TurnOff':     'WCTL — Turn off',
        'WCTL_Leave':       'WCTL — Leave',
        'Evacuate':         'Evacuate',
    }
    return map[name] || name
}

export default function Dashboard() {

    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod]   = useState('all')
    const scoreChartRef         = useRef(null)
    const scoreChartInstance    = useRef(null)

    useEffect(() => {
        fetchDashboard()
    }, [period])

 // Redraw when data changes OR when the theme flips (so the chart re-colors)
    const [theme, setTheme] = useState(
        document.documentElement.getAttribute('data-theme') || 'light'
    )

    useEffect(() => {
        // Watch <html data-theme> so the chart knows when dark mode toggles
        const el = document.documentElement
        const observer = new MutationObserver(() => {
            setTheme(el.getAttribute('data-theme') || 'light')
        })
        observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (!data) return
        buildScoreChart()
        return () => {
            if (scoreChartInstance.current) {
                scoreChartInstance.current.destroy()
            }
        }
    }, [data, theme])

    const fetchDashboard = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await axios.get('/api/superadmin/dashboard', {
                headers: { Authorization: `Bearer ${token}` },
                params:  { period },
            })
            setData(res.data)
        } catch (err) {
            console.error('Dashboard fetch failed:', err)
        } finally {
            setLoading(false)
        }
    }

   const buildScoreChart = () => {
        if (!scoreChartRef.current) return
        if (scoreChartInstance.current) {
            scoreChartInstance.current.destroy()
        }

        // Theme-aware palette (canvas can't read CSS variables, so we branch here)
        const dark = document.documentElement.getAttribute('data-theme') === 'dark'
        const gridColor = dark ? '#282c34' : '#edf1ee'
        const tickColor = dark ? '#8b909b' : '#7c877f'
        const tipBg     = dark ? '#17191e' : '#ffffff'
        const tipBorder = dark ? '#282c34' : '#edf1ee'
        const tipTitle  = dark ? '#e8eaef' : '#18241f'
        const tipBody   = dark ? '#8b909b' : '#7c877f'

        scoreChartInstance.current = new Chart(scoreChartRef.current, {
            type: 'bar',
            data: {
                labels: ['Excellent', 'Good', 'Passed'],
                datasets: [{
                    data: [
                        data.score_distribution.Excellent,
                        data.score_distribution.Good,
                        data.score_distribution.Passed,
                    ],
                    backgroundColor: ['#278a43', '#4fb36b', '#aeddbc'],
                    borderRadius: 10,
                    borderSkipped: false,
                    // keeps bars from ballooning to full width when data is sparse
                    maxBarThickness: 90,
                }]
            },
            options: {
                // vertical bars (removed indexAxis: 'y')
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: tipBg,
                        borderColor: tipBorder,
                        borderWidth: 1,
                        titleColor: tipTitle,
                        bodyColor: tipBody,
                        padding: 10,
                        callbacks: {
                            label: ctx => ` ${ctx.raw} simulations`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: tickColor, font: { size: 12, weight: '600' } },
                        border: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        // whole numbers only — no 0.5 simulations
                        ticks: { color: tickColor, font: { size: 11 }, precision: 0, stepSize: 1 },
                        grid: { color: gridColor },
                        border: { display: false }
                    }
                }
            }
        })
    }

    const maxFails = data?.most_failed_steps?.[0]?.fail_count || 1
    const barWidth = (count) => Math.round((count / maxFails) * 100)

    if (loading) {
        return (
            <div className="db-page">
                <div className="db-loading">
                    <i className="bi bi-arrow-repeat db-spin"></i>
                    Loading dashboard...
                </div>
            </div>
        )
    }

    return (
        <div className="db-page">

            {/* ── HEADER ───────────────────────────────────── */}
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                    <div>
                        <h4 className="db-title mb-0">Dashboard</h4>
                        <p className="db-sub mb-0">Monitor participant performance and simulation results across all events</p>
                    </div>
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
                    {/* CHANGED — added "fill" for the green highlight card */}
                    <div className="db-kpi-card fill">
                        <div className="db-kpi-line red"></div>
                        <div className="d-flex align-items-start justify-content-between mb-2 mt-1">
                            <div className="db-kpi-icon r"><i className="bi bi-people-fill"></i></div>
                            <span className="db-kpi-tag r">Participants</span>
                        </div>
                        <div className="db-kpi-val">{data.overview.total_participants}</div>
                        <div className="db-kpi-sub">Total registered in the app</div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="db-kpi-card">
                        <div className="db-kpi-line green"></div>
                        <div className="d-flex align-items-start justify-content-between mb-2 mt-1">
                            <div className="db-kpi-icon g"><i className="bi bi-controller"></i></div>
                            <span className="db-kpi-tag g">Played</span>
                        </div>
                        <div className="db-kpi-val">{data.overview.played}</div>
                        <div className="db-kpi-sub">Completed at least one simulation</div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="db-kpi-card">
                        <div className="db-kpi-line blue"></div>
                        <div className="d-flex align-items-start justify-content-between mb-2 mt-1">
                            <div className="db-kpi-icon b"><i className="bi bi-graph-up"></i></div>
                            <span className="db-kpi-tag b">Avg score</span>
                        </div>
                        <div className="db-kpi-val">{data.overview.avg_score}%</div>
                        <div className="db-kpi-sub">Average score across all simulations</div>
                    </div>
                </div>
            </div>

            {/* ── ACTIVITY ─────────────────────────────────── */}
            <div className="db-section-label">Activity</div>
            <div className="row g-2 mb-2">
                <div className="col-12 col-md-4">
                    <div className="db-mini-card">
                        <div className="db-mini-icon r"><i className="bi bi-calendar-event-fill"></i></div>
                        <div>
                            <div className="db-mini-label">Total events</div>
                            <div className="db-mini-val">{data.activity.total_events}</div>
                            <div className="db-mini-sub">All time</div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="db-mini-card">
                        <div className="db-mini-icon g"><i className="bi bi-patch-check-fill"></i></div>
                        <div>
                            <div className="db-mini-label">Simulations completed</div>
                            <div className="db-mini-val">{data.activity.total_simulations}</div>
                            <div className="db-mini-sub">Across all environments</div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="db-mini-card">
                        <div className="db-mini-icon p"><i className="bi bi-person-badge-fill"></i></div>
                        <div>
                            <div className="db-mini-label">Total staff</div>
                            <div className="db-mini-val">{data.activity.total_staff}</div>
                            <div className="db-mini-sub">Active staff accounts</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SCORE DISTRIBUTION ───────────────────────── */}
            <div className="db-section-label">Score distribution</div>
            <div className="row g-2 mb-2">
                <div className="col-12">
                    <div className="db-panel">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="db-panel-title">
                                <i className="bi bi-bar-chart-fill"></i>
                                Simulation score breakdown
                            </div>
                            <span className="db-panel-badge">
                                {data.activity.total_simulations} simulations
                            </span>
                        </div>
                        <div className="db-score-chart-wrap">
                            <canvas ref={scoreChartRef}></canvas>
                        </div>
                        <div className="d-flex justify-content-center gap-3 flex-wrap mt-2">
                            <div className="d-flex align-items-center gap-2">
                                <div className="db-dl-dot e"></div>
                                <span className="db-dl-text">
                                    <strong>{data.score_distribution.Excellent}</strong> Excellent
                                    <span className="db-dl-range"> 90–100%</span>
                                </span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <div className="db-dl-dot g"></div>
                                <span className="db-dl-text">
                                    <strong>{data.score_distribution.Good}</strong> Good
                                    <span className="db-dl-range"> 75–89%</span>
                                </span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <div className="db-dl-dot p"></div>
                                <span className="db-dl-text">
                                    <strong>{data.score_distribution.Passed}</strong> Passed
                                    <span className="db-dl-range"> 50–74%</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── ENVIRONMENTS ─────────────────────────────── */}
            <div className="db-section-label">Environments</div>
            <div className="row g-2 mb-2">
                {[
                    { key: 'office',    label: 'Office',    icon: 'bi-building-fill',    tag: 'TPASS' },
                    { key: 'classroom', label: 'Classroom', icon: 'bi-mortarboard-fill', tag: 'TPASS' },
                    { key: 'kitchen',   label: 'Kitchen',   icon: 'bi-fire',             tag: 'WCTL'  },
                ].map(env => {
                    const e = data.environments[env.key]
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
                                        <span className="db-env-row-val">{e.passed}</span>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-between py-2">
                                        <span className="db-env-row-lbl">
                                            <i className="bi bi-graph-up me-2"></i>
                                            Avg simulation score
                                        </span>
                                        <span className="db-env-row-val">{e.avg_score}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ── RECENT ACTIVITY ──────────────────────────── */}
            <div className="db-section-label">Recent activity</div>
            <div className="row g-2">

                <div className="col-12 col-md-6">
                    <div className="db-panel">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="db-panel-title">
                                <i className="bi bi-clock-fill"></i>
                                Recent events
                            </div>
                            <span className="db-panel-badge">5 latest</span>
                        </div>
                        {data.recent_events.length === 0 ? (
                            <div className="db-empty">No events yet.</div>
                        ) : (
                            data.recent_events.map(event => (
                                <div key={event.id} className="d-flex align-items-center gap-2 py-2 border-bottom border-dark">
                                    <div className={`db-event-dot ${event.is_open ? 'open' : 'closed'}`}></div>
                                    <div className="flex-grow-1 overflow-hidden">
                                        <div className="db-event-name">{event.name}</div>
                                        <div className="db-event-meta">
                                            {new Date(event.created_at).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', year: 'numeric'
                                            })}
                                            {' · '}{event.participant_count} registered
                                        </div>
                                    </div>
                                    <span className={`db-ev-badge ${event.is_open ? 'open' : 'closed'}`}>
                                        {event.is_open ? 'Open' : 'Closed'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="col-12 col-md-6">
                    <div className="db-panel">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="db-panel-title">
                                <i className="bi bi-exclamation-triangle-fill"></i>
                                Most failed steps
                            </div>
                            <span className="db-panel-badge">Top 5</span>
                        </div>
                        {data.most_failed_steps.length === 0 ? (
                            <div className="db-empty">No data yet.</div>
                        ) : (
                            data.most_failed_steps.map((step, index) => (
                                <div key={index} className="db-step-item">
                                    <div className="db-step-rank">{index + 1}</div>
                                    <div className="flex-grow-1">
                                        <div className="db-step-name">
                                            {formatStepName(step.step_name)}
                                        </div>
                                        <div className="db-step-bar-wrap">
                                            <div
                                                className="db-step-bar"
                                                style={{ width: `${barWidth(step.fail_count)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="db-step-count">{step.fail_count}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

        </div>
    )
}