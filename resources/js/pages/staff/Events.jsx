import api from '../../api/axios'
import { useState, useEffect } from 'react'
import EventModal from './EventModal'
import EventDetail from './EventDetail'
import QRModal from './QRModal'
import '../../../css/Staff/events.css'
import '../../../css/Components/eventlist.css'

const EMPTY_FORM = {
    name: '', description: '', date: '',
    location_name: '', latitude: null, longitude: null, radius_meters: 100,
}

export default function Events() {
    const [eventList,     setEventList]     = useState([])
    const [showModal,     setShowModal]     = useState(false)
    const [showQR,        setShowQR]        = useState(false)
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [editing,       setEditing]       = useState(null)
    const [form,          setForm]          = useState(EMPTY_FORM)
    const [markerPos,     setMarkerPos]     = useState(null)
    const [flyTarget,     setFlyTarget]     = useState(null)
    const [mapKey,        setMapKey]        = useState(0)
    const [error,         setError]         = useState('')
    const [success,       setSuccess]       = useState('')
    const [loading,       setLoading]       = useState(false)
    const [selectedView,  setSelectedView]  = useState(null)

    // NEW — search + filter, same as the admin page
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')


    useEffect(() => { fetchEvents() }, [])

    const fetchEvents = async () => {
        try {
            const res = await api.get('/staff/events')
            setEventList(Array.isArray(res.data) ? res.data : [])
        } catch {
            setEventList([])
        }
    }

    const openCreate = () => {
        setEditing(null); setForm(EMPTY_FORM); setMarkerPos(null)
        setFlyTarget(null); setMapKey(k => k + 1)
        setError(''); setSuccess(''); setShowModal(true)
    }

    const openEdit = (event) => {
        setEditing(event)
        setForm({
            name:          event.name          || '',
            description:   event.description   || '',
            date:          event.date          || '',
            location_name: event.location_name || '',
            latitude:      event.latitude      || null,
            longitude:     event.longitude     || null,
            radius_meters: event.radius_meters || 100,
        })
        const pos = event.latitude && event.longitude
            ? { lat: parseFloat(event.latitude), lng: parseFloat(event.longitude) }
            : null
        setMarkerPos(pos); setFlyTarget(pos)
        setMapKey(k => k + 1); setError(''); setSuccess(''); setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false); setEditing(null); setError(''); setSuccess('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true); setError('')
        try {
            if (editing) {
                await api.put(`/staff/events/${editing.id}`, form)
                setSuccess('Event updated!')
            } else {
                await api.post('/staff/events', form)
                setSuccess('Event created!')
            }
            await fetchEvents()
            if (editing && selectedView) {
                setSelectedView(prev => ({ ...prev, ...form }))
            }
            setTimeout(closeModal, 1000)
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong.')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this event and all its participants?')) return
        try { await api.delete(`/staff/events/${id}`); fetchEvents() }
        catch (err) { console.error('Delete error:', err) }
    }

    const handleToggle = async (eventToToggle) => {
        try {
            const res = await api.patch(
                `/staff/events/${eventToToggle.id}/toggle`,
                {}
            )
            const newIsOpen = res.data.is_open

            setEventList(prev =>
                prev.map(e => e.id === eventToToggle.id ? { ...e, is_open: newIsOpen } : e)
            )
            setSelectedView(prev => ({ ...prev, is_open: newIsOpen }))
        } catch (err) {
            console.error('Toggle failed:', err.response?.data || err.message)
        }
    }

    // ── Derived data for the stat cards + list ────────────────
    const totalEvents  = eventList.length
    const openEvents   = eventList.filter(e => e.is_open).length
    const closedEvents = eventList.filter(e => !e.is_open).length

    const filtered = eventList.filter(e => {
        const q = search.toLowerCase()
        const matchSearch =
            e.name?.toLowerCase().includes(q) ||
            e.location_name?.toLowerCase().includes(q)
        const matchFilter =
            filter === 'all'  ? true :
            filter === 'open' ? e.is_open :
                                !e.is_open
        return matchSearch && matchFilter
    })

    return (
        <>
        {selectedView ? (
            <EventDetail
                event={selectedView}
                onBack={() => setSelectedView(null)}
                onEdit={(event) => { openEdit(event) }}
                onDelete={async (id) => { await handleDelete(id); setSelectedView(null) }}
                onQR={(event) => { setSelectedEvent(event); setShowQR(true) }}
                onToggle={handleToggle}
            />
        ) : (
        <div className="ae-page">

            {/* ── PAGE HEADER ── */}
            <div className="ae-page-header">
                <div>
                    <h4 className="ae-page-title">My Events</h4>
                    <p className="ae-page-sub">Create and manage your fire safety training events</p>
                </div>
                <button className="ae-btn-primary" onClick={openCreate}>
                    <i className="bi bi-plus-circle-fill"></i> Create Event
                </button>
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
                        <div className="ae-stat-label">All events you created</div>
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
                        placeholder="Search by event name or location..."
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
            {filtered.length === 0 ? (
                <div className="ae-empty">
                    <i className="bi bi-calendar-x"></i>
                    <p>{eventList.length === 0
                        ? 'No events yet. Click "Create Event" to add one.'
                        : 'No events match your search.'}</p>
                </div>
            ) : (
                <div className="ae-list">
                    {filtered.map(event => (
                        <div
                            key={event.id}
                            className="ae-card"
                            onClick={() => setSelectedView(event)}
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

                                {/* Description in place of the admin "in charge" row */}
                                {event.description && (
                                    <div className="ae-card-incharge">
                                        <div className="ae-incharge-label">Description</div>
                                        <div className="ae-incharge-name">{event.description}</div>
                                    </div>
                                )}
                            </div>

                            {/* Participants count */}
                            <div className="ae-card-count">
                                <b>{event.participants_count ?? 0}</b>
                                <span>Joined</span>
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
        )}

        <EventModal
            show={showModal}
            editing={editing}
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            onClose={closeModal}
            loading={loading}
            error={error}
            success={success}
            markerPos={markerPos}
            setMarkerPos={setMarkerPos}
            flyTarget={flyTarget}
            setFlyTarget={setFlyTarget}
            mapKey={mapKey}
        />

        <QRModal
            show={showQR}
            event={selectedEvent}
            onClose={() => setShowQR(false)}
        />
        </>
    )
}