import React, { useState, useEffect } from 'react';
import api from '../../api/axios'
import '../../../css/Superadmin/activitylogs.css';

export default function ActivityLogs() {
    const [logs,     setLogs]     = useState([]);
    const [fetching, setFetching] = useState(true);
    const [filter,   setFilter]   = useState('all');

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setFetching(true);
        try {
            const res = await api.get('/superadmin/activity-logs');
            setLogs(res.data);
        } catch (err) {
            console.log('Error fetching logs:', err);
        } finally {
            setFetching(false);
        }
    };

    const formatDate = (dateStr) =>
        new Date(dateStr).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

    // Each action gets an icon + a semantic CSS class (no inline colors)
    const actionStyle = (action) => {
        const map = {
            created:    { icon: 'bi-plus-circle-fill',      className: 'al-action-created' },
            edited:     { icon: 'bi-pencil-fill',           className: 'al-action-edited' },
            archived:   { icon: 'bi-archive-fill',          className: 'al-action-archived' },
            restored:   { icon: 'bi-arrow-counterclockwise', className: 'al-action-restored' },
            viewed:     { icon: 'bi-eye-fill',              className: 'al-action-viewed' },
            deleted:    { icon: 'bi-trash-fill',            className: 'al-action-deleted' },
            toggled:    { icon: 'bi-toggle-on',             className: 'al-action-toggled' },
            generated:  { icon: 'bi-file-earmark-pdf-fill', className: 'al-action-generated' },
            registered: { icon: 'bi-person-plus-fill',      className: 'al-action-registered' },
            imported:   { icon: 'bi-box-arrow-in-down',     className: 'al-action-imported' },
        };
        return map[action] || { icon: 'bi-circle-fill', className: 'al-action-default' };
    };

    // Get unique actions for filter buttons
    const uniqueActions = ['all', ...new Set(logs.map(l => l.action))];

    // Filter logs based on selected action
    const filteredLogs = filter === 'all'
        ? logs
        : logs.filter(l => l.action === filter);

    return (
        <div className="al-page">

            {/* Header */}
            <div className="al-header">
                <div>
                    <h4 className="al-title">Activity Logs</h4>
                  <p className="al-sub">Audit trail of administration and staff actions across the system</p>
                </div>
                <span className="al-count">{filteredLogs.length} entries</span>
            </div>

            {/* Filter tabs */}
            <div className="al-filters">
                {uniqueActions.map(action => (
                    <button
                        key={action}
                        className={`al-filter-btn ${filter === action ? 'active' : ''}`}
                        onClick={() => setFilter(action)}
                    >
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                    </button>
                ))}
            </div>

            {/* Logs table */}
            {fetching ? (
                <div className="al-loading">
                    <span className="al-spinner"></span>
                    Loading logs...
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="al-empty">
                    <i className="bi bi-journal-x"></i>
                    <p>No activity recorded yet.</p>
                </div>
            ) : (
                <div className="al-list">
                    {filteredLogs.map(log => {
                        const { icon, className } = actionStyle(log.action);
                        const isToggle = log.action === 'toggled';

                        return (
                            <div className="al-entry" key={log.id}>

                                {/* Icon */}
                                <div className={`al-icon ${className}`}>
                                    <i className={`bi ${icon}`}></i>
                                </div>

                                {/* Main content */}
                                <div className="al-body">
                                    <div className="al-row-top">
                                        <span className={`al-action ${className}`}>
                                            {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                                        </span>
                                        <span className="al-date">{formatDate(log.created_at)}</span>
                                    </div>
                                    <div className="al-desc">{log.description}</div>
                                    <div className="al-meta-row">
                                        <span className="al-performer">
                                            <i className="bi bi-person"></i>
                                            {log.performed_by}
                                        </span>
                                        {log.target && log.target !== 'N/A' && (
                                            <span className="al-target">
                                                <i className="bi bi-arrow-right"></i>
                                                {log.target}
                                            </span>
                                        )}
                                    </div>

                                    {/* Meta changes — skipped for event toggle actions */}
                                    {log.meta && log.meta.before && log.meta.after && !isToggle && (
                                        <div className="al-changes">
                                            <div className="al-changes-label">Changes</div>
                                            <table className="al-changes-table">
                                                <thead>
                                                    <tr>
                                                        <th>Field</th>
                                                        <th>Before</th>
                                                        <th>After</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.keys(log.meta.before).map(key =>
                                                        log.meta.before[key] !== log.meta.after[key] && (
                                                            <tr key={key}>
                                                                <td className="al-field">{key.replace('_', ' ')}</td>
                                                                <td className="al-old">{log.meta.before[key] || '—'}</td>
                                                                <td className="al-new">{log.meta.after[key] || '—'}</td>
                                                            </tr>
                                                        )
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}