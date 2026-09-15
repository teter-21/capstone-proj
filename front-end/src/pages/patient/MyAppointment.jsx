import API_BASE_URL from "../../config/apiBase.js";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAutoRefresh } from "../../utils/useAutoRefresh";
import "../../css/MyAppointment.css";
import { useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaClock, FaTooth } from "react-icons/fa";

import { formatDateOnly } from "../../utils/dateUtils";
function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(API_BASE_URL + "/my-appointments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAppointments(response.data);
      setError("");
    } catch (err) {
      console.error("Appointment error:", err);
      setError("Unable to load your appointments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  useAutoRefresh(fetchAppointments);

  const formatDate = (date) => formatDateOnly(date);

  const formatTime = (time) => {
    if (!time) return "—";

    const [hours, minutes] = time.split(":");

    const date = new Date();

    date.setHours(parseInt(hours), parseInt(minutes));

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusClass = (status) => {
    if (!status) return "pending";

    const normalizedStatus = status.toLowerCase().trim();

    switch (normalizedStatus) {
      case "pending":
        return "pending";

      case "approved":
        return "confirmed";

      case "confirmed":
        return "confirmed";

      case "rescheduled":
        return "rescheduled";

      case "rejected":
        return "cancelled";

      case "cancelled":
      case "canceled":
        return "cancelled";

      case "completed":
        return "completed";

      default:
        return "pending";
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return "Pending";

    const normalizedStatus = status.toLowerCase().trim();

    switch (normalizedStatus) {
      case "pending":
        return "Pending";

      case "approved":
        return "Approved";

      case "confirmed":
        return "Confirmed";

      case "rescheduled":
        return "Rescheduled";

      case "rejected":
        return "Rejected";

      case "cancelled":
      case "canceled":
        return "Cancelled";

      case "completed":
        return "Completed";

      default:
        return status;
    }
  };

  const getQueueStatus = (appointment) => {
    if (!appointment.queue_status) {
      return null;
    }

    switch (appointment.queue_status.toLowerCase().trim()) {
      case "waiting":
        return "Checked In";

      case "called":
        return "Called";

      case "in treatment":
        return "In Treatment";

      case "completed":
        return "Treatment Completed";

      case "skipped":
        return "Skipped";

      case "cancelled":
        return "Queue Cancelled";

      default:
        return appointment.queue_status;
    }
  };

  return (
    <div className="my-appointments-page">
      {/* HEADER */}

      <div className="appointments-header">
        <div>
          <h1>My Appointments</h1>

          <p className="page-description">
            View and manage your upcoming dental appointments.
          </p>
        </div>

        <button
          className="book-new-appointment-btn"
          onClick={() => navigate("/patient/book-appointment")}
        >
          + Book New Appointment
        </button>
      </div>

      {/* CONTENT */}

      <div className="appointments-container">
        {loading && (
          <div className="appointment-message">
            <div className="loading-spinner"></div>

            <p>Loading appointments...</p>
          </div>
        )}

        {!loading && error && (
          <div className="appointment-message error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && appointments.length === 0 && (
          <div className="empty-appointments">
            <div className="empty-icon"></div>

            <h2>No Appointments Yet</h2>

            <p>You currently don't have any scheduled appointments.</p>
          </div>
        )}

        {!loading && !error && appointments.length > 0 && (
          <div className="appointments-list">
            {appointments.map((appointment) => (
              <div className="appointment-card" key={appointment.id}>
                {/* CARD HEADER */}

                <div className="appointment-card-header">
                  <div>
                    <span className="appointment-label">APPOINTMENT</span>

                    <h2>{appointment.service}</h2>
                  </div>

                  <span
                    className={`appointment-status ${getStatusClass(
                      appointment.status,
                    )}`}
                  >
                    {getStatusLabel(appointment.status)}
                  </span>

                  {appointment.queue_status && (
                    <span
                      className={`appointment-queue-status ${appointment.queue_status
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {getQueueStatus(appointment)}
                    </span>
                  )}
                </div>

                {/* DATE */}

                <div className="appointment-details">
                  <div className="appointment-detail">
                    <span className="detail-icon">
                      <FaCalendarAlt />
                    </span>

                    <div>
                      <small>DATE</small>

                      <strong>{formatDate(appointment.preferred_date)}</strong>
                    </div>
                  </div>

                  {/* TIME */}

                  <div className="appointment-detail">
                    <span className="detail-icon">
                      <FaClock />
                    </span>

                    <div>
                      <small>TIME</small>

                      <strong>{formatTime(appointment.preferred_time)}</strong>
                    </div>
                  </div>

                  {/* SERVICE */}

                  <div className="appointment-detail">
                    <span className="detail-icon">
                      <FaTooth />
                    </span>

                    <div>
                      <small>SERVICE</small>

                      <strong>{appointment.service}</strong>
                    </div>
                  </div>
                </div>

                {/* REASON */}

                {appointment.reason && (
                  <div className="appointment-reason">
                    <span>Reason for visit</span>

                    <p>{appointment.reason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyAppointments;
