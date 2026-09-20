import API_BASE_URL from "../../config/apiBase.js";
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../css/BookPatientAppointment.css";
import { FaCalendarAlt } from "react-icons/fa";

function BookPatientAppointment() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    preferred_date: "",
    preferred_time: "",
    service: "",
    reason: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const services = [
    "Dental Check-up",
    "Teeth Cleaning",
    "Tooth Extraction",
    "Wisdom Tooth Removal",
    "Tooth Filling",
    "Root Canal Treatment",
    "Braces Adjustment",
    "Teeth Whitening",
    "Dental Crown",
    "Dental Bridge",
    "Dentures",
    "X-Ray",
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (
      !formData.preferred_date ||
      !formData.preferred_time ||
      !formData.service
    ) {
      setError("Please complete the required fields.");

      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await axios.post(
        API_BASE_URL + "/patient/appointment",

        formData,

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setMessage(
        response.data.message || "Appointment submitted successfully.",
      );

      setFormData({
        preferred_date: "",
        preferred_time: "",
        service: "",
        reason: "",
      });
    } catch (err) {
      console.error("Patient appointment error:", err);

      setError(
        err.response?.data?.message || "Unable to book your appointment.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="book-patient-page">
      <div className="book-patient-header">
        <div>
          <p className="page-label">PATIENT PORTAL</p>

          <h1>Book an Appointment</h1>

          <p>Schedule your next dental visit with Magno Dental Clinic.</p>
        </div>

        <div className="book-patient-icon">
          <FaCalendarAlt />
        </div>
      </div>

      <div className="book-patient-card">
        <div className="form-heading">
          <h2>Appointment Details</h2>

          <p>Please select your preferred schedule and service.</p>
        </div>

        {message && <div className="appointment-success">✓ {message}</div>}

        {error && <div className="appointment-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="patient-form-row">
            <div className="patient-form-group">
              <label>
                Preferred Date
                <span>*</span>
              </label>

              <input
                type="date"
                name="preferred_date"
                value={formData.preferred_date}
                min={new Date().toISOString().split("T")[0]}
                onChange={handleChange}
              />
            </div>

            <div className="patient-form-group">
              <label>
                Preferred Time
                <span>*</span>
              </label>

              <input
                type="time"
                name="preferred_time"
                value={formData.preferred_time}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="patient-form-group">
            <label>
              Dental Service
              <span>*</span>
            </label>

            <select
              name="service"
              value={formData.service}
              onChange={handleChange}
            >
              <option value="">Select a service</option>

              {services.map((service, index) => (
                <option key={index} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>

          <div className="patient-form-group">
            <label>Reason for Visit</label>

            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Tell us briefly why you would like to visit..."
              rows="5"
            />
          </div>

          <div className="patient-form-actions">
            <button
              type="button"
              className="patient-cancel-btn"
              onClick={() => navigate("/patient/appointments")}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="patient-book-btn"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Book Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BookPatientAppointment;
