const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/adminAccountController");

router.get("/admin-accounts", auth, controller.getAdmins);
router.post("/admin-accounts", auth, controller.createAdmin);
router.delete("/admin-accounts/:id", auth, controller.deleteAdmin);

router.put("/admin-accounts/:id/role", auth, controller.updateRole);
module.exports = router;
