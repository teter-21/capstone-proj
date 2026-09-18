import React, { useEffect, useState } from "react";

import { FaTooth, FaChartBar } from "react-icons/fa";

import api from "../api";
import { useAutoRefresh } from "../utils/useAutoRefresh";

function TopProcedure() {
  const [procedures, setProcedures] = useState([]);

  const [loading, setLoading] = useState(true);

  /* LOAD PROCEDURES */

  useEffect(() => {
    loadProcedures();
  }, []);

  const loadProcedures = async () => {
    try {
      const res = await api.get("/dashboard-procedures");

      setProcedures(res.data || []);
    } catch (err) {
      console.error("Top procedures error:", err);
    } finally {
      setLoading(false);
    }
  };

  useAutoRefresh(loadProcedures);

  return (
    <div className="procedure-card top-procedure">
      {/* HEADER */}

      <div className="procedure-card-header">
        <div>
          <h3>Top Procedures</h3>

          <p className="sub-text">Most requested services this month</p>
        </div>

        <div className="procedure-icon">
          <FaChartBar />
        </div>
      </div>

      {/* LOADING */}

      {loading ? (
        <div className="procedure-message">Loading procedures...</div>
      ) : procedures.length === 0 ? (
        <div className="procedure-message">
          <FaTooth />

          <span>No procedures recorded this month.</span>
        </div>
      ) : (
        <div className="procedure-list">
          {procedures.map((item, index) => (
            <div key={index} className="progress-item">
              {/* LABEL */}

              <div className="progress-label">
                <span>{item.name}</span>

                <span>{item.count} visits</span>
              </div>

              {/* BAR */}

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${item.percent}%`,
                  }}
                ></div>
              </div>

              {/* PERCENT */}

              <div className="procedure-percentage">
                {item.percent}% of procedures
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TopProcedure;
