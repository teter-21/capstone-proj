const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const admin = require("../middleware/adminMiddleware");

const patient = require("../middleware/patientMiddleware");

const appointmentController = require("../controllers/appointmentController");

const {
  publicAppointmentLimiter,
} = require("../middleware/securityMiddleware");

/*  PUBLIC APPOINTMENT  No login required. */

router.post(
  "/appointment",
  publicAppointmentLimiter,
  appointmentController.createAppointment,
);

/*  PATIENT PORTAL - CREATE APPOINTMENT  */

router.post(
  "/patient/appointment",
  auth,
  patient,
  appointmentController.createPatientAppointment,
);

/*  ADMIN - VIEW APPOINTMENTS  */

router.get("/appointments", auth, admin, appointmentController.getAppointments);

/*  ADMIN - UPDATE STATUS  */

router.put(
  "/appointments/:id/status",
  auth,
  admin,
  appointmentController.updateAppointmentStatus,
);

/*  ADMIN - RESCHEDULE  */

router.put(
  "/appointments/:id/reschedule",
  auth,
  admin,
  appointmentController.rescheduleAppointment,
);

/*  PATIENT - VIEW OWN APPOINTMENTS  */

router.get(
  "/my-appointments",
  auth,
  patient,
  appointmentController.getMyAppointments,
);

module.exports = router;
