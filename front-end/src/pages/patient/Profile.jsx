import API_BASE_URL from "../../config/apiBase.js";
import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../css/Settings.css";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState({
    email: "",
    address: "",
    phone: "",
    occupation: "",
    gender: "",
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

  const loadProfile = async () => {
    const [profileResponse, accountResponse] = await Promise.all([
      axios.get(API_BASE_URL + "/patient/profile", { headers }),
      axios.get(API_BASE_URL + "/account", { headers }),
    ]);

    setProfile(profileResponse.data);
    setAccount(accountResponse.data);
    setForm((current) => ({
      ...current,
      email: accountResponse.data.email || profileResponse.data.email || "",
      address: profileResponse.data.address || "",
      phone: profileResponse.data.phone || "",
      occupation: profileResponse.data.occupation || "",
      gender: profileResponse.data.gender || "",
    }));
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadProfile();
      } catch (err) {
        console.error("Profile error:", err);
        setError(err.response?.data?.message || "Unable to load your profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
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
      const accountResponse = await axios.put(
        API_BASE_URL + "/account",
        {
          fullname: account?.fullname || profile?.name || "Patient",
          email: form.email,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        },
        { headers },
      );

      await axios.put(
        API_BASE_URL + "/my-profile",
        {
          address: form.address,
          phone: form.phone,
          occupation: form.occupation,
          gender: form.gender,
        },
        { headers },
      );

      setMessage(
        accountResponse.data.message.includes("password")
          ? "Profile information and password updated successfully."
          : "Profile information updated successfully.",
      );

      await loadProfile();

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
      <div className="account-message">Loading profile information...</div>
    );
  }

  if (error && !profile) {
    return <div className="account-message account-error">{error}</div>;
  }

  return (
    <div className="account-page">
      <div className="account-header">
        <div>
          <h1>My Profile</h1>
          <p>View your information and manage your account password.</p>
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
              {(profile?.name || account?.fullname)?.charAt(0)?.toUpperCase() ||
                "P"}
            </div>
            <div>
              <h2>{profile?.name || account?.fullname || "Patient"}</h2>
              <p>{form.email || "No email address"}</p>
              <span className="account-role">Patient Account</span>
            </div>
          </div>

          <div className="account-section">
            <h3>Personal Information</h3>
            <div className="account-grid">
              <label>
                Full Name
                <input
                  value={profile?.name || account?.fullname || "—"}
                  disabled
                />
              </label>

              <label>
                Patient ID
                <input
                  value={profile?.id || account?.patient_id || "—"}
                  disabled
                />
              </label>

              <label>
                Age
                <input value={profile?.age || "—"} disabled />
              </label>

              <label>
                Gender
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>

              <label>
                Phone Number
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
              </label>

              <label>
                Occupation
                <input
                  name="occupation"
                  value={form.occupation}
                  onChange={handleChange}
                />
              </label>

              <label className="account-full-width">
                Address
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                />
              </label>
            </div>
          </div>

          <div className="account-section">
            <h3>Account Information</h3>
            <div className="account-grid">
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
                <input value="Patient" disabled />
              </label>

              <label>
                Status
                <input value={profile?.status || "Active"} disabled />
              </label>
            </div>
          </div>

          <div className="account-section">
            <h3>Change Password</h3>
            <p className="account-help">
              Leave these fields empty if you only want to update your profile
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

export default Profile;
