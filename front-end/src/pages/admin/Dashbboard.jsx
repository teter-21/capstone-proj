import React, { useEffect, useState } from "react";
import "../../css/Dashboard.css";

import api from "../../api";
import { useAutoRefresh } from "../../utils/useAutoRefresh";

import MonthlyGraph from "../../components/MonthlyGraph";
import TopProcedure from "../../components/TopProcedure";
import PatientManagement from "../../components/PatientTable";

import {
  FaUsers,
  FaCalendarCheck,
  FaClock,
  FaMoneyBillWave,
  FaArrowRight,
} from "react-icons/fa";

import { Link } from "react-router-dom";

function Dashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,

    pendingAppointments: 0,

    todayAppointments: 0,

    totalRevenue: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get("/dashboard-summary");

      setStats(res.data);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useAutoRefresh(loadDashboard);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(value || 0));
  };

  return (
    <div className="dashboard">
      {/* PAGE HEADER */}

      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>

          <p>
            Welcome back, Dr. Magno. Here's what's happening at your clinic
            today.
          </p>
        </div>

        <Link to="/Appointments" className="dashboard-action">
          View Appointments
          <FaArrowRight />
        </Link>
      </div>

      {/* STATISTICS */}

      <div className="stats-container">
        {/* TOTAL PATIENTS */}

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon blue">
              <FaUsers />
            </div>

            <span className="stat-label">Patients</span>
          </div>

          <h2>{loading ? "..." : stats.totalPatients}</h2>

          <p>Total registered patients</p>
        </div>

        {/* PENDING APPOINTMENTS */}

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon orange">
              <FaClock />
            </div>

            <span className="stat-label">Pending</span>
          </div>

          <h2>{loading ? "..." : stats.pendingAppointments}</h2>

          <p>Appointments awaiting approval</p>
        </div>

        {/* TODAY'S APPOINTMENTS */}

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon green">
              <FaCalendarCheck />
            </div>

            <span className="stat-label">Today</span>
          </div>

          <h2>{loading ? "..." : stats.todayAppointments}</h2>

          <p>Appointments scheduled today</p>
        </div>

        {/* REVENUE */}

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon purple">
              <FaMoneyBillWave />
            </div>

            <span className="stat-label">Revenue</span>
          </div>

          <h2>{loading ? "..." : formatCurrency(stats.totalRevenue)}</h2>

          <p>Total recorded payments</p>
        </div>
      </div>

      {/* ANALYTICS */}

      <div className="dashboard-grid">
        <MonthlyGraph />

        <TopProcedure />
      </div>

      {/* PATIENT TABLE */}

      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h2>Recent Patients</h2>

            <p>Recently registered patient records</p>
          </div>

          <Link to="/PatientMngmt" className="section-link">
            View All
            <FaArrowRight />
          </Link>
        </div>

        <PatientManagement />
      </div>
    </div>
  );
}

export default Dashboard;
