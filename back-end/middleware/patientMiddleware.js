module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized.",
    });
  }

  if (req.user.role !== "patient") {
    return res.status(403).json({
      message: "Access denied. Patients only.",
    });
  }

  if (!req.user.patient_id) {
    return res.status(403).json({
      message: "This account is not linked to a patient record.",
    });
  }

  next();
};
