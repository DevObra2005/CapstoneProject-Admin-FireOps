import { useEffect, useState } from "react";
import axios from "axios";
import '../../../css/Staff/dashboard.css'

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [recentEvents, setRecentEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            axios.get("/api/staff/dashboard-stats"),
            axios.get("/api/staff/events"),
        ])
            .then(([statsRes, eventsRes]) => {
                setStats(statsRes.data);
                // Take only the 5 most recent events
                setRecentEvents(eventsRes.data.slice(0, 5));
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load dashboard", err);
                setLoading(false);
            });
    }, []);

    const cards = stats
        ? [
              {
                  label: "Total Events",
                  value: stats.total_events,
                  icon: "bi-calendar-event",
                  colorClass: "icon-red",
              },
              {
                  label: "Open Events",
                  value: stats.open_events,
                  icon: "bi-door-open",
                  colorClass: "icon-green",
              },
              {
                  label: "Closed Events",
                  value: stats.closed_events,
                  icon: "bi-door-closed",
                  colorClass: "icon-slate",
              },
              {
                  label: "Total Participants",
                  value: stats.total_participants,
                  icon: "bi-people",
                  colorClass: "icon-blue",
              },
          ]
        : [];

    return (
        <div>
            <h5 className="mb-4 fw-semibold text-light d-flex align-items-center gap-2">
                <i className="bi bi-grid-1x2 text-secondary"></i>
                Staff Dashboard
            </h5>

            {loading ? (
                <div className="text-secondary">Loading...</div>
            ) : (
                <>
                    {/* Stat Cards */}
                    <div className="row g-3 mb-4">
                        {cards.map((card) => (
                            <div className="col-6 col-xl-3" key={card.label}>
                                <div className="stat-card d-flex align-items-center gap-3 p-3 rounded-3">
                                    <div className={`stat-icon ${card.colorClass}`}>
                                        <i className={`bi ${card.icon}`}></i>
                                    </div>
                                    <div>
                                        <div className="stat-value">{card.value}</div>
                                        <div className="stat-label">{card.label}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Recent Events Table */}
                    <div className="table-card rounded-3 overflow-hidden">
                        <div className="p-3 pb-0">
                            <p className="section-header d-flex align-items-center gap-2 mb-3">
                                <i className="bi bi-calendar-week"></i>
                                Recent Events
                            </p>
                        </div>
                        <table className="table table-dark table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Event</th>
                                    <th>Date</th>
                                    <th>Participants</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center text-secondary py-4">
                                            No events yet.
                                        </td>
                                    </tr>
                                ) : (
                                    recentEvents.map((event) => (
                                        <tr key={event.id}>
                                            <td className="fw-semibold text-light">{event.name}</td>
                                            <td className="text-secondary">{event.date}</td>
                                            <td>{event.participants_count ?? "—"}</td>
                                            <td>
                                                {event.is_open ? (
                                                    <span className="badge-open">
                                                        <i className="bi bi-circle-fill me-1" style={{ fontSize: "7px", verticalAlign: "middle" }}></i>
                                                        Open
                                                    </span>
                                                ) : (
                                                    <span className="badge-closed">
                                                        <i className="bi bi-circle me-1" style={{ fontSize: "7px", verticalAlign: "middle" }}></i>
                                                        Closed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}