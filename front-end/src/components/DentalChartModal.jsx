import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api";
import { FaTimes, FaSave, FaTrash, FaTooth } from "react-icons/fa";
import "../css/DentalChartModal.css";

const CONDITIONS = [
  "Healthy",
  "Cavity",
  "Filled",
  "Missing",
  "Extracted",
  "Cracked",
  "Impacted",
  "Root Canal",
  "Crown",
  "Other",
];

/* FDI permanent adult teeth arranged like the paper odontogram reference */
const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48];

function toothType(tooth) {
  const number = Number(String(tooth).slice(-1));
  if (number <= 2) return "incisor";
  if (number === 3) return "canine";
  if (number <= 5) return "premolar";
  return "molar";
}

function ToothDrawing({ condition }) {
  const marked = condition && condition !== "Healthy";

  return (
    <svg
      className="tooth-drawing simple-tooth"
      viewBox="0 0 70 80"
      aria-hidden="true"
    >
      <path
        className="tooth-outline"
        d="M35 5 C25 5 17 9 14 18 C11 27 15 37 19 45 C22 51 23 58 24 66 C25 73 29 76 33 72 C36 68 36 56 35 49 C34 43 32 36 35 32 C38 36 36 43 35 49 C34 56 34 68 37 72 C41 76 45 73 46 66 C47 58 48 51 51 45 C55 37 59 27 56 18 C53 9 45 5 35 5 Z"
      />
      {marked && (
        <circle className="tooth-condition-mark" cx="35" cy="31" r="5" />
      )}
    </svg>
  );
}

function DentalChartModal({ patient, onClose }) {
  const [records, setRecords] = useState({});
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [condition, setCondition] = useState("Healthy");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const allTeeth = useMemo(() => [...UPPER, ...LOWER], []);

  useEffect(() => {
    loadChart();
  }, [patient.id]);

  const loadChart = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/dental-chart/${patient.id}`);
      const mapped = {};
      res.data.forEach((record) => {
        mapped[String(record.tooth_number)] = record;
      });
      setRecords(mapped);
    } catch (err) {
      console.error("Get dental chart error:", err);
      alert(err.response?.data?.message || "Unable to load dental chart.");
    } finally {
      setLoading(false);
    }
  };

  const selectTooth = (tooth) => {
    const record = records[String(tooth)];
    setSelectedTooth(tooth);
    setCondition(record?.condition_name || "Healthy");
    setNotes(record?.notes || "");
  };

  const saveTooth = async () => {
    if (!selectedTooth) return;
    try {
      setSaving(true);
      const res = await api.put(
        `/dental-chart/${patient.id}/${selectedTooth}`,
        {
          condition_name: condition,
          notes,
        },
      );
      setRecords((prev) => ({
        ...prev,
        [String(selectedTooth)]: res.data.tooth,
      }));
      alert(`Tooth #${selectedTooth} saved successfully.`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to save tooth condition.");
    } finally {
      setSaving(false);
    }
  };

  const clearTooth = async () => {
    if (!selectedTooth) return;
    if (!window.confirm(`Clear the record for tooth #${selectedTooth}?`))
      return;
    try {
      setSaving(true);
      await api.delete(`/dental-chart/${patient.id}/${selectedTooth}`);
      setRecords((prev) => {
        const next = { ...prev };
        delete next[String(selectedTooth)];
        return next;
      });
      setCondition("Healthy");
      setNotes("");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to clear tooth condition.");
    } finally {
      setSaving(false);
    }
  };

  const conditionClass = (tooth) => {
    const value = records[String(tooth)]?.condition_name || "Healthy";
    return value.toLowerCase().replace(/\s+/g, "-");
  };

  const renderTooth = (tooth) => {
    const record = records[String(tooth)];
    const value = record?.condition_name || "Healthy";
    return (
      <button
        key={tooth}
        type="button"
        className={`odontogram-tooth ${conditionClass(tooth)} ${selectedTooth === tooth ? "selected" : ""}`}
        onClick={() => selectTooth(tooth)}
        title={`Tooth #${tooth} — ${value}`}
        aria-label={`Tooth ${tooth}, ${value}`}
      >
        <span className="tooth-number">{tooth}</span>
        <ToothDrawing condition={value} />
      </button>
    );
  };

  const renderFourRows = () => {
    const quadrants = [
      {
        label: "upper right",
        teeth: UPPER.slice(0, 8),
        position: "upper-right",
      },
      { label: "upper left", teeth: UPPER.slice(8), position: "upper-left" },
      {
        label: "lower right",
        teeth: LOWER.slice(0, 8),
        position: "lower-right",
      },
      { label: "lower left", teeth: LOWER.slice(8), position: "lower-left" },
    ];

    return (
      <div className="reference-odontogram">
        <div className="quadrant-grid">
          {quadrants.map((quadrant) => (
            <section
              className={`tooth-quadrant ${quadrant.position}-quadrant`}
              key={quadrant.label}
            >
              <h3 className="quadrant-label">{quadrant.label}</h3>
              <div className="quadrant-teeth">
                {quadrant.teeth.map((tooth) => renderTooth(tooth))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  };

  const conditionCounts = CONDITIONS.reduce((acc, item) => {
    acc[item] = allTeeth.filter(
      (tooth) => records[String(tooth)]?.condition_name === item,
    ).length;
    return acc;
  }, {});

  return createPortal(
    <div className="dental-chart-overlay" onMouseDown={onClose}>
      <div
        className="dental-chart-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="dental-chart-header">
          <div>
            <div className="dental-chart-title-row">
              <FaTooth />
              <h2>Dental Chart</h2>
            </div>
            <p>
              {patient.name} · PID {patient.id}
            </p>
          </div>
          <button
            className="dental-chart-close"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="dental-chart-content">
          <section className="odontogram-panel">
            <div className="odontogram-section-title">
              <span>Permanent Dentition</span>
              <small>FDI / reference odontogram layout</small>
            </div>
            {loading ? (
              <div className="odontogram-loading">Loading dental chart...</div>
            ) : (
              <div className="odontogram-scroll">{renderFourRows()}</div>
            )}
            <div className="odontogram-legend">
              <span>
                <i className="legend-dot healthy" /> Healthy
              </span>
              <span>
                <i className="legend-dot cavity" /> Cavity
              </span>
              <span>
                <i className="legend-dot filled" /> Filled
              </span>
              <span>
                <i className="legend-dot missing" /> Missing
              </span>
              <span>
                <i className="legend-dot cracked" /> Cracked
              </span>
              <span>
                <i className="legend-dot other" /> Other
              </span>
            </div>
          </section>

          <aside className="tooth-editor">
            {selectedTooth ? (
              <>
                <div className="selected-tooth-heading">
                  <span>Selected tooth</span>
                  <strong>#{selectedTooth}</strong>
                </div>
                <label htmlFor="tooth-condition">Condition</label>
                <select
                  id="tooth-condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  {CONDITIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <label htmlFor="tooth-notes">Clinical notes</label>
                <textarea
                  id="tooth-notes"
                  rows="6"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add findings or treatment notes..."
                />
                <div className="tooth-editor-actions">
                  <button
                    className="save-tooth-btn"
                    onClick={saveTooth}
                    disabled={saving}
                  >
                    <FaSave /> {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="clear-tooth-btn"
                    onClick={clearTooth}
                    disabled={saving}
                  >
                    <FaTrash /> Clear
                  </button>
                </div>
              </>
            ) : (
              <div className="tooth-editor-empty">
                <FaTooth />
                <h3>Select a tooth</h3>
                <p>
                  Click any tooth number or drawing to record its condition.
                </p>
              </div>
            )}
          </aside>
        </div>

        <div className="dental-chart-summary">
          <strong>Chart Summary</strong>
          <span>{conditionCounts.Cavity || 0} Cavities</span>
          <span>{conditionCounts.Cracked || 0} Cracked</span>
          <span>{conditionCounts.Filled || 0} Filled</span>
          <span>{conditionCounts.Missing || 0} Missing</span>
          <span>{conditionCounts["Root Canal"] || 0} Root Canal</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default DentalChartModal;
