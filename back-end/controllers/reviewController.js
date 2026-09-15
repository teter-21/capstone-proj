const db = require("../config/db");

/* Create the review table automatically when the server starts. */
exports.ensureReviewTable = (callback) => {
  const sql = `
        CREATE TABLE IF NOT EXISTS patient_reviews (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            patient_id INT NOT NULL,
            rating TINYINT NOT NULL,
            comment VARCHAR(1000) NOT NULL,
            status ENUM('pending', 'approved', 'hidden') NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_patient_review (patient_id),
            INDEX idx_review_status (status),
            INDEX idx_review_patient (patient_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

  db.query(sql, (err) => {
    if (err) {
      console.error("Review table setup error:", err);
    }
    if (callback) callback(err);
  });
};

/* Public homepage: only approved reviews are visible. */
exports.getApprovedReviews = (req, res) => {
  db.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, p.name
         FROM patient_reviews r
         INNER JOIN patients p ON p.id = r.patient_id
         WHERE r.status = 'approved'
         ORDER BY r.created_at DESC
         LIMIT 20`,
    (err, results) => {
      if (err) {
        console.error("Get approved reviews error:", err);
        return res
          .status(500)
          .json({ message: "Unable to load patient reviews." });
      }
      res.json(results);
    },
  );
};

/* Patient can view their own review. */
exports.getMyReview = (req, res) => {
  db.query(
    `SELECT id, patient_id, rating, comment, status, created_at, updated_at
         FROM patient_reviews
         WHERE patient_id = ?
         LIMIT 1`,
    [req.user.patient_id],
    (err, results) => {
      if (err) {
        console.error("Get patient review error:", err);
        return res.status(500).json({ message: "Unable to load your review." });
      }
      res.json(results[0] || null);
    },
  );
};

/* Create or update the single review allowed for each patient. */
exports.saveMyReview = (req, res) => {
  const patientId = req.user.patient_id;
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ message: "Please select a rating from 1 to 5 stars." });
  }

  if (comment.length < 3) {
    return res
      .status(400)
      .json({ message: "Please enter a short comment about your experience." });
  }

  if (comment.length > 1000) {
    return res
      .status(400)
      .json({ message: "Your comment must be 1000 characters or fewer." });
  }

  db.query(
    `INSERT INTO patient_reviews (patient_id, rating, comment, status)
         VALUES (?, ?, ?, 'pending')
         ON DUPLICATE KEY UPDATE
            rating = VALUES(rating),
            comment = VALUES(comment),
            status = 'pending',
            updated_at = CURRENT_TIMESTAMP`,
    [patientId, rating, comment],
    (err, result) => {
      if (err) {
        console.error("Save patient review error:", err);
        return res.status(500).json({ message: "Unable to save your review." });
      }

      res.status(result.affectedRows === 1 ? 201 : 200).json({
        message:
          "Review submitted successfully. It will appear on the homepage after approval.",
        review: { rating, comment, status: "pending" },
      });
    },
  );
};

/* Admin review moderation. */
exports.getAdminReviews = (req, res) => {
  db.query(
    `SELECT r.id, r.patient_id, p.name, r.rating, r.comment, r.status,
                r.created_at, r.updated_at
         FROM patient_reviews r
         INNER JOIN patients p ON p.id = r.patient_id
         ORDER BY FIELD(r.status, 'pending', 'approved', 'hidden'), r.created_at DESC`,
    (err, results) => {
      if (err) {
        console.error("Get admin reviews error:", err);
        return res.status(500).json({ message: "Unable to load reviews." });
      }
      res.json(results);
    },
  );
};

exports.updateReviewStatus = (req, res) => {
  const reviewId = Number(req.params.id);
  const status = String(req.body.status || "")
    .trim()
    .toLowerCase();

  if (!Number.isInteger(reviewId) || reviewId < 1) {
    return res.status(400).json({ message: "Invalid review." });
  }

  if (!["pending", "approved", "hidden"].includes(status)) {
    return res.status(400).json({ message: "Invalid review status." });
  }

  db.query(
    `UPDATE patient_reviews SET status = ? WHERE id = ?`,
    [status, reviewId],
    (err, result) => {
      if (err) {
        console.error("Update review status error:", err);
        return res
          .status(500)
          .json({ message: "Unable to update the review." });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Review not found." });
      }

      res.json({ message: "Review status updated successfully." });
    },
  );
};

exports.deleteReview = (req, res) => {
  const reviewId = Number(req.params.id);

  if (!Number.isInteger(reviewId) || reviewId < 1) {
    return res.status(400).json({ message: "Invalid review." });
  }

  db.query(
    `DELETE FROM patient_reviews WHERE id = ?`,
    [reviewId],
    (err, result) => {
      if (err) {
        console.error("Delete review error:", err);
        return res
          .status(500)
          .json({ message: "Unable to delete the review." });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Review not found." });
      }

      res.json({ message: "Review deleted successfully." });
    },
  );
};
