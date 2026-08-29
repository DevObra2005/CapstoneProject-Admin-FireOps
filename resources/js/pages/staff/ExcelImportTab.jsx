import { useState, useRef } from 'react'
import api from '../../api/axios'

// How many rows go in each commit request.
// Gmail SMTP takes 1-3s per email, so 10 rows ≈ 10-30s — comfortably
// inside PHP's 30s max_execution_time and every browser timeout.
// Raising this risks a half-finished import with no way to tell
// which rows made it.
const CHUNK_SIZE = 10

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

        return (
            <div className="ap-excel">

                <div className="ap-file-bar">
                    <span className="ap-file-name">
                        <i className="bi bi-file-earmark-spreadsheet"></i>
                        {file?.name}
                    </span>
                    <button className="ap-link" onClick={reset}>Change file</button>
                </div>

                <div className="ap-counts">
                    <div className="ap-count ap-count-new">
                        <span className="ap-count-n">{summary.new}</span>
                        <span className="ap-count-l">New</span>
                    </div>
                    <div className="ap-count ap-count-existing">
                        <span className="ap-count-n">{summary.existing}</span>
                        <span className="ap-count-l">Existing</span>
                    </div>
                    <div className="ap-count ap-count-dupe">
                        <span className="ap-count-n">{summary.duplicate}</span>
                        <span className="ap-count-l">Already in</span>
                    </div>
                    <div className="ap-count ap-count-err">
                        <span className="ap-count-n">{summary.error}</span>
                        <span className="ap-count-l">Errors</span>
                    </div>
                </div>

                {summary.error > 0 && (
                    <div className="ap-alert ap-alert-warning">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                        <span>
                            {summary.error} row{summary.error > 1 ? 's' : ''} will be skipped.
                            Fix them in your file and upload again, or continue without them.
                        </span>
                    </div>
                )}

                <div className="ap-table-wrap">
                    <table className="ap-table">
                        <thead>
                            <tr>
                                <th className="ap-th-row">Row</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th className="ap-th-status">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <tr key={row.row_number} className={`ap-tr-${row.status}`}>
                                    <td className="ap-td-row">{row.row_number}</td>
                                    <td className="ap-td-name">{row.name || '—'}</td>
                                    <td className="ap-td-email">
                                        {row.email || '—'}
                                        {row.status === 'error' && (
                                            <span className="ap-td-msg">{row.message}</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`ap-pill ap-pill-${row.status}`}>
                                            {statusLabel[row.status]}
                                        </span>
                                    </td>
                                </tr>
                            ))}
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