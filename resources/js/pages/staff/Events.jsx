import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { QRCodeCanvas } from 'qrcode.react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '../../../css/Staff/events.css'
import DataTable from '../../components/DataTable';
import '../../../css//Components/datatable.css';

// Fix Leaflet marker icons broken by Vite bundler
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// For testing — covers Binalonan + Natividad area
const DEFAULT_CENTER    = [15.9987, 120.6190]  // Binalonan center
const DEFAULT_ZOOM      = 12
const BBOX_SW           = { lat: 15.8000, lng: 120.5000 }  // expanded south-west
const BBOX_NE           = { lat: 16.2000, lng: 120.9500 }  // expanded north-east
const NATIVIDAD_BOUNDS  = L.latLngBounds(
    L.latLng(BBOX_SW.lat, BBOX_SW.lng),
    L.latLng(BBOX_NE.lat, BBOX_NE.lng)
)
const NOMINATIM_VIEWBOX = `${BBOX_SW.lng},${BBOX_SW.lat},${BBOX_NE.lng},${BBOX_NE.lat}`

const EMPTY_FORM = {
    name: '', description: '', date: '',
    location_name: '', latitude: null, longitude: null, radius_meters: 100,
}

function LocateMe({ onLocate }) {
    const map = useMap()
    const [loading, setLoading] = useState(false)

    const locate = () => {
        setLoading(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude
                const lng = pos.coords.longitude
                map.flyTo([lat, lng], 17, { duration: 1.2 })
                onLocate(lat, lng)
                setLoading(false)
            },
            () => {
                alert('Could not get your location. Please allow location access.')
                setLoading(false)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    return (
        <div style={{
            position: 'absolute', bottom: 16, right: 16, zIndex: 1000
        }}>
            <button
                type="button"
                onClick={locate}
                style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#f1f5f9',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
            >
                {loading ? '⏳' : '📍'} {loading ? 'Locating...' : 'Use My Location'}
            </button>
        </div>
    )
}
// ── MapPicker ─────────────────────────────────────────────────────────────────
function MapPicker({ onLocationSelect }) {
    useMapEvents({ click(e) { onLocationSelect(e.latlng.lat, e.latlng.lng) } })
    return null
}

// ── FlyTo ─────────────────────────────────────────────────────────────────────
function FlyTo({ target }) {
    const map = useMap()
    useEffect(() => {
        if (target) map.flyTo([target.lat, target.lng], 17, { duration: 1.2 })
    }, [target, map])
    return null
}

// ── LocationSearch ────────────────────────────────────────────────────────────
function LocationSearch({ onSelect }) {
    const [query,     setQuery]     = useState('')
    const [results,   setResults]   = useState([])
    const [loading,   setLoading]   = useState(false)
    const [focused,   setFocused]   = useState(false)
    const [noResults, setNoResults] = useState(false)
    const wrapRef                   = useRef(null)
    const timerRef                  = useRef(null)

    useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        const q = query.trim()
        if (q.length < 2) { setResults([]); setNoResults(false); return }

        timerRef.current = setTimeout(async () => {
            setLoading(true)
            setNoResults(false)
            try {
                const params = new URLSearchParams({
                    q:            q + ' Natividad Pangasinan Philippines',
                    format:       'json',
                    limit:        '7',
                    countrycodes: 'ph',
                    viewbox:      NOMINATIM_VIEWBOX,
                    bounded:      '1',
                })
                const res  = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
                    headers: { 'Accept-Language': 'en', 'User-Agent': 'NatividadEventsApp/1.0' },
                })
                const data = await res.json()
                const inside = data.filter(r => {
                    const lat = parseFloat(r.lat), lon = parseFloat(r.lon)
                    return lat >= BBOX_SW.lat && lat <= BBOX_NE.lat &&
                           lon >= BBOX_SW.lng && lon <= BBOX_NE.lng
                })
                setResults(inside)
                setNoResults(inside.length === 0)
            } catch {
                setResults([])
            } finally {
                setLoading(false)
            }
        }, 400)
    }, [query])

    const pick = (r) => {
        const lat  = parseFloat(r.lat)
        const lng  = parseFloat(r.lon)
        const name = r.display_name.split(',').slice(0, 2).join(', ')
        onSelect(lat, lng, name)
        setQuery(name)
        setFocused(false)
        setResults([])
    }

    const clear = () => { setQuery(''); setResults([]); setFocused(false); setNoResults(false) }

    const showDropdown = focused && query.trim().length >= 2 && (loading || results.length > 0 || noResults)

    return (
        <div ref={wrapRef} className="ev-search-wrap">
            <div className="ev-search-input-wrap">
                <span className="ev-search-icon">{loading ? '⏳' : '🔍'}</span>
                <input
                    className="ev-search-input"
                    placeholder="Search e.g. School, etc..."
                    value={query}
                    onChange={e => { setQuery(e.target.value); setFocused(true) }}
                    onFocus={() => setFocused(true)}
                />
                {query && (
                    <button className="ev-search-clear" onMouseDown={clear}>✕</button>
                )}
            </div>

            {showDropdown && (
                <ul className="ev-search-dropdown">
                    {loading && (
                        <li className="ev-search-item" style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                            Searching…
                        </li>
                    )}
                    {!loading && noResults && (
                        <li className="ev-search-item" style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                            No places found in Natividad
                        </li>
                    )}
                    {!loading && results.map((r, i) => {
                        const parts = r.display_name.split(',')
                        const title = parts.slice(0, 2).join(', ')
                        const sub   = parts.slice(2, 4).join(', ').trim()
                        return (
                            <li key={i} className="ev-search-item" onMouseDown={() => pick(r)}>
                                <span style={{ marginRight: 8, flexShrink: 0 }}>📍</span>
                                <span>
                                    <span className="ev-search-item-title">{title}</span>
                                    {sub && <span className="ev-search-item-sub">{sub}</span>}
                                </span>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
function EventDetail({ event, onBack, onEdit, onDelete, onQR, token, onToggle }) {
    const [participants, setParticipants] = useState([])
    const [loadingP, setLoadingP]         = useState(true)
    const [toggling, setToggling]         = useState(false)
    

    // Fetch participants for this event when component mounts
    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get(`/api/staff/events/${event.id}/participants`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setParticipants(Array.isArray(res.data) ? res.data : [])
            } catch {
                setParticipants([])
            } finally {
                setLoadingP(false)
            }
        }
        fetch()
    }, [event.id])

    const handleToggleClick = async () => {
        setToggling(true)
        try {
            await onToggle(event)
        } finally {
            setToggling(false)
        }
    }
    const participantColumns = [
    {   key: '_index',
        label: '#',           
        width: '36px', 
        className: 'sm-num',
        render: (_, __, i) => i + 1 
    },

    {   key: 'name',         
        label: 'Name',
        render: (value) => <span className="ev-event-name">{value}</span> 
    },

    {   key: 'email',
        label: 'Email',        
        className: 'sm-muted' },

    {   key: 'department',   
        label: 'Department',   
        className: 'sm-muted',
        hidden640: true,
        render: (value) => value || <span className="ev-dash">—</span> 
    },

    {   key: 'contact_number', 
        label: 'Contact',    
        className: 'sm-muted',
        render: (value) => value || <span className="ev-dash">—</span> 
    },

    {   key: 'created_at',   
        label: 'Registered',   
        hidden640: true,
        render: (value) =>
                new Date(value).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                }),
    },
];

    return (
        <div className="ev-page">

            {/* Header */}
            <div className="ev-page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="ev-btn ev-btn-ghost" onClick={onBack}>
                        <i className="bi bi-arrow-left"></i> Back
                    </button>
                    <div>
                        <h4 className="ev-page-title">{event.name}</h4>
                        <p className="ev-page-sub">Event Details</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="ev-btn ev-btn-ghost" onClick={() => onQR(event)}>
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
                        <i className="bi bi-calendar3 me-2 text-danger"></i>{event.date}
                    </div>
                </div>
                <div className="ev-detail-card">
                    <div className="ev-detail-label">Venue</div>
                    <div className="ev-detail-value">
                        <i className="bi bi-geo-alt-fill me-2 text-danger"></i>
                        {event.location_name || '—'}
                    </div>
                </div>
                <div className="ev-detail-card">
                    <div className="ev-detail-label">Registration Radius</div>
                    <div className="ev-detail-value">
                        <i className="bi bi-broadcast me-2 text-danger"></i>
                        {event.radius_meters}m from venue
                    </div>
                </div>
                <div className="ev-detail-card">
                    <div className="ev-detail-label">Total Registered</div>
                    <div className="ev-detail-value">
                        <i className="bi bi-people-fill me-2 text-danger"></i>
                        {event.participants_count ?? participants.length} participants
                    </div>
                </div>
            </div>

            {event.description && (
                <div className="ev-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
                    <div className="ev-detail-label" style={{ marginBottom: 4 }}>Description</div>
                    <p style={{ margin: 0, color: '#cbd5e1' }}>{event.description}</p>
                </div>
            )}

            {/* Participants Table */}
            <div className="ev-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
                    <h6 style={{ margin: 0, color: '#f1f5f9', fontWeight: 600 }}>
                        <i className="bi bi-people-fill me-2 text-danger"></i>
                        Registered Participants
                    </h6>
                </div>
                <DataTable
                    columns={participantColumns}
                    data={participants}
                    loading={loadingP}
                    emptyIcon="bi-inbox"
                    emptyTitle="No participants yet"
                    emptySub="No participants registered yet."
                />
            </div>

        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
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
    const [selectedView, setSelectedView]   = useState(null)
    const [something, setSomething]         = useState([])
    const [copied, setCopied]               = useState(false)
    const [downloaded, setDownloaded]       = useState(false)
   

    const token = localStorage.getItem('token')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

    useEffect(() => { fetchEvents() }, [])

    const fetchEvents = async () => {
        try {
            const res = await axios.get('/api/staff/events')
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

    const handleMapClick = (lat, lng) => {
        setForm(prev => ({ ...prev, latitude: lat, longitude: lng }))
        setMarkerPos({ lat, lng })
    }

    const handleSearchSelect = (lat, lng, name) => {
        setForm(prev => ({ ...prev, latitude: lat, longitude: lng, location_name: prev.location_name || name }))
        setMarkerPos({ lat, lng })
        setFlyTarget({ lat, lng })
    }

    const getRegistrationUrl = (tok) => `${window.location.origin}/register/${tok}`

    const downloadQR = () => {
        const canvas = document.getElementById('qr-canvas')
        const qrSize = 190
        const padding = 28
        const headerH = 76
        const footerH = 52
        const totalW = qrSize + padding * 2
        const totalH = headerH + qrSize + padding * 2 + footerH

        const out = document.createElement('canvas')
        out.width = totalW
        out.height = totalH
        const ctx = out.getContext('2d')

        // White background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, totalW, totalH)

        // Red header
        ctx.fillStyle = '#CC2229'
        ctx.fillRect(0, 0, totalW, headerH)

        // Header text
        ctx.textAlign = 'center'
        ctx.fillStyle = '#ffffff'
        ctx.font = '500 12px system-ui, sans-serif'
        ctx.fillText('BUREAU OF FIRE PROTECTION', totalW / 2, 24)
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.font = '400 10px system-ui, sans-serif'
        ctx.fillText('Official Event Registration', totalW / 2, 40)

        // Divider line
        ctx.fillStyle = 'rgba(255,255,255,0.2)'
        ctx.fillRect(padding, 50, totalW - padding * 2, 0.5)

        // Event name
        ctx.fillStyle = '#ffffff'
        ctx.font = '500 11px system-ui, sans-serif'
        ctx.fillText(selectedEvent.name, totalW / 2, 64)

        // QR code
        ctx.drawImage(canvas, padding, headerH + padding - 8, qrSize, qrSize)

        // Footer
        ctx.fillStyle = '#f9fafb'
        ctx.fillRect(0, totalH - footerH, totalW, footerH)
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(0, totalH - footerH)
        ctx.lineTo(totalW, totalH - footerH)
        ctx.stroke()

        // Footer URL
        ctx.fillStyle = '#9ca3af'
        ctx.font = '400 8.5px system-ui, sans-serif'
        ctx.fillText(getRegistrationUrl(selectedEvent.token), totalW / 2, totalH - footerH + 20)

        // Footer label
        ctx.fillStyle = '#CC2229'
        ctx.font = '500 9px system-ui, sans-serif'
        ctx.fillText('Scan to register', totalW / 2, totalH - footerH + 36)

        const link = document.createElement('a')
        link.download = `${selectedEvent.name.replace(/\s+/g, '-')}-QR.png`
        link.href = out.toDataURL('image/png')
        setDownloaded(true)
        setTimeout(() => setDownloaded(false), 2000)
        link.click()
    }

    const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
        if (editing) {
            await axios.put(`/api/staff/events/${editing.id}`, form)
            setSuccess('Event updated!')
        } else {
            await axios.post('/api/staff/events', form)
            setSuccess('Event created!')
        }
        const res = await fetchEvents()  
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
        try { await axios.delete(`/api/staff/events/${id}`); fetchEvents() }
        catch (err) { console.error('Delete error:', err) }
    }

    const handleToggle = async (eventToToggle) => {
        try {
            const res = await axios.patch(
                `/api/staff/events/${eventToToggle.id}/toggle`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
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

    const mapCenter = markerPos ? [markerPos.lat, markerPos.lng] : DEFAULT_CENTER
    

    return (
        <>
        {selectedView ? (
            <EventDetail
                event={selectedView}
                token={token}
                onBack={() => setSelectedView(null)}
                onEdit={(event) => { openEdit(event) }}
                onDelete={async (id) => { await handleDelete(id); setSelectedView(null) }}
                onQR={(event) => { setSelectedEvent(event); setShowQR(true) }}
                onToggle={handleToggle}
            />
        ) : (
        <div className="ev-page">

            {/* ── Page header ── */}
            <div className="ev-page-header">
                <div>
                    <h4 className="ev-page-title">My Events</h4>
                    <p className="ev-page-sub">Create and manage your fire safety training events</p>
                </div>
                <button className="ev-btn ev-btn-primary" onClick={openCreate}>
                    <i className="bi bi-plus-circle-fill"></i> Create Event
                </button>
            </div>

            {/* ── Events table ── */}
            <div className="sm-card">
                <table className="sm-table ev-events-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th>Event Name</th>
                            <th>Date</th>
                            <th className="sm-col-hide640">Venue</th>
                            <th className="sm-col-hide640" style={{ width: '80px' }}>Radius</th>
                            <th style={{ width: '130px' }}>Participants</th>
                        </tr>
                    </thead>
                    <tbody>
                        {eventList.length === 0 ? (
                            <tr>
                                <td colSpan="6">
                                    <div className="sm-empty">
                                        <i className="bi bi-calendar-x sm-empty-icon"></i>
                                        <p className="sm-empty-title">No events yet</p>
                                        <p className="sm-empty-sub">Click "Create Event" to add one.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : eventList.map((event, i) => (
                            <tr
                                key={event.id}
                                onClick={() => setSelectedView(event)}
                                style={{ cursor: 'pointer' }}
                            >
                                <td className="sm-num">{i + 1}</td>
                                <td>
                                    <span className="ev-event-name">{event.name}</span>
                                </td>
                                <td className="sm-muted">
                                    {new Date(event.date).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', year: 'numeric',
                                    })}
                                </td>
                                <td className="sm-muted sm-col-hide640">
                                    {event.location_name || <span className="ev-dash">—</span>}
                                </td>
                                <td className="sm-col-hide640">
                                    <span className="ev-badge ev-badge-blue">{event.radius_meters}m</span>
                                </td>
                                <td>
                                    <span className="ev-badge ev-badge-gray">
                                        {event.participants_count ?? 0} registered
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        )}

        {/* Create / Edit Modal */}
        {showModal && (
            <div className="ev-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
                <div className="ev-modal">

                    <div className="ev-modal-header">
                        <div className="ev-modal-header-icon">
                            <i className={`bi ${editing ? 'bi-pencil-fill' : 'bi-plus-lg'}`}></i>
                        </div>
                        <div className="ev-modal-header-text">
                            <h5>{editing ? 'Edit Event' : 'Create New Event'}</h5>
                            <p>{editing ? 'Update event details below' : 'Fill in the details to create an event'}</p>
                        </div>
                        <button className="ev-modal-close" onClick={closeModal}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
                        <div className="ev-modal-body">

                            {error   && <div className="ev-alert ev-alert-error">{error}</div>}
                            {success && <div className="ev-alert ev-alert-success">{success}</div>}

                            <div className="ev-section-label">Basic Information</div>

                            <div className="ev-field">
                                <label>Event Name <span className="ev-req">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. Fire Safety Seminar Batch 1"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="ev-field">
                                <label>Description <span className="ev-opt">(optional)</span></label>
                                <textarea
                                    rows="2"
                                    placeholder="Brief description of the event..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="ev-row">
                                <div className="ev-field">
                                    <label>Date <span className="ev-req">*</span></label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="ev-field">
                                    <label>Venue Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Natividad Municipal Hall"
                                        value={form.location_name}
                                        onChange={e => setForm({ ...form, location_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="ev-section-label" style={{ marginTop: 8 }}>Location & Radius</div>

                            <div className="ev-field">
                                <label>
                                    Registration Radius
                                    <span className="ev-radius-val">{form.radius_meters}m</span>
                                </label>
                                <input
                                    type="range" min="50" max="500" step="50"
                                    value={form.radius_meters}
                                    onChange={e => setForm({ ...form, radius_meters: parseInt(e.target.value) })}
                                    className="ev-range"
                                />
                                <div className="ev-range-labels">
                                    <span>50m · indoor</span>
                                    <span>500m · outdoor</span>
                                </div>
                            </div>

                            <div className="ev-field">
                                <label>
                                    Pin on Map <span className="ev-req">*</span>
                                    <span className="ev-hint">Search a place or tap the map to drop a pin</span>
                                </label>
                                <div className="ev-map-wrap">
                                    <LocationSearch onSelect={handleSearchSelect} />
                                    <MapContainer
                                        key={mapKey}
                                        center={mapCenter}
                                        zoom={DEFAULT_ZOOM}
                                        minZoom={12}
                                        maxZoom={18}
                                        maxBounds={NATIVIDAD_BOUNDS}
                                        maxBoundsViscosity={1.0}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution="© OpenStreetMap"
                                        />
                                        <MapPicker onLocationSelect={handleMapClick} />
                                        <FlyTo target={flyTarget} />
                                        {markerPos && <Marker position={[markerPos.lat, markerPos.lng]} />}
                                        {markerPos && (
                                            <Circle
                                                center={[markerPos.lat, markerPos.lng]}
                                                radius={form.radius_meters}
                                                pathOptions={{
                                                    color: '#c0392b',
                                                    fillColor: '#c0392b',
                                                    fillOpacity: 0.15,
                                                    weight: 2,
                                                }}
                                            />
                                        )}
                                         <LocateMe onLocate={(lat, lng) => {
                                            handleMapClick(lat, lng)
                                            setFlyTarget({ lat, lng })
                                        }} />
                                    </MapContainer>
                                </div>
                                <div className="ev-pin-feedback">
                                    {markerPos ? (
                                        <span className="ev-pin-set">
                                            <i className="bi bi-geo-alt-fill"></i>
                                            Pinned at {parseFloat(markerPos.lat).toFixed(5)}, {parseFloat(markerPos.lng).toFixed(5)}
                                        </span>
                                    ) : (
                                        <span className="ev-pin-unset">
                                            <i className="bi bi-exclamation-circle"></i>
                                            No pin set — search or tap the map
                                        </span>
                                    )}
                                </div>
                            </div>

                        </div>

                        <div className="ev-modal-footer">
                            <button type="button" className="ev-btn ev-btn-ghost" onClick={closeModal}>
                                Cancel
                            </button>
                            <button type="submit" className="ev-btn ev-btn-primary" disabled={loading}>
                                {loading ? (
                                    <><span className="ev-spinner"></span> Saving…</>
                                ) : (
                                    <><i className={`bi ${editing ? 'bi-check-lg' : 'bi-plus-lg'}`}></i> {editing ? 'Update Event' : 'Create Event'}</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* ══ QR Code Modal */}
        {showQR && selectedEvent && (
            <div className="ev-overlay" onClick={e => { if (e.target === e.currentTarget) setShowQR(false) }}>
                <div className="ev-modal ev-modal-qr">

    
                    <div className="ev-modal-header ev-modal-header-qr">
                        <div className="ev-modal-header-icon">
                            <i className="bi bi-qr-code-scan"></i>
                        </div>
                        <div className="ev-modal-header-text">
                            <h5>Event QR Code</h5>
                            <p>Scan to register for this event</p>
                        </div>
                        <button className="ev-modal-close ev-modal-close-qr" onClick={() => setShowQR(false)}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className="ev-modal-body ev-qr-body">

                        <p className="ev-qr-event-name">{selectedEvent.name}</p>
                        <p className="ev-qr-meta">
                            <i className="bi bi-calendar3"></i>&nbsp;
                            {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'long', day: 'numeric'
                            })}
                            {selectedEvent.location_name && (
                                <>
                                    &nbsp;<span className="ev-qr-dot">·</span>&nbsp;
                                    <i className="bi bi-geo-alt"></i>&nbsp;{selectedEvent.location_name}
                                </>
                            )}
                        </p>

                        <div className="ev-qr-frame">
                            <div className="ev-qr-inner">
                                <QRCodeCanvas
                                    id="qr-canvas"
                                    value={getRegistrationUrl(selectedEvent.token)}
                                    size={190}
                                    level="H"
                                />
                            </div>
                        </div>

                        <div className="ev-qr-url-chip">
                            <i className="bi bi-link-45deg"></i>
                            <span className="ev-qr-url-text">{getRegistrationUrl(selectedEvent.token)}</span>
                        </div>
                    </div>

                    <div className="ev-modal-footer ev-qr-footer">
                        <button
                            className={`ev-btn ev-qr-download-btn ${downloaded ? 'ev-btn-success' : 'ev-btn-primary'}`}
                            onClick={downloadQR}
                            style={{ transition: 'background 0.3s, border-color 0.3s, color 0.3s' }}
                        >
                            <i className={`bi ${downloaded ? 'bi-check-lg' : 'bi-download'}`}></i>
                            {downloaded ? 'Downloaded!' : 'Download QR Code'}
                        </button>
                        <button
                            className="ev-btn ev-btn-ghost ev-qr-share-btn"
                            onClick={() => {
                                navigator.clipboard.writeText(getRegistrationUrl(selectedEvent.token))
                                setCopied(true)
                                setTimeout(() => setCopied(false), 2000)
                            }}
                        >
                            <i className={`bi ${copied ? 'bi-check-lg' : 'bi-share'}`}></i>
                            {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                    </div>

                    <p className="ev-qr-hint">
                        Post or print this QR so participants can scan and register instantly.
                    </p>
                </div>
            </div>
        )}
        </>
    )
}