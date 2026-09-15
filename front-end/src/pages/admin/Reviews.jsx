import React, { useEffect, useState } from "react";
import { FaCheck, FaEyeSlash, FaStar, FaTrash } from "react-icons/fa";
import api from "../../api";
import { useAutoRefresh } from "../../utils/useAutoRefresh";
import "../../css/Reviews.css";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function Rating({ value }) {
  return (
    <div className="admin-review-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar
          key={star}
          className={star <= Number(value) ? "filled" : "empty"}
        />
      ))}
    </div>
  );
}

function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReviews = async () => {
    try {
      setError("");
      const response = await api.get("/admin/reviews");
      setReviews(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  useAutoRefresh(loadReviews);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/admin/reviews/${id}/status`, { status });
      await loadReviews();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update the review.");
    }
  };

  const deleteReview = async (id) => {
    if (!window.confirm("Delete this review permanently?")) return;

    try {
      await api.delete(`/admin/reviews/${id}`);
      await loadReviews();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete the review.");
    }
  };

  const pendingCount = reviews.filter(
    (review) => review.status === "pending",
  ).length;

  return (
    <div className="reviews-admin-page">
      <div className="reviews-admin-header">
        <div>
          <h1>Patient Reviews</h1>
          <p>
            Review, approve, hide, or remove patient feedback displayed on the
            homepage.
          </p>
        </div>
        <div className="reviews-admin-summary">
          <strong>{pendingCount}</strong>
          <span>Pending</span>
        </div>
      </div>

      {error && <div className="reviews-admin-alert">{error}</div>}

      {loading ? (
        <div className="reviews-admin-empty">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="reviews-admin-empty">
          <FaStar />
          <h3>No patient reviews yet</h3>
          <p>Submitted patient feedback will appear here.</p>
        </div>
      ) : (
        <div className="reviews-admin-list">
          {reviews.map((review) => (
            <article className="admin-review-card" key={review.id}>
              <div className="admin-review-top">
                <div>
                  <h3>{review.name}</h3>
                  <span>{formatDate(review.created_at)}</span>
                </div>
                <span className={`review-status-badge ${review.status}`}>
                  {review.status}
                </span>
              </div>

              <Rating value={review.rating} />
              <p className="admin-review-comment">{review.comment}</p>

              <div className="admin-review-actions">
                {review.status !== "approved" && (
                  <button
                    className="review-action approve"
                    onClick={() => updateStatus(review.id, "approved")}
                  >
                    <FaCheck /> Approve
                  </button>
                )}
                {review.status !== "hidden" && (
                  <button
                    className="review-action hide"
                    onClick={() => updateStatus(review.id, "hidden")}
                  >
                    <FaEyeSlash /> Hide
                  </button>
                )}
                {review.status !== "pending" && (
                  <button
                    className="review-action pending"
                    onClick={() => updateStatus(review.id, "pending")}
                  >
                    Set Pending
                  </button>
                )}
                <button
                  className="review-action delete"
                  onClick={() => deleteReview(review.id)}
                >
                  <FaTrash /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Reviews;
