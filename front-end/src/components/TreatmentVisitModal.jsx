import API_BASE_URL from "../config/apiBase.js";
import React, { useEffect, useState } from "react";
import axios from "axios";
import "../css/TreatmentVisitModal.css";

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function TreatmentVisitModal({ patient, onClose, onCompleted }) {
  const [formData, setFormData] = useState({
    visit_date: getToday(),
    visit_time: getCurrentTime(),
    procedure_name: patient?.service || "",
    complain: patient?.reason || "",
    description: "",
    amount_paid: "",
    balance: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({
      visit_date: getToday(),
      visit_time: getCurrentTime(),
      procedure_name: patient?.service || "",
      complain: patient?.reason || "",
      description: "",
      amount_paid: "",
      balance: "",
    });
  }, [patient]);

  const procedures = [
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
    "Consultation",
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.visit_date ||
      !formData.visit_time ||
      !formData.procedure_name
    ) {
      alert("Please complete the date, time, and procedure.");
      return;
    }

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_BASE_URL}/queue/${patient.id}/complete-treatment`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      alert(response.data?.message || "Treatment completed and visit saved.");

      if (onCompleted) {
        await onCompleted();
      }

      onClose();
    } catch (error) {
      console.error("Complete treatment error:", error);

      alert(error.response?.data?.message || "Unable to complete treatment.");
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return null;
  }

  return (
    <div className="treatment-modal-overlay" onMouseDown={onClose}>
      <div
        className="treatment-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="treatment-modal-header">
          <div>
            <span className="treatment-modal-label">COMPLETE TREATMENT</span>

            <h2>Save Visit Record</h2>

            <p>
              Queue #{patient.queue_number}
              {" • "}
              {patient.patient_name}
            </p>
          </div>

          <button
            type="button"
            className="treatment-close"
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className="treatment-patient-summary">
          <div>
            <span>Patient</span>
            <strong>{patient.patient_name}</strong>
          </div>

          <div>
            <span>Queue Type</span>
            <strong>{patient.queue_type}</strong>
          </div>

          <div>
            <span>Service</span>
            <strong>{patient.service || "Dental Service"}</strong>
          </div>
        </div>

        <form className="treatment-form" onSubmit={handleSubmit}>
          <div className="treatment-form-row">
            <div className="treatment-form-group">
              <label>Visit Date</label>

              <input
                type="date"
                name="visit_date"
                value={formData.visit_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="treatment-form-group">
              <label>Visit Time</label>

              <input
                type="time"
                name="visit_time"
                value={formData.visit_time}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="treatment-form-group">
            <label>Procedure</label>

            <select
              name="procedure_name"
              value={formData.procedure_name}
              onChange={handleChange}
              required
            >
              <option value="">Select procedure</option>

              {procedures.map((procedure) => (
                <option key={procedure} value={procedure}>
                  {procedure}
                </option>
              ))}
            </select>
          </div>

          <div className="treatment-form-group">
            <label>Complaint</label>

            <input
              type="text"
              name="complain"
              value={formData.complain}
              onChange={handleChange}
              placeholder="Patient complaint"
            />
          </div>

          <div className="treatment-form-group">
            <label>Treatment / Description</label>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Record the treatment performed, findings, or dentist notes..."
              rows="4"
            />
          </div>

          <div className="treatment-form-row">
            <div className="treatment-form-group">
              <label>Amount Paid</label>

              <input
                type="number"
                min="0"
                step="0.01"
                name="amount_paid"
                value={formData.amount_paid}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>

            <div className="treatment-form-group">
              <label>Balance</label>

              <input
                type="number"
                min="0"
                step="0.01"
                name="balance"
                value={formData.balance}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="treatment-form-actions">
            <button
              type="button"
              className="treatment-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button type="submit" className="treatment-save" disabled={saving}>
              {saving ? "Saving..." : "Complete & Save Visit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TreatmentVisitModal;
