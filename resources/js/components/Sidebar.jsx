import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import '../../css//Components/sidebar.css'

export default function Sidebar() {
    const navigate = useNavigate()
    const role = localStorage.getItem('role')  // 👈 get role

    function handleLogout() {
        localStorage.removeItem('token')
        localStorage.removeItem('role')  // 👈 clear role too
        navigate('/login')
    }

    return (
        <div className="sidebar">

            {/* LOGO */}
            <div className="sidebar-logo d-flex align-items-center gap-2">
                <div className="reg-logo-mark">
                        <i className="bi bi-fire" aria-hidden="true"></i>
                    </div>
                <div>
                    <div className="app-name">FireOps Admin</div>
                    <div className="app-sub">
                        {role === 'superadmin' ? 'Super Admin' : 'Staff Panel'}
                    </div>
                </div>
            </div>

            {/* NAV LINKS */}
            <nav className="flex-grow-1 p-2 mt-2">

                {/* Superadmin links */}
                {role === 'superadmin' && (
                    <>
                   
                        <NavLink to="/dashboard" className={({ isActive }) =>
                            'sidebar-link' + (isActive ? ' active' : '')
                        }>
                            <i className="bi bi-grid-fil\l"></i>
                            Dashboard
                        </NavLink>
                        <hr style={{ borderColor: 'rgba(255,255,255,0.15)', opacity: 1, margin: '3px 3px' }} />

                        <NavLink to="/staff" className={({ isActive }) =>
                            'sidebar-link' + (isActive ? ' active' : '')
                        }>
                            <i className="bi bi-people-fill"></i>
                            Staff Management
                        </NavLink>
                        <hr style={{ borderColor: 'rgba(255,255,255,0.15)', opacity: 1, margin: '3px 3px' }} />

                        <NavLink to="/certificates" className={({ isActive }) =>
                            'sidebar-link' + (isActive ? ' active' : '')
                        }>
                            <i className="bi bi-patch-check-fill"></i>
                            Certificates
                        </NavLink>
                        <hr style={{ borderColor: 'rgba(255,255,255,0.15)', opacity: 1, margin: '3px 3px' }} />
                        <NavLink to="/reports" className={({ isActive }) =>
                            'sidebar-link' + (isActive ? ' active' : '')
                        }>
                            <i className="bi bi-bar-chart-fill"></i>
                            Reports
                        </NavLink>
                    </>
                )}

                {/* Staff links */}
                {role === 'staff' && (
                    <>
                        <NavLink to="/staff/dashboard" className={({ isActive }) =>
                            'sidebar-link' + (isActive ? ' active' : '')
                        }>
                            <i className="bi bi-grid-fill"></i>
                            Dashboard
                        </NavLink>

                        <NavLink to="/staff/events" className={({ isActive }) =>
                            'sidebar-link' + (isActive ? ' active' : '')
                        }>
                            <i className="bi bi-calendar-event-fill"></i>
                            My Events
                        </NavLink>
                    </>
                )}

            </nav>

            {/* LOGOUT */}
            <div className="p-5 mb-5">
                <button className="btn btn-danger px-4" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right"></i>
                    Logout
                </button>
            </div>
        </div>
    )
}