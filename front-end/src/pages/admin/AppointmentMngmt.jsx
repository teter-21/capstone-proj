import React, { useEffect, useState } from "react";

import api from "../../api";
import { useAutoRefresh } from "../../utils/useAutoRefresh";

import {
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaCheck,
  FaTimes,
  FaEdit,
  FaEye,
  FaPhone,
  FaEnvelope,
} from "react-icons/fa";

import "../../css/AppointmentMngmt.css";
import { formatDateOnly } from "../../utils/dateUtils";

function AppointmentMngmt() {
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [showDetails, setShowDetails] = useState(false);

  const [showReschedule, setShowReschedule] = useState(false);

  const [newDate, setNewDate] = useState("");

  const [newTime, setNewTime] = useState("");

  /* LOAD APPOINTMENTS */

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);

      setError("");

      const res = await api.get("/appointments");

      setAppointments(res.data);
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.message || "Unable to load appointments.");
    } finally {
      setLoading(false);
    }
  };

  useAutoRefresh(loadAppointments);

  /* FORMAT DATE */

  const formatDate = (date) => formatDateOnly(date);

  /* FORMAT TIME */

  const formatTime = (time) => {
    if (!time) return "-";

    const [hours, minutes] = time.split(":");

    const date = new Date();

    date.setHours(hours, minutes);

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  /* UPDATE STATUS */

  const updateStatus = async (appointmentId, status) => {
    const confirmMessage =
      status === "Approved"
        ? "Approve this appointment?"
        : status === "Cancelled"
          ? "Cancel this appointment?"
          : "Mark this appointment as completed?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await api.put(`/appointments/${appointmentId}/status`, {
        status,
      });

      await loadAppointments();
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Unable to update appointment.");
    }
  };

  /* CHECK IN APPOINTMENT */

  const checkInAppointment = async (appointmentId) => {
    if (
      !window.confirm("Check in this patient and add them to today's queue?")
    ) {
      return;
    }

    try {
      const response = await api.post(`/queue/appointment/${appointmentId}`);

      alert(response.data?.message || "Patient checked in successfully.");

      await loadAppointments();
    } catch (err) {
      console.error("Check-in error:", err);

      alert(err.response?.data?.message || "Unable to check in patient.");
    }
  };

  /* OPEN DETAILS */

  const openDetails = (appointment) => {
    setSelectedAppointment(appointment);

    setShowDetails(true);
  };

  /* OPEN RESCHEDULE */

  const openReschedule = (appointment) => {
    setSelectedAppointment(appointment);

    setNewDate(
      appointment.preferred_date
        ? appointment.preferred_date.split("T")[0]
        : "",
    );

    setNewTime(
      appointment.preferred_time ? appointment.preferred_time.slice(0, 5) : "",
    );

    setShowReschedule(true);
  };

  /* RESCHEDULE */

  const handleReschedule = async (e) => {
    e.preventDefault();

    if (!newDate || !newTime) {
      alert("Please select a date and time.");

      return;
    }

    try {
      await api.put(
        `/appointments/${selectedAppointment.id}/reschedule`,

        {
          preferred_date: newDate,

          preferred_time: newTime,
        },
      );

      alert("Appointment rescheduled successfully.");

      setShowReschedule(false);

      setSelectedAppointment(null);

      await loadAppointments();
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Unable to reschedule appointment.");
    }
  };

  /* STATUS BADGE */

  const getStatusClass = (status) => {
    switch (status) {
      case "Approved":
        return "approved";

      case "Completed":
        return "completed";

      case "Cancelled":
        return "cancelled";

      default:
        return "pending";
    }
  };

  return (
    <div className="appointment-page">
      {/* HEADER */}

      <div className="appointment-page-header">
        <div>
          <h1>Appointments</h1>

          <p>Review and manage patient appointment requests.</p>
        </div>

        <div className="appointment-count">
          <span>Total Appointments</span>

          <strong>{appointments.length}</strong>
        </div>
      </div>

      {/* ERROR */}

      {error && <div className="appointment-error">{error}</div>}

      {/* TABLE CARD */}

      <div className="appointment-table-card">
        {/* LOADING */}

        {loading ? (
          <div className="appointment-message">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="appointment-message">
            <FaCalendarAlt />

            <h3>No appointments</h3>

            <p>There are currently no appointment requests.</p>
          </div>
        ) : (
          <div className="appointment-table-wrapper">
            <table className="appointment-table">
              <thead>
                <tr>
                  <th>Patient</th>

                  <th>Schedule</th>

                  <th>Service</th>

                  <th>Status</th>

                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    {/* PATIENT */}

                    <td>
                      <div className="appointment-patient">
                        <div className="appointment-avatar">
                          <FaUser />
                        </div>

                        <div>
                          <strong>{appointment.fullname}</strong>

                          <span>
                            <FaEnvelope />

                            {appointment.email}
                          </span>

                          <span>
                            <FaPhone />

                            {appointment.phone}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* SCHEDULE */}

                    <td>
                      <div className="appointment-schedule">
                        <div>
                          <FaCalendarAlt />

                          <span>{formatDate(appointment.preferred_date)}</span>
                        </div>

                        <div>
                          <FaClock />

                          <span>{formatTime(appointment.preferred_time)}</span>
                        </div>
                      </div>
                    </td>

                    {/* SERVICE */}

                    <td>
                      <div className="appointment-service">
                        {appointment.service}
                      </div>

                      {appointment.reason && (
                        <span className="appointment-reason">
                          {appointment.reason}
                        </span>
                      )}
                    </td>

                    {/* STATUS */}

                    <td>
                      <span
                        className={`appointment-status ${getStatusClass(
                          appointment.status,
                        )}`}
                      >
                        <span className="status-dot"></span>

                        {appointment.status || "Pending"}
                      </span>
                    </td>

                    {/* ACTIONS */}

                    <td>
                      <div className="appointment-actions">
                        {/* VIEW */}

                        <button
                          className="action-view"
                          title="View Details"
                          onClick={() => openDetails(appointment)}
                        >
                          <FaEye />
                        </button>

                        {/* PENDING */}

                        {(!appointment.status ||
                          appointment.status === "Pending") && (
                          <>
                            <button
                              className="action-approve"
                              title="Approve"
                              onClick={() =>
                                updateStatus(appointment.id, "Approved")
                              }
                            >
                              <FaCheck />
                            </button>

                            <button
                              className="action-cancel"
                              title="Cancel"
                              onClick={() =>
                                updateStatus(appointment.id, "Cancelled")
                              }
                            >
                              <FaTimes />
                            </button>
                          </>
                        )}

                        {/* APPROVED */}

                        {(appointment.status === "Approved" ||
                          appointment.status === "Rescheduled") && (
                          <>
                            <button
                              className="action-check-in"
                              title="Check In Patient"
                              onClick={() => checkInAppointment(appointment.id)}
                            >
                              <FaUser />
                            </button>

                            <button
                              className="action-reschedule"
                              title="Reschedule"
                              onClick={() => openReschedule(appointment)}
                            >
                              <FaEdit />
                            </button>

                            <button
                              className="action-complete"
                              title="Mark Completed"
                              onClick={() =>
                                updateStatus(appointment.id, "Completed")
                              }
                            >
                              <FaCheck />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILS MODAL */}

      {showDetails && selectedAppointment && (
        <div className="appointment-modal-overlay">
          <div className="appointment-modal">
            <div className="modal-header">
              <div>
                <span>APPOINTMENT DETAILS</span>

                <h2>{selectedAppointment.fullname}</h2>
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="modal-close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-status-row">
              <span
                className={`appointment-status ${getStatusClass(
                  selectedAppointment.status,
                )}`}
              >
                <span className="status-dot"></span>

                {selectedAppointment.status || "Pending"}
              </span>
            </div>

            <div className="appointment-detail-grid">
              <div className="detail-item">
                <label>Email</label>

                <p>{selectedAppointment.email}</p>
              </div>

              <div className="detail-item">
                <label>Phone</label>

                <p>{selectedAppointment.phone}</p>
              </div>

              <div className="detail-item">
                <label>Preferred Date</label>

                <p>{formatDate(selectedAppointment.preferred_date)}</p>
              </div>

              <div className="detail-item">
                <label>Preferred Time</label>

                <p>{formatTime(selectedAppointment.preferred_time)}</p>
              </div>

              <div className="detail-item full">
                <label>Service</label>

                <p>{selectedAppointment.service}</p>
              </div>

              <div className="detail-item full">
                <label>Reason for Visit</label>

                <p>{selectedAppointment.reason || "No reason provided."}</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-secondary"
                onClick={() => setShowDetails(false)}
              >
                Close
              </button>

              {(!selectedAppointment.status ||
                selectedAppointment.status === "Pending") && (
                <button
                  className="modal-primary"
                  onClick={() => {
                    updateStatus(selectedAppointment.id, "Approved");

                    setShowDetails(false);
                  }}
                >
                  <FaCheck />
                  Approve Appointment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}

      {showReschedule && selectedAppointment && (
        <div className="appointment-modal-overlay">
          <div className="appointment-modal reschedule-modal">
            <div className="modal-header">
              <div>
                <span>RESCHEDULE APPOINTMENT</span>

                <h2>{selectedAppointment.fullname}</h2>
              </div>

              <button
                onClick={() => setShowReschedule(false)}
                className="modal-close"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleReschedule}>
              <div className="reschedule-form">
                <div>
                  <label>New Date</label>

                  <input
                    type="date"
                    value={newDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label>New Time</label>

                  <input
                    type="time"
                    value={newTime}
                    min="08:00"
                    max="18:00"
                    onChange={(e) => setNewTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-secondary"
                  onClick={() => setShowReschedule(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="modal-primary">
                  <FaEdit />
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentMngmt;
