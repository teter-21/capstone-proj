import API_BASE_URL from "../config/apiBase.js";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { FaUser, FaCalendarAlt, FaChevronRight } from "react-icons/fa";
import { formatDateOnly } from "../utils/dateUtils";

import api from "../api";
import { useAutoRefresh } from "../utils/useAutoRefresh";

function PatientTable() {
  const [patients, setPatients] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* LOAD RECENT PATIENTS */

  useEffect(() => {
    loadRecentPatients();
  }, []);

  const loadRecentPatients = async () => {
    try {
      setLoading(true);

      setError("");

      const res = await api.get("/recent-patients");

      setPatients(res.data);
    } catch (err) {
      console.error("Recent patients error:", err);

      setError(
        err.response?.data?.message || "Unable to load recent patients.",
      );
    } finally {
      setLoading(false);
    }
  };

  useAutoRefresh(loadRecentPatients);

  /* FORMAT DATE */

  const formatDate = (date) => formatDateOnly(date);

  return (
    <div className="recent-patients">
      {/* TABLE */}

      <div className="recent-patient-table-wrapper">
        <table className="recent-patient-table">
          {/* TABLE HEADER */}

          <thead>
            <tr>
              <th>Patient</th>

              <th>Patient ID</th>

              <th>Age</th>

              <th>Last Visit</th>

              <th>Status</th>
            </tr>
          </thead>

          {/* TABLE BODY */}

          <tbody>
            {/* LOADING */}

            {loading && (
              <tr>
                <td colSpan="5" className="table-message">
                  Loading patients...
                </td>
              </tr>
            )}

            {/* ERROR */}

            {!loading && error && (
              <tr>
                <td colSpan="5" className="table-message error">
                  {error}
                </td>
              </tr>
            )}

            {/* NO PATIENTS */}

            {!loading && !error && patients.length === 0 && (
              <tr>
                <td colSpan="5" className="table-message">
                  No patients found.
                </td>
              </tr>
            )}

            {/* PATIENTS */}

            {!loading &&
              !error &&
              patients.map((patient) => (
                <tr key={patient.id}>
                  {/* PATIENT */}

                  <td>
                    <div className="patient-name-cell">
                      {/* IMAGE */}

                      {patient.image ? (
                        <img
                          src={`${API_BASE_URL}/uploads/${patient.image}`}
                          alt={patient.name}
                          className="patient-avatar-image"
                        />
                      ) : (
                        <div className="patient-avatar">
                          <FaUser />
                        </div>
                      )}

                      {/* NAME */}

                      <div>
                        <strong>{patient.name}</strong>

                        <span>Dental Patient</span>
                      </div>
                    </div>
                  </td>

                  {/* PATIENT ID */}

                  <td>
                    <span className="patient-id">
                      P{String(patient.id).padStart(3, "0")}
                    </span>
                  </td>

                  {/* AGE */}

                  <td>
                    <span className="patient-age">{patient.age} years old</span>
                  </td>

                  {/* LAST VISIT */}

                  <td>
                    <div className="last-visit">
                      <FaCalendarAlt />

                      <span>{formatDate(patient.last_visit)}</span>
                    </div>
                  </td>

                  {/* STATUS */}

                  <td>
                    <span
                      className={`patient-status ${(
                        patient.status || "Active"
                      ).toLowerCase()}`}
                    >
                      {patient.status || "Active"}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PatientTable;
