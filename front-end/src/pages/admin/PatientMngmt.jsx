import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api";
import { useAutoRefresh } from "../../utils/useAutoRefresh";
import PatientColumn from "../../components/PatientColumn";
import { FaSearch } from "react-icons/fa";
import "../../css/PatientMngmt.css";

function PatientMngmt() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("registration-newest");
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
      setPatients(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || "Unable to load patients.");
    }
  };

  useAutoRefresh(loadPatients);

  const handleUpdatePatient = async () => {
    await loadPatients();
  };

  /*
   * Search covers patient name, patient ID, and occupation.
   * Age is handled separately through the age-range filter.
   */
  const filteredAndSortedPatients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = patients.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const id = String(p.id ?? "").toLowerCase();
      const occupation = String(p.occupation || "").toLowerCase();
      const age = Number(p.age);

      const matchesSearch =
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        id.includes(normalizedSearch) ||
        occupation.includes(normalizedSearch);

      let matchesAge = true;

      if (ageFilter === "under-18") {
        matchesAge = Number.isFinite(age) && age < 18;
      } else if (ageFilter === "18-30") {
        matchesAge = Number.isFinite(age) && age >= 18 && age <= 30;
      } else if (ageFilter === "31-50") {
        matchesAge = Number.isFinite(age) && age >= 31 && age <= 50;
      } else if (ageFilter === "51-65") {
        matchesAge = Number.isFinite(age) && age >= 51 && age <= 65;
      } else if (ageFilter === "66-plus") {
        matchesAge = Number.isFinite(age) && age >= 66;
      }

      return matchesSearch && matchesAge;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "name-az" || sortBy === "name-za") {
        const comparison = String(a.name || "").localeCompare(
          String(b.name || ""),
          undefined,
          { sensitivity: "base" },
        );
        return sortBy === "name-az" ? comparison : -comparison;
      }

      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      return sortBy === "registration-oldest" ? dateA - dateB : dateB - dateA;
    });
  }, [patients, search, ageFilter, sortBy]);

  /* PAGINATION CALCULATION */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedPatients.length / recordsPerPage),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const indexOfLast = safeCurrentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentPatients = filteredAndSortedPatients.slice(
    indexOfFirst,
    indexOfLast,
  );

  /* PAGE CONTROLS */
  const goNext = () => {
    if (safeCurrentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const goPrev = () => {
    if (safeCurrentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  /* Reset page when searching/filtering/sorting */
  const handleSearch = (value) => {
    setSearch(value);
    setCurrentPage(1);

    if (searchParams.get("search")) {
      setSearchParams(value ? { search: value } : {});
    }
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
    filteredAndSortedPatients.length === 0 ? 0 : indexOfFirst + 1;
  const lastShown = Math.min(indexOfLast, filteredAndSortedPatients.length);

  return (
    <div className="patient-container">
      <div className="page-header">
        <h2>Patient Directory</h2>
        <p>Manage and view your clinic's patient records and history.</p>
      </div>

      <div className="patient-card">
        <div className="card-header patient-filter-header">
          <h3>{filteredAndSortedPatients.length} Patients Found</h3>

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
            {filteredAndSortedPatients.length} patients
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
