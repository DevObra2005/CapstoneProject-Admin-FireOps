import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../../Components/datatable';
import '../../../css/Superadmin/staff.css';
import { useNavigate } from 'react-router-dom';

export default function Staff() {
    const [staffList, setStaffList] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing,   setEditing]   = useState(null);
    const [form,      setForm]      = useState({ first_name: '', last_name: '', middle_name: '', email: '' });
    const [error,     setError]     = useState('');
    const [success,   setSuccess]   = useState('');
    const [loading,   setLoading]   = useState(false);
    const [fetching,  setFetching]  = useState(true);
    const [archiving, setArchiving] = useState(null);
    

    const token = localStorage.getItem('token');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    useEffect(() => { fetchStaff(); }, []);

    const fetchStaff = async () => {
        setFetching(true);
        try {
            const res = await axios.get('/api/superadmin/staff');
            setStaffList(res.data);
        } catch (err) {
            console.log('Error fetching staff:', err);
        } finally {
            setFetching(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ first_name: '', last_name: '', middle_name: '', email: '' });
        setError(''); setSuccess('');
        setShowModal(true);
    };

    const openEdit = (staff) => {
        setEditing(staff);
        setForm({
            first_name:  staff.first_name,
            last_name:   staff.last_name,
            middle_name: staff.middle_name || '',
            email:       staff.email,
        });
        setError(''); setSuccess('');
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setError(''); setSuccess(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            if (editing) {
                await axios.put(`/api/superadmin/staff/${editing.id}`, form);
                setSuccess('Staff account updated successfully.');
            } else {
                await axios.post('/api/superadmin/staff', form);
                setSuccess('Staff account created. Credentials sent to their email.');
            }
            fetchStaff();
            setTimeout(() => { setShowModal(false); setSuccess(''); }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async (staff) => {
        const isActive = staff.is_active;
        const action = isActive ? 'archive' : 'restore';
        const confirmMsg = isActive
            ? `Archive ${staff.full_name}? They will no longer be able to log in.`
            : `Restore ${staff.full_name}? They will regain access to the system.`;
        if (!window.confirm(confirmMsg)) return;

        setArchiving(staff.id);
        try {
            await axios.patch(`/api/superadmin/staff/${staff.id}/${action}`);
            fetchStaff();
        } catch (err) {
            console.log('Archive/Restore error:', err);
        } finally {
            setArchiving(null);
        }
    };
    const navigate = useNavigate();
    const columns = [
        {
            key: '_index',
            label: '#',
            width: '36px',
            render: (_, __, index) => index + 1,
        },
        
        {
            key: 'full_name',
            label: 'Name',
            render: (value, row) => (
                <div className="dt-name-cell" 
                     onClick={() => navigate(`/staff/${row.id}`)}
                     style={{ cursor: 'pointer' }}
                    >
                    <div className="dt-avatar">{row.first_name.charAt(0).toUpperCase()}</div>
                    <div>
                        <div>{value}</div>
                        <div className="dt-muted" style={{ fontSize: '12px' }}>{row.email}</div>
                    </div>
                </div>
                
            ),
        },
        {
            key: 'is_active',
            label: 'Status',
            render: (value) => (
                <span className={value ? 'sm-badge-active' : 'sm-badge-archived'}>
                    {value ? 'Active' : 'Archived'}
                </span>
            ),
        },
        {
            key: 'created_at',
            label: 'Created',
            className: 'dt-muted',
            hidden640: true,
            render: (value) =>
                new Date(value).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                }),
        },
        {
            key: '_actions',
            label: 'Actions',
            render: (_, row) => (
                <div className="dt-actions">
                    <button
                        className="dt-btn-icon dt-btn-edit"
                        onClick={() => openEdit(row)}
                        title="Edit"
                    >
                        <i className="bi bi-pencil"></i>
                    </button>
                    <button
                        className={`dt-btn-icon ${row.is_active ? 'dt-btn-archive' : 'dt-btn-restore'}`}
                        onClick={() => handleArchive(row)}
                        disabled={archiving === row.id}
                        title={row.is_active ? 'Archive' : 'Restore'}
                    >
                        {archiving === row.id
                            ? <span className="dt-spin"></span>
                            : <i className={`bi ${row.is_active ? 'bi-archive' : 'bi-arrow-counterclockwise'}`}></i>
                        }
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="sm-page">

            {/* Header */}
            <div className="sm-header">
                <div>
                    <h4 className="sm-title">Staff accounts</h4>
                    <p className="sm-sub">Manage BFP staff access and credentials</p>
                </div>
                <button className="sm-add-btn" onClick={openCreate}>
                    <i className="bi bi-plus-lg"></i>
                    Add staff
                </button>
            </div>

            <DataTable
                columns={columns}
                data={staffList}
                loading={fetching}
                emptyIcon="bi-people"
                emptyTitle="No staff accounts yet"
                emptySub='Click "Add staff" to create the first account.'
            />

            {/* Modal */}
            {showModal && (
                <div className="sm-overlay" onClick={closeModal}>
                    <div className="sm-modal" onClick={e => e.stopPropagation()}>

                        <div className="sm-modal-header">
                            <h5 className="sm-modal-title">
                                {editing ? 'Edit staff account' : 'Add new staff'}
                            </h5>
                            <button className="sm-close" onClick={closeModal}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="sm-modal-body">
                            {error   && <div className="sm-alert sm-alert-err"><i className="bi bi-exclamation-circle-fill"></i>{error}</div>}
                            {success && <div className="sm-alert sm-alert-ok"><i className="bi bi-check-circle-fill"></i>{success}</div>}

                            {/* Name row — First + Last side by side */}
                            <div className="sm-field-row">
                                <div className="sm-field">
                                    <label className="sm-label">First name <span className="sm-req">*</span></label>
                                    <input
                                        type="text"
                                        className="sm-input"
                                        placeholder="Juan"
                                        value={form.first_name}
                                        onChange={e => setForm({ ...form, first_name: e.target.value })}
                                        
                                    />
                                </div>
                                <div className="sm-field">
                                    <label className="sm-label">Last name <span className="sm-req">*</span></label>
                                    <input
                                        type="text"
                                        className="sm-input"
                                        placeholder="Dela Cruz"
                                        value={form.last_name}
                                        onChange={e => setForm({ ...form, last_name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Middle name */}
                            <div className="sm-field">
                                <label className="sm-label">
                                    Middle name <span className="sm-hint">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    className="sm-input"
                                    placeholder="Santos"
                                    value={form.middle_name}
                                    onChange={e => setForm({ ...form, middle_name: e.target.value })}
                                />
                            </div>

                            {/* Email */}
                            <div className="sm-field">
                                <label className="sm-label">Email address <span className="sm-req">*</span></label>
                                <input
                                    type="email"
                                    className="sm-input"
                                    placeholder="juan@example.com"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Info note — only on create */}
                            {!editing && (
                                <div className="sm-info-note">
                                    <i className="bi bi-info-circle"></i>
                                    A password will be auto-generated and sent to their email address.
                                </div>
                            )}

                            <div className="sm-modal-footer">
                                <button type="button" className="sm-btn-cancel" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="sm-btn-submit" disabled={loading}>
                                    {loading
                                        ? <><span className="sm-spin sm-spin-white"></span>Saving…</>
                                        : editing ? 'Update staff' : 'Create staff'
                                    }
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}

        </div>
    );
}