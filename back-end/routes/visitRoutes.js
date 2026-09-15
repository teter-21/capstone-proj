const express = require("express");

const router = express.Router();

const controller = require("../controllers/visitController");

const auth = require("../middleware/authMiddleware");

const admin = require("../middleware/adminMiddleware");

const patient = require("../middleware/patientMiddleware");

const visitController = require("../controllers/visitController");

/*  ADMIN ADD VISIT  */

router.post("/add-visit", auth, admin, controller.addVisit);

/*  ADMIN VIEW ANY PATIENT'S VISITS  */

router.get("/visits/:patient_id", auth, admin, controller.getVisits);

/*  PATIENT - VIEW OWN VISIT / TREATMENT HISTORY  */
router.get("/patient/visits", auth, patient, visitController.getMyVisits);

/*  PATIENT - VIEW OWN PAYMENTS  */
router.get("/patient/payments", auth, patient, visitController.getMyPayments);

module.exports = router;
