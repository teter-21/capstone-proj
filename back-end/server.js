const express = require("express");
const cors = require("cors");
require("dotenv").config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and contain at least 32 characters.");
}

const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const visitRoutes = require("./routes/visitRoutes");
const reportRoutes = require("./routes/reportRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const queueRoutes = require("./routes/queueRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const dentalChartRoutes = require("./routes/dentalChartRoutes");
const adminAccountRoutes = require("./routes/adminAccountRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const reviewController = require("./controllers/reviewController");
const { securityHeaders } = require("./middleware/securityMiddleware");
const { verifyEmailConnection } = require("./services/emailService");

const app = express();

/* Security and request limits. */
app.disable("x-powered-by");
app.use(securityHeaders);

const configuredOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || configuredOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin is not allowed."));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

/* Uploaded files are served only from the dedicated upload folder. */
app.use(
  "/uploads",
  express.static("uploads", {
    dotfiles: "deny",
    index: false,
    maxAge: "1d",
  }),
);

/* Routes */
app.use("/", authRoutes);
app.use("/", patientRoutes);
app.use("/", visitRoutes);
app.use("/", reportRoutes);
app.use("/", appointmentRoutes);
app.use("/", dashboardRoutes);
app.use("/", notificationRoutes);
app.use("/", queueRoutes);
app.use("/", paymentRoutes);
app.use("/", dentalChartRoutes);
app.use("/", adminAccountRoutes);
app.use("/", reviewRoutes);

app.get("/", (req, res) => {
  res.send("Magno Dental Clinic API is running...");
});

/* Handle upload and request errors without exposing stack traces. */
app.use((err, req, res, next) => {
  if (err.message === "CORS origin is not allowed.") {
    return res.status(403).json({ message: "Request origin is not allowed." });
  }

  if (err.name === "MulterError" || err.message.includes("Only JPG")) {
    return res.status(400).json({ message: err.message });
  }

  console.error("Unhandled server error:", err);
  return res
    .status(500)
    .json({ message: "An unexpected server error occurred." });
});

const PORT = process.env.PORT || 3001;

reviewController.ensureReviewTable((tableError) => {
  if (tableError) {
    console.warn(
      "Patient review table could not be initialized. Run database/patient_reviews.sql manually.",
    );
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    verifyEmailConnection();
  });
});
