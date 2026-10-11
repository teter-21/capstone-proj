import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaUserShield, FaPlus, FaUsers, FaTrash } from "react-icons/fa";

import API_BASE_URL from "../config/apiBase.js";
import { getAccessToken } from "../utils/session.js";
import { useAutoRefresh } from "../utils/useAutoRefresh";
import "../css/AdminAccounts.css";

const emptyForm = {
  fullname: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function AdminAccountsSection() {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const token = getAccessToken();

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const loadAdmins = useCallback(
    async ({ background = false } = {}) => {
      try {
        const response = await axios.get(`${API_BASE_URL}/admin-accounts`, {
          headers,
        });

        setAdmins(response.data);
      } catch (error) {
        if (!background && !error.nativeAlertHandled) {
          window.alert(
            error.response?.data?.message || "Unable to load admin accounts.",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [headers],
  );

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  useAutoRefresh(loadAdmins);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (form.password !== form.confirmPassword) {
      window.alert("The passwords do not match.");
      return;
    }

    if (form.password.length < 12) {
      window.alert("Password must be at least 12 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin-accounts`,
        {
          fullname: form.fullname,
          email: form.email,
          password: form.password,
        },
        { headers },
      );

      if (!response.nativeAlertHandled) {
        window.alert(
          response.data.message || "Admin account created successfully.",
        );
      }

      setForm(emptyForm);
      await loadAdmins({ background: true });
    } catch (error) {
      if (!error.nativeAlertHandled) {
        window.alert(
          error.response?.data?.message || "Unable to create admin account.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin) => {
    if (deletingId !== null) return;

    if (Number(admin.is_main_admin) === 1) {
      window.alert("The main admin account cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      `Delete the staff account for ${admin.fullname} (${admin.email})?\n\n` +
        "They will lose access to the system. This action cannot be undone.",
    );

    if (!confirmed) return;

    setDeletingId(admin.id);

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/admin-accounts/${admin.id}`,
        { headers },
      );

      if (!response.nativeAlertHandled) {
        window.alert(
          response.data.message || "Staff account deleted successfully.",
        );
      }

      setAdmins((current) =>
        current.filter((account) => account.id !== admin.id),
      );

      await loadAdmins({ background: true });
    } catch (error) {
      if (!error.nativeAlertHandled) {
        window.alert(
          error.response?.data?.message ||
            "Unable to delete the staff account.",
        );
      }
    } finally {
      setDeletingId(null);
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
                placeholder="At least 12 characters"
                autoComplete="new-password"
                minLength={12}
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
                minLength={12}
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
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {admins.map((admin) => {
                    const isMainAdmin = Number(admin.is_main_admin) === 1;

                    return (
                      <tr key={admin.id}>
                        <td>{admin.fullname}</td>
                        <td>{admin.email}</td>
                        <td>
                          <span className="admin-role-badge">
                            {isMainAdmin ? "Main Admin" : "Staff Admin"}
                          </span>
                        </td>
                        <td>
                          {admin.created_at
                            ? String(admin.created_at).slice(0, 10)
                            : "—"}
                        </td>
                        <td>
                          {isMainAdmin ? (
                            <span className="admin-protected-label">
                              Protected
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="admin-delete-button"
                              onClick={() => handleDelete(admin)}
                              disabled={deletingId !== null}
                              aria-label={`Delete account for ${admin.fullname}`}
                            >
                              <FaTrash />
                              {deletingId === admin.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminAccountsSection;
