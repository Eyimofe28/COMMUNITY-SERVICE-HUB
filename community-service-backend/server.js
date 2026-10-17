// =============================================================================
// Backend entry point - Express API server
// -----------------------------------------------------------------------------
// Start with `npm start` from the project root. Settings come from
// community-service-backend/.env (see .env.example).
// =============================================================================

const path = require('path');
const fs = require('fs');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const opportunityRoutes = require("./routes/opportunityRoutes");
const communicationRoutes = require("./routes/communicationRoutes");
const adminRoutes = require("./routes/adminRoutes");

const db = require('./config/db');

// SECURITY: refuse to start without a signing secret - otherwise login tokens
// could not be issued or verified safely.
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set in community-service-backend/.env - refusing to start.");
  process.exit(1);
}

const app = express();

// ----- GLOBAL MIDDLEWARE -----
// SECURITY: helmet sets standard protective HTTP headers (e.g. no MIME sniffing,
// no embedding in other sites' frames) and hides the "X-Powered-By: Express" header.
app.use(helmet());

// CLIENT/SERVER COMMUNICATION: CORS_ORIGIN limits which website may call this API
// (e.g. https://mcisstudents.mvsu.edu). Comma-separate several origins.
// If unset (local development), any origin is allowed.
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : true;
app.use(cors({ origin: allowedOrigins }));

// Parse JSON request bodies (max 100 KB) - MUST come before routes
app.use(express.json({ limit: '100kb' }));

// ----- TEST DB CONNECTION -----
db.query("SELECT 1")
  .then(() => {
    console.log("Connected to the database successfully.");
  })
  .catch(err => {
    console.error("Failed to connect to the database:", err);
  });

// ----- HEALTH CHECK -----
// Visit /api/health to confirm the backend is up and can reach the database.
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check DB error:", error.message);
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

// ----- ROUTES -----
app.use("/api/auth", authRoutes);
app.use("/api/opportunity", opportunityRoutes);
app.use("/api/communication", communicationRoutes);
app.use("/api/admin", adminRoutes);

// ----- ERROR HANDLING -----
// Unknown API address -> JSON 404 (instead of Express's default HTML page)
app.use((req, res) => {
  res.status(404).json({ message: "Not found." });
});

// Catch-all error handler (Express calls this when a request fails before or
// outside a route's own try/catch). Every error leaves the API as JSON, and
// internal details/stack traces are never sent to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Malformed JSON in the request body, or a body over the size limit
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: "Request body is not valid JSON." });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: "Request is too large." });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Something went wrong on the server. Please try again." });
});


// ----- START SERVER -----
// On the school server, put a certificate in community-service-backend/ssl/
// (key.pem + cert.pem) and the API is served over HTTPS, so passwords and tokens
// are encrypted in transit. Locally there are no certificate files, so it runs
// over plain HTTP.
const PORT = process.env.PORT || 5000;
const SSL_KEY = path.join(__dirname, 'ssl', 'key.pem');
const SSL_CERT = path.join(__dirname, 'ssl', 'cert.pem');

if (fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)) {
  https
    .createServer({ key: fs.readFileSync(SSL_KEY), cert: fs.readFileSync(SSL_CERT) }, app)
    .listen(PORT, () => console.log(`Server running on port ${PORT} (HTTPS)`));
} else {
  app.listen(PORT, () => console.log(`Server running on port ${PORT} (HTTP)`));
}
