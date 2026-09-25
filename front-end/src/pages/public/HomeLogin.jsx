import API_BASE_URL from "../../config/apiBase.js";
import React from "react";
import axios from "axios";
import "../../App.css";
import "../../css/HomeLogin.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import teethLogo from "../../assets/images/60x60modal-logo.png";

function HomeLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    console.log("LOGIN:", email, password);

    axios
      .post(`${API_BASE_URL}/login`, {
        email: email,
        password: password,
      })
      .then((res) => {
        localStorage.setItem("token", res.data.token);

        localStorage.setItem("role", res.data.role);

        localStorage.setItem(
          "is_main_admin",
          String(res.data.is_main_admin || 0),
        );

        if (res.data.role === "admin") {
          navigate("/Dashboard");
        } else if (res.data.role === "patient") {
          navigate("/patient/dashboard");
        } else {
          alert("Unknown user role.");
        }
      })
      .catch((err) => {
        alert("Invalid Email or Password");
        console.log(err);
      });
  };

  return (
    <div className="home-login">
      <div className="login-left">
        <div className="left-overlay">
          <button
            type="button"
            className="back-home-btn"
            onClick={() => navigate("/")}
          >
            Home
          </button>

          <div className="brand">
            <img src={teethLogo} alt="logo" />
            <h4>Magno Dental Clinic</h4>
          </div>

          <div className="left-main">
            <h1>
              Modern dental care <br />
              <span>tailored for you.</span>
            </h1>

            <p>
              Access your treatment history, records, and stay connected with
              your dental health team through our secure integrated platform.
            </p>
          </div>

          <div className="left-footer">
            <p>"Exceptional care for a lifetime of smiles."</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="login-right">
        <div className="login-card">
          <h2>Welcome</h2>
          <p>Sign in to access your portal</p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="name@example.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="login-btn">
              Sign In
            </button>

            <button
              type="button"
              className="forgot-password-link"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot Password?
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default HomeLogin;
