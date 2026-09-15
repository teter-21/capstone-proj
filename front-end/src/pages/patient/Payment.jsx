import API_BASE_URL from "../../config/apiBase.js";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAutoRefresh } from "../../utils/useAutoRefresh";
import "../../css/Payment.css";
import {
  FaMoneyBillWave,
  FaBalanceScale,
  FaCalendarAlt,
  FaExclamationCircle,
} from "react-icons/fa";

import { formatDateOnly } from "../../utils/dateUtils";
function Payments() {
  const [payments, setPayments] = useState([]);

  const [summary, setSummary] = useState({
    totalPaid: 0,
    totalBalance: 0,
    unpaidVisits: 0,
    totalVisits: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(API_BASE_URL + "/patient/payments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPayments(response.data.payments || []);
      setSummary(
        response.data.summary || {
          totalPaid: 0,
          totalBalance: 0,
          unpaidVisits: 0,
          totalVisits: 0,
        },
      );
      setError("");
    } catch (err) {
      console.error("Payment history error:", err);
      setError(
        err.response?.data?.message || "Unable to load payment history.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  useAutoRefresh(fetchPayments);

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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

  return (
    <div className="payments-page">
      {/* HEADER */}

      <div className="payments-header">
        <div>
          <h1>Payments</h1>

          <p className="page-description">
            View your payment records and outstanding balances.
          </p>
        </div>

        <div className="payments-header-icon">
          <FaMoneyBillWave />
        </div>
      </div>

      {/* LOADING */}

      {loading && (
        <div className="payments-message">
          <div className="payments-spinner"></div>

          <p>Loading payment information...</p>
        </div>
      )}

      {/* ERROR */}

      {!loading && error && (
        <div className="payments-message error">
          <div className="payments-error-icon">
            <FaExclamationCircle />
          </div>

          <p>{error}</p>
        </div>
      )}

      {/* CONTENT */}

      {!loading && !error && (
        <>
          {/* SUMMARY CARDS */}

          <div className="payment-summary">
            <div className="payment-summary-card">
              <div className="summary-icon paid-icon">
                <FaMoneyBillWave />
              </div>

              <div>
                <span>TOTAL PAID</span>

                <strong>₱{formatCurrency(summary.totalPaid)}</strong>
              </div>
            </div>

            <div className="payment-summary-card">
              <div className="summary-icon balance-icon">
                <FaBalanceScale />
              </div>

              <div>
                <span>OUTSTANDING BALANCE</span>

                <strong
                  className={
                    summary.totalBalance > 0 ? "balance-amount" : "paid-amount"
                  }
                >
                  ₱{formatCurrency(summary.totalBalance)}
                </strong>
              </div>
            </div>

            <div className="payment-summary-card">
              <div className="summary-icon visit-icon">
                <FaCalendarAlt />
              </div>

              <div>
                <span>TOTAL VISITS</span>

                <strong>{summary.totalVisits}</strong>
              </div>
            </div>

            <div className="payment-summary-card">
              <div className="summary-icon unpaid-icon">
                <FaExclamationCircle />
              </div>

              <div>
                <span>UNPAID VISITS</span>

                <strong>{summary.unpaidVisits}</strong>
              </div>
            </div>
          </div>

          {/* PAYMENT HISTORY */}

          <div className="payment-history-card">
            <div className="payment-history-header">
              <div>
                <h2>Payment History</h2>

                <p>Your recorded payments from dental visits.</p>
              </div>
            </div>

            {payments.length === 0 ? (
              <div className="empty-payments">
                <div className="empty-payment-icon">₱</div>

                <h3>No Payment Records</h3>

                <p>You don't have any recorded payments yet.</p>
              </div>
            ) : (
              <div className="payment-table-wrapper">
                <table className="payment-table">
                  <thead>
                    <tr>
                      <th>DATE</th>

                      <th>PROCEDURE</th>

                      <th>AMOUNT PAID</th>

                      <th>BALANCE</th>

                      <th>STATUS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map((payment) => {
                      const balance = Number(payment.balance || 0);

                      return (
                        <tr key={payment.id}>
                          <td>
                            <div className="payment-date">
                              <strong>{formatDate(payment.visit_date)}</strong>

                              <span>{formatTime(payment.visit_time)}</span>
                            </div>
                          </td>

                          <td>
                            <span className="procedure-name">
                              {payment.procedure_name || "Dental Treatment"}
                            </span>
                          </td>

                          <td>
                            <strong className="amount-paid">
                              ₱{formatCurrency(payment.amount_paid)}
                            </strong>
                          </td>

                          <td>
                            <strong
                              className={
                                balance > 0 ? "amount-balance" : "amount-zero"
                              }
                            >
                              ₱{formatCurrency(balance)}
                            </strong>
                          </td>

                          <td>
                            {balance > 0 ? (
                              <span className="payment-status pending">
                                Balance Due
                              </span>
                            ) : (
                              <span className="payment-status paid">Paid</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Payments;
