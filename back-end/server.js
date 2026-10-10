const express = require("express");
const cors = require("cors");
require("dotenv").config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 ||
  new Set(process.env.JWT_SECRET).size < 8 || /^(replace|your[-_]|changeme)/i.test(process.env.JWT_SECRET)) {
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
const { getPatientImage, maskImages } = require("./services/privateImages");
const auth = require("./middleware/authMiddleware");
const { securityHeaders } = require("./middleware/securityMiddleware");
const { verifyEmailConnection } = require("./services/emailService");

const { startEmailQueue, stopEmailQueue } = require("./services/emailQueue");
const db = require("./config/db");
const app = express();
// Configure only a known proxy hop count; never blindly trust arbitrary headers.
if (process.env.TRUST_PROXY_HOPS) {
  const hops = Number(process.env.TRUST_PROXY_HOPS);
  if (!Number.isInteger(hops) || hops < 1)
    throw new Error("TRUST_PROXY_HOPS must be a positive integer.");
  app.set("trust proxy", hops);
}
app.get("/health/live", (req, res) => res.json({ status: "ok" }));
app.get("/health/ready", async (req, res) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) res.status(503).json({ status: "unavailable" });
  }, 3000);
  try {
    await db.promise().query("SELECT id FROM auth_sessions LIMIT 1");
    await db.promise().query("SELECT bucket_key FROM security_rate_limits LIMIT 1");
    await db.promise().query("SELECT id FROM email_outbox LIMIT 1");
    if (!res.headersSent) res.json({ status: "ready" });
  } catch {
    if (!res.headersSent) res.status(503).json({ status: "unavailable" });
  } finally {
    clearTimeout(timer);
  }
});

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
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

app.use((req, res, next) => {
  if (req.headers.authorization) res.set("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Never expose legacy files or Cloudinary asset URLs publicly.
app.use((req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => json(maskImages(body));
  next();
});
app.get('/patient-images/:id', auth, getPatientImage);
app.use('/uploads', (req, res) => res.status(404).json({ message: 'Not found.' }));

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

  console.error("Unhandled server error:", err.code || err.name);
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    verifyEmailConnection()
      .then(startEmailQueue)
      .catch((error) => {
        console.error(
          "Email configuration check failed:",
          error.code || error.message,
        );
        // Keep attempting queued mail; configuration/network problems may be temporary.
        startEmailQueue();
      });
  });
  const maintenance = setInterval(async () => {
    try {
      await db.promise().query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
      await db.promise().execute('DELETE FROM security_rate_limits WHERE last_seen < ?', [Date.now() - 24 * 60 * 60 * 1000]);
    } catch (error) { console.error('Security maintenance failed:', error.code || error.name); }
  }, 15 * 60 * 1000);
  maintenance.unref();
  const shutdown = () => {
    clearInterval(maintenance);
    stopEmailQueue();
    server.close(() => db.end(() => process.exit(0)));
    setTimeout(() => process.exit(1), 20000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
});
