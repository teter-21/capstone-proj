/* Basic security headers without adding another package. */
const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; frame-ancestors 'none'; base-uri 'self'",
  );
  next();
};

/* Small in-memory limiter for sensitive endpoints. */
const createRateLimiter = ({ windowMs, max, message }) => {
  const attempts = new Map();

  setInterval(
    () => {
      const now = Date.now();
      for (const [key, value] of attempts) {
        if (now - value.start >= windowMs) {
          attempts.delete(key);
        }
      }
    },
    Math.min(windowMs, 60_000),
  ).unref();

  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const current = attempts.get(key);

    if (!current || now - current.start >= windowMs) {
      attempts.set(key, { start: now, count: 1 });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      return res.status(429).json({ message });
    }

    next();
  };
};

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again later.",
});

const resetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset requests. Please try again later.",
});

const publicAppointmentLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many appointment requests. Please try again later.",
});

module.exports = {
  securityHeaders,
  loginLimiter,
  resetLimiter,
  publicAppointmentLimiter,
};
