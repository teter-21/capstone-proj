const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const paymentController = require("../controllers/paymentController");

/* ADMIN - BILLING */
router.get("/billing", auth, admin, paymentController.getBillingRecords);
router.post("/billing/payments", auth, admin, paymentController.recordPayment);
router.get(
  "/billing/summary",
  auth,
  admin,
  paymentController.getBillingSummary,
);

router.get("/billing/:id/invoice", auth, admin, paymentController.getInvoice);
router.put("/billing/:id/invoice", auth, admin, paymentController.saveInvoice);
module.exports = router;
