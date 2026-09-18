import API_BASE_URL from "../config/apiBase.js";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PatientRow from "./PatientRow";
import "../css/ViewVisitModal.css";
import "../css/addVisitModal.css";

function PatientColumn({ patients, onSaveVisit, onUpdatePatient }) {
  const [selectedImage, setSelectedImage] = useState(null);

  // Keep only one image preview open at a time and allow Escape to close it.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedImage(null);
      }
    };

    if (selectedImage) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage]);

  return (
    <div className="table">
      {/* TABLE HEADER */}
      <div className="table-header">
        <span>PID</span>
        <span>Patient Image</span>
        <span>Name</span>
        <span>Address</span>
        <span>Phone</span>
        <span>Age</span>
        <span>Occupation</span>
        <span>Status</span>
        <span>Complaint</span>
        <span>Actions</span>
      </div>

      {/* TABLE ROWS */}
      {Array.isArray(patients) && patients.length > 0 ? (
        patients.map((patient, index) => (
          <PatientRow
            key={index}
            patient={patient}
            onSaveVisit={onSaveVisit}
            onUpdatePatient={onUpdatePatient}
            onImageClick={setSelectedImage}
          />
        ))
      ) : (
        <div className="no-data">No patients found</div>
      )}

      {selectedImage &&
        createPortal(
          <div
            className="image-overlay"
            onClick={() => setSelectedImage(null)}
            role="presentation"
          >
            <div
              className="image-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="image-modal-close"
                onClick={() => setSelectedImage(null)}
                aria-label="Close image preview"
              >
                ×
              </button>
              <img
                src={`${API_BASE_URL}/uploads/${selectedImage}`}
                alt="Patient preview"
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default PatientColumn;
