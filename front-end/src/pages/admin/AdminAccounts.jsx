import API_BASE_URL from "../../config/apiBase.js";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAutoRefresh } from "../../utils/useAutoRefresh";
import { FaUserShield, FaPlus, FaUsers } from "react-icons/fa";
import "../../css/AdminAccounts.css";

const emptyForm = {
  fullname: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function AdminAccounts() {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const loadAdmins = async () => {
    try {
      const response = await axios.get(API_BASE_URL + "/admin-accounts", {
        headers,
      });
      setAdmins(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load admin accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  useAutoRefresh(loadAdmins);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
    setMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await axios.post(
        API_BASE_URL + "/admin-accounts",
        {
          fullname: form.fullname,
          email: form.email,
          password: form.password,
        },
        { headers },
      );

      setMessage(response.data.message);
      setForm(emptyForm);
      await loadAdmins();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to create admin account.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-accounts-page">
      <div className="admin-accounts-header">
        <div>
          <h1>Admin Accounts</h1>
          <p>Create and manage administrator accounts for the clinic.</p>
        </div>
      </div>

      {message && <div className="admin-accounts-alert success">{message}</div>}

      {error && <div className="admin-accounts-alert error">{error}</div>}

      <div className="admin-accounts-layout">
        <section className="admin-account-card create-card">
          <div className="card-title">
            <div className="title-icon">
              <FaUserShield />
            </div>
            <div>
              <h2>Create Admin Account</h2>
              <p>Add another administrator to the system.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="admin-account-form">
            <label>
              Full Name
              <input
                name="fullname"
                value={form.fullname}
                onChange={handleChange}
                placeholder="Enter full name"
                autoComplete="name"
                required
              />
            </label>

            <label>
              Email Address
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email address"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                minLength="6"
                required
              />
            </label>

            <label>
              Confirm Password
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                autoComplete="new-password"
                minLength="6"
                required
              />
            </label>

            <button type="submit" disabled={saving}>
              <FaPlus />
              {saving ? "Creating..." : "Create Admin"}
            </button>
          </form>
        </section>

        <section className="admin-account-card admin-list-card">
          <div className="card-title">
            <div className="title-icon">
              <FaUsers />
            </div>
            <div>
              <h2>Admin Accounts</h2>
              <p>Administrator accounts currently registered.</p>
            </div>
          </div>

          {loading ? (
            <div className="admin-list-message">Loading accounts...</div>
          ) : admins.length === 0 ? (
            <div className="admin-list-message">No admin accounts found.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-accounts-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td>{admin.fullname}</td>
                      <td>{admin.email}</td>
                      <td>
                        <span className="admin-role-badge">Administrator</span>
                      </td>
                      <td>
                        {admin.created_at
                          ? String(admin.created_at).slice(0, 10)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminAccounts;
