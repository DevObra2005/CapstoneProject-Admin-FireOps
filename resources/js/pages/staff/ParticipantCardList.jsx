import '../../../css/Staff/participantcardlist.css'


export default function ParticipantCardList({participants,loading,onRowClick,}) {

    // Initials for avatar
    const initials = (name) =>
        name
            ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
            : '?'

    //
    const orgBadgeClass = (org) => {
        const key = (org || '').toLowerCase()
        if (key === 'student') return 'student'
        if (key === 'employee') return 'employee'
        return 'other'
    }

    if (loading) {
        return (
            <div className="pcl-list">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="pcl-row pcl-skeleton-row">
                        <div className="pcl-skeleton pcl-skeleton-avatar" />
                        <div className="pcl-skeleton-text">
                            <div className="pcl-skeleton pcl-skeleton-line-lg" />
                            <div className="pcl-skeleton pcl-skeleton-line-sm" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (participants.length === 0) {
        return (
            <div className="ev-tab-empty">
                <i className="bi bi-inbox"></i>
                <p>No participants yet</p>
                <p className="pcl-empty-sub">No participants registered yet.</p>
            </div>
        )
    }

    return (
        <div className="pcl-list">
            {participants.map((p, index) => (
                <div
                    key={p.id ?? p.email ?? index}
                    className="pcl-row"
                    onClick={() => onRowClick(p)}
                >
                    <div className="pcl-avatar">{initials(p.name)}</div>

                    <div className="pcl-main">
                        <div className="pcl-name">{p.name}</div>
                        <div className="pcl-email">{p.email}</div>
                    </div>

                    <div className="pcl-meta">
                        {p.organization && (
                            <span className={`pcl-badge ${orgBadgeClass(p.organization)}`}>
                                {p.organization}
                            </span>
                        )}
                    </div>

                    <i className="bi bi-chevron-right pcl-arrow"></i>
                </div>
            ))}
        </div>
    )
}