import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminEventDetail from './AdminEventDetail'
import '../../../css/Superadmin/adminevents.css'

export default function AdminEvents() {
    const [events, setEvents]           = useState([])
    const [loading, setLoading]         = useState(true)
    const [search, setSearch]           = useState('')
    const [filter, setFilter]           = useState('all')
    const [selectedEvent, setSelectedEvent] = useState(null)
    const token = localStorage.getItem('token')

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get('/api/superadmin/events', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setEvents(Array.isArray(res.data) ? res.data : [])
            } catch {
                setEvents([])
            } finally {
                setLoading(false)
            }
        }
        fetch()
    }, [])

    const filtered = events.filter(e => {
        const matchSearch =
            e.name?.toLowerCase().includes(search.toLowerCase()) ||
            e.incharge_name?.toLowerCase().includes(search.toLowerCase()) ||
            e.location_name?.toLowerCase().includes(search.toLowerCase())
        const matchFilter =
            filter === 'all' ? true :
            filter === 'open' ? e.is_open :
            !e.is_open
        return matchSearch && matchFilter
    })

    const totalEvents  = events.length
    const openEvents   = events.filter(e => e.is_open).length
    const closedEvents = events.filter(e => !e.is_open).length

    if (selectedEvent) {
        return (
            <AdminEventDetail
                event={selectedEvent}
                token={token}
                onBack={() => setSelectedEvent(null)}
            />
        )
    }

    return (
        <div className="ae-page">

            {/* ── PAGE HEADER ── */}
            <div className="ae-page-header">
                <div>
                    <h4 className="ae-page-title">Events</h4>
                    <p className="ae-page-sub">Monitor all events across all staff</p>
                </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="row g-2 mb-3">
                <div className="col-12 col-md-4">
                    <div className="ae-stat-card fill">
                        <div className="d-flex align-items-start justify-content-between mb-2">
                            <div className="ae-stat-icon">
                                <i className="bi bi-calendar-event-fill"></i>
                            </div>
                            <span className="ae-stat-tag">Total</span>
                        </div>
                        <div className="ae-stat-number">{totalEvents}</div>
                        <div className="ae-stat-label">All events across staff</div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="ae-stat-card">
                        <div className="d-flex align-items-start justify-content-between mb-2">
                            <div className="ae-stat-icon green">
                                <i className="bi bi-unlock-fill"></i>
                            </div>
                            <span className="ae-stat-tag">Open</span>
                        </div>
                        <div className="ae-stat-number green">{openEvents}</div>
                        <div className="ae-stat-label">Currently accepting participants</div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="ae-stat-card">
                        <div className="d-flex align-items-start justify-content-between mb-2">
                            <div className="ae-stat-icon muted">
                                <i className="bi bi-lock-fill"></i>
                            </div>
                            <span className="ae-stat-tag">Closed</span>
                        </div>
                        <div className="ae-stat-number">{closedEvents}</div>
                        <div className="ae-stat-label">No longer accepting participants</div>
                    </div>
                </div>
            </div>

            {/* ── SEARCH + FILTER ── */}
            <div className="ae-toolbar mb-3">
                <div className="ae-search-wrap">
                    <i className="bi bi-search ae-search-icon"></i>
                    <input
                        type="text"
                        className="ae-search"
                        placeholder="Search by event name, staff, or location..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="ae-filter-group">
                    {['all', 'open', 'closed'].map(f => (
                        <button
                            key={f}
                            className={`ae-filter-btn ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── EVENT LIST ── */}
            {loading ? (
                <div className="ae-loading">
                    <i className="bi bi-arrow-repeat ae-spin"></i>
                    Loading events...
                </div>
            ) : filtered.length === 0 ? (
                <div className="ae-empty">
                    <i className="bi bi-calendar-x"></i>
                    <p>No events found.</p>
                </div>
            ) : (
                <div className="ae-list">
                    {filtered.map(event => (
                        <div
                            key={event.id}
                            className="ae-card"
                            onClick={() => setSelectedEvent(event)}
                        >
                            <div className="ae-card-body">
                                {/* Top row — name + status badge */}
                                <div className="ae-card-top">
                                    <div className="ae-card-name">{event.name}</div>
                                    <span className={`ae-badge ${event.is_open ? 'ae-badge-open' : 'ae-badge-closed'}`}>
                                        <span className="ae-badge-dot"></span>
                                        {event.is_open ? 'Open' : 'Closed'}
                                    </span>
                                </div>

                                {/* Meta row */}
                                <div className="ae-card-meta">
                                    <span className="ae-meta-chip">
                                        <i className="bi bi-calendar3"></i>
                                        {new Date(event.date).toLocaleDateString('en-US', {
                                            month: 'long', day: 'numeric', year: 'numeric'
                                        })}
                                    </span>
                                    {event.location_name && (
                                        <span className="ae-meta-chip">
                                            <i className="bi bi-geo-alt-fill"></i>
                                            {event.location_name}
                                        </span>
                                    )}
                                </div>

                                {/* In charge row */}
                                <div className="ae-card-incharge">
                                    <div className="ae-incharge-avatar">
                                        {event.incharge_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="ae-incharge-label">BFP Personnel In Charge</div>
                                        <div className="ae-incharge-name">{event.incharge_name}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="ae-card-arrow">
                                <i className="bi bi-chevron-right"></i>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}