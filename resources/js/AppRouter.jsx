import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/public/Login';
import MainLayout from './layouts/MainLayout';
import Register from './pages/public/Register';
import ForgotPassword from './pages/public/ForgotPassword';
import ResetPassword from './pages/public/ResetPassword';
import StaffDetail from './pages/superadmin/StaffDetail';
import AdminEvents from './pages/superadmin/AdminEvents';
import ActivityLogs from './pages/superadmin/ActivityLogs';

// Superadmin pages
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import Staff from './pages/superadmin/Staff';

// Staff pages
import StaffDashboard from './pages/staff/Dashboard';
import Events from './pages/staff/Events';

// Set token globally ONCE when app loads
const token = localStorage.getItem('token');
if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

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
            <Route path="/" element={<Navigate to="/login" />} />

            {/* Public routes — no login required */}
            <Route path="/login" element={<Login />} />
            <Route path="/register/:token" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Superadmin routes */}
            <Route path="/" element={
                <SuperAdminRoute><MainLayout /></SuperAdminRoute>
            }>
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="staff" element={<Staff />} />
                <Route path="staff/:id" element={<StaffDetail />} />
                <Route path="/events" element={<AdminEvents />} />
                <Route path="activity-logs" element={<ActivityLogs />} />
            </Route>

            {/* Staff routes */}
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