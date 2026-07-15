import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

export default function QRModal({ show, event, onClose }) {
    const [copied,     setCopied]     = useState(false)
    const [downloaded, setDownloaded] = useState(false)

    if (!show || !event) return null

    const getRegistrationUrl = (token) => `${window.location.origin}/register/${token}`

    const downloadQR = () => {
        const canvas  = document.getElementById('qr-canvas')
        const qrSize  = 190
        const padding = 28
        const headerH = 76
        const footerH = 52
        const totalW  = qrSize + padding * 2
        const totalH  = headerH + qrSize + padding * 2 + footerH

        const out = document.createElement('canvas')
        out.width  = totalW
        out.height = totalH
        const ctx  = out.getContext('2d')

        // White background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, totalW, totalH)

        // Red header
        ctx.fillStyle = '#CC2229'
        ctx.fillRect(0, 0, totalW, headerH)

        // Header text
        ctx.textAlign  = 'center'
        ctx.fillStyle  = '#ffffff'
        ctx.font       = '500 12px system-ui, sans-serif'
        ctx.fillText('BUREAU OF FIRE PROTECTION', totalW / 2, 24)
        ctx.fillStyle  = 'rgba(255,255,255,0.75)'
        ctx.font       = '400 10px system-ui, sans-serif'
        ctx.fillText('Official Event Registration', totalW / 2, 40)

        // Divider
        ctx.fillStyle = 'rgba(255,255,255,0.2)'
        ctx.fillRect(padding, 50, totalW - padding * 2, 0.5)

        // Event name
        ctx.fillStyle = '#ffffff'
        ctx.font      = '500 11px system-ui, sans-serif'
        ctx.fillText(event.name, totalW / 2, 64)

        // QR code
        ctx.drawImage(canvas, padding, headerH + padding - 8, qrSize, qrSize)

        // Footer background
        ctx.fillStyle = '#f9fafb'
        ctx.fillRect(0, totalH - footerH, totalW, footerH)
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth   = 0.5
        ctx.beginPath()
        ctx.moveTo(0, totalH - footerH)
        ctx.lineTo(totalW, totalH - footerH)
        ctx.stroke()

        // Footer URL
        ctx.fillStyle = '#9ca3af'
        ctx.font      = '400 8.5px system-ui, sans-serif'
        ctx.fillText(getRegistrationUrl(event.token), totalW / 2, totalH - footerH + 20)

        // Footer label
        ctx.fillStyle = '#CC2229'
        ctx.font      = '500 9px system-ui, sans-serif'
        ctx.fillText('Scan to register', totalW / 2, totalH - footerH + 36)

        const link    = document.createElement('a')
        link.download = `${event.name.replace(/\s+/g, '-')}-QR.png`
        link.href     = out.toDataURL('image/png')
        setDownloaded(true)
        setTimeout(() => setDownloaded(false), 2000)
        link.click()
    }

    return (
        <div className="ev-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="ev-modal ev-modal-qr">

                <div className="ev-modal-header ev-modal-header-qr">
                    <div className="ev-modal-header-icon">
                        <i className="bi bi-qr-code-scan"></i>
                    </div>
                    <div className="ev-modal-header-text">
                        <h5>Event QR Code</h5>
                        <p>Scan to register for this event</p>
                    </div>
                    <button className="ev-modal-close ev-modal-close-qr" onClick={onClose}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="ev-modal-body ev-qr-body">
                    <p className="ev-qr-event-name">{event.name}</p>
                    <p className="ev-qr-meta">
                        <i className="bi bi-calendar3"></i>&nbsp;
                        {new Date(event.date).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                        })}
                        {event.location_name && (
                            <>
                                &nbsp;<span className="ev-qr-dot">·</span>&nbsp;
                                <i className="bi bi-geo-alt"></i>&nbsp;{event.location_name}
                            </>
                        )}
                    </p>

                    <div className="ev-qr-frame">
                        <div className="ev-qr-inner">
                            <QRCodeCanvas
                                id="qr-canvas"
                                value={getRegistrationUrl(event.token)}
                                size={190}
                                level="H"
                            />
                        </div>
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
                            navigator.clipboard.writeText(getRegistrationUrl(event.token))
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
    )
}