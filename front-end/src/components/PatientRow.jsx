import API_BASE_URL from "../config/apiBase.js";
import React, { useState } from "react";
import AddVisitModal from "./AddVisitModal";
import ViewVisitModal from "./ViewVisitModal";
import EditPatientModal from "./EditPatientModal";
import CreateAccountModal from "./CreateAccountModal";
import DentalChartModal from "./DentalChartModal";

import "../css/PatientRow.css";

function PatientRow({ patient, onSaveVisit, onUpdatePatient, onImageClick }) {
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showDentalChart, setShowDentalChart] = useState(false);

  return (
    <div className="table-row">
      <span>{patient.id}</span>

      <span>
        <img
          src={`${API_BASE_URL}/uploads/${patient.image}`}
          width="80"
          className="avatar"
          onClick={() => onImageClick?.(patient.image)}
        />
      </span>

      <span className="name">{patient.name}</span>
      <span className="muted">{patient.address}</span>
      <span className="muted">{patient.phone}</span>
      <span>{patient.age}</span>
      <span>{patient.occupation}</span>

      <span>
        <span
          className={`status ${patient.status.toLowerCase().replace(" ", "-")}`}
        >
          {patient.status}
        </span>
      </span>

      <span className="complaint">{patient.complain}</span>

      {/* ACTION BUTTONS */}
      <span className="visit-actions">
        <button className="add-btn" onClick={() => setShowModal(true)}>
          Add
        </button>

        <button className="view-btn" onClick={() => setShowViewModal(true)}>
          View
        </button>

        <button
          className="dental-chart-btn"
          onClick={() => setShowDentalChart(true)}
        >
          Dental Chart
        </button>

        <button className="edit-btn" onClick={() => setShowEditModal(true)}>
          Update
        </button>

        <button
          className="create-account-btn"
          onClick={() => setShowCreateAccount(true)}
        >
          Create Account
        </button>
      </span>

      {/* MODALS */}
      {showViewModal && (
        <ViewVisitModal
          patient={patient}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {showModal && (
        <AddVisitModal
          patient={patient}
          onClose={() => setShowModal(false)}
          onSave={onSaveVisit}
        />
      )}

      {showEditModal && (
        <EditPatientModal
          patient={patient}
          onClose={() => setShowEditModal(false)}
          onSave={onUpdatePatient}
        />
      )}

      {showCreateAccount && (
        <CreateAccountModal
          patient={patient}
          onClose={() => setShowCreateAccount(false)}
        />
      )}

      {showDentalChart && (
        <DentalChartModal
          patient={patient}
          onClose={() => setShowDentalChart(false)}
        />
      )}
    </div>
  );
}

export default PatientRow;
