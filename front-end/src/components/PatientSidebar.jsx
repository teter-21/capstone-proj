import API_BASE_URL from "../config/apiBase.js";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  FaTachometerAlt,
  FaCalendarAlt,
  FaFileMedical,
  FaUser,
  FaSignOutAlt,
  FaStar,
} from "react-icons/fa";

import dentalLogo from "../assets/images/60x60modal-logo.png";
import api from "../api";

function PatientSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const response = await api.get("/patient/profile");
        if (mounted) setProfile(response.data);
      } catch (error) {
        console.error("Patient sidebar profile error:", error);
      }
    };

    loadProfile();

    const handleDataUpdated = () => loadProfile();
    window.addEventListener("clinic:data-updated", handleDataUpdated);
    window.addEventListener("focus", loadProfile);

    return () => {
      mounted = false;
      window.removeEventListener("clinic:data-updated", handleDataUpdated);
      window.removeEventListener("focus", loadProfile);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    navigate("/login");
  };

  return (
    <aside className="patient-sidebar">
      {/* LOGO */}

      <div className="patient-sidebar-logo">
        <img src={dentalLogo} alt="Magno Dental" />

        <div>
          <h2>Magno Dental</h2>

          <span>PATIENT PORTAL</span>
        </div>
      </div>

      {/* MENU */}

      <div className="patient-menu">
        <p className="patient-menu-title">MAIN MENU</p>

        <Link
          to="/patient/dashboard"
          className={
            location.pathname === "/patient/dashboard"
              ? "patient-menu-item active"
              : "patient-menu-item"
          }
        >
          <FaTachometerAlt />

          <span>Dashboard</span>
        </Link>

        <Link
          to="/patient/treatments"
          className={
            location.pathname === "/patient/treatments"
              ? "patient-menu-item active"
              : "patient-menu-item"
          }
        >
          <FaFileMedical />

          <span>Treatment History</span>
        </Link>

        <Link
          to="/patient/review"
          className={
            location.pathname === "/patient/review"
              ? "patient-menu-item active"
              : "patient-menu-item"
          }
        >
          <FaStar />

          <span>Review Clinic</span>
        </Link>

        <Link
          to="/patient/profile"
          className={
            location.pathname === "/patient/profile"
              ? "patient-menu-item active"
              : "patient-menu-item"
          }
        >
          <FaUser />

          <span>My Profile</span>
        </Link>
      </div>

      {/* BOTTOM */}

      <div className="patient-sidebar-bottom">
        <div className="patient-user">
          <div className="patient-user-icon">
            {profile?.image ? (
              <img
                src={`${API_BASE_URL}/uploads/${profile.image}`}
                alt={profile.name || "Patient"}
                className="patient-sidebar-avatar"
              />
            ) : (
              <FaUser />
            )}
          </div>

          <div>
            <strong>{profile?.name || profile?.fullname || "Patient"}</strong>

            <span>
              {profile?.id ? `Patient ID: ${profile.id}` : "Patient Portal"}
            </span>
          </div>
        </div>

        <button className="patient-logout" onClick={handleLogout}>
          <FaSignOutAlt />

          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default PatientSidebar;
