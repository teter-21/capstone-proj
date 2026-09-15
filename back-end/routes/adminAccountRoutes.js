const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const adminAccountController = require("../controllers/adminAccountController");

/* Admin account management */
router.get("/admin-accounts", auth, adminAccountController.getAdmins);
router.post("/admin-accounts", auth, adminAccountController.createAdmin);

module.exports = router;
