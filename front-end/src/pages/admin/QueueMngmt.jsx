import API_BASE_URL from "../../config/apiBase.js";
import React, { useEffect, useState } from "react";

import axios from "axios";
import { useAutoRefresh } from "../../utils/useAutoRefresh";

import {
  FaUsers,
  FaWalking,
  FaCalendarCheck,
  FaPhone,
  FaPlay,
  FaCheck,
  FaForward,
  FaTimes,
  FaUserPlus,
  FaPlus,
} from "react-icons/fa";

import "../../css/QueueMngmt.css";
import TreatmentVisitModal from "../../components/TreatmentVisitModal";

function QueueManagement() {
  const [queue, setQueue] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showWalkInModal, setShowWalkInModal] = useState(false);

  const [patients, setPatients] = useState([]);

  const [patientsLoading, setPatientsLoading] = useState(false);

  const [walkInForm, setWalkInForm] = useState({
    patient_id: "",
    patient_name: "",
    service: "",
    reason: "",
    priority: "Normal",
  });

  const [walkInSubmitting, setWalkInSubmitting] = useState(false);

  const [callingNext, setCallingNext] = useState(false);

  const [showTreatmentModal, setShowTreatmentModal] = useState(false);

  const [treatmentPatient, setTreatmentPatient] = useState(null);

  /* GET TOKEN */

  const getToken = () => {
    return localStorage.getItem("token");
  };

  /* LOAD QUEUE */

  const fetchQueue = async () => {
    try {
      setLoading(true);

      setError("");

      const response = await axios.get(API_BASE_URL + "/queue", {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      setQueue(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Queue error:", err);

      setError("Unable to load today's queue.");
    } finally {
      setLoading(false);
    }
  };

  /* GET PATIENTS FOR WALK-IN */

  const fetchPatients = async () => {
    try {
      setPatientsLoading(true);

      const response = await axios.get(API_BASE_URL + "/patients", {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      setPatients(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Patients error:", err);

      alert("Unable to load patients.");
    } finally {
      setPatientsLoading(false);
    }
  };

  /* OPEN WALK-IN MODAL */

  const openWalkInModal = () => {
    setWalkInForm({
      patient_id: "",
      patient_name: "",
      service: "",
      reason: "",
      priority: "Normal",
    });

    setShowWalkInModal(true);

    fetchPatients();
  };

  /* HANDLE WALK-IN FORM */

  const handleWalkInChange = (event) => {
    const { name, value } = event.target;

    if (name === "patient_id") {
      const selectedPatient = patients.find(
        (patient) => String(patient.id) === String(value),
      );

      setWalkInForm((previous) => ({
        ...previous,
        patient_id: value,
        patient_name: selectedPatient ? selectedPatient.name : "",
      }));

      return;
    }

    setWalkInForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* ADD WALK-IN TO QUEUE */

  const addWalkIn = async (event) => {
    event.preventDefault();

    if (!walkInForm.patient_id) {
      alert("Please select a patient.");

      return;
    }

    if (!walkInForm.service) {
      alert("Please select a service.");

      return;
    }

    try {
      setWalkInSubmitting(true);

      const response = await axios.post(
        API_BASE_URL + "/queue/walk-in",
        {
          patient_id: walkInForm.patient_id,

          patient_name: walkInForm.patient_name,

          service: walkInForm.service,

          reason: walkInForm.reason,

          priority: walkInForm.priority,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      alert(response.data?.message || "Walk-in patient added to queue.");

      setShowWalkInModal(false);

      setWalkInForm({
        patient_id: "",
        patient_name: "",
        service: "",
        reason: "",
        priority: "Normal",
      });

      await fetchQueue();
    } catch (err) {
      console.error("Add walk-in error:", err);

      alert(err.response?.data?.message || "Unable to add walk-in patient.");
    } finally {
      setWalkInSubmitting(false);
    }
  };

  /* Keep the queue updated without manually reloading the page. */
  useAutoRefresh(fetchQueue);

  /* OPEN TREATMENT COMPLETION FORM */

  const openTreatmentModal = (patient) => {
    setTreatmentPatient(patient);

    setShowTreatmentModal(true);
  };

  /* CLOSE TREATMENT COMPLETION FORM */

  const closeTreatmentModal = () => {
    setShowTreatmentModal(false);

    setTreatmentPatient(null);
  };

  /* QUEUE ACTION */

  const queueAction = async (id, action) => {
    try {
      await axios.put(
        `${API_BASE_URL}/queue/${id}/${action}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      fetchQueue();
    } catch (err) {
      console.error(`Queue ${action} error:`, err);

      alert(err.response?.data?.message || "Unable to update queue.");
    }
  };

  /* CALL NEXT PATIENT */

  const callNextPatient = async () => {
    if (calledCount > 0 || treatmentCount > 0) {
      alert("A patient is already called or in treatment.");

      return;
    }

    try {
      setCallingNext(true);

      const response = await axios.post(
        API_BASE_URL + "/queue/call-next",
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      alert(response.data?.message || "Next patient called successfully.");

      await fetchQueue();
    } catch (err) {
      console.error("Call next error:", err);

      alert(err.response?.data?.message || "Unable to call the next patient.");
    } finally {
      setCallingNext(false);
    }
  };

  /* COUNTS */

  const waitingCount = queue.filter((item) => item.status === "Waiting").length;

  const calledCount = queue.filter((item) => item.status === "Called").length;

  const treatmentCount = queue.filter(
    (item) => item.status === "In Treatment",
  ).length;

  const completedCount = queue.filter(
    (item) => item.status === "Completed",
  ).length;

  /* STATUS CLASS */

  const statusClass = (status) => {
    return status.toLowerCase().replace(/\s+/g, "-");
  };

  return (
    <div className="queue-page">
      {/* HEADER */}

      <div className="queue-header">
        <div>
          <h1>Today's Queue</h1>

          <p className="queue-description">
            Manage appointments and walk-in patients.
          </p>
        </div>

        <div className="queue-header-actions">
          <button
            className="call-next-button"
            onClick={callNextPatient}
            disabled={
              callingNext ||
              calledCount > 0 ||
              treatmentCount > 0 ||
              waitingCount === 0
            }
          >
            <FaPhone />

            {callingNext ? "Calling..." : "Call Next"}
          </button>

          <button className="walk-in-button" onClick={openWalkInModal}>
            <FaUserPlus />
            Add Walk-in
          </button>
        </div>
      </div>

      {/* STATISTICS */}

      <div className="queue-stats">
        <div className="queue-stat-card">
          <div className="queue-stat-icon waiting">
            <FaUsers />
          </div>

          <div>
            <span>Waiting</span>

            <strong>{waitingCount}</strong>
          </div>
        </div>

        <div className="queue-stat-card">
          <div className="queue-stat-icon called">
            <FaPhone />
          </div>

          <div>
            <span>Called</span>

            <strong>{calledCount}</strong>
          </div>
        </div>

        <div className="queue-stat-card">
          <div className="queue-stat-icon treatment">
            <FaPlay />
          </div>

          <div>
            <span>In Treatment</span>

            <strong>{treatmentCount}</strong>
          </div>
        </div>

        <div className="queue-stat-card">
          <div className="queue-stat-icon completed">
            <FaCheck />
          </div>

          <div>
            <span>Completed</span>

            <strong>{completedCount}</strong>
          </div>
        </div>
      </div>

      {/* NOW SERVING */}

      {(calledCount > 0 || treatmentCount > 0) && (
        <div className="now-serving-card">
          <div className="now-serving-icon">
            <FaPhone />
          </div>

          <div className="now-serving-content">
            <span className="now-serving-label">NOW SERVING</span>

            {queue
              .filter(
                (item) =>
                  item.status === "Called" || item.status === "In Treatment",
              )
              .slice(0, 1)
              .map((item) => (
                <div className="now-serving-patient" key={item.id}>
                  <strong>#{item.queue_number}</strong>

                  <div>
                    <h2>{item.patient_name}</h2>

                    <p>
                      {item.queue_type}
                      {" • "}
                      {item.service || "Dental Service"}
                      {" • "}
                      {item.priority}
                    </p>
                  </div>
                </div>
              ))}
          </div>

          <div
            className={`now-serving-status ${
              treatmentCount > 0 ? "treatment" : "called"
            }`}
          >
            {treatmentCount > 0 ? "In Treatment" : "Called"}
          </div>
        </div>
      )}

      {/* QUEUE */}

      <div className="queue-container">
        <div className="queue-container-header">
          <div>
            <h2>Patient Queue</h2>

            <p>Today's clinic queue</p>
          </div>

          <button className="refresh-button" onClick={fetchQueue}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="queue-message">Loading queue...</div>
        ) : error ? (
          <div className="queue-message error">{error}</div>
        ) : queue.length === 0 ? (
          <div className="queue-empty">
            <div className="queue-empty-icon">
              <FaUsers />
            </div>

            <h3>No patients in queue</h3>

            <p>Check in an appointment or add a walk-in patient.</p>
          </div>
        ) : (
          <div className="queue-table-wrapper">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Queue</th>

                  <th>Patient</th>

                  <th>Type</th>

                  <th>Service</th>

                  <th>Priority</th>

                  <th>Status</th>

                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {queue.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="queue-number">#{item.queue_number}</div>
                    </td>

                    <td>
                      <div className="queue-patient">
                        <strong>{item.patient_name}</strong>

                        <small>{item.reason || "No reason provided"}</small>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`queue-type ${
                          item.queue_type === "Walk-in"
                            ? "walk-in"
                            : "appointment"
                        }`}
                      >
                        {item.queue_type === "Walk-in" ? (
                          <FaWalking />
                        ) : (
                          <FaCalendarCheck />
                        )}

                        {item.queue_type}
                      </span>
                    </td>

                    <td>{item.service || "—"}</td>

                    <td>
                      <span
                        className={`priority ${item.priority.toLowerCase()}`}
                      >
                        {item.priority}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`queue-status ${statusClass(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td>
                      <div className="queue-actions">
                        {item.status === "Waiting" && (
                          <>
                            <button
                              className="action-call"
                              title="Call patient"
                              onClick={() => queueAction(item.id, "call")}
                            >
                              <FaPhone />
                              Call
                            </button>

                            <button
                              className="action-skip"
                              title="Skip patient"
                              onClick={() => queueAction(item.id, "skip")}
                            >
                              <FaForward />
                            </button>
                          </>
                        )}

                        {item.status === "Called" && (
                          <button
                            className="action-start"
                            onClick={() => queueAction(item.id, "start")}
                          >
                            <FaPlay />
                            Start
                          </button>
                        )}

                        {item.status === "In Treatment" && (
                          <button
                            className="action-complete"
                            onClick={() => openTreatmentModal(item)}
                          >
                            <FaCheck />
                            Complete
                          </button>
                        )}

                        {(item.status === "Waiting" ||
                          item.status === "Called") && (
                          <button
                            className="action-cancel"
                            title="Cancel"
                            onClick={() => queueAction(item.id, "cancel")}
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TREATMENT / VISIT RECORD MODAL */}

      {showTreatmentModal && treatmentPatient && (
        <TreatmentVisitModal
          patient={treatmentPatient}
          onClose={closeTreatmentModal}
          onCompleted={async () => {
            await fetchQueue();
          }}
        />
      )}

      {/* WALK-IN MODAL */}

      {showWalkInModal && (
        <div
          className="walk-in-modal-overlay"
          onClick={() => setShowWalkInModal(false)}
        >
          <div
            className="walk-in-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="walk-in-modal-header">
              <div>
                <p className="walk-in-modal-label">CLINIC QUEUE</p>

                <h2>Add Walk-in Patient</h2>

                <p>Add a patient directly to today's queue.</p>
              </div>

              <button
                type="button"
                className="walk-in-close"
                onClick={() => setShowWalkInModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form className="walk-in-form" onSubmit={addWalkIn}>
              {/* PATIENT */}

              <div className="walk-in-form-group">
                <label>Patient</label>

                <select
                  name="patient_id"
                  value={walkInForm.patient_id}
                  onChange={handleWalkInChange}
                  disabled={patientsLoading}
                  required
                >
                  <option value="">
                    {patientsLoading ? "Loading patients..." : "Select patient"}
                  </option>

                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SERVICE */}

              <div className="walk-in-form-group">
                <label>Service</label>

                <select
                  name="service"
                  value={walkInForm.service}
                  onChange={handleWalkInChange}
                  required
                >
                  <option value="">Select service</option>

                  <option value="Dental Check-up">Dental Check-up</option>

                  <option value="Tooth Filling">Tooth Filling</option>

                  <option value="Tooth Extraction">Tooth Extraction</option>

                  <option value="Teeth Cleaning">Teeth Cleaning</option>

                  <option value="Consultation">Consultation</option>
                </select>
              </div>

              {/* REASON */}

              <div className="walk-in-form-group">
                <label>Reason for Visit</label>

                <textarea
                  name="reason"
                  value={walkInForm.reason}
                  onChange={handleWalkInChange}
                  placeholder="Enter reason for visit..."
                  rows="3"
                />
              </div>

              {/* PRIORITY */}

              <div className="walk-in-form-group">
                <label>Priority</label>

                <div className="priority-options">
                  <label className="priority-option">
                    <input
                      type="radio"
                      name="priority"
                      value="Normal"
                      checked={walkInForm.priority === "Normal"}
                      onChange={handleWalkInChange}
                    />

                    <span>Normal</span>
                  </label>

                  <label className="priority-option urgent">
                    <input
                      type="radio"
                      name="priority"
                      value="Urgent"
                      checked={walkInForm.priority === "Urgent"}
                      onChange={handleWalkInChange}
                    />

                    <span>Urgent</span>
                  </label>
                </div>
              </div>

              {/* ACTIONS */}

              <div className="walk-in-form-actions">
                <button
                  type="button"
                  className="walk-in-cancel"
                  onClick={() => setShowWalkInModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="walk-in-submit"
                  disabled={walkInSubmitting}
                >
                  {walkInSubmitting ? "Adding..." : "Add to Queue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default QueueManagement;
