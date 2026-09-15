const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const admin = require("../middleware/adminMiddleware");

const queueController = require("../controllers/queueController");

/*  ADMIN - GET TODAY'S QUEUE  */

router.get("/queue", auth, admin, queueController.getTodayQueue);

/*  ADMIN - CALL NEXT PATIENT  */

router.post("/queue/call-next", auth, admin, queueController.callNextPatient);

/*  ADMIN - CHECK IN APPOINTMENT  */

router.post(
  "/queue/appointment/:id",
  auth,
  admin,
  queueController.checkInAppointment,
);

/*  ADMIN - ADD WALK-IN  */

router.post("/queue/walk-in", auth, admin, queueController.addWalkIn);

/*  ADMIN - CALL PATIENT  */

router.put("/queue/:id/call", auth, admin, queueController.callPatient);

/*  ADMIN - START TREATMENT  */

router.put("/queue/:id/start", auth, admin, queueController.startTreatment);

/*  ADMIN - COMPLETE  */

router.put("/queue/:id/complete", auth, admin, queueController.completeQueue);

/*  ADMIN - SKIP  */

router.put("/queue/:id/skip", auth, admin, queueController.skipPatient);

/*  ADMIN - CANCEL  */

router.put("/queue/:id/cancel", auth, admin, queueController.cancelQueue);

/*  ADMIN - COMPLETE TREATMENT + SAVE VISIT  */

router.post(
  "/queue/:id/complete-treatment",
  auth,
  admin,
  queueController.completeTreatmentWithVisit,
);

module.exports = router;
