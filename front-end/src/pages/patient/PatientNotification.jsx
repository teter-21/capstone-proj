import API_BASE_URL from "../../config/apiBase.js";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaBell,
  FaCheckCircle,
  FaCalendarAlt,
  FaTimesCircle,
  FaClock,
} from "react-icons/fa";

import "../../css/PatientNotification.css";

function PatientNotifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const notificationRef = useRef(null);

  /* GET NOTIFICATIONS */

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await axios.get(API_BASE_URL + "/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Notification error:", error);
    } finally {
      setLoading(false);
    }
  };

  /* LOAD ON START */

  useEffect(() => {
    fetchNotifications();

    const notificationInterval = setInterval(() => {
      fetchNotifications();
    }, 10000); // every 10 seconds

    return () => {
      clearInterval(notificationInterval);
    };
  }, []);

  useEffect(() => {
    const handleDataUpdated = () => fetchNotifications();
    window.addEventListener("clinic:data-updated", handleDataUpdated);
    return () =>
      window.removeEventListener("clinic:data-updated", handleDataUpdated);
  }, []);

  /* CLOSE WHEN CLICKING OUTSIDE */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* UNREAD COUNT */

  const unreadCount = notifications.filter(
    (notification) => Number(notification.is_read) === 0,
  ).length;

  /* MARK AS READ */

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API_BASE_URL}/notifications/${id}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                is_read: 1,
              }
            : notification,
        ),
      );
    } catch (error) {
      console.error("Mark notification error:", error);
    }
  };

  /* MARK ALL AS READ */

  const markAllAsRead = async () => {
    const unread = notifications.filter(
      (notification) => Number(notification.is_read) === 0,
    );

    for (const notification of unread) {
      await markAsRead(notification.id);
    }
  };

  /* NOTIFICATION ICON */

  const getNotificationIcon = (type) => {
    switch (type) {
      case "rescheduled":
        return <FaCalendarAlt />;

      case "approved":
        return <FaCheckCircle />;

      case "cancelled":
        return <FaTimesCircle />;

      case "completed":
        return <FaCheckCircle />;

      default:
        return <FaBell />;
    }
  };

  /* TIME FORMAT */

  const formatNotificationTime = (date) => {
    if (!date) return "";

    const notificationDate = new Date(date);

    const now = new Date();

    const difference = Math.floor((now - notificationDate) / 1000);

    if (difference < 60) {
      return "Just now";
    }

    if (difference < 3600) {
      const minutes = Math.floor(difference / 60);

      return `${minutes}m ago`;
    }

    if (difference < 86400) {
      const hours = Math.floor(difference / 3600);

      return `${hours}h ago`;
    }

    return notificationDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="patient-notification" ref={notificationRef}>
      {/* BELL */}

      <button
        className="patient-notification-button"
        onClick={() => {
          setOpen((previous) => !previous);

          if (!open) {
            fetchNotifications();
          }
        }}
        aria-label="Notifications"
      >
        <FaBell />

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN */}

      {open && (
        <div className="patient-notification-dropdown">
          <div className="notification-header">
            <div>
              <h3>Notifications</h3>

              <span>
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </span>
            </div>

            {unreadCount > 0 && (
              <button className="mark-all-button" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">
                <div className="notification-spinner"></div>

                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">
                  <FaBell />
                </div>

                <h4>No notifications</h4>

                <p>You're all caught up.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    Number(notification.is_read) === 0 ? "unread" : ""
                  }`}
                  onClick={async () => {
                    if (Number(notification.is_read) === 0) {
                      await markAsRead(notification.id);
                    }

                    setOpen(false);

                    navigate("/patient/appointments");
                  }}
                >
                  <div
                    className={`notification-type-icon ${notification.type || "general"}`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-content">
                    <div className="notification-title-row">
                      <h4>{notification.title}</h4>

                      {Number(notification.is_read) === 0 && (
                        <span className="unread-dot"></span>
                      )}
                    </div>

                    <p>{notification.message}</p>

                    <span className="notification-time">
                      <FaClock />

                      {formatNotificationTime(notification.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientNotifications;
