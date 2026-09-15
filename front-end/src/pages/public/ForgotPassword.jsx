import API_BASE_URL from "../../config/apiBase.js";
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import teethLogo from "../../assets/images/60x60modal-logo.png";
import "../../App.css";
import "../../css/HomeLogin.css";
import "../../css/PasswordReset.css";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(API_BASE_URL + "/forgot-password", {
        email,
      });
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send the reset link.");
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

        <h1>Forgot Password?</h1>
        <p className="password-intro">
          Enter the email connected to your patient or admin account and we will
          send you a reset link.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Email Address</label>
          <input
            type="email"
            value={email}
            placeholder="name@example.com"
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" className="password-submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {message && <div className="password-success">{message}</div>}
        {error && <div className="password-error">{error}</div>}
      </div>
    </div>
  );
}

export default ForgotPassword;
