import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api";
import { useAutoRefresh } from "../../utils/useAutoRefresh";
import PatientColumn from "../../components/PatientColumn";
import { FaSearch } from "react-icons/fa";
import "../../css/PatientMngmt.css";

function PatientMngmt() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    loadPatients();
  }, []);

  // Apply searches coming from the admin navbar.
  useEffect(() => {
    const navbarSearch = searchParams.get("search") || "";
    setSearch(navbarSearch);
    setCurrentPage(1);
  }, [searchParams]);

  const loadPatients = async () => {
    try {
      const res = await api.get("/patients");

      setPatients(res.data);
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Unable to load patients.");
    }
  };

  useAutoRefresh(loadPatients);

  const handleUpdatePatient = async () => {
    await loadPatients();
  };

  /* SEARCH FILTER */
  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toString().includes(search),
  );

  /* PAGINATION CALCULATION */
  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirst, indexOfLast);

  const totalPages = Math.ceil(filteredPatients.length / recordsPerPage);

  /* PAGE CONTROLS */
  const goNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  /* Reset page when searching */
  const handleSearch = (value) => {
    setSearch(value);
    setCurrentPage(1);

    if (searchParams.get("search")) {
      setSearchParams(value ? { search: value } : {});
    }
  };

  return (
    <div className="patient-container">
      <div className="page-header">
        <h2>Patient Directory</h2>
        <p>Manage and view your clinic's patient records and history.</p>
      </div>

      <div className="patient-card">
        <div className="card-header">
          <h3>{filteredPatients.length} Patients Found</h3>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search for patients..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <FaSearch className="search-icon" />
          </div>
        </div>

        {/* PASS HERE */}
        <PatientColumn
          patients={currentPatients}
          onUpdatePatient={handleUpdatePatient}
        />

        {/* Table footer */}
        <div className="table-footer">
          <span>
            Showing {indexOfFirst + 1} to{" "}
            {Math.min(indexOfLast, filteredPatients.length)} of{" "}
            {filteredPatients.length} patients
          </span>

          <div className="pagination">
            <button onClick={goPrev} disabled={currentPage === 1}>
              Previous
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button onClick={goNext} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientMngmt;
