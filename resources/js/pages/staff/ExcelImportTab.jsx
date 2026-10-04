import { useState, useRef } from 'react'
import api from '../../api/axios'
import '../../../css/Staff/excelimporttab.css'

// How many rows go in each commit request.
// Gmail SMTP takes 1-3s per email, so 10 rows ≈ 10-30s — comfortably
// inside PHP's 30s max_execution_time and every browser timeout.
// Raising this risks a half-finished import with no way to tell
// which rows made it.
const CHUNK_SIZE = 10

// The columns shown in the preview table. If an error belongs to one of
// these fields, that cell turns red. Anything else (e.g. organization)
// shows the message under the name instead.
const SHOWN_FIELDS = ['name', 'email', 'contact_number']

// Works out WHICH column an error belongs to.
// 1. Prefer row.error_field — the backend will send this after Step 2.
// 2. Until then, guess from the wording of row.message.
const getErrorField = (row) => {
    if (row.status !== 'error') return null
    if (row.error_field) return row.error_field

    const msg = (row.message || '').toLowerCase()
    if (msg.includes('contact')) return 'contact_number'
    if (msg.includes('email'))   return 'email'
    if (msg.includes('name'))    return 'name'
    return null
}

export default function ExcelImportTab({ event, onSuccess }) {
    // 'pick' → 'preview' → 'importing' → 'done'
    const [stage, setStage]       = useState('pick')
    const [file, setFile]         = useState(null)
    const [parsing, setParsing]   = useState(false)
    const [preview, setPreview]   = useState(null)   // { summary, rows }
    const [error, setError]       = useState(null)
    const [progress, setProgress] = useState({ done: 0, total: 0 })
    const [result, setResult]     = useState(null)   // final totals
    const [dragging, setDragging] = useState(false)

    // Which filter chip is active in the preview: 'all', 'new',
    // 'existing', 'duplicate' or 'error'
    const [filter, setFilter]     = useState('all')

    // The real <input type="file"> is hidden — the styled drop zone
    // triggers it. Browsers won't let you style a file input directly.
    const fileInputRef = useRef(null)

    // ── TEMPLATE DOWNLOAD ────────────────────────────────────────────
    // Can't use a plain <a href> because the endpoint needs a Bearer
    // token. So we fetch it as a blob, then trigger a download from
    // an object URL.
    const downloadTemplate = async () => {
        try {
            const res = await api.get('/staff/participants/import-template', {
                responseType: 'blob',
            })

            const url  = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'fireops_participant_template.xlsx')
            document.body.appendChild(link)
            link.click()

            // Clean up, or the blob stays in memory until page reload
            link.remove()
            window.URL.revokeObjectURL(url)

        } catch {
            setError('Could not download the template. Please try again.')
        }
    }

    // ── PREVIEW ──────────────────────────────────────────────────────
    const handleFile = async (selected) => {
        if (!selected) return

        setError(null)
        setFile(selected)
        setParsing(true)

        // FormData is required for file uploads — a plain JSON body
        // can't carry binary. Axios sets the multipart Content-Type
        // header automatically when it sees a FormData instance.
        const formData = new FormData()
        formData.append('file', selected)

        try {
            const res = await api.post(
                `/staff/events/${event.id}/participants/import/preview`,
                formData
            )
            setPreview(res.data)
            setFilter('all')
            setStage('preview')

        } catch (err) {
            setError(
                err.response?.data?.message ||
                'That file could not be read. Please use the template.'
            )
            setFile(null)
        } finally {
            setParsing(false)
        }
    }

    // ── COMMIT ───────────────────────────────────────────────────────
    const startImport = async () => {
        // Only rows the server marked 'new' or 'existing' get sent.
        // 'duplicate' and 'error' rows are dropped here — the server
        // would skip them anyway, but sending them wastes requests.
        const toImport = preview.rows.filter(
            r => r.status === 'new' || r.status === 'existing'
        )

        // Split into chunks of CHUNK_SIZE
        const chunks = []
        for (let i = 0; i < toImport.length; i += CHUNK_SIZE) {
            chunks.push(toImport.slice(i, i + CHUNK_SIZE))
        }

        setStage('importing')
        setProgress({ done: 0, total: toImport.length })

        const totals = { created: 0, enrolled: 0, skipped: 0, failed: 0 }
        const failedRows = []

        // SEQUENTIAL, not Promise.all(). Firing every chunk at once
        // would recreate the exact overload the chunking prevents —
        // and Gmail rate-limits parallel connections.
        for (const chunk of chunks) {
            try {
                const res = await api.post(
                    `/staff/events/${event.id}/participants/import/commit`,
                    {
                        rows: chunk.map(r => ({
                            row_number:     r.row_number,
                            name:           r.name,
                            email:          r.email,
                            organization:   r.organization,
                            contact_number: r.contact_number,
                        })),
                    }
                )

                const s = res.data.summary
                totals.created  += s.created
                totals.enrolled += s.enrolled
                totals.skipped  += s.skipped
                totals.failed   += s.failed

                res.data.results
                    .filter(r => r.status === 'error')
                    .forEach(r => failedRows.push(r))

            } catch {
                // A whole chunk failed — network drop, timeout, or a
                // 422 the preview missed. Count every row in it as
                // failed and keep going, so one bad chunk doesn't
                // abandon the rest of the import.
                totals.failed += chunk.length
                chunk.forEach(r => failedRows.push({
                    ...r,
                    message: 'Request failed — please add this person manually.',
                }))
            }

            setProgress(prev => ({ ...prev, done: prev.done + chunk.length }))
        }

        setResult({ ...totals, failedRows })
        setStage('done')
        onSuccess()   // refresh the participant list behind the modal
    }

    const reset = () => {
        setStage('pick')
        setFile(null)
        setPreview(null)
        setResult(null)
        setError(null)
        setFilter('all')
        setProgress({ done: 0, total: 0 })
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const statusLabel = {
        new:       'Will create',
        existing:  'Will add',
        duplicate: 'Skip',
        error:     'Error',
    }

    // ══════════════════════════════════════════════════════════════
    // STAGE: PICK
    // ══════════════════════════════════════════════════════════════
    if (stage === 'pick') {
        return (
            <div className="ap-excel">

                {error && (
                    <div className="ap-alert ap-alert-error">
                        <i className="bi bi-x-circle-fill"></i>
                        <span>{error}</span>
                    </div>
                )}

                <div className="ap-template">
                    <div className="ap-template-text">
                        <strong>Need the format?</strong>
                        <span>Download the template with the correct columns.</span>
                    </div>
                    <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={downloadTemplate}>
                        <i className="bi bi-download"></i>
                        Template
                    </button>
                </div>

                <div
                    className={`ap-drop ${dragging ? 'ap-drop-active' : ''} ${parsing ? 'ap-drop-busy' : ''}`}
                    onClick={() => !parsing && fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => {
                        e.preventDefault()
                        setDragging(false)
                        if (!parsing) handleFile(e.dataTransfer.files[0])
                    }}
                >
                    {parsing ? (
                        <>
                            <span className="spinner-border" role="status"></span>
                            <p className="ap-drop-title">Reading {file?.name}...</p>
                        </>
                    ) : (
                        <>
                            <i className="bi bi-cloud-arrow-up"></i>
                            <p className="ap-drop-title">Drop your file here, or click to browse</p>
                            <p className="ap-drop-sub">.xlsx, .xls, or .csv — up to 2 MB, 300 rows</p>
                        </>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files[0])}
                />

                <p className="ap-note">
                    Nothing is saved until you review the file and confirm.
                </p>

            </div>
        )
    }

    // ══════════════════════════════════════════════════════════════
    // STAGE: PREVIEW
    // ══════════════════════════════════════════════════════════════
    if (stage === 'preview') {
        const { summary, rows } = preview
        const importable = summary.new + summary.existing

        // The 4 stat cards. Each has its own colour (tone) and icon.
        const stats = [
            { tone: 'new',       label: 'New',        value: summary.new,       icon: 'bi-person-plus' },
            { tone: 'existing',  label: 'Existing',   value: summary.existing,  icon: 'bi-person-check' },
            { tone: 'duplicate', label: 'Already in', value: summary.duplicate, icon: 'bi-people' },
            { tone: 'error',     label: 'Errors',     value: summary.error,     icon: 'bi-exclamation-triangle' },
        ]

        // Filter chips. "All" always shows; the others only if they
        // have at least one row, so staff never click an empty filter.
        const filters = [
            { key: 'all',       label: 'All',        count: rows.length },
            { key: 'new',       label: 'New',        count: summary.new },
            { key: 'existing',  label: 'Existing',   count: summary.existing },
            { key: 'duplicate', label: 'Already in', count: summary.duplicate },
            { key: 'error',     label: 'Errors',     count: summary.error },
        ].filter(f => f.key === 'all' || f.count > 0)

        // Rows that match the active chip
        const visibleRows = filter === 'all'
            ? rows
            : rows.filter(r => r.status === filter)

        // Draws one table cell. If this cell's field is the one that
        // failed, it gets the red box with the message underneath.
        const renderCell = (row, field, errorField) => {
            const value = row[field] || '—'

            if (errorField !== field) return value

            return (
                <div className="ap-pv-bad">
                    <span className="ap-pv-bad-value">{value}</span>
                    <span className="ap-pv-bad-hint">
                        <i className="bi bi-exclamation-circle"></i>
                        {row.message}
                    </span>
                </div>
            )
        }

        return (
            <div className="ap-excel ap-pv">

                {/* ── File bar ── */}
                <div className="ap-pv-file">
                    <span className="ap-pv-file-icon">
                        <i className="bi bi-file-earmark-spreadsheet"></i>
                    </span>
                    <span className="ap-pv-file-name">{file?.name}</span>
                    <button className="ap-pv-file-change" onClick={reset}>
                        <i className="bi bi-arrow-repeat"></i>
                        Change file
                    </button>
                </div>

                {/* ── Stat cards ── */}
                <div className="ap-pv-stats">
                    {stats.map(s => (
                        <div key={s.tone} className={`ap-pv-stat ap-pv-tone-${s.tone}`}>
                            <span className="ap-pv-stat-icon">
                                <i className={`bi ${s.icon}`}></i>
                            </span>
                            <span className="ap-pv-stat-text">
                                <span className="ap-pv-stat-value">{s.value}</span>
                                <span className="ap-pv-stat-label">{s.label}</span>
                            </span>
                        </div>
                    ))}
                </div>

                {/* ── Warning (only when some rows will be skipped) ── */}
                {summary.error > 0 && (
                    <div className="ap-pv-warning">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                        <span>
                            {summary.error} row{summary.error > 1 ? 's' : ''} will be skipped.
                            Fix them in your file and upload again, or continue without them.
                        </span>
                    </div>
                )}

                {/* ── Filter chips ── */}
                <div className="ap-pv-chips">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            className={`ap-pv-chip ${filter === f.key ? 'is-active' : ''} ap-pv-chip-${f.key}`}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}
                            <span className="ap-pv-chip-count">{f.count}</span>
                        </button>
                    ))}
                </div>

                {/* ── Table ── */}
                <div className="ap-pv-table-wrap">
                    <table className="ap-pv-table">
                        <thead>
                            <tr>
                                <th className="ap-pv-col-row">Row</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th className="ap-pv-col-contact">Contact no.</th>
                                <th className="ap-pv-col-status">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map(row => {
                                const errorField = getErrorField(row)

                                // Error on a column we don't show (e.g. organization),
                                // or one we couldn't detect → show it under the name.
                                const showUnderName =
                                    row.status === 'error' && !SHOWN_FIELDS.includes(errorField)

                                return (
                                    <tr key={row.row_number}>
                                        <td className="ap-pv-col-row">{row.row_number}</td>

                                        <td className="ap-pv-name">
                                            {renderCell(row, 'name', errorField)}
                                            {showUnderName && (
                                                <span className="ap-pv-bad-hint ap-pv-hint-plain">
                                                    <i className="bi bi-exclamation-circle"></i>
                                                    {row.message}
                                                </span>
                                            )}
                                        </td>

                                        <td className="ap-pv-email">
                                            {renderCell(row, 'email', errorField)}
                                        </td>

                                        <td className="ap-pv-col-contact">
                                            {renderCell(row, 'contact_number', errorField)}
                                        </td>

                                        <td className="ap-pv-col-status">
                                            <span className={`ap-pv-pill ap-pv-tone-${row.status}`}>
                                                <span className="ap-pv-pill-dot"></span>
                                                {statusLabel[row.status]}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <button
                    className="ap-btn ap-btn-primary ap-btn-block"
                    onClick={startImport}
                    disabled={importable === 0}
                >
                    <i className="bi bi-person-plus-fill"></i>
                    {importable === 0
                        ? 'Nothing to import'
                        : `Import ${importable} participant${importable > 1 ? 's' : ''}`}
                </button>

                {importable > 0 && (
                    <p className="ap-note">
                        This sends {importable} email{importable > 1 ? 's' : ''} and may take
                        about {Math.ceil(importable * 2 / 60)} minute
                        {Math.ceil(importable * 2 / 60) > 1 ? 's' : ''}. Keep this window open.
                    </p>
                )}

            </div>
        )
    }

    // ══════════════════════════════════════════════════════════════
    // STAGE: IMPORTING
    // ══════════════════════════════════════════════════════════════
    if (stage === 'importing') {
        const pct = progress.total > 0
            ? Math.round((progress.done / progress.total) * 100)
            : 0

        return (
            <div className="ap-excel ap-excel-center">
                <span className="spinner-border ap-big-spinner" role="status"></span>
                <p className="ap-progress-title">Importing participants</p>
                <p className="ap-progress-sub">
                    {progress.done} of {progress.total} processed
                </p>
                <div className="ap-bar">
                    <div className="ap-bar-fill" style={{ width: `${pct}%` }}></div>
                </div>
                <p className="ap-note">
                    Sending emails — please don't close this window.
                </p>
            </div>
        )
    }

    // ══════════════════════════════════════════════════════════════
    // STAGE: DONE
    // ══════════════════════════════════════════════════════════════
    return (
        <div className="ap-excel">

            <div className="ap-done">
                <i className={`bi ${result.failed > 0 ? 'bi-exclamation-circle' : 'bi-check-circle'}`}></i>
                <p className="ap-done-title">Import finished</p>
            </div>

            <div className="ap-counts">
                <div className="ap-count ap-count-new">
                    <span className="ap-count-n">{result.created}</span>
                    <span className="ap-count-l">Created</span>
                </div>
                <div className="ap-count ap-count-existing">
                    <span className="ap-count-n">{result.enrolled}</span>
                    <span className="ap-count-l">Added</span>
                </div>
                <div className="ap-count ap-count-dupe">
                    <span className="ap-count-n">{result.skipped}</span>
                    <span className="ap-count-l">Skipped</span>
                </div>
                <div className="ap-count ap-count-err">
                    <span className="ap-count-n">{result.failed}</span>
                    <span className="ap-count-l">Failed</span>
                </div>
            </div>

            {result.failedRows.length > 0 && (
                <>
                    <div className="ap-alert ap-alert-warning">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                        <span>These rows were not imported. Add them manually.</span>
                    </div>
                    <div className="ap-table-wrap">
                        <table className="ap-table">
                            <tbody>
                                {result.failedRows.map((row, i) => (
                                    <tr key={i}>
                                        <td className="ap-td-row">{row.row_number || '—'}</td>
                                        <td className="ap-td-name">{row.name}</td>
                                        <td className="ap-td-email">
                                            {row.email}
                                            <span className="ap-td-msg">{row.message}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <button className="ap-btn ap-btn-ghost ap-btn-block" onClick={reset}>
                <i className="bi bi-arrow-repeat"></i>
                Import another file
            </button>

        </div>
    )
}