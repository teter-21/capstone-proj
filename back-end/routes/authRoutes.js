const { loginIpLimit, loginAccountLimit, resetLimit } = require("../middleware/persistentLimits");
const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const {
  loginLimiter,
  resetLimiter,
} = require("../middleware/securityMiddleware");

/* Login */
router.post("/login", loginIpLimit, loginAccountLimit, loginLimiter, authController.login);

/* Password reset */
router.post("/forgot-password", resetLimit, resetLimiter, authController.forgotPassword);
router.get("/verify-reset-token", authController.verifyResetToken);
router.post("/reset-password", resetLimit, resetLimiter, authController.resetPassword);

/* Create Patient Account */
router.post("/create-account", auth, admin, authController.createAccount);

/* Account settings */
router.get("/account", auth, authController.getMyAccount);
router.put("/account", auth, authController.updateMyAccount);

module.exports = router;

router.post("/logout", auth, authController.logout);
