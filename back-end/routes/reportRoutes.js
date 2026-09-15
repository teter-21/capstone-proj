const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const reportController = require("../controllers/reportController");

/*  ADMIN REPORTS  */
router.get("/reports", auth, admin, reportController.getReports);

router.get(
  "/report-procedures",
  auth,
  admin,
  reportController.getReportProcedures,
);

module.exports = router;
