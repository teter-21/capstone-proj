import React, { useEffect, useMemo, useState } from "react";
import { FaMoneyBillWave, FaSearch, FaPlus, FaTimes } from "react-icons/fa";
import api from "../../api";
import { useAutoRefresh } from "../../utils/useAutoRefresh";
import "../../css/AdminPayment.css";

import { formatDateOnly } from "../../utils/dateUtils";
const money = (value) =>
  Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => formatDateOnly(value);

function AdminPayment() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalVisits: 0,
    totalPaid: 0,
    totalBalance: 0,
    paidVisits: 0,
    unpaidVisits: 0,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentVisit, setPaymentVisit] = useState(null);
  const [form, setForm] = useState({
    amount: "",
    payment_method: "Cash",
    reference_number: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const loadBilling = async () => {
    try {
      setLoading(true);
      setError("");
      const [recordsResponse, summaryResponse] = await Promise.all([
        api.get("/billing", { params: { search, status } }),
        api.get("/billing/summary"),
      ]);
      setRecords(
        Array.isArray(recordsResponse.data) ? recordsResponse.data : [],
      );
      setSummary(summaryResponse.data || {});
    } catch (err) {
      console.error("Billing load error:", err);
      setError(
        err.response?.data?.message || "Unable to load billing records.",
      );
    } finally {
      setLoading(false);
    }
  };

  useAutoRefresh(loadBilling);

  useEffect(() => {
    const timer = setTimeout(loadBilling, 250);
    return () => clearTimeout(timer);
  }, [search, status]);

  const visibleRecords = useMemo(() => records, [records]);

  const openPayment = (record) => {
    setPaymentVisit(record);
    setForm({
      amount: record.balance > 0 ? String(record.balance) : "",
      payment_method: "Cash",
      reference_number: "",
      notes: "",
    });
  };

  const closePayment = () => {
    if (saving) return;
    setPaymentVisit(null);
    setForm({ amount: "", payment_method: "Cash", notes: "" });
  };

  const referenceRequired = ["GCash", "Card", "Bank Transfer"].includes(
    form.payment_method,
  );

  const handlePayment = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);

    if (!paymentVisit || !Number.isFinite(amount) || amount <= 0) {
      alert("Enter a valid payment amount.");
      return;
    }

    if (amount > Number(paymentVisit.balance || 0)) {
      alert("Payment cannot exceed the remaining balance.");
      return;
    }

    if (referenceRequired && !form.reference_number.trim()) {
      alert(
        "Reference number is required for GCash, Card, or Bank Transfer payments.",
      );
      return;
    }

    try {
      setSaving(true);
      const response = await api.post("/billing/payments", {
        visit_id: paymentVisit.id,
        amount,
        payment_method: form.payment_method,
        reference_number: form.reference_number.trim() || null,
        notes: form.notes,
      });
      alert(response.data?.message || "Payment recorded successfully.");
      closePayment();
      await loadBilling();
    } catch (err) {
      console.error("Record payment error:", err);
      alert(err.response?.data?.message || "Unable to record payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-payment-page">
      <div className="admin-payment-header">
        <div>
          <h1>Billing & Payments</h1>
          <p>Manage visit charges, payments, and outstanding balances.</p>
        </div>
        <div className="admin-payment-icon">
          <FaMoneyBillWave />
        </div>
      </div>

      <div className="billing-summary-grid">
        <div className="billing-summary-card blue">
          <span>Total Recorded Visits</span>
          <strong>{summary.totalVisits}</strong>
        </div>
        <div className="billing-summary-card green">
          <span>Total Collected</span>
          <strong>₱{money(summary.totalPaid)}</strong>
        </div>
        <div className="billing-summary-card balance">
          <span>Outstanding Balance</span>
          <strong>₱{money(summary.totalBalance)}</strong>
        </div>
        <div className="billing-summary-card soft">
          <span>Paid Visits</span>
          <strong>{summary.paidVisits}</strong>
        </div>
      </div>

      <div className="billing-card">
        <div className="billing-toolbar">
          <div>
            <h2>Payment Records</h2>
            <p>Amounts are linked directly to completed visit records.</p>
          </div>
          <div className="billing-filters">
            <div className="billing-search">
              <FaSearch />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, procedure, or visit ID..."
              />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="balance">Balance Due</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {error && <div className="billing-error">{error}</div>}

        <div className="billing-table-wrap">
          <table className="billing-table">
            <thead>
              <tr>
                <th>VISIT</th>
                <th>DATE</th>
                <th>PATIENT</th>
                <th>PROCEDURE</th>
                <th>CHARGE</th>
                <th>PAID</th>
                <th>BALANCE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="billing-empty">
                    Loading billing records...
                  </td>
                </tr>
              ) : visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan="9" className="billing-empty">
                    No billing records found.
                  </td>
                </tr>
              ) : (
                visibleRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="visit-id">#{record.id}</td>
                    <td>{formatDate(record.visit_date)}</td>
                    <td className="patient-name">{record.patient_name}</td>
                    <td>{record.procedure_name || "Dental Treatment"}</td>
                    <td>₱{money(record.total_charge)}</td>
                    <td className="paid-cell">₱{money(record.amount_paid)}</td>
                    <td
                      className={
                        record.balance > 0 ? "balance-cell" : "zero-cell"
                      }
                    >
                      ₱{money(record.balance)}
                    </td>
                    <td>
                      <span
                        className={`billing-status ${record.payment_status.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {record.payment_status}
                      </span>
                    </td>
                    <td>
                      {record.balance > 0 ? (
                        <button
                          className="record-payment-btn"
                          onClick={() => openPayment(record)}
                        >
                          <FaPlus /> Record Payment
                        </button>
                      ) : (
                        <span className="paid-label">Fully Paid</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paymentVisit && (
        <div className="payment-modal-overlay" onMouseDown={closePayment}>
          <div
            className="payment-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="payment-modal-header">
              <div>
                <span>RECORD PAYMENT</span>
                <h2>Payment Details</h2>
              </div>
              <button type="button" onClick={closePayment} disabled={saving}>
                <FaTimes />
              </button>
            </div>

            <div className="payment-visit-summary">
              <div>
                <span>Patient</span>
                <strong>{paymentVisit.patient_name}</strong>
              </div>
              <div>
                <span>Visit</span>
                <strong>#{paymentVisit.id}</strong>
              </div>
              <div>
                <span>Balance Due</span>
                <strong>₱{money(paymentVisit.balance)}</strong>
              </div>
            </div>

            <form onSubmit={handlePayment}>
              <label>Payment Amount</label>
              <input
                type="number"
                min="0.01"
                max={paymentVisit.balance}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                required
              />

              <label>Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) =>
                  setForm({ ...form, payment_method: e.target.value })
                }
              >
                <option>Cash</option>
                <option>GCash</option>
                <option>Card</option>
                <option>Bank Transfer</option>
              </select>

              <label>
                Reference Number
                {referenceRequired && <span className="required-mark"> *</span>}
              </label>

              <input
                type="text"
                value={form.reference_number}
                onChange={(e) =>
                  setForm({ ...form, reference_number: e.target.value })
                }
                placeholder={
                  referenceRequired
                    ? "Enter transaction/reference number"
                    : "Optional"
                }
                required={referenceRequired}
              />

              <label>
                Notes <span>(optional)</span>
              </label>
              <textarea
                rows="3"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes..."
              />

              <div className="payment-modal-actions">
                <button
                  type="button"
                  className="payment-cancel-btn"
                  onClick={closePayment}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="payment-save-btn"
                  disabled={saving}
                >
                  <FaMoneyBillWave /> {saving ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPayment;
