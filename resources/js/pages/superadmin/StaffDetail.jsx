import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios'
import '../../../css/Superadmin/staffdetail.css';

export default function StaffDetail() {
    const { id }       = useParams();
    const navigate     = useNavigate();
    const [staff,      setStaff]    = useState(null);
    const [logs,       setLogs]     = useState([]);
    const [loading,    setLoading]  = useState(true);
    const [error,      setError]    = useState('');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [staffRes, logsRes] = await Promise.all([
                api.get(`/superadmin/staff/${id}`),
                api.get(`/superadmin/staff/${id}/logs`),
            ]);
            setStaff(staffRes.data);
            setLogs(logsRes.data.logs);
        } catch (err) {
            setError('Failed to load staff details.');
        } finally {
            setLoading(false);
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
            created:  { icon: 'bi-plus-circle-fill',        className: 'sd-action-created' },
            edited:   { icon: 'bi-pencil-fill',              className: 'sd-action-edited' },
            archived: { icon: 'bi-archive-fill',              className: 'sd-action-archived' },
            restored: { icon: 'bi-arrow-counterclockwise',    className: 'sd-action-restored' },
            viewed:   { icon: 'bi-eye-fill',                  className: 'sd-action-viewed' },
            deleted:  { icon: 'bi-trash-fill',                className: 'sd-action-deleted' },
            toggled:  { icon: 'bi-toggle-on',                 className: 'sd-action-toggled' },
            login:    { icon: 'bi-box-arrow-in-right',        className: 'sd-action-login' },
        };
        return map[action] || { icon: 'bi-circle-fill', className: 'sd-action-default' };
    };

    if (loading) return (
        <div className="sd-loading">
            <span className="sd-spinner"></span>
            Loading staff details...
        </div>
    );

    if (error) return (
        <div className="sd-error">
            <i className="bi bi-exclamation-circle-fill"></i>
            {error}
        </div>
    );

    return (
        <div className="sd-page">

            {/* Back button */}
           <button className="sd-back" onClick={() => navigate('/staff-management')}>
                <i className="bi bi-arrow-left"></i>
                Back to Staff
            </button>

            {/* Staff info card */}
            {staff && (
                <div className="sd-info-card">
                    <div className="sd-avatar">
                        {staff.first_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="sd-info-body">
                        <div className="sd-name">{staff.full_name}</div>
                        <div className="sd-email">{staff.email}</div>
                        <div className="sd-meta">
                            <span className={staff.is_active ? 'sm-badge-active' : 'sm-badge-archived'}>
                                {staff.is_active ? 'Active' : 'Archived'}
                            </span>
                            <span className="sd-since">
                                <i className="bi bi-calendar3"></i>
                                Joined {new Date(staff.created_at).toLocaleDateString('en-US', {
                                    month: 'long', day: 'numeric', year: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Activity logs */}
            <div className="sd-section">
                <div className="sd-section-header">
                    <h5 className="sd-section-title">
                        <i className="bi bi-clock-history"></i>
                        Activity Log
                    </h5>
                    <span className="sd-count">{logs.length} entries</span>
                </div>

                {logs.length === 0 ? (
                    <div className="sd-empty">
                        <i className="bi bi-journal-x"></i>
                        <p>No activity recorded yet.</p>
                    </div>
                ) : (
                    <div className="sd-timeline">
                        {logs.map((log) => {
                            const { icon, className } = actionStyle(log.action);
                            const isToggle = log.action === 'toggled';

                            return (
                                <div className="sd-entry" key={log.id}>

                                    {/* Icon */}
                                    <div className={`sd-entry-icon ${className}`}>
                                        <i className={`bi ${icon}`}></i>
                                    </div>

                                    {/* Content */}
                                    <div className="sd-entry-body">
                                        <div className="sd-entry-top">
                                            <span className={`sd-entry-action ${className}`}>
                                                {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                                            </span>
                                            <span className="sd-entry-date">{formatDate(log.created_at)}</span>
                                        </div>
                                        <div className="sd-entry-desc">{log.description}</div>
                                        <div className="sd-entry-by">
                                            <i className="bi bi-person"></i>
                                            <span>By</span> {log.performed_by}
                                        </div>

                                        {/* Meta — skipped entirely for event toggle actions */}
                                        {log.meta && !isToggle && (
                                            <div className="sd-meta-box">
                                                <div className="sd-meta-label">Changes</div>
                                                {log.meta.before && log.meta.after ? (
                                                    <table className="sd-meta-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Field</th>
                                                                <th>Before</th>
                                                                <th>After</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {Object.keys(log.meta.before).map((key) => (
                                                                log.meta.before[key] !== log.meta.after[key] && (
                                                                    <tr key={key}>
                                                                        <td className="sd-meta-key">{key.replace('_', ' ')}</td>
                                                                        <td className="sd-meta-old">{log.meta.before[key] || '—'}</td>
                                                                        <td className="sd-meta-new">{log.meta.after[key] || '—'}</td>
                                                                    </tr>
                                                                )
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="sd-meta-pills">
                                                        {Object.entries(log.meta).map(([key, value]) => (
                                                            <div className="sd-meta-pill" key={key}>
                                                                <span className="sd-meta-pill-key">{key.replace('_', ' ')}</span>
                                                                <span className="sd-meta-pill-val">{value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}