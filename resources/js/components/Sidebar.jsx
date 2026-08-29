import { NavLink, useNavigate } from 'react-router-dom'
import '../../css/Components/sidebar.css'
import fireopsLogo from '/public/Images/FireOps_Logo.png'
import useDarkMode from '../hooks/useDarkMode'

export default function Sidebar() {
    const navigate  = useNavigate()
    const role      = localStorage.getItem('role')
    const firstName = localStorage.getItem('first_name') || ''
    const lastName  = localStorage.getItem('last_name')  || ''
    const fullName  = `${firstName} ${lastName}`.trim()
    const { isDark, toggle } = useDarkMode()

    function handleLogout() {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        localStorage.removeItem('first_name')
        localStorage.removeItem('last_name')
        navigate('/login')
    }

    return (
        <div className="sidebar">

            {/* ── LOGO ─────────────────────────────────── */}
            <div className="sb-logo">
                <div>
                    <img src={fireopsLogo} alt="FireOps" style={{ width: 50, height: 50, objectFit: 'contain' }} />
                </div>
                <div>
                    <div className="sb-logo-name">FireOps</div>
                    <div className="m-0 sb-admin-name">{fullName}</div>
                    <div className="sb-role">
                        {role === 'superadmin' ? 'Administrator' : 'Staff'}
                    </div>
                </div>
            </div>

            {/* ── NAV LINKS ────────────────────────────── */}
            <nav className="sb-nav">

                {/* Administrator links */}
                {role === 'superadmin' && (
                    <>
                        <NavLink to="/dashboard" className={({ isActive }) => 'sb-link' + (isActive ? ' active' : '')}>
                            <i className="bi bi-grid-fill"></i>
                            Dashboard
                        </NavLink>
                        <NavLink to="/events" className={({ isActive }) => 'sb-link' + (isActive ? ' active' : '')}>
                            <i className="bi bi-calendar-event-fill"></i>
                            Events
                        </NavLink>
                        {/* CHANGED — was /staff, now /staff-management */}
                        <NavLink to="/staff-management" className={({ isActive }) => 'sb-link' + (isActive ? ' active' : '')}>
                            <i className="bi bi-people-fill"></i>
                            Staff Management
                        </NavLink>
                        <NavLink to="/activity-logs" className={({ isActive }) => 'sb-link' + (isActive ? ' active' : '')}>
                            <i className="bi bi-clock-history"></i>
                            Activity Logs
                        </NavLink>
                        <NavLink to="/certificates" className={({ isActive }) => 'sb-link' + (isActive ? ' active' : '')}>
                            <i className="bi bi-patch-check-fill"></i>
                            Certificates
                        </NavLink>
                    </>
                )}

                {/* Staff links */}
                {role === 'staff' && (
                    <>
                        <NavLink to="/staff/dashboard" className={({ isActive }) => 'sb-link' + (isActive ? ' active' : '')}>
                            <i className="bi bi-grid-fill"></i>
                            Dashboard
                        </NavLink>
                        <NavLink to="/staff/events" className={({ isActive }) => 'sb-link' + (isActive ? ' active' : '')}>
                            <i className="bi bi-calendar-event-fill"></i>
                            Events Management
                        </NavLink>
                        
                        <NavLink to="/staff/certifications" className={({ isActive }) => 'sb-link' + (isActive ? ' active' : '')}>
                            <i className="bi bi-patch-check-fill"></i>
                            Certifications
                        </NavLink>
             
                        <NavLink to="/staff/reports" className={({ isActive }) => 'sb-link' + (isActive ? ' active' : '')}>
                            <i className="bi bi-file-earmark-bar-graph-fill"></i>
                            Reports
                        </NavLink>
                    </>
                )}

            </nav>

            {/* ── FOOTER ───────────────────────────────── */}
            <div className="sb-footer">

                <button className="sb-theme" onClick={toggle}>
                    <span className="sb-theme-l">
                        <i className={`bi ${isDark ? 'bi-moon-stars-fill' : 'bi-sun-fill'}`}></i>
                        {isDark ? 'Dark mode' : 'Light mode'}
                    </span>
                    <span className={`sb-switch ${isDark ? 'on' : ''}`}>
                        <span className="sb-knob"></span>
                    </span>
                </button>

                <button className="sb-logout" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right"></i>
                    Logout
                </button>
            </div>

        </div>
    )
}