import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Register from './pages/public/Register';

// Superadmin pages
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import Staff from './pages/superadmin/Staff';

// Staff pages
import StaffDashboard from './pages/staff/Dashboard';
import Events from './pages/staff/Events';

// Guard for superadmin only
const SuperAdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('role');
    if (!token) return <Navigate to="/login" />;
    if (role !== 'superadmin') return <Navigate to="/login" />;
    return children;
};

// Guard for staff only
const StaffRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('role');
    if (!token) return <Navigate to="/login" />;
    if (role !== 'staff') return <Navigate to="/login" />;
    return children;
};

export default function AppRouter() {
    return (
        <Routes>
            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" />} />

            {/* Public */}
            <Route path="/register/:token" element={<Register />} />
            <Route path="/login" element={<Login />} />
            

            {/* Superadmin routes */}
            <Route path="/" element={
                <SuperAdminRoute><MainLayout /></SuperAdminRoute>
            }>
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="staff" element={<Staff />} />
            </Route>

            {/* Staff routes — all in ONE group */}
            <Route path="/staff" element={
                <StaffRoute><MainLayout /></StaffRoute>
            }>
                <Route path="dashboard" element={<StaffDashboard />} />
                <Route path="events" element={<Events />} /> 
            </Route>

            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    );
}