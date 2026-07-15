import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet marker icons broken by Vite bundler
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DEFAULT_CENTER    = [15.9987, 120.6190]
const DEFAULT_ZOOM      = 12
const BBOX_SW           = { lat: 15.8000, lng: 120.5000 }
const BBOX_NE           = { lat: 16.2000, lng: 120.9500 }
const NATIVIDAD_BOUNDS  = L.latLngBounds(
    L.latLng(BBOX_SW.lat, BBOX_SW.lng),
    L.latLng(BBOX_NE.lat, BBOX_NE.lng)
)
const NOMINATIM_VIEWBOX = `${BBOX_SW.lng},${BBOX_SW.lat},${BBOX_NE.lng},${BBOX_NE.lat}`

// ── LocateMe ──────────────────────────────────────────────────────────────────
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
        <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 1000 }}>
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

// ── EventModal ────────────────────────────────────────────────────────────────
export default function EventModal({
    show,
    editing,
    form,
    setForm,
    onSubmit,
    onClose,
    loading,
    error,
    success,
    markerPos,
    setMarkerPos,
    flyTarget,
    setFlyTarget,
    mapKey,
}) {
    // Local error specifically for the missing-pin case — kept
    // separate from the `error` prop (which comes from the parent's
    // API call) so it can be cleared independently the moment a
    // pin gets set, without touching parent state.
    const [pinError, setPinError] = useState('')

    if (!show) return null

    const mapCenter = markerPos ? [markerPos.lat, markerPos.lng] : DEFAULT_CENTER

    // Pin is only REQUIRED when creating a new event. When editing,
    // markerPos should already be populated from the event's existing
    // latitude/longitude, so this never blocks an edit in practice.
    const pinRequired = !editing
    const pinMissing  = pinRequired && !markerPos

    const handleMapClick = (lat, lng) => {
        setForm(prev => ({ ...prev, latitude: lat, longitude: lng }))
        setMarkerPos({ lat, lng })
        setPinError('')
    }

    const handleSearchSelect = (lat, lng, name) => {
        setForm(prev => ({ ...prev, latitude: lat, longitude: lng, location_name: prev.location_name || name }))
        setMarkerPos({ lat, lng })
        setFlyTarget({ lat, lng })
        setPinError('')
    }

    // Intercepts the form submit before handing off to the parent's
    // onSubmit. If a pin is required and missing, block it here and
    // show an inline error instead of letting the API call happen.
    const handleSubmit = (e) => {
        e.preventDefault()
        if (pinMissing) {
            setPinError('Please pin a location on the map before creating this event.')
            return
        }
        setPinError('')
        onSubmit(e)
    }

    return (
        <div className="ev-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="ev-modal">

                <div className="ev-modal-header">
                    <div className="ev-modal-header-icon">
                        <i className={`bi ${editing ? 'bi-pencil-fill' : 'bi-plus-lg'}`}></i>
                    </div>
                    <div className="ev-modal-header-text">
                        <h5>{editing ? 'Edit Event' : 'Create New Event'}</h5>
                        <p>{editing ? 'Update event details below' : 'Fill in the details to create an event'}</p>
                    </div>
                    <button className="ev-modal-close" onClick={onClose}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
                    <div className="ev-modal-body">

                        {error    && <div className="ev-alert ev-alert-error">{error}</div>}
                        {pinError && <div className="ev-alert ev-alert-error">{pinError}</div>}
                        {success  && <div className="ev-alert ev-alert-success">{success}</div>}

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
                            <div
                                className="ev-map-wrap"
                                style={pinMissing ? { border: '1.5px solid #dc2626' } : undefined}
                            >
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
                                        {pinRequired
                                            ? 'No pin set — search or tap the map (required)'
                                            : 'No pin set — search or tap the map'}
                                    </span>
                                )}
                            </div>
                        </div>

                    </div>

                    <div className="ev-modal-footer">
                        <button type="button" className="ev-btn ev-btn-ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="ev-btn ev-btn-primary"
                            disabled={loading || pinMissing}
                            title={pinMissing ? 'Pin a location on the map first' : undefined}
                        >
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
    )
}