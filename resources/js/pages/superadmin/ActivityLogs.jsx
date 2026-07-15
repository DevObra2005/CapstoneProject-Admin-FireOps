import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../../css/Superadmin/activitylogs.css';

export default function ActivityLogs() {
    const [logs,     setLogs]     = useState([]);
    const [fetching, setFetching] = useState(true);
    const [filter,   setFilter]   = useState('all');

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setFetching(true);
        try {
            const res = await axios.get('/api/superadmin/activity-logs');
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

    const actionStyle = (action) => {
        const map = {
            created:  { color: '#22c55e', icon: 'bi-plus-circle-fill' },
            edited:   { color: '#3b82f6', icon: 'bi-pencil-fill' },
            archived: { color: '#f59e0b', icon: 'bi-archive-fill' },
            restored: { color: '#22c55e', icon: 'bi-arrow-counterclockwise' },
            viewed:   { color: '#64748b', icon: 'bi-eye-fill' },
            deleted:  { color: '#f87171', icon: 'bi-trash-fill' },
            toggled:  { color: '#a855f7', icon: 'bi-toggle-on' },
        };
        return map[action] || { color: '#64748b', icon: 'bi-circle-fill' };
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
                    <p className="al-sub">All superadmin and staff actions recorded by the system</p>
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
                        const { color, icon } = actionStyle(log.action);
                        return (
                            <div className="al-entry" key={log.id}>

                                {/* Icon */}
                                <div className="al-icon" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
                                    <i className={`bi ${icon}`} style={{ color }}></i>
                                </div>

                                {/* Main content */}
                                <div className="al-body">
                                    <div className="al-row-top">
                                        <span className="al-action" style={{ color }}>
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

                                    {/* Meta changes */}
                                    {log.meta && log.meta.before && log.meta.after && (
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