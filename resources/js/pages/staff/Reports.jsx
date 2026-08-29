import { useEffect, useState, useMemo } from 'react';
import api from '../../api/axios';
import { generateEventReport } from '../../utils/reports';
import '../../../css/Staff/reports.css'

// Below this count, a search box is clutter rather than help.
const SEARCH_THRESHOLD = 6;

function Reports() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    api.get('/staff/events')
      .then((res) => setEvents(res.data.events ?? res.data ?? []))
      .catch(() => setError('Could not load your events.'))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    const result = await generateEventReport(selected, { preview: true });
    if (!result.ok) setError(result.message);
    setBusy(false);
  };

  const chosen = events.find((e) => String(e.id) === String(selected));

  // Newest first — staff almost always want the most recent event.
  // useMemo stops this re-sorting on every keystroke in the search box.
  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [events]
  );

  const filtered = sorted.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.location_name?.toLowerCase().includes(search.toLowerCase())
  );

  // participants_count may be absent depending on the endpoint's
  // eager loading, so treat a missing value as 0 rather than NaN.
  const totalParticipants = events.reduce(
    (sum, e) => sum + (e.participants_count ?? 0), 0
  );

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div className="rp-page">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="rp-header">
        <div>
          <h1 className="rp-title">Generate reports</h1>
          <p className="rp-sub">
            Printable training records for BFP Natividad Station
          </p>
        </div>

        {!loading && events.length > 0 && (
          <div className="rp-chips">
            <div className="rp-chip">
              <span className="rp-chip-n">{events.length}</span>
              <span className="rp-chip-l">events</span>
            </div>
            <div className="rp-chip">
              <span className="rp-chip-n">{totalParticipants}</span>
              <span className="rp-chip-l">participants</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Report type ────────────────────────────────────── */}
      <div className="rp-section-label">Report type</div>

      <div className="rp-types">
        <div className="rp-type rp-type-active">
          <div className="rp-type-head">
            <i className="bi bi-file-earmark-text-fill"></i>
            <span className="rp-type-name">Event summary</span>
            <span className="rp-badge-pdf">PDF</span>
          </div>
          <p className="rp-type-desc">
            One event: attendance, pass rates, per-environment
            performance, and a full participant results table.
          </p>
        </div>

        {/* Placeholder for the period report. Keeping the slot visible
            makes the roadmap obvious and stops the page reading as
            unfinished when only one report exists. */}
        <div className="rp-type rp-type-soon">
          <div className="rp-type-head">
            <i className="bi bi-calendar-range"></i>
            <span className="rp-type-name">Period report</span>
            <span className="rp-badge-soon">Soon</span>
          </div>
          <p className="rp-type-desc">
            All events within a date range, with station-wide totals.
          </p>
        </div>
      </div>

      {/* ── Event selection ────────────────────────────────── */}
      <div className="rp-section-label">
        Select event
        {events.length > SEARCH_THRESHOLD && (
          <input
            type="text"
            className="rp-search"
            placeholder="Search events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        )}
      </div>

      {loading ? (
        <div className="rp-skeleton-list">
          <div className="rp-skeleton"></div>
          <div className="rp-skeleton"></div>
          <div className="rp-skeleton"></div>
        </div>

      ) : events.length === 0 ? (
        <div className="rp-empty">
          <i className="bi bi-calendar-x"></i>
          <p className="rp-empty-title">No events yet</p>
          <p className="rp-empty-sub">
            Create an event first — reports are generated per event.
          </p>
        </div>

      ) : filtered.length === 0 ? (
        <div className="rp-empty">
          <i className="bi bi-search"></i>
          <p className="rp-empty-title">No events match "{search}"</p>
        </div>

      ) : (
        <div className="rp-event-list">
          {filtered.map(event => {
            const isSelected = String(event.id) === String(selected);
            return (
              <button
                key={event.id}
                type="button"
                className={`rp-event ${isSelected ? 'rp-event-active' : ''}`}
                onClick={() => setSelected(String(event.id))}
              >
                <div className="rp-event-main">
                  <div className="rp-event-name">{event.name}</div>
                  <div className="rp-event-meta">
                    <i className="bi bi-calendar3"></i>
                    {formatDate(event.date)}
                    <span className="rp-dot">·</span>
                    <i className="bi bi-geo-alt"></i>
                    {event.location_name || 'No venue set'}
                  </div>
                </div>

                <div className="rp-event-stats">
                  <div className="rp-stat">
                    <span className="rp-stat-n">
                      {event.participants_count ?? 0}
                    </span>
                    <span className="rp-stat-l">joined</span>
                  </div>
                  <span className={`rp-status ${event.is_open ? 'rp-status-open' : 'rp-status-closed'}`}>
                    {event.is_open ? 'Open' : 'Closed'}
                  </span>
                </div>

                <i className={`bi ${isSelected ? 'bi-check-circle-fill' : 'bi-circle'} rp-event-check`}></i>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Generate panel ─────────────────────────────────── */}
      {!loading && events.length > 0 && (
        <div className="rp-generate">
          <div className="rp-includes-label">This report includes</div>
          <div className="rp-includes">
            <span className="rp-pill">BFP letterhead</span>
            <span className="rp-pill">Event details</span>
            <span className="rp-pill">Attendance</span>
            <span className="rp-pill">Pass rate</span>
            <span className="rp-pill">By environment</span>
            <span className="rp-pill">Results table</span>
            <span className="rp-pill">Signature line</span>
          </div>

          {error && (
            <div className="rp-error">
              <i className="bi bi-exclamation-triangle-fill"></i>
              {error}
            </div>
          )}

          <div className="rp-generate-bar">
            <span className="rp-generate-target">
              {chosen ? (
                <>
                  <i className="bi bi-file-earmark-pdf"></i>
                  {chosen.name}
                </>
              ) : (
                'Select an event above'
              )}
            </span>
            <button
              className="rp-btn"
              onClick={handleGenerate}
              disabled={!selected || busy}
            >
              {busy ? (
                <>
                  <span className="rp-spinner"></span>
                  Generating...
                </>
              ) : (
                <>
                  <i className="bi bi-download"></i>
                  Generate report
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Reports;