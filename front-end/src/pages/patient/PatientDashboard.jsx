import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { useAutoRefresh } from "../../utils/useAutoRefresh";
import "../../css/PatientDashboard.css";
import {
  FaCalendarAlt,
  FaTooth,
  FaClock,
  FaMoneyBillWave,
  FaArrowRight,
} from "react-icons/fa";
import { formatDateOnly, getDateParts } from "../../utils/dateUtils";

function PatientDashboard() {
  const [profile, setProfile] = useState(null);
  const [visits, setVisits] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadPatientData = async () => {
    try {
      setLoading(true);
      setError("");

      const [profileRes, visitsRes, balanceRes, appointmentsRes] =
        await Promise.all([
          api.get("/my-profile"),
          api.get("/my-visits"),
          api.get("/my-balance"),
          api.get("/my-appointments"),
        ]);

      setProfile(profileRes.data);
      setVisits(Array.isArray(visitsRes.data) ? visitsRes.data : []);
      setBalance(Number(balanceRes.data?.total_balance || 0));
      setAppointments(
        Array.isArray(appointmentsRes.data) ? appointmentsRes.data : [],
      );
    } catch (requestError) {
      console.error("Patient dashboard error:", requestError);
      setError(
        requestError.response?.data?.message ||
          "Unable to load your information.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, []);

  useAutoRefresh(loadPatientData);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(amount || 0));

  const formatDate = (date) => formatDateOnly(date);

  const formatTime = (time) => {
    if (!time) return "—";

    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);

    return date.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusClass = (status) => {
    const value = String(status || "Pending").toLowerCase();

    if (value === "approved" || value === "confirmed") return "approved";
    if (value === "completed") return "completed";
    if (value === "cancelled" || value === "rejected") return "cancelled";
    if (value === "rescheduled") return "rescheduled";

    return "pending";
  };

  const getStatusLabel = (status) => {
    const value = String(status || "Pending").toLowerCase();

    if (value === "approved") return "Approved";
    if (value === "confirmed") return "Confirmed";
    if (value === "completed") return "Completed";
    if (value === "cancelled" || value === "canceled") return "Cancelled";
    if (value === "rejected") return "Rejected";
    if (value === "rescheduled") return "Rescheduled";

    return "Pending";
  };

  const upcomingAppointment = [...appointments]
    .filter(
      (appointment) =>
        !["cancelled", "completed", "rejected"].includes(
          String(appointment.status || "").toLowerCase(),
        ),
    )
    .sort(
      (a, b) =>
        new Date(`${a.preferred_date} ${a.preferred_time || "00:00"}`) -
        new Date(`${b.preferred_date} ${b.preferred_time || "00:00"}`),
    )[0];

  if (loading) {
    return (
      <div className="patient-loading">
        <div className="patient-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="patient-error">
        <div className="patient-error-card">
          <h2>Unable to Load Dashboard</h2>
          <p>{error}</p>
          <button onClick={loadPatientData}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-dashboard">
      <div className="patient-dashboard-header">
        <div>
          <h1>
            Welcome back,
            <span> {profile?.name || "Patient"}</span>
          </h1>
          <p className="patient-subtitle">
            Here's an overview of your dental care.
          </p>
        </div>

        <div className="patient-avatar">
          {profile?.name?.charAt(0)?.toUpperCase() || "P"}
        </div>
      </div>

      <div className="patient-stat-grid">
        <div className="patient-stat-card blue">
          <div className="patient-stat-icon">
            <FaCalendarAlt />
          </div>
          <div>
            <p>Appointments</p>
            <h2>{appointments.length}</h2>
          </div>
        </div>

        <div className="patient-stat-card purple">
          <div className="patient-stat-icon">
            <FaTooth />
          </div>
          <div>
            <p>Total Visits</p>
            <h2>{visits.length}</h2>
          </div>
        </div>

        <div className="patient-stat-card green">
          <div className="patient-stat-icon">
            <FaMoneyBillWave />
          </div>
          <div>
            <p>Current Balance</p>
            <h2>{formatCurrency(balance)}</h2>
          </div>
        </div>
      </div>

      <div className="patient-main-grid">
        <div className="patient-card upcoming-card">
          <div className="patient-card-header">
            <div>
              <p className="patient-card-label">NEXT APPOINTMENT</p>
              <h2>Upcoming Appointment</h2>
            </div>
          </div>

          {upcomingAppointment ? (
            <div className="upcoming-content">
              <div className="appointment-date-box">
                <span>
                  {(() => {
                    const parts = getDateParts(
                      upcomingAppointment.preferred_date,
                    );
                    if (!parts) return "—";
                    return new Date(
                      parts.year,
                      parts.month - 1,
                      parts.day,
                    ).toLocaleDateString("en-PH", { month: "short" });
                  })()}
                </span>
                <strong>
                  {getDateParts(upcomingAppointment.preferred_date)?.day || "—"}
                </strong>
              </div>

              <div className="appointment-info">
                <h3>{upcomingAppointment.service}</h3>
                <p>
                  {formatDate(upcomingAppointment.preferred_date)} •{" "}
                  {formatTime(upcomingAppointment.preferred_time)}
                </p>
                <span
                  className={`appointment-status-patient ${getStatusClass(
                    upcomingAppointment.status,
                  )}`}
                >
                  {getStatusLabel(upcomingAppointment.status)}
                </span>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div>
                <FaClock />
              </div>
              <h3>No upcoming appointments</h3>
              <p>You don't have an upcoming appointment.</p>
            </div>
          )}
        </div>

        <div className="patient-card profile-summary">
          <div className="patient-card-header">
            <div>
              <p className="patient-card-label">MY PROFILE</p>
              <h2>Personal Information</h2>
            </div>
          </div>

          <div className="profile-info">
            <div>
              <span>Full Name</span>
              <strong>{profile?.name || "—"}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{profile?.email || "—"}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{profile?.phone || "—"}</strong>
            </div>
            <div>
              <span>Address</span>
              <strong>{profile?.address || "—"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="patient-card appointments-section">
        <div className="patient-card-header">
          <div>
            <p className="patient-card-label">APPOINTMENTS</p>
            <h2>My Appointments</h2>
          </div>

          <button
            className="patient-book-button"
            onClick={() => navigate("/patient/book-appointment")}
          >
            + Book Appointment
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="empty-state appointment-empty">
            <div>
              <FaCalendarAlt />
            </div>
            <h3>No appointments yet</h3>
            <p>Book an appointment to see it here.</p>
          </div>
        ) : (
          <div className="dashboard-appointments-list">
            {appointments.map((appointment) => (
              <div className="dashboard-appointment-row" key={appointment.id}>
                <div className="dashboard-appointment-main">
                  <div className="dashboard-appointment-icon">
                    <FaTooth />
                  </div>

                  <div>
                    <h3>{appointment.service || "Dental Appointment"}</h3>
                    <p>
                      {formatDate(appointment.preferred_date)} •{" "}
                      {formatTime(appointment.preferred_time)}
                    </p>
                    {appointment.reason && (
                      <span>{appointment.reason}</span>
                    )}
                  </div>
                </div>

                <div className="dashboard-appointment-right">
                  <span
                    className={`appointment-status-patient ${getStatusClass(
                      appointment.status,
                    )}`}
                  >
                    {getStatusLabel(appointment.status)}
                  </span>

                  {appointment.queue_status && (
                    <small>
                      Queue: {appointment.queue_status}
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="patient-card treatment-card">
        <div className="patient-card-header">
          <div>
            <p className="patient-card-label">DENTAL RECORDS</p>
            <h2>Recent Treatment History</h2>
          </div>

          <button
            className="patient-text-button"
            onClick={() => navigate("/patient/treatments")}
          >
            View History <FaArrowRight />
          </button>
        </div>

        {visits.length === 0 ? (
          <div className="empty-state">
            <div>🦷</div>
            <h3>No treatment records</h3>
            <p>Your treatment history will appear here.</p>
          </div>
        ) : (
          <div className="treatment-table-wrapper">
            <table className="treatment-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Procedure</th>
                  <th>Complaint</th>
                  <th>Amount Paid</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {visits.slice(0, 5).map((visit) => (
                  <tr key={visit.id}>
                    <td>{formatDate(visit.visit_date)}</td>
                    <td>
                      <strong>{visit.procedure_name || "—"}</strong>
                    </td>
                    <td>{visit.complain || "—"}</td>
                    <td>{formatCurrency(visit.amount_paid)}</td>
                    <td>
                      <span
                        className={
                          Number(visit.balance) > 0
                            ? "balance-due"
                            : "balance-paid"
                        }
                      >
                        {formatCurrency(visit.balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientDashboard;
