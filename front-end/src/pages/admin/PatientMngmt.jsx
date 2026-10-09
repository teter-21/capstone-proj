import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api";
import { useAutoRefresh } from "../../utils/useAutoRefresh";
import PatientColumn from "../../components/PatientColumn";
import { FaSearch } from "react-icons/fa";
import "../../css/PatientMngmt.css";

function PatientMngmt() {
  const [patients, setPatients] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, totalPages: 1 });
  const [ageFilter, setAgeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("registration-newest");
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const loadPatients = useCallback(async ({ background = false } = {}) => {
    try {
      const res = await api.get("/patients", { params: { page: currentPage, page_size: recordsPerPage,
        search, age: ageFilter, sort: sortBy } });
      setPatients(res.data.items || []);
      setPageInfo(res.data);
    } catch (error) { console.error(error); if (!background) window.alert(error.response?.data?.message || "Unable to load patients."); }
  }, [currentPage, recordsPerPage, search, ageFilter, sortBy]);
  useEffect(() => {
    const timer = setTimeout(loadPatients, 250);
    return () => clearTimeout(timer);
  }, [loadPatients]);
  useAutoRefresh(loadPatients);
  const handleUpdatePatient = () => loadPatients();
  const totalPages = pageInfo.totalPages;
  const safeCurrentPage = pageInfo.page;
  const indexOfFirst = (safeCurrentPage - 1) * recordsPerPage;
  const indexOfLast = indexOfFirst + patients.length;
  const currentPatients = patients;

  /* PAGE CONTROLS */
  const goNext = () => {
    if (safeCurrentPage < totalPages) {
      setCurrentPage(safeCurrentPage + 1);
    }
  };

  const goPrev = () => {
    if (safeCurrentPage > 1) {
      setCurrentPage(safeCurrentPage - 1);
    }
  };

  /* Reset page when searching/filtering/sorting */
  const handleSearch = (value) => {
    setSearchParams(value ? { search: value } : {}, { replace: true });
    setCurrentPage(1);
  };
  const handleAgeFilter = (value) => {
    setAgeFilter(value);
    setCurrentPage(1);
  };

  const handleSort = (value) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const firstShown =
    pageInfo.total === 0 ? 0 : indexOfFirst + 1;
  const lastShown = Math.min(indexOfLast, pageInfo.total);

  return (
    <div className="patient-container">
      <div className="page-header">
        <h2>Patient Directory</h2>
        <p>Manage and view your clinic's patient records and history.</p>
      </div>

      <div className="patient-card">
        <div className="card-header patient-filter-header">
          <h3>{pageInfo.total} Patients Found</h3>

          <div className="patient-filter-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search name, ID, or occupation..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                aria-label="Search patients by name, ID, or occupation"
              />
              <FaSearch className="search-icon" />
            </div>

            <select
              className="patient-filter-select"
              value={ageFilter}
              onChange={(e) => handleAgeFilter(e.target.value)}
              aria-label="Filter patients by age"
            >
              <option value="all">All Ages</option>
              <option value="under-18">Under 18</option>
              <option value="18-30">18–30</option>
              <option value="31-50">31–50</option>
              <option value="51-65">51–65</option>
              <option value="66-plus">66+</option>
            </select>

            <select
              className="patient-filter-select"
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
              aria-label="Sort patients"
            >
              <option value="name-az">Name A–Z</option>
              <option value="name-za">Name Z–A</option>
              <option value="registration-newest">Registration: Newest</option>
              <option value="registration-oldest">Registration: Oldest</option>
            </select>
          </div>
        </div>

        <PatientColumn
          patients={currentPatients}
          onUpdatePatient={handleUpdatePatient}
        />

        {/* Table footer */}
        <div className="table-footer">
          <span>
            Showing {firstShown} to {lastShown} of{" "}
            {pageInfo.total} patients
          </span>

          <div className="pagination">
            <button onClick={goPrev} disabled={safeCurrentPage === 1}>
              Previous
            </button>

            <span>
              Page {safeCurrentPage} of {totalPages}
            </span>

            <button onClick={goNext} disabled={safeCurrentPage === totalPages}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientMngmt;
