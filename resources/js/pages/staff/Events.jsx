import axios from 'axios'
import { useState, useEffect } from 'react'
import EventModal from './EventModal'
import EventDetail from './EventDetail'
import QRModal from './QRModal'
import '../../../css/Staff/events.css'
import DataTable from '../../components/DataTable';

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

            {/* ── Events grid ── */}
            <div className="ev-grid">
                {eventList.length === 0 ? (
                   <div className="ev-empty">
                        <i className="bi bi-calendar-x ev-empty-icon"></i>
                        <p className="ev-empty-title">No events yet</p>
                        <p className="ev-empty-sub">Click "Create Event" to add one.</p>
                    </div>
                ) : eventList.map((event) => (
                    <div
                        key={event.id}
                        className="ev-event-card"
                        onClick={() => setSelectedView(event)}
                    >
                        <div className="ev-event-card-top">
                            <div className="ev-event-card-icon">
                                <i className="bi bi-fire"></i>
                            </div>
                            <span className={`ev-status-badge ${event.is_open ? 'ev-status-open' : 'ev-status-closed'}`}>
                                {event.is_open ? <><span className="ev-status-dot"></span> Open</> : 'Closed'}
                            </span>
                        </div>

                        <div className="ev-event-card-body">
                            <p className="ev-event-card-name">{event.name}</p>
                            {event.description && (
                                <p className="ev-event-card-desc">{event.description}</p>
                            )}
                        </div>

                        <hr className="ev-event-card-divider" />

                        <div className="ev-event-card-meta">
                            <span className="ev-event-card-meta-item">
                                <i className="bi bi-calendar3"></i>
                                {new Date(event.date).toLocaleDateString('en-US', {
                                    month: 'long', day: 'numeric', year: 'numeric',
                                })}
                            </span>
        
                            <span className="ev-event-card-participants">
                                <i className="bi bi-people"></i>
                                {event.participants_count ?? 0}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
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