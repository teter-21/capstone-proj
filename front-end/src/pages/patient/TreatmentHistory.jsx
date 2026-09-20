import API_BASE_URL from "../../config/apiBase.js";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAutoRefresh } from "../../utils/useAutoRefresh";
import "../../css/TreatmentHistory.css";
import { FaTooth } from "react-icons/fa";

import { formatDateOnly } from "../../utils/dateUtils";
function TreatmentHistory() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchVisits = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(API_BASE_URL + "/patient/visits", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setVisits(response.data);
      setError("");
    } catch (err) {
      console.error("Treatment history error:", err);
      setError(
        err.response?.data?.message || "Unable to load treatment history.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  useAutoRefresh(fetchVisits);

  const formatDate = (date) => formatDateOnly(date);

  const formatTime = (time) => {
    if (!time) return "—";

    const parts = time.split(":");

    const date = new Date();

    date.setHours(parseInt(parts[0]), parseInt(parts[1]));

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount) => {
    return Number(amount || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="treatment-history-page">
      {/* HEADER */}

      <div className="treatment-history-header">
        <div>
          <h1>Treatment History</h1>

          <p className="page-description">
            View your previous dental visits, treatments, and payment records.
          </p>
        </div>

        <div className="treatment-header-icon">
          <FaTooth />
        </div>
      </div>

      {/* LOADING */}

      {loading && (
        <div className="treatment-message">
          <div className="treatment-spinner"></div>

          <p>Loading treatment history...</p>
        </div>
      )}

      {/* ERROR */}

      {!loading && error && (
        <div className="treatment-message error">
          <div className="treatment-error-icon">!</div>

          <p>{error}</p>
        </div>
      )}

      {/* EMPTY */}

      {!loading && !error && visits.length === 0 && (
        <div className="empty-treatment">
          <div className="empty-treatment-icon">
            <FaTooth />
          </div>

          <h2>No Treatment History</h2>

          <p>You don't have any recorded dental visits yet.</p>
        </div>
      )}

      {/* VISITS */}

      {!loading && !error && visits.length > 0 && (
        <div className="treatment-list">
          {visits.map((visit) => (
            <div className="treatment-card" key={visit.id}>
              {/* CARD HEADER */}

              <div className="treatment-card-header">
                <div>
                  <span className="treatment-label">DENTAL VISIT</span>

                  <h2>{visit.procedure_name || "Dental Treatment"}</h2>
                </div>

                <div className="treatment-date">
                  <strong>{formatDate(visit.visit_date)}</strong>

                  <span>{formatTime(visit.visit_time)}</span>
                </div>
              </div>

              {/* DETAILS */}

              <div className="treatment-details">
                <div className="treatment-detail">
                  <span>Complaint</span>

                  <strong>{visit.complain || "No complaint recorded"}</strong>
                </div>

                <div className="treatment-detail">
                  <span>Treatment Description</span>

                  <strong>
                    {visit.description || "No description recorded"}
                  </strong>
                </div>
              </div>

              {/* PAYMENT */}

              <div className="treatment-payment">
                <div>
                  <span>Amount Paid</span>

                  <strong>₱{formatAmount(visit.amount_paid)}</strong>
                </div>

                <div>
                  <span>Balance</span>

                  <strong
                    className={
                      Number(visit.balance) > 0 ? "has-balance" : "paid"
                    }
                  >
                    ₱{formatAmount(visit.balance)}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TreatmentHistory;
