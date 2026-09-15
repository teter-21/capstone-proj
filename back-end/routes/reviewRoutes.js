const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const patient = require("../middleware/patientMiddleware");

/* Public */
router.get("/reviews", reviewController.getApprovedReviews);

/* Patient */
router.get("/patient/review", auth, patient, reviewController.getMyReview);
router.post("/patient/review", auth, patient, reviewController.saveMyReview);

/* Admin */
router.get("/admin/reviews", auth, admin, reviewController.getAdminReviews);
router.put(
  "/admin/reviews/:id/status",
  auth,
  admin,
  reviewController.updateReviewStatus,
);
router.delete("/admin/reviews/:id", auth, admin, reviewController.deleteReview);

module.exports = router;
