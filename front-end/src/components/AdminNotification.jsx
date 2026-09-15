import API_BASE_URL from "../config/apiBase.js";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaBell,
  FaCheckCircle,
  FaCalendarAlt,
  FaTimesCircle,
  FaClock,
  FaUserPlus,
  FaMoneyBillWave,
} from "react-icons/fa";
import "../css/AdminNotification.css";

function AdminNotification() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const notificationRef = useRef(null);

  /* Load admin notifications. */
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(API_BASE_URL + "/admin/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Admin notification error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleDataUpdated = () => fetchNotifications();
    window.addEventListener("clinic:data-updated", handleDataUpdated);
    return () =>
      window.removeEventListener("clinic:data-updated", handleDataUpdated);
  }, []);

  const unreadCount = notifications.filter(
    (item) => Number(item.is_read) === 0,
  ).length;

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/admin/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNotifications((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, is_read: 1 } : item,
        ),
      );
    } catch (error) {
      console.error("Mark admin notification error:", error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((item) => Number(item.is_read) === 0);
    for (const item of unread) {
      await markAsRead(item.id);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "new_appointment":
        return <FaUserPlus />;
      case "payment":
        return <FaMoneyBillWave />;
      case "approved":
        return <FaCheckCircle />;
      case "cancelled":
        return <FaTimesCircle />;
      case "rescheduled":
        return <FaCalendarAlt />;
      default:
        return <FaBell />;
    }
  };

  const formatTime = (date) => {
    if (!date) return "";
    const notificationDate = new Date(date);
    const difference = Math.floor((new Date() - notificationDate) / 1000);
    if (difference < 60) return "Just now";
    if (difference < 3600) return `${Math.floor(difference / 60)}m ago`;
    if (difference < 86400) return `${Math.floor(difference / 3600)}h ago`;
    return notificationDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="admin-notification" ref={notificationRef}>
      <button
        className="notification-btn"
        onClick={() => {
          setOpen((previous) => !previous);
          if (!open) fetchNotifications();
        }}
        aria-label="Notifications"
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="admin-notification-count">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="admin-notification-dropdown">
          <div className="admin-notification-header">
            <div>
              <h3>Notifications</h3>
              <span>
                {unreadCount ? `${unreadCount} unread` : "You're all caught up"}
              </span>
            </div>
            {unreadCount > 0 && (
              <button className="admin-mark-all" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="admin-notification-list">
            {loading ? (
              <div className="admin-notification-empty">
                <div className="admin-notification-spinner"></div>
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="admin-notification-empty">
                <div className="admin-notification-empty-icon">
                  <FaBell />
                </div>
                <h4>No notifications</h4>
                <p>You're all caught up.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`admin-notification-item ${Number(notification.is_read) === 0 ? "unread" : ""}`}
                  onClick={async () => {
                    if (Number(notification.is_read) === 0)
                      await markAsRead(notification.id);
                    setOpen(false);
                    if (notification.type === "new_appointment")
                      navigate("/Appointments");
                    if (notification.type === "payment") navigate("/Payment");
                  }}
                >
                  <div
                    className={`admin-notification-icon ${notification.type || "general"}`}
                  >
                    {getIcon(notification.type)}
                  </div>
                  <div className="admin-notification-content">
                    <div className="admin-notification-title">
                      <h4>{notification.title}</h4>
                      {Number(notification.is_read) === 0 && (
                        <span className="admin-unread-dot"></span>
                      )}
                    </div>
                    <p>{notification.message}</p>
                    <span className="admin-notification-time">
                      <FaClock /> {formatTime(notification.created_at)}
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

export default AdminNotification;
