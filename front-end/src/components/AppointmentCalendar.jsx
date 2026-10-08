import React, { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaUser,
} from "react-icons/fa";
import api from "../api";
import { useAutoRefresh } from "../utils/useAutoRefresh";
import "../css/Dashboard.css";

const STATUS_CLASS = {
  Pending: "pending",
  Approved: "approved",
  Completed: "completed",
  Cancelled: "cancelled",
};

function AppointmentCalendar() {
  const today = new Date();
  const todayKey = toDateKey(today);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAppointments = async () => {
    try {
      setError("");
      const res = await api.get("/appointments", { params: {
        start_date: toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)),
        end_date: toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)),
      } });
      setAppointments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Appointment calendar error:", err);
      setError(err.response?.data?.message || "Unable to load appointments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  // Month changes intentionally reload the displayed range.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  useAutoRefresh(loadAppointments);

  const appointmentMap = useMemo(() => {
    const map = {};

    appointments.forEach((appointment) => {
      const key = getAppointmentDateKey(appointment.preferred_date);

      if (!key) return;

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(appointment);
    });

    Object.values(map).forEach((items) => {
      items.sort((a, b) =>
        String(a.preferred_time || "").localeCompare(
          String(b.preferred_time || ""),
        ),
      );
    });

    return map;
  }, [appointments]);

  const calendarDays = useMemo(
    () => buildCalendarDays(currentMonth),
    [currentMonth],
  );

  const selectedAppointments = appointmentMap[selectedDate] || [];

  const monthAppointmentCount = appointments.filter((appointment) => {
    const key = getAppointmentDateKey(appointment.preferred_date);
    if (!key) return false;

    const [year, month] = key.split("-").map(Number);

    return (
      year === currentMonth.getFullYear() &&
      month === currentMonth.getMonth() + 1
    );
  }).length;

  const changeMonth = (offset) => {
    setCurrentMonth(
      (previous) =>
        new Date(previous.getFullYear(), previous.getMonth() + offset, 1),
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(todayKey);
  };

  const selectDate = (dateKey) => {
    setSelectedDate(dateKey);
  };

  return (
    <div className="appointment-calendar-card">
      <div className="appointment-calendar-header">
        <div>
          <h3>Appointment Calendar</h3>
          <p className="sub-text">
            {monthAppointmentCount} appointment
            {monthAppointmentCount !== 1 ? "s" : ""} scheduled this month
          </p>
        </div>
      </div>

      <div className="calendar-toolbar">
        <div className="calendar-month-navigation">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            <FaChevronLeft />
          </button>

          <strong>
            {currentMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </strong>

          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
          >
            <FaChevronRight />
          </button>
        </div>

        <button
          type="button"
          className="calendar-today-btn"
          onClick={goToToday}
        >
          Today
        </button>
      </div>

      {error && <div className="calendar-error">{error}</div>}

      <div className="calendar-content">
        <div className="calendar-grid-wrapper">
          <div className="calendar-weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          {loading ? (
            <div className="calendar-message">Loading appointments...</div>
          ) : (
            <div className="calendar-grid">
              {calendarDays.map((day) => {
                const dateKey = toDateKey(day.date);
                const dayAppointments = appointmentMap[dateKey] || [];
                const isCurrentMonth =
                  day.date.getMonth() === currentMonth.getMonth();
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;

                return (
                  <button
                    type="button"
                    key={dateKey}
                    className={[
                      "calendar-day",
                      !isCurrentMonth ? "outside-month" : "",
                      isToday ? "today" : "",
                      isSelected ? "selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectDate(dateKey)}
                    aria-label={`${formatLongDate(day.date)}, ${dayAppointments.length} appointment${dayAppointments.length !== 1 ? "s" : ""}`}
                  >
                    <span className="calendar-day-number">
                      {day.date.getDate()}
                    </span>

                    {dayAppointments.length > 0 && (
                      <span className="calendar-day-count">
                        {dayAppointments.length}
                      </span>
                    )}

                    <span className="calendar-status-dots">
                      {getStatusTypes(dayAppointments).map((status) => (
                        <span
                          key={status}
                          className={`calendar-status-dot ${STATUS_CLASS[status] || "pending"}`}
                          title={status}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="calendar-details">
          <div className="calendar-details-header">
            <div>
              <span>Selected date</span>
              <h4>{formatSelectedDate(selectedDate)}</h4>
            </div>

            <strong>{selectedAppointments.length}</strong>
          </div>

          {selectedAppointments.length === 0 ? (
            <div className="calendar-empty">
              <FaCalendarAlt />
              <p>No appointments scheduled.</p>
            </div>
          ) : (
            <div className="calendar-appointments">
              {selectedAppointments.map((appointment) => {
                const statusClass =
                  STATUS_CLASS[appointment.status] || "pending";

                return (
                  <div className="calendar-appointment" key={appointment.id}>
                    <div className="calendar-appointment-time">
                      <FaClock />
                      {formatTime(appointment.preferred_time)}
                    </div>

                    <div className="calendar-appointment-info">
                      <strong>{appointment.fullname || "Patient"}</strong>
                      <span>{appointment.service || "Dental appointment"}</span>
                    </div>

                    <span className={`calendar-status ${statusClass}`}>
                      {appointment.status || "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {selectedAppointments.length > 0 && (
            <div className="calendar-details-footer">
              <FaUser />
              Click another date to view its appointments.
            </div>
          )}
        </div>
      </div>

      <div className="calendar-legend">
        <span>
          <i className="calendar-status-dot pending" /> Pending
        </span>
        <span>
          <i className="calendar-status-dot approved" /> Approved
        </span>
        <span>
          <i className="calendar-status-dot completed" /> Completed
        </span>
        <span>
          <i className="calendar-status-dot cancelled" /> Cancelled
        </span>
      </div>
    </div>
  );
}

function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();

  const days = [];

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - startOffset + 1;

    let date;

    if (dayNumber < 1) {
      date = new Date(year, month - 1, previousMonthDays + dayNumber);
    } else if (dayNumber > daysInMonth) {
      date = new Date(year, month + 1, dayNumber - daysInMonth);
    } else {
      date = new Date(year, month, dayNumber);
    }

    days.push({ date });
  }

  return days;
}

function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getAppointmentDateKey(value) {
  if (!value) return "";

  const valueString = String(value);
  const datePart = valueString.includes("T")
    ? valueString.split("T")[0]
    : valueString.slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return "";
  }

  return datePart;
}

function formatSelectedDate(dateKey) {
  if (!dateKey) return "Select a date";

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLongDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time) {
  if (!time) return "—";

  const [hours, minutes] = String(time).split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return "—";
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusTypes(dayAppointments) {
  const statusOrder = ["Pending", "Approved", "Completed", "Cancelled"];

  return statusOrder.filter((status) =>
    dayAppointments.some(
      (appointment) =>
        String(appointment.status || "Pending").toLowerCase() ===
        status.toLowerCase(),
    ),
  );
}

export default AppointmentCalendar;
