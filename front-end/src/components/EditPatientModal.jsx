import React, { useState } from "react";
import api from "../api";
import "../css/EditPatientModal.css";
import { buildFullName, splitFullName } from "../utils/nameFormatter";

function EditPatientModal({ patient, onClose, onSave }) {
  const patientName = splitFullName(patient.name);

  const [formData, setFormData] = useState({
    lastName: patientName.lastName,
    firstName: patientName.firstName,
    middleName: patientName.middleName,
    age: patient.age || "",
    occupation: patient.occupation || "",
    address: patient.address || "",
    phone: patient.phone || "",
    gender: patient.gender || "",
    status: patient.status || "Active",
    complain: patient.complain || "",
  });

  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fullname = buildFullName(
      formData.lastName,
      formData.firstName,
      formData.middleName,
    );

    if (!fullname.trim()) {
      alert("Please enter the patient's name.");
      return;
    }

    const data = new FormData();

    data.append("name", fullname);
    data.append("age", formData.age);
    data.append("occupation", formData.occupation);
    data.append("address", formData.address);
    data.append("phone", formData.phone);
    data.append("gender", formData.gender);
    data.append("status", formData.status);
    data.append("complain", formData.complain);

    if (image) {
      data.append("image", image);
    }

    try {
      setSaving(true);

      await api.put(`/update-patient/${patient.id}`, data);

      if (onSave) {
        await onSave();
      }

      onClose();
    } catch (err) {
      console.error("Update patient error:", err);
      alert(err.response?.data?.message || "Unable to update patient.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-modal-overlay" onMouseDown={onClose}>
      <form
        className="edit-modal"
        onSubmit={handleSubmit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="edit-modal-header">
          <div>
            <h2>Update Patient</h2>
            <p>Update the patient's personal and contact information.</p>
          </div>

          <button
            type="button"
            className="edit-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="edit-modal-body">
          <div className="edit-section-title">Personal Information</div>

          <div className="edit-name-grid">
            <div className="edit-field">
              <label>Last Name</label>
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>

            <div className="edit-field">
              <label>First Name</label>
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>

            <div className="edit-field">
              <label>Middle Name</label>
              <input
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="edit-two-column">
            <div className="edit-field">
              <label>Age</label>
              <input
                type="number"
                min="0"
                name="age"
                value={formData.age}
                onChange={handleChange}
              />
            </div>

            <div className="edit-field">
              <label>Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="edit-two-column">
            <div className="edit-field">
              <label>Phone Number</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="edit-field">
              <label>Occupation</label>
              <input
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="edit-field">
            <label>Address</label>
            <input
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="edit-section-title">Clinic Information</div>

          <div className="edit-two-column">
            <div className="edit-field">
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="edit-field">
              <label>Patient Image</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div className="edit-field">
            <label>Complaint</label>
            <textarea
              name="complain"
              rows="3"
              value={formData.complain}
              onChange={handleChange}
            />
          </div>

          {patient.image && !image && (
            <p className="edit-current-image">
              Current image: <strong>{patient.image}</strong>
            </p>
          )}
        </div>

        <div className="edit-modal-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditPatientModal;
