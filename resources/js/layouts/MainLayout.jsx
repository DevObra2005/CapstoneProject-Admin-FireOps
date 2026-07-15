import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import '../../css/mainlayout.css'

export default function MainLayout() {
    return (
        <div>

            {/* ===== DESKTOP SIDEBAR ===== */}
            <div className="sidebar-desktop d-none d-lg-flex">
                <Sidebar />
            </div>

            {/* ===== MOBILE TOPBAR ===== */}
            <div className="mobile-topbar">
                <button
                    className="btn btn-sm"
                    style={{ color: 'var(--ink)', fontSize: '20px' }}
                    data-bs-toggle="offcanvas"
                    data-bs-target="#mobileSidebar"
                >
                    <i className="bi bi-list"></i>
                </button>
                <span style={{ color: 'var(--green)', fontWeight: '700' }}>
                    FireOps
                </span>
                <div style={{ width: '30px' }}></div>
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