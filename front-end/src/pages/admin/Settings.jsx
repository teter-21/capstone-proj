import API_BASE_URL from "../../config/apiBase.js";
import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../css/Settings.css";

function Settings() {
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const response = await axios.get(API_BASE_URL + "/account", {
          headers,
        });
        setAccount(response.data);
        setForm((current) => ({
          ...current,
          fullname: response.data.fullname || "",
          email: response.data.email || "",
        }));
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load your account information.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, []);

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (form.newPassword && !form.currentPassword) {
      setError("Enter your current password before changing it.");
      return;
    }

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);

    try {
      const response = await axios.put(
        API_BASE_URL + "/account",
        {
          fullname: form.fullname,
          email: form.email,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        },
        { headers },
      );

      setMessage(response.data.message);
      setAccount((current) => ({
        ...current,
        fullname: form.fullname,
        email: form.email,
      }));
      setForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save your changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="account-message">Loading account information...</div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-header">
        <div>
          <h1>Settings</h1>
          <p>View your account information and manage your password.</p>
        </div>
      </div>

      {message && (
        <div className="account-alert account-success">{message}</div>
      )}
      {error && <div className="account-alert account-error">{error}</div>}

      <form className="account-form" onSubmit={handleSave}>
        <section className="account-card">
          <div className="account-profile-top">
            <div className="account-avatar">
              {account?.fullname?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <h2>{account?.fullname || "Administrator"}</h2>
              <p>{account?.email || "No email address"}</p>
              <span className="account-role">Administrator</span>
            </div>
          </div>

          <div className="account-section">
            <h3>Account Information</h3>
            <div className="account-grid">
              <label>
                Full Name
                <input
                  name="fullname"
                  value={form.fullname}
                  onChange={handleChange}
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
                  required
                />
              </label>

              <label>
                Account Type
                <input value="Administrator" disabled />
              </label>

              <label>
                Account ID
                <input value={account?.id || "—"} disabled />
              </label>
            </div>
          </div>

          <div className="account-section">
            <h3>Change Password</h3>
            <p className="account-help">
              Leave these fields empty if you only want to update your account
              information.
            </p>

            <div className="account-grid password-grid">
              <label>
                Current Password
                <input
                  type="password"
                  name="currentPassword"
                  value={form.currentPassword}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
              </label>

              <label>
                New Password
                <input
                  type="password"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  minLength="6"
                  autoComplete="new-password"
                />
              </label>

              <label>
                Confirm New Password
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  minLength="6"
                  autoComplete="new-password"
                />
              </label>
            </div>
          </div>

          <div className="account-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

export default Settings;
