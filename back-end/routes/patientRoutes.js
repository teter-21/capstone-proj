const express = require("express");

const router = express.Router();

const patientController = require("../controllers/patientController");

const auth = require("../middleware/authMiddleware");

const admin = require("../middleware/adminMiddleware");

const patient = require("../middleware/patientMiddleware");

const upload = require("../middleware/uploadMiddleware");

/* this are all ADMIN ROUTES  */

/* VIEW ALL PATIENTS */

router.get("/patients", auth, admin, patientController.getPatients);

/* Recent patients */

router.get(
  "/recent-patients",
  auth,
  admin,
  patientController.getRecentPatients,
);

/* ADD PATIENT */

router.post(
  "/add-patient",
  auth,
  admin,
  upload.single("image"),
  patientController.addPatient,
);

/* UPDATE PATIENT */

router.put(
  "/update-patient/:id",
  auth,
  admin,
  upload.single("image"),
  patientController.updatePatient,
);

/* this are alll  PATIENT PORTAL ROUTES  */

/* MY PROFILE */

router.get("/my-profile", auth, patient, patientController.getMyProfile);

/* MY TREATMENT HISTORY */

router.get("/my-visits", auth, patient, patientController.getMyVisits);

/* MY BALANCE */

router.get("/my-balance", auth, patient, patientController.getMyBalance);

/* UPDATE MY PROFILE */

router.put("/my-profile", auth, patient, patientController.updateMyProfile);

router.get("/patient/profile", auth, patient, patientController.getMyProfile);

module.exports = router;
