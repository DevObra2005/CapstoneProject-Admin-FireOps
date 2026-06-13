import React from 'react'
import '../../../css/Superadmin/dashboard.css'

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js'

import { Bar } from 'react-chartjs-2'

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
)

const stats = [
    {
        label: 'Total Players',
        value: '248',
        trend: '+12 this week',
        trendColor: '#2ecc71',
        borderColor: 'orange'
    },
    {
        label: 'Simulations Conducted',
        value: '1,342',
        trend: '+87 this month',
        trendColor: '#2ecc71',
        borderColor: 'blue'
    },
    {
        label: 'Certificates Issued',
        value: '183',
        trend: '+23 this month',
        trendColor: '#2ecc71',
        borderColor: 'green'
    },
    {
        label: 'Pass Rate',
        value: '74%',
        trend: '-1% vs last week',
        trendColor: '#e74c3c',
        borderColor: 'yellow'
    },
]

const barData = {
    labels: ['A+', 'A', 'B', 'C', 'D', 'F'],
    datasets: [
        {
            label: 'Students',
            data: [40, 33, 63, 54, 38, 22],
            backgroundColor: [
                '#2ecc71', '#27ae60', '#3498db',
                '#f39c12', '#e67e22', '#e74c3c',
            ],
            borderRadius: 6,
        },
    ],
}

const barOptions = {
    responsive: true,
    plugins: {
        legend: { display: false },
    },
    scales: {
        x: {
            ticks: { color: '#8a9bb0' },
            grid:  { color: '#2a3a4a' },
        },
        y: {
            ticks: { color: '#8a9bb0' },
            grid:  { color: '#2a3a4a' },
        },
    },
}

const moduleData = [
    { name: 'Hazard Identification', percent: 89, color: '#3498db' },
    { name: 'Emergency Response',    percent: 76, color: '#e67e22' },
    { name: 'Equipment Training',    percent: 83, color: '#2ecc71' },
    { name: 'Decision Making',       percent: 68, color: '#f1c40f' },
]

export default function Dashboard() {
    return (
        // 👇 No more MainLayout wrapper — router handles it now
        <div>
            {/* PAGE HEADER */}
            <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                    <h4 style={{ color: '#ffffff', fontWeight: '700', marginBottom: '4px' }}>
                        Dashboard
                    </h4>
                    <p style={{ color: '#8a9bb0', fontSize: '13px', margin: 0 }}>
                        Fire Emergency Simulation — Overview
                    </p>
                </div>
                <span className="d-flex align-items-center gap-1"
                    style={{
                        backgroundColor: '#1a3a2a',
                        color: '#2ecc71',
                        padding: '8px 14px',
                        borderRadius: '20px',
                        fontSize: '13px'
                    }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#2ecc71',
                        borderRadius: '50%',
                        display: 'inline-block'
                    }}></span>
                    Live
                </span>
            </div>

            {/* STAT CARDS */}
            <div className="row g-3 mb-4">
                {stats.map((stat, index) => (
                    <div className="col-md-3" key={index}>
                        <div className={`stat-card ${stat.borderColor}`}>
                            <div className="stat-label">{stat.label}</div>
                            <div className="stat-value">{stat.value}</div>
                            <div className="stat-trend" style={{ color: stat.trendColor }}>
                                ↑ {stat.trend}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* CHARTS ROW */}
            <div className="row g-3">
                <div className="col-md-8">
                    <div className="chart-card">
                        <div className="card-title">Performance Grade — All Participants</div>
                        <div className="card-subtitle mb-3">Distribution by grade level</div>
                        <Bar data={barData} options={barOptions} />
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="chart-card h-100">
                        <div className="card-title">Module Completion</div>
                        <div className="card-subtitle mb-4">% of players who finished</div>

                        {moduleData.map((module, index) => (
                            <div className="module-item" key={index}>
                                <div className="module-label">
                                    <span>{module.name}</span>
                                    <span>{module.percent}%</span>
                                </div>
                                <div className="progress">
                                    <div
                                        className="progress-bar"
                                        style={{
                                            width: `${module.percent}%`,
                                            backgroundColor: module.color,
                                            borderRadius: '10px'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}