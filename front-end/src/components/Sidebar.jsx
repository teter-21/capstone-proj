import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  FaTachometerAlt,
  FaUserPlus,
  FaUsers,
  FaFileAlt,
  FaCog,
  FaSignOutAlt,
  FaCalendarAlt,
  FaHeartbeat,
  FaListOl,
  FaMoneyBillWave,
  FaUserShield,
  FaStar,
} from "react-icons/fa";

import adminPic from "../assets/images/dentist-pic.png";
import dentalLogo from "../assets/images/60x60modal-logo.png";
import api from "../api";

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadAccount = async () => {
      try {
        const response = await api.get("/account");
        if (mounted) setAccount(response.data);
      } catch (error) {
        console.error("Sidebar account error:", error);
      }
    };

    loadAccount();

    const handleDataUpdated = () => loadAccount();
    window.addEventListener("clinic:data-updated", handleDataUpdated);
    window.addEventListener("focus", loadAccount);

    return () => {
      mounted = false;
      window.removeEventListener("clinic:data-updated", handleDataUpdated);
      window.removeEventListener("focus", loadAccount);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("patient_id");
    localStorage.removeItem("is_main_admin");

    navigate("/login");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <aside className="sidebar">
      {/* LOGO */}

      <div className="sidebar-logo">
        <img
          src={dentalLogo}
          alt="Magno Dental Clinic"
          className="sidebar-logo-image"
        />

        <div className="sidebar-brand">
          <h2>Magno Dental</h2>

          <span>CLINIC MANAGEMENT</span>
        </div>
      </div>

      {/* MENU */}

      <div className="sidebar-section-title">MAIN MENU</div>

      <ul className="sidebar-menu">
        {/* Dashboard */}

        <li className={isActive("/Dashboard") ? "active" : ""}>
          <Link to="/Dashboard">
            <span className="menu-icon">
              <FaTachometerAlt />
            </span>

            <span>Dashboard</span>
          </Link>
        </li>

        {/* Add Patient */}

        <li className={isActive("/AddPatient") ? "active" : ""}>
          <Link to="/AddPatient">
            <span className="menu-icon">
              <FaUserPlus />
            </span>

            <span>Add Patient</span>
          </Link>
        </li>

        {/* Appointments */}

        <li className={isActive("/Appointments") ? "active" : ""}>
          <Link to="/Appointments">
            <span className="menu-icon">
              <FaCalendarAlt />
            </span>

            <span>Appointments</span>
          </Link>
        </li>

        {/* Queue */}

        <li className={location.pathname === "/Queue" ? "active" : ""}>
          <Link to="/Queue">
            <span className="menu-icon">
              <FaListOl />
            </span>

            <span>Queue</span>
          </Link>
        </li>

        {/* Patient Management */}

        <li className={isActive("/PatientMngmt") ? "active" : ""}>
          <Link to="/PatientMngmt">
            <span className="menu-icon">
              <FaUsers />
            </span>

            <span>Patients</span>
          </Link>
        </li>

        {/* Patient Reviews */}

        <li className={isActive("/Reviews") ? "active" : ""}>
          <Link to="/Reviews">
            <span className="menu-icon">
              <FaStar />
            </span>

            <span>Reviews</span>
          </Link>
        </li>

        {/* Reports */}

        <li className={isActive("/Report") ? "active" : ""}>
          <Link to="/Report">
            <span className="menu-icon">
              <FaFileAlt />
            </span>

            <span>Reports</span>
          </Link>
        </li>

        {/* Billing */}

        <li className={isActive("/Payment") ? "active" : ""}>
          <Link to="/Payment">
            <span className="menu-icon">
              <FaMoneyBillWave />
            </span>

            <span>Billing</span>
          </Link>
        </li>
      </ul>

      {/* SYSTEM */}

      <div className="sidebar-section-title system-title">SYSTEM</div>

      <ul className="sidebar-menu">
        {localStorage.getItem("is_main_admin") === "1" && (
          <li className={isActive("/AdminAccounts") ? "active" : ""}>
            <Link to="/AdminAccounts">
              <span className="menu-icon">
                <FaUserShield />
              </span>

              <span>Admin Accounts</span>
            </Link>
          </li>
        )}

        <li className={isActive("/Settings") ? "active" : ""}>
          <Link to="/Settings">
            <span className="menu-icon">
              <FaCog />
            </span>

            <span>Settings</span>
          </Link>
        </li>
      </ul>

      {/* ADMIN CARD */}

      <div className="sidebar-bottom">
        <div
          className="sidebar-admin-card"
          title={
            account?.fullname ||
            localStorage.getItem("fullname") ||
            "Administrator"
          }
        >
          <div className="admin-avatar">
            {(
              account?.fullname ||
              localStorage.getItem("fullname") ||
              "Administrator"
            )
              .trim()
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="admin-details">
            <h4>
              {account?.fullname ||
                localStorage.getItem("fullname") ||
                "Administrator"}
            </h4>

            <span>
              {account?.role === "admin"
                ? "Administrator"
                : account?.role || "Administrator"}
            </span>
          </div>
        </div>

        <button className="sidebar-logout" onClick={handleLogout}>
          <FaSignOutAlt />

          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
