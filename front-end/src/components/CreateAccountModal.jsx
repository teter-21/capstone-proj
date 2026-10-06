import API_BASE_URL from "../config/apiBase.js";
import React, { useState } from "react";
import axios from "axios";
import "../css/CreateAccountModal.css";

function CreateAccountModal({ patient, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleCreateAccount = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        API_BASE_URL + "/create-account",
        {
          patient_id: patient.id,
          fullname: patient.name,
          email,
          password,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert(res.data.message);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Unable to create account.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>Create Patient Account</h2>

        <form onSubmit={handleCreateAccount}>
          <label>Patient Name</label>

          <input type="text" value={patient.name} readOnly />

          <label>Email</label>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Temporary Password</label>

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="modal-buttons">
            <button type="submit" className="save-btn">
              Create Account
            </button>

            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateAccountModal;
