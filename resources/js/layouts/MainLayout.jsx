import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Offcanvas } from 'bootstrap'
import Sidebar from '../components/Sidebar'
import fireopsLogo from '/public/Images/FireOps_Logo.png'
import '../../css/mainlayout.css'

export default function MainLayout() {
    const location = useLocation()

useEffect(() => {
    const el = document.getElementById('mobileSidebar')
    if (!el || !el.classList.contains('show')) return

    const instance = Offcanvas.getOrCreateInstance(el)

    // Runs after Bootstrap's slide-out animation completes
    const onHidden = () => {
        document.querySelectorAll('.offcanvas-backdrop').forEach(b => b.remove())
        document.body.classList.remove('offcanvas-backdrop')
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''
    }

    el.addEventListener('hidden.bs.offcanvas', onHidden, { once: true })
    instance.hide()

    return () => el.removeEventListener('hidden.bs.offcanvas', onHidden)
}, [location.pathname])

    return (
        <div>

            {/* ===== DESKTOP SIDEBAR ===== */}
            <div className="sidebar-desktop d-none d-lg-flex">
                <Sidebar />
            </div>

            {/* ===== MOBILE TOPBAR ===== */}
            <div className="mobile-topbar">
                <button
                    className="mt-burger"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#mobileSidebar"
                    aria-label="Open menu"
                >
                    <i className="bi bi-list"></i>
                </button>
                <div className="mt-spacer"></div>
                <div className="mt-logo">
                    <img src={fireopsLogo} alt="FireOps" />
                </div>
            </div>

            {/* ===== MOBILE SIDEBAR ===== */}
            <div className="offcanvas offcanvas-start" id="mobileSidebar" tabIndex="-1">
                <div className="offcanvas-body p-0">
                    <Sidebar />
                </div>
            </div>

            {/* ===== MAIN CONTENT ===== */}
            <div className="main-wrapper p-3 p-lg-5">
                <Outlet />
            </div>

        </div>
    )
}