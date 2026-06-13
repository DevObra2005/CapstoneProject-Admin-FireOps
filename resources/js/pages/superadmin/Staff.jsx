import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../../Components/datatable';   // ← adjust path to wherever you put DataTable.jsx
import '../../../css/Superadmin/staff.css';

export default function Staff() {
    const [staffList, setStaffList] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing,   setEditing]   = useState(null);
    const [form,      setForm]      = useState({ name: '', email: '', password: '' });
    const [error,     setError]     = useState('');
    const [success,   setSuccess]   = useState('');
    const [loading,   setLoading]   = useState(false);
    const [fetching,  setFetching]  = useState(true);   // ← new: skeleton on initial load
    const [deleting,  setDeleting]  = useState(null);
    const [showPass,  setShowPass]  = useState(false);

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
        setForm({ name: '', email: '', password: '' });
        setError(''); setSuccess(''); setShowPass(false);
        setShowModal(true);
    };

    const openEdit = (staff) => {
        setEditing(staff);
        setForm({ name: staff.name, email: staff.email, password: '' });
        setError(''); setSuccess(''); setShowPass(false);
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setError(''); setSuccess(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            if (editing) {
                await axios.put(`/api/superadmin/staff/${editing.id}`, form);
                setSuccess('Staff updated successfully.');
            } else {
                await axios.post('/api/superadmin/staff', form);
                setSuccess('Staff account created.');
            }
            fetchStaff();
            setTimeout(() => { setShowModal(false); setSuccess(''); }, 1200);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this staff account?')) return;
        setDeleting(id);
        try {
            await axios.delete(`/api/superadmin/staff/${id}`);
            fetchStaff();
        } catch (err) {
            console.log('Delete error:', err);
        } finally {
            setDeleting(null);
        }
    };

    /* ── Column definitions ─────────────────────────────────────────────── */
    /*
     * Each object describes one column.
     *
     * key        → which field in the row object to read (or a fake key like '_index')
     * label      → header text
     * render     → optional function: (cellValue, fullRow, rowIndex) => JSX
     * hidden640  → hides the column on screens ≤ 640 px
     * className  → extra class on every <td> in this column
     */
    const columns = [
        {
            key: '_index',
            label: '#',
            width: '36px',
            render: (_, __, index) => index + 1,
        },
        {
            key: 'name',
            label: 'Name',
            render: (value) => (
                <div className="dt-name-cell">
                    <div className="dt-avatar">{value.charAt(0).toUpperCase()}</div>
                    {value}
                </div>
            ),
        },
        {
            key: 'email',
            label: 'Email',
            className: 'dt-muted',
            hidden640: true,
        },
        {
            key: 'created_at',
            label: 'Created',
            className: 'dt-muted',
            hidden640: true,
            render: (value) =>
                new Date(value).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
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
                        className="dt-btn-icon dt-btn-del"
                        onClick={() => handleDelete(row.id)}
                        disabled={deleting === row.id}
                        title="Delete"
                    >
                        {deleting === row.id
                            ? <span className="dt-spin"></span>
                            : <i className="bi bi-trash"></i>
                        }
                    </button>
                </div>
            ),
        },
    ];

    /* ── Render ─────────────────────────────────────────────────────────── */
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

            {/* Modal — unchanged */}
            {showModal && (
                <div className="sm-overlay" onClick={closeModal}>
                    <div className="sm-modal" onClick={e => e.stopPropagation()}>

                        <div className="sm-modal-header">
                            <h5 className="sm-modal-title">
                                {editing ? 'Edit staff' : 'Add new staff'}
                            </h5>
                            <button className="sm-close" onClick={closeModal}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="sm-modal-body">
                            {error   && <div className="sm-alert sm-alert-err"><i className="bi bi-exclamation-circle-fill"></i>{error}</div>}
                            {success && <div className="sm-alert sm-alert-ok"><i className="bi bi-check-circle-fill"></i>{success}</div>}

                            <div className="sm-field">
                                <label className="sm-label">Name <span className="sm-req">*</span></label>
                                <input type="text" className="sm-input" placeholder="Juan Dela Cruz"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>

                            <div className="sm-field">
                                <label className="sm-label">Email <span className="sm-req">*</span></label>
                                <input type="email" className="sm-input" placeholder="juan@example.com"
                                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                            </div>

                            <div className="sm-field">
                                <label className="sm-label">
                                    Password {editing && <span className="sm-hint">leave blank to keep current</span>}
                                    {!editing && <span className="sm-req">*</span>}
                                </label>
                                <div className="sm-pass-wrap">
                                    <input type={showPass ? 'text' : 'password'} className="sm-input" placeholder="••••••••"
                                        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                        {...(!editing && { required: true })} />
                                    <button type="button" className="sm-eye" onClick={() => setShowPass(p => !p)}>
                                        <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

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