import React, { useEffect, useState } from "react";
import { FaStar } from "react-icons/fa";
import api from "../../api";
import "../../css/PatientReview.css";

function PatientReview() {
  const [review, setReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadReview = async () => {
    try {
      const response = await api.get("/patient/review");
      const data = response.data;
      setReview(data);
      setRating(Number(data?.rating || 0));
      setComment(data?.comment || "");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load your review.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReview();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!rating) {
      setError("Please select a rating from 1 to 5 stars.");
      return;
    }

    setSaving(true);
    try {
      const response = await api.post("/patient/review", { rating, comment });
      setMessage(response.data.message);
      await loadReview();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit your review.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="review-page-message">Loading your review...</div>;
  }

  return (
    <div className="patient-review-page">
      <div className="patient-review-header">
        <h1>Review Our Clinic</h1>
        <p>
          Share your experience to help us continue improving our dental care.
        </p>
      </div>

      <div className="patient-review-card">
        {message && (
          <div className="review-alert review-alert-success">{message}</div>
        )}
        {error && (
          <div className="review-alert review-alert-error">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="rating-field">
            <label>Your rating</label>
            <div
              className="rating-stars"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="rating-star-button"
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} out of 5`}
                >
                  <FaStar
                    className={(hoverRating || rating) >= star ? "active" : ""}
                  />
                </button>
              ))}
            </div>
            <span className="rating-caption">
              {hoverRating || rating
                ? `${hoverRating || rating} out of 5`
                : "Select a rating"}
            </span>
          </div>

          <div className="comment-field">
            <label htmlFor="patient-review-comment">Your comment</label>
            <textarea
              id="patient-review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={1000}
              rows={6}
              placeholder="Tell us about your experience at Magno Dental Clinic..."
            />
            <span>{comment.length}/1000</span>
          </div>

          <button
            className="review-submit-button"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Submitting..."
              : review
                ? "Update Review"
                : "Submit Review"}
          </button>
        </form>

        {review && (
          <div className={`review-status review-status-${review.status}`}>
            Current status: <strong>{review.status}</strong>
            {review.status === "pending" &&
              " — Your updated review is waiting for admin approval."}
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientReview;
