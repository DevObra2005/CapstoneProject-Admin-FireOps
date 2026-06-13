import React from 'react';
import '../../css//Components/datatable.css'
/**
 * DataTable — reusable table component for the BFP admin panel.
 *
 * Props
 * ──────────────────────────────────────────────────────────────────────────
 * columns   {Array}   Required. Column definitions (see below).
 * data      {Array}   Required. Array of row objects.
 * loading   {bool}    Optional. Shows a skeleton loader when true.
 * emptyIcon {string}  Optional. Bootstrap icon class for empty state.
 * emptyTitle{string}  Optional. Heading for empty state.
 * emptySub  {string}  Optional. Sub-text for empty state.
 * rowKey    {string}  Optional. Key used for React's `key` prop (default: 'id').
 *
 * Column definition shape
 * ──────────────────────────────────────────────────────────────────────────
 * {
 *   key:        string,             — unique identifier, maps to row[key]
 *   label:      string,             — header text
 *   width:      string,             — optional CSS width, e.g. '40px'
 *   hidden640:  bool,               — hide column below 640 px (responsive)
 *   className:  string,             — extra <td> class names
 *   render:     (value, row) => JSX — optional custom cell renderer
 * }
 *
 * Usage example (Staff page)
 * ──────────────────────────────────────────────────────────────────────────
 * const columns = [
 *   { key: '_index', label: '#', width: '36px', className: 'sm-num',
 *     render: (_, __, index) => index + 1 },
 *
 *   { key: 'name', label: 'Name',
 *     render: (value) => (
 *       <div className="dt-name-cell">
 *         <div className="dt-avatar">{value.charAt(0).toUpperCase()}</div>
 *         {value}
 *       </div>
 *     )},
 *
 *   { key: 'email',      label: 'Email',   className: 'dt-muted', hidden640: true },
 *   { key: 'created_at', label: 'Created', className: 'dt-muted',
 *     render: (v) => new Date(v).toLocaleDateString('en-US',
 *       { month: 'short', day: 'numeric', year: 'numeric' }) },
 *
 *   { key: '_actions', label: 'Actions',
 *     render: (_, row) => <YourActionButtons row={row} /> },
 * ];
 *
 * <DataTable columns={columns} data={staffList} />
 */

/* ── Skeleton row ───────────────────────────────────────────────────────── */
function SkeletonRow({ colCount }) {
    return (
        <tr>
            {Array.from({ length: colCount }).map((_, i) => (
                <td key={i}>
                    <div className="dt-skeleton" style={{
                        height: '14px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        animation: 'dt-pulse 1.4s ease-in-out infinite',
                        width: i === 0 ? '28px' : i === colCount - 1 ? '68px' : '80%',
                    }} />
                </td>
            ))}
        </tr>
    );
}

/* ── DataTable ──────────────────────────────────────────────────────────── */
export default function DataTable({
    columns = [],
    data = [],
    loading = false,
    emptyIcon  = 'bi-table',
    emptyTitle = 'No records found',
    emptySub   = 'Add an entry to see it listed here.',
    rowKey     = 'id',
}) {
    const isEmpty = !loading && data.length === 0;

    return (
        <>
            {/* Pulse keyframe injected once via a <style> tag.
                If you already have sm-spin in staff.css, just add sm-pulse there instead. */}
            <style>{`
                @keyframes dt-pulse {
                    0%, 100% { opacity: 1 }
                    50%       { opacity: 0.4 }
                }
            `}</style>

            <div className="dt-card">
                {isEmpty ? (
                    /* ── Empty state ── */
                    <div className="dt-empty">
                        <i className={`bi ${emptyIcon} dt-empty-icon`}></i>
                        <p className="dt-empty-title">{emptyTitle}</p>
                        <p className="dt-empty-sub">{emptySub}</p>
                    </div>
                ) : (
                    <table className="dt-table">
                        <thead>
                            <tr>
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        style={{ width: col.width }}
                                        className={col.hidden640 ? 'dt-col-hide640' : undefined}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {loading
                                ? /* ── Skeleton rows ── */
                                  Array.from({ length: 5 }).map((_, i) => (
                                      <SkeletonRow key={i} colCount={columns.length} />
                                  ))
                                : /* ── Real rows ── */
                                  data.map((row, index) => (
                                      <tr key={row[rowKey] ?? index}>
                                          {columns.map((col) => (
                                              <td
                                                  key={col.key}
                                                  className={[
                                                      col.className,
                                                      col.hidden640 ? 'dt-col-hide640' : '',
                                                  ].filter(Boolean).join(' ') || undefined}
                                              >
                                                  {col.render
                                                      ? col.render(row[col.key], row, index)
                                                      : row[col.key]}
                                              </td>
                                          ))}
                                      </tr>
                                  ))
                            }
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}