import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import AdminNotification from "./AdminNotification";
import api from "../api";

function Navbar() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);

  const loadPatients = async () => {
    try {
      const res = await api.get("/patients");
      setPatients(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Unable to load patients for navbar search:", error);
    }
  };

  useEffect(() => {
    loadPatients();

    const handleDataUpdate = () => loadPatients();
    const handleWindowFocus = () => loadPatients();

    window.addEventListener("clinic:data-updated", handleDataUpdate);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("clinic:data-updated", handleDataUpdate);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  const matchingPatients = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return [];

    return patients
      .filter((patient) =>
        String(patient.name || "")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 8);
  }, [patients, search]);

  const openPatientManagement = (value = search) => {
    const query = value.trim();
    if (!query) return;

    setShowResults(false);
    navigate(`/PatientMngmt?search=${encodeURIComponent(query)}`);
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setShowResults(true);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      openPatientManagement();
    }

    if (event.key === "Escape") {
      setShowResults(false);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-search-wrapper">
          <div className="navbar-search">
            <FaSearch className="navbar-search-icon" />

            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              onFocus={() => setShowResults(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search patient name..."
              aria-label="Search patient name"
            />

            <span className="search-shortcut">Search</span>
          </div>

          {showResults && search.trim() && (
            <div className="navbar-search-results">
              {matchingPatients.length > 0 ? (
                matchingPatients.map((patient) => (
                  <button
                    type="button"
                    className="navbar-search-result"
                    key={patient.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openPatientManagement(patient.name)}
                  >
                    <FaSearch className="navbar-result-icon" />
                    <span className="navbar-result-info">
                      <strong>{patient.name}</strong>
                      <small>Patient ID: {patient.id}</small>
                    </span>
                  </button>
                ))
              ) : (
                <div className="navbar-search-empty">
                  No patient found for “{search.trim()}”
                </div>
              )}

              <button
                type="button"
                className="navbar-search-all"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openPatientManagement()}
              >
                Search Patient Management
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="navbar-right">
        <AdminNotification />
      </div>
    </header>
  );
}

export default Navbar;
