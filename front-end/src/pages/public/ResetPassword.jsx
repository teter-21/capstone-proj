import API_BASE_URL from "../../config/apiBase.js";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../../App.css";
import "../../css/PasswordReset.css";
function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [valid, setValid] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setValid(false);
        window.alert("This reset link is invalid or missing.");
        return;
      }
      try {
        await axios.get(`${API_BASE_URL}/verify-reset-token?token=${encodeURIComponent(token)}`);
        setValid(true);
      } catch (err) {
        setValid(false);
        if (!err?.nativeAlertHandled) window.alert(err.response?.data?.message || "This reset link is invalid or has expired.");
      }
    };
    verify();
  }, [token]);
  const handleSubmit = async e => {
    e.preventDefault();
    if (password.length < 12) {
      window.alert("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      window.alert("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(API_BASE_URL + "/reset-password", {
        token,
        newPassword: password
      });
      if (!response.nativeAlertHandled) window.alert(response.data.message);
      navigate("/login");
    } catch (err) {
      if (!err?.nativeAlertHandled) window.alert(err.response?.data?.message || "Unable to reset the password.");
    } finally {
      setLoading(false);
    }
  };
  return <div className="password-page">
      <div className="password-card">
        <button className="password-back" onClick={() => navigate("/login")}>
          Back to Login
        </button>

        <h1>Reset Password</h1>

        {valid === null ? <p className="password-intro">Checking your reset link...</p> : valid ? <>
            <p className="password-intro">
              Create a new password for your account.
            </p>
            <form onSubmit={handleSubmit}>
              <label>New Password</label>
              <input type="password" value={password} placeholder="At least 12 characters" onChange={e => setPassword(e.target.value)} required />

              <label>Confirm Password</label>
              <input type="password" value={confirmPassword} placeholder="Enter your password again" onChange={e => setConfirmPassword(e.target.value)} required />

              <button type="submit" className="password-submit" disabled={loading}>
                {loading ? "Saving..." : "Change Password"}
              </button>
            </form>
          </> : null}

      </div>
    </div>;
}
export default ResetPassword;
