import API_BASE_URL from "../../config/apiBase.js";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import teethLogo from "../../assets/images/60x60modal-logo.png";
import "../../App.css";
import "../../css/PasswordReset.css";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [valid, setValid] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setValid(false);
        setError("This reset link is invalid or missing.");
        return;
      }

      try {
        await axios.get(
          `${API_BASE_URL}/verify-reset-token?token=${encodeURIComponent(token)}`,
        );
        setValid(true);
      } catch (err) {
        setValid(false);
        setError(
          err.response?.data?.message ||
            "This reset link is invalid or has expired.",
        );
      }
    };

    verify();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(API_BASE_URL + "/reset-password", {
        token,
        newPassword: password,
      });
      setMessage(response.data.message);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset the password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-page">
      <div className="password-card">
        <button className="password-back" onClick={() => navigate("/login")}>
          Back to Login
        </button>

        <h1>Reset Password</h1>

        {valid === null ? (
          <p className="password-intro">Checking your reset link...</p>
        ) : valid ? (
          <>
            <p className="password-intro">
              Create a new password for your account.
            </p>
            <form onSubmit={handleSubmit}>
              <label>New Password</label>
              <input
                type="password"
                value={password}
                placeholder="At least 6 characters"
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                placeholder="Enter your password again"
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <button
                type="submit"
                className="password-submit"
                disabled={loading}
              >
                {loading ? "Saving..." : "Change Password"}
              </button>
            </form>
          </>
        ) : null}

        {message && <div className="password-success">{message}</div>}
        {error && <div className="password-error">{error}</div>}
      </div>
    </div>
  );
}

export default ResetPassword;
