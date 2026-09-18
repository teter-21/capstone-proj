import React, { useEffect, useMemo, useState } from "react";
import { FaDownload, FaFilter, FaSyncAlt } from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import api from "../../api";
import { useAutoRefresh } from "../../utils/useAutoRefresh";
import "../../css/Report.css";
import { formatDateOnly } from "../../utils/dateUtils";

const formatReportDate = (value) => formatDateOnly(value);

const COLORS = [
  "#4f86c6",
  "#5b9e8a",
  "#3d6f9f",
  "#6d9f95",
  "#789fc1",
  "#4a8877",
  "#8bb4d5",
  "#88b9aa",
];

const pad = (number) => String(number).padStart(2, "0");

const formatDate = (date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const getPresetRange = (preset) => {
  const today = new Date();
  const end = new Date(today);
  let start = new Date(today);

  if (preset === "week") {
    start.setDate(today.getDate() - 6);
  } else if (preset === "month") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (preset === "year") {
    start = new Date(today.getFullYear(), 0, 1);
  }

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
};

const currency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));

const dateDisplay = (value) => {
  return formatReportDate(value);
};

function Report() {
  const defaultRange = getPresetRange("month");

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [preset, setPreset] = useState("month");
  const [group, setGroup] = useState("month");
  const [procedure, setProcedure] = useState("");

  const [procedures, setProcedures] = useState([]);
  const [report, setReport] = useState({
    summary: {
      totalPatients: 0,
      totalVisits: 0,
      totalRevenue: 0,
      outstandingBalance: 0,
    },
    revenue: [],
    procedures: [],
    details: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProcedures = async () => {
    try {
      const response = await api.get("/report-procedures");
      setProcedures(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Report procedures error:", err);
    }
  };

  const loadReport = async () => {
    if (!startDate || !endDate) return;

    if (startDate > endDate) {
      setError("Start date cannot be later than end date.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get("/reports", {
        params: {
          start_date: startDate,
          end_date: endDate,
          group,
          procedure,
        },
      });

      setReport(response.data);
    } catch (err) {
      console.error("Reports error:", err);
      setError(
        err.response?.data?.message || "Unable to load the automatic report.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcedures();
  }, []);

  useEffect(() => {
    loadReport();
    /* Filters intentionally trigger a fresh database report. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, group, procedure]);

  useAutoRefresh(loadReport);

  const applyPreset = (value) => {
    setPreset(value);

    if (value === "custom") return;

    const range = getPresetRange(value);
    setStartDate(range.startDate);
    setEndDate(range.endDate);

    if (value === "week") {
      setGroup("day");
    } else if (value === "month") {
      setGroup("day");
    } else {
      setGroup("month");
    }
  };

  const exportReport = () => {
    const rows = report.details || [];

    const header = [
      "Date",
      "Time",
      "Patient",
      "Procedure",
      "Amount Paid",
      "Balance",
      "Complaint",
      "Description",
    ];

    const escapeCsv = (value) => {
      const text = String(value ?? "");
      return `"${text.replaceAll('"', '""')}"`;
    };

    const csv = [
      header.map(escapeCsv).join(","),
      ...rows.map((row) =>
        [
          row.visit_date,
          row.visit_time,
          row.patient,
          row.procedure_name,
          row.amount_paid,
          row.balance,
          row.complain,
          row.description,
        ]
          .map(escapeCsv)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `magno-dental-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const procedureTotal = useMemo(() => {
    return report.procedures.reduce(
      (total, item) => total + Number(item.value || 0),
      0,
    );
  }, [report.procedures]);

  return (
    <div className="reports">
      {/* HEADER */}
      <div className="reports-header">
        <div>
          <h1>Reports</h1>
          <p>
            Automatic clinic performance reports generated from your database.
          </p>
        </div>

        <div className="reports-header-actions">
          <button
            className="report-refresh-btn"
            onClick={loadReport}
            disabled={loading}
          >
            <FaSyncAlt className={loading ? "spin" : ""} />
            Refresh
          </button>

          <button
            className="export-btn"
            onClick={exportReport}
            disabled={!report.details?.length}
          >
            <FaDownload />
            Export CSV
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="reports-filters">
        <div className="report-filter-group">
          <label>Period</label>
          <select
            value={preset}
            onChange={(event) => applyPreset(event.target.value)}
          >
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        <div className="report-filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => {
              setPreset("custom");
              setStartDate(event.target.value);
            }}
          />
        </div>

        <div className="report-filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => {
              setPreset("custom");
              setEndDate(event.target.value);
            }}
          />
        </div>

        <div className="report-filter-group">
          <label>Procedures</label>
          <select
            value={procedure}
            onChange={(event) => setProcedure(event.target.value)}
          >
            <option value="">All Procedures</option>
            {procedures.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="report-filter-group">
          <label>Chart Grouping</label>
          <select
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          >
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
          </select>
        </div>

        <button
          className="filter-btn"
          onClick={loadReport}
          title="Apply filters"
        >
          <FaFilter />
          Apply
        </button>
      </div>

      {error && <div className="report-error">{error}</div>}

      {/* STATS */}
      <div className="reports-stats">
        <div className="reports-card blue">
          <h4>TOTAL PATIENTS</h4>
          <h2>
            {loading ? "—" : report.summary.totalPatients.toLocaleString()}
          </h2>
          <span>Registered in the system</span>
        </div>

        <div className="reports-card green">
          <h4>VISITS</h4>
          <h2>{loading ? "—" : report.summary.totalVisits.toLocaleString()}</h2>
          <span>Within selected period</span>
        </div>

        <div className="reports-card revenue">
          <h4>TOTAL REVENUE</h4>
          <h2>{loading ? "—" : currency(report.summary.totalRevenue)}</h2>
          <span>Payments recorded</span>
        </div>

        <div className="reports-card balance">
          <h4>OUTSTANDING BALANCE</h4>
          <h2>{loading ? "—" : currency(report.summary.outstandingBalance)}</h2>
          <span>Remaining patient balances</span>
        </div>
      </div>

      {/* CHARTS */}
      <div className="reports-charts">
        <div className="card report-chart-card">
          <div className="reports-card-heading">
            <div>
              <h3>Revenue Overview</h3>
              <p>
                {dateDisplay(startDate)} — {dateDisplay(endDate)}
              </p>
            </div>
          </div>

          {report.revenue.length === 0 ? (
            <div className="report-no-data">
              No revenue data for the selected period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={report.revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe6ed" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [currency(value), "Revenue"]} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#4f86c6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#4f86c6" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card report-chart-card">
          <div className="reports-card-heading">
            <div>
              <h3>Procedure Distribution</h3>
              <p>{procedureTotal} recorded visits</p>
            </div>
          </div>

          {report.procedures.length === 0 ? (
            <div className="report-no-data">
              No procedure data for the selected period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={report.procedures}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={88}
                  innerRadius={42}
                  paddingAngle={2}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {report.procedures.map((entry, index) => (
                    <Cell
                      key={`${entry.name}-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="card report-detail-card">
        <div className="reports-card-heading">
          <div>
            <h3>Detailed Report</h3>
            <p>Actual visit and payment records from the database.</p>
          </div>

          <span className="report-record-count">
            {report.details.length} records
          </span>
        </div>

        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Patient</th>
                <th>Procedure</th>
                <th>Amount Paid</th>
                <th>Balance</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="report-empty">
                    Loading report data...
                  </td>
                </tr>
              ) : report.details.length === 0 ? (
                <tr>
                  <td colSpan="6" className="report-empty">
                    No visit records found for the selected filters.
                  </td>
                </tr>
              ) : (
                report.details.map((row) => (
                  <tr key={row.id}>
                    <td>{dateDisplay(row.visit_date)}</td>
                    <td>{row.visit_time || "—"}</td>
                    <td className="patient-name-cell">{row.patient}</td>
                    <td>{row.procedure_name || "—"}</td>
                    <td className="amount-cell">{currency(row.amount_paid)}</td>
                    <td
                      className={
                        Number(row.balance) > 0 ? "balance-cell" : "amount-cell"
                      }
                    >
                      {currency(row.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Report;
