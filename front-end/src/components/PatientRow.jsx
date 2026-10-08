import { patientImageUrl } from "../utils/patientImage.js";
import React, { useState } from "react";
{
  /* import AddVisitModal from "./AddVisitModal"; */
}
import ViewVisitModal from "./ViewVisitModal";
import EditPatientModal from "./EditPatientModal";
import CreateAccountModal from "./CreateAccountModal";
import DentalChartModal from "./DentalChartModal";
import { FaPlus, FaEye, FaEdit, FaTooth, FaUserPlus } from "react-icons/fa";

import "../css/PatientRow.css";

function PatientRow({ patient, onUpdatePatient, onImageClick }) {
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showDentalChart, setShowDentalChart] = useState(false);

  return (
    <div className="table-row">
      <span>{patient.id}</span>

      <span>
        <img
           src={patientImageUrl(patient.image)}
          width="80"
          className="avatar"
          alt={patient.name}
          onClick={() => onImageClick?.(patient.image)}
        />
      </span>

      <span className="name">{patient.name}</span>
      <span className="muted">{patient.address}</span>
      <span className="muted">{patient.phone}</span>
      <span>{patient.age}</span>
      <span>{patient.occupation}</span>

      <span>{patient.status || "—"}</span>

      <span className="complaint">{patient.complain}</span>

      {/* ACTION BUTTONS */}
      <span className="visit-actions">
        {/*  <button className="add-btn" onClick={() => setShowModal(true)}>
          <FaPlus />
        </button>
        commented
        */}

        <button className="view-btn" onClick={() => setShowViewModal(true)}>
          <FaEye />
        </button>

        <button
          className="dental-chart-btn"
          onClick={() => setShowDentalChart(true)}
        >
          <FaTooth />
        </button>

        <button className="edit-btn" onClick={() => setShowEditModal(true)}>
          <FaEdit />
        </button>

        <button
          className="create-account-btn"
          onClick={() => setShowCreateAccount(true)}
        >
          <FaUserPlus />
        </button>
      </span>

      {/* MODALS */}
      {showViewModal && (
        <ViewVisitModal
          patient={patient}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {/* 
      commented 
      {showModal && (
        <AddVisitModal
          patient={patient}
          onClose={() => setShowModal(false)}
          onSave={onSaveVisit}
        />
      )} 
      */}

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
