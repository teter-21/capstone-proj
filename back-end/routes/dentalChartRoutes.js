const express = require("express");
const router = express.Router();

const controller = require("../controllers/dentalChartController");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

router.get("/dental-chart/:patient_id", auth, admin, controller.getDentalChart);

router.put(
  "/dental-chart/:patient_id/:tooth_number",
  auth,
  admin,
  controller.saveToothCondition,
);

router.delete(
  "/dental-chart/:patient_id/:tooth_number",
  auth,
  admin,
  controller.clearToothCondition,
);

module.exports = router;
