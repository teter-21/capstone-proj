const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const admin = require("../middleware/adminMiddleware");

const dashboardController = require("../controllers/dashboardController");

/*  ADMIN DASHBOARD SUMMARY  */

router.get(
  "/dashboard-summary",
  auth,
  admin,
  dashboardController.getDashboardSummary,
);

/*  MONTHLY REVENUE  */

router.get(
  "/dashboard-revenue",
  auth,
  admin,
  dashboardController.getMonthlyRevenue,
);

/*  TOP PROCEDURES  */

router.get(
  "/dashboard-procedures",
  auth,
  admin,
  dashboardController.getTopProcedures,
);

module.exports = router;
