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

/* Failed-login limiter: maximum 5 failed attempts per IP + email in 15 minutes.
 * A sixth attempt while the window is active returns HTTP 429.
 * Successful login clears the counter through req.clearLoginFailures().
 */
const failedLoginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of failedLoginAttempts) {
    if (now - value.firstAttempt >= LOGIN_WINDOW_MS) failedLoginAttempts.delete(key);
  }
}, 60000).unref();

const getLoginKey = (req) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  return `${ip}|${email || "unknown"}`;
};

const loginLimiter = (req, res, next) => {
  const now = Date.now();
  const key = getLoginKey(req);
  const current = failedLoginAttempts.get(key);

  if (current && now - current.firstAttempt >= LOGIN_WINDOW_MS) {
    failedLoginAttempts.delete(key);
  }

  const entry = failedLoginAttempts.get(key);

  if (entry && entry.count >= LOGIN_MAX_FAILURES) {
    const retryAfter = Math.max(
      1,
      Math.ceil((LOGIN_WINDOW_MS - (now - entry.firstAttempt)) / 1000),
    );

    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      message: "Too many failed login attempts. Please try again later.",
      retryAfter,
    });
  }

  req.recordLoginFailure = () => {
    const timestamp = Date.now();
    const existing = failedLoginAttempts.get(key);

    if (!existing || timestamp - existing.firstAttempt >= LOGIN_WINDOW_MS) {
      failedLoginAttempts.set(key, {
        count: 1,
        firstAttempt: timestamp,
      });
      return;
    }

    existing.count += 1;
  };

  req.clearLoginFailures = () => {
    failedLoginAttempts.delete(key);
  };

  next();
};

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
