import { useEffect, useState, useMemo } from 'react';
import api from '../../api/axios';
import { generateEventReport, generateStepAnalysisReport, generateFollowUpReport } from '../../utils/reports';
import '../../../css/Staff/reports.css'

// Below this count a search box is clutter — you can see everything.
const SEARCH_THRESHOLD = 6;

export default function Reports() {

  // Which report the page is configuring: 'event', 'steps', or 'followup'
  const [reportType, setReportType] = useState('event');

  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');

  // Date range for the training analysis report. Empty strings mean
  // "no bound" — the controller's ->when() skips the filter entirely,
  // which gives all-time data.
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo]     = useState('');

  useEffect(() => {
    api.get('/staff/events')
      .then((res) => setEvents(res.data.events ?? res.data ?? []))
      .catch(() => setError('Could not load your events.'))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setBusy(true);
    setError('');

    let result;
    if (reportType === 'steps') {
      result = await generateStepAnalysisReport({
        from: rangeFrom || null,
        to:   rangeTo   || null,
        preview: true,
      });
    } else if (reportType === 'followup') {
      result = await generateFollowUpReport(selected, { preview: true });
    } else {
      result = await generateEventReport(selected, { preview: true });
    }

    if (!result.ok) setError(result.message);
    setBusy(false);
  };

  const chosen = events.find((e) => String(e.id) === String(selected));

  // Newest first. useMemo keeps the sort from re-running on every
  // keystroke in the search box below.
  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [events]
  );

  const filtered = sorted.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.location_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalParticipants = events.reduce(
    (sum, e) => sum + (e.participants_count ?? 0), 0
  );

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  // The event report needs a selected event; the steps report is
  // always runnable because an empty range means all time.
  // Follow-up needs an event, same as the event summary
  const canGenerate = reportType === 'steps' ? true : Boolean(selected);

  const includes = reportType === 'event'
    ? [
        'BFP letterhead and reference number',
        'Event details, date, and venue',
        'Overview metrics',
        'Performance by environment',
        'Participant results table',
        'Signature line',
      ]
    : reportType === 'steps'
    ? [
        'BFP letterhead and reference number',
        'Date range covered',
        'Headline failure finding',
        'Step-by-step failure rates',
        'Average penalty per missed step',
        'Signature line',
      ]
    : [
        'BFP letterhead and reference number',
        'Summary finding',
        'Overview metrics',
        'Participants requiring follow-up',
        'Step each participant kept missing',
        'Recommended action',
        'Signature line',
      ];
    
  if (loading) {
    return (
      <div className="rp-page">
        <div className="rp-loading">
          <span className="rp-ring"></span>
          Loading events...
        </div>
      </div>
    );
  }

  return (
    <div className="rp-page">

      {/* ── HEADER ───────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h4 className="rp-title mb-0">Generate reports</h4>
          <p className="rp-sub mb-0">
            Printable training records for BFP Natividad Station
          </p>
        </div>

        {events.length > 0 && (
          <div className="rp-pills">
            <div className="rp-pill">
              <span className="rp-pill-val">{events.length}</span>
              <span className="rp-pill-lbl">Events</span>
            </div>
            <div className="rp-pill">
              <span className="rp-pill-val">{totalParticipants}</span>
              <span className="rp-pill-lbl">Participants</span>
            </div>
          </div>
        )}
      </div>

      {/* ── REPORT TYPE ──────────────────────────────── */}
      <div className="rp-section-label">Report type</div>
      <div className="row g-2 mb-2">

        <div className="col-12 col-md-4">
          <button
            type="button"
            className={`rp-type-card ${reportType === 'event' ? 'active' : ''}`}
            onClick={() => { setReportType('event'); setError(''); }}
          >
            <div className="d-flex align-items-start justify-content-between mb-2 mt-1">
              <div className="rp-type-icon">
                <i className="bi bi-file-earmark-text-fill"></i>
              </div>
              <span className="rp-type-tag">PDF</span>
            </div>
            <div className="rp-type-name">Event summary</div>
            <div className="rp-type-desc">
              What happened in one event: who joined, who passed, and
              how they did in each environment.
            </div>
          </button>
        </div>

        <div className="col-12 col-md-4">
          <button
            type="button"
            className={`rp-type-card ${reportType === 'steps' ? 'active' : ''}`}
            onClick={() => { setReportType('steps'); setError(''); }}
          >
            <div className="d-flex align-items-start justify-content-between mb-2 mt-1">
              <div className="rp-type-icon">
                <i className="bi bi-clipboard-data-fill"></i>
              </div>
              <span className="rp-type-tag">PDF</span>
            </div>
            <div className="rp-type-name">Training analysis</div>
            <div className="rp-type-desc">
              Which steps participants get wrong most often, across any
              period you choose. Tells you what to emphasise in the next
              session.
            </div>
          </button>
        </div>

        <div className="col-12 col-md-4">
          <button
            type="button"
            className={`rp-type-card ${reportType === 'followup' ? 'active' : ''}`}
            onClick={() => { setReportType('followup'); setError(''); }}
          >
            <div className="d-flex align-items-start justify-content-between mb-2 mt-1">
              <div className="rp-type-icon">
                <i className="bi bi-person-exclamation"></i>
              </div>
              <span className="rp-type-tag">PDF</span>
            </div>
            <div className="rp-type-name">Needs more training</div>
            <div className="rp-type-desc">
              Participants who tried a simulation at least three times and
              still could not pass it. Shows the step each one kept getting
              wrong, so you know what to teach them.
            </div>
          </button>
        </div>

      </div>

      {/* ── CONFIG SECTION ───────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="rp-section-label mb-0">
          {reportType === 'steps' ? 'Date range' : 'Select event'}
        </div>
        {reportType !== 'steps' && events.length > SEARCH_THRESHOLD && (
          <input
            type="text"
            className="rp-search"
            placeholder="Search events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        )}
      </div>

      <div className="row g-2 mt-0">

        {/* LEFT — event picker or date range */}
        <div className="col-12 col-lg-8">

          {reportType === 'steps' ? (
            <div className="rp-panel">
              <div className="rp-range">
                <div className="rp-range-field">
                  <label className="rp-range-lbl" htmlFor="range-from">From</label>
                  <input
                    id="range-from"
                    type="date"
                    className="rp-date"
                    value={rangeFrom}
                    onChange={e => setRangeFrom(e.target.value)}
                  />
                </div>
                <div className="rp-range-field">
                  <label className="rp-range-lbl" htmlFor="range-to">To</label>
                  <input
                    id="range-to"
                    type="date"
                    className="rp-date"
                    value={rangeTo}
                    onChange={e => setRangeTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="rp-range-note">
                <i className="bi bi-info-circle"></i>
                Leave both blank to cover every simulation ever recorded.
                {(rangeFrom || rangeTo) && (
                  <button
                    type="button"
                    className="rp-range-clear"
                    onClick={() => { setRangeFrom(''); setRangeTo(''); }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

          ) : events.length === 0 ? (
            <div className="rp-panel">
              <div className="rp-empty">
                <i className="bi bi-calendar-x"></i>
                <div className="rp-empty-title">No events yet</div>
                <div className="rp-empty-sub">
                  Create an event first — reports are generated per event.
                </div>
              </div>
            </div>

          ) : filtered.length === 0 ? (
            <div className="rp-panel">
              <div className="rp-empty">
                <i className="bi bi-search"></i>
                <div className="rp-empty-title">Nothing matches "{search}"</div>
                <div className="rp-empty-sub">Try a different name or venue.</div>
              </div>
            </div>

          ) : (
            <div className="rp-list">
              {filtered.map(event => {
                const isActive = String(event.id) === String(selected);
                return (
                  <button
                    key={event.id}
                    type="button"
                    className={`rp-row ${isActive ? 'active' : ''}`}
                    onClick={() => setSelected(String(event.id))}
                  >
                    <span className="rp-row-radio">
                      <i className={`bi ${isActive ? 'bi-record-circle-fill' : 'bi-circle'}`}></i>
                    </span>

                    <span className="rp-row-info">
                      <span className="rp-row-name">{event.name}</span>
                      <span className="rp-row-meta">
                        <i className="bi bi-calendar3"></i>
                        {formatDate(event.date)}
                        <span className="rp-row-sep">·</span>
                        <i className="bi bi-geo-alt"></i>
                        {event.location_name || 'No venue set'}
                      </span>
                    </span>

                    <span className="rp-row-side">
                      <span className="rp-row-count">
                        <i className="bi bi-people-fill"></i>
                        {event.participants_count ?? 0}
                      </span>
                      <span className={`rp-row-badge ${event.is_open ? 'open' : 'closed'}`}>
                        {event.is_open ? 'Open' : 'Closed'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT — generate panel */}
        <div className="col-12 col-lg-4">
          <div className="rp-panel rp-panel-sticky">

            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="rp-panel-title">
                <i className="bi bi-file-earmark-pdf-fill"></i>
                Report contents
              </div>
              <span className="rp-panel-badge">{includes.length} sections</span>
            </div>

            <div className="rp-includes">
              {includes.map(item => (
                <div key={item} className="rp-include">
                  <i className="bi bi-check-circle-fill"></i>
                  {item}
                </div>
              ))}
            </div>

            {error && (
              <div className="rp-error">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <span>{error}</span>
              </div>
            )}

            <div className="rp-target">
              {reportType === 'steps' ? (
                <>
                  <div className="rp-target-lbl">Covering</div>
                  <div className="rp-target-name">
                    {!rangeFrom && !rangeTo && 'All recorded simulations'}
                    {rangeFrom && !rangeTo && `${formatDate(rangeFrom)} onward`}
                    {!rangeFrom && rangeTo && `Up to ${formatDate(rangeTo)}`}
                    {rangeFrom && rangeTo && `${formatDate(rangeFrom)} – ${formatDate(rangeTo)}`}
                  </div>
                </>
              ) : chosen ? (
                <>
                  <div className="rp-target-lbl">Generating for</div>
                  <div className="rp-target-name">{chosen.name}</div>
                </>
              ) : (
                <div className="rp-target-empty">
                  <i className="bi bi-arrow-left"></i>
                  Select an event to continue
                </div>
              )}
            </div>

            <button
              className="rp-btn"
              onClick={handleGenerate}
              disabled={!canGenerate || busy}
            >
              {busy ? (
                <>
                  <span className="rp-ring rp-ring-sm rp-ring-light"></span>
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

      </div>
    </div>
  );
}