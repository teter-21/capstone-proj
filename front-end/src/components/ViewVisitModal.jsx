import { formatDateOnly } from "../utils/dateUtils";
import React, { useEffect, useState } from "react";
import api from "../api";
import "../css/ViewVisitModal.css";

function ViewVisitModal({ patient, onClose }) {
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    if (patient?.id) {
      loadVisits();
    }
  }, [patient]);

  const loadVisits = async () => {
    try {
      const res = await api.get(`/visits/${patient.id}`);

      setVisits(res.data);
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Unable to load visits.");
    }
  };

  return (
    <div className="viewv-modal-overlay">
      <div className="viewv-modal">
        {/* HEADER */}
        <div className="modal-header">
          <h2>Visit History</h2>
          <p>{patient?.name}</p>
        </div>

        {/* TABLE */}
        <div className="table-container">
          <table className="visit-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Time</th>
                <th>Procedure</th>
                <th>Complaint</th>
                <th>Description</th>
                <th>Paid</th>
                <th>Balance</th>
              </tr>
            </thead>

            <tbody>
              {visits.length > 0 ? (
                visits.map((v, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{formatDateOnly(v.visit_date)}</td>
                    <td>{v.visit_time}</td>
                    <td className="procedure">{v.procedure_name || "-"}</td>
                    <td>{v.complain || "-"}</td>
                    <td className="desc">{v.description || "-"}</td>
                    <td className="paid">₱{v.amount_paid || 0}</td>
                    <td className="balance">₱{v.balance || 0}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">
                    No visit history
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default ViewVisitModal;
