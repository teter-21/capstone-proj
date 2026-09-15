const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const notificationController = require("../controllers/notificationController");

/* Patient notifications. */
router.get("/notifications", auth, notificationController.getMyNotifications);
router.put("/notifications/:id/read", auth, notificationController.markAsRead);

/* Admin notifications. */
router.get(
  "/admin/notifications",
  auth,
  admin,
  notificationController.getAdminNotifications,
);
router.put(
  "/admin/notifications/:id/read",
  auth,
  admin,
  notificationController.markAdminAsRead,
);

module.exports = router;
