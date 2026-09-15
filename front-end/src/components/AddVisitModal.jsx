import API_BASE_URL from "../config/apiBase.js";
import React, { useState } from "react";
import axios from "axios";
import "../css/addVisitModal.css";

function AddVisitModal({ patient, onClose, onSave }) {
  const [formData, setFormData] = useState({
    visit_date: "",
    visit_time: "",
    procedure_name: "",
    complain: "",
    description: "",
    amount_paid: "",
    balance: "",
  });

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
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        API_BASE_URL + "/add-visit",

        {
          patient_id: patient.id,

          ...formData,
        },

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log(res.data);

      alert("Visit added successfully!");

      if (onSave) {
        onSave();
      }

      onClose();
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Failed to save visit.");
    }
  };

  return (
    <div className="addv-modal-overlay">
      <div className="addv-modal">
        <h2>Add Visit</h2>

        {/* DATE & TIME */}
        <div className="form-row">
          <div>
            <label>Date</label>
            <input type="date" name="visit_date" onChange={handleChange} />
          </div>
          <div>
            <label>Time</label>
            <input type="time" name="visit_time" onChange={handleChange} />
          </div>
        </div>

        {/* PROCEDURE */}
        <label>Procedure</label>
        <select name="procedure_name" onChange={handleChange}>
          <option value="">Select Procedure</option>
          {procedures.map((proc, index) => (
            <option key={index} value={proc}>
              {proc}
            </option>
          ))}
        </select>

        {/* COMPLAINT */}
        <label>Complaint</label>
        <input
          type="text"
          name="complain"
          placeholder="Patient complaint"
          onChange={handleChange}
        />

        {/* DESCRIPTION */}
        <label>Description</label>
        <textarea
          name="description"
          placeholder="Treatment details..."
          onChange={handleChange}
        />

        {/* PAYMENT */}
        <div className="form-row">
          <div>
            <label>Amount Paid</label>
            <input type="number" name="amount_paid" onChange={handleChange} />
          </div>
          <div>
            <label>Balance</label>
            <input type="number" name="balance" onChange={handleChange} />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="modal-actions">
          <button className="save-btn" onClick={handleSubmit}>
            Save
          </button>
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddVisitModal;
