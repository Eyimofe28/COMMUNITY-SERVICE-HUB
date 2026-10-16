const path = require('path');
const fs = require('fs');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const express = require('express');
const cors = require('cors');

const testRoutes = require('./routes/testRoutes');
const authRoutes = require('./routes/authRoutes');
const opportunityRoutes = require("./routes/opportunityRoutes");
const communicationRoutes = require("./routes/communicationRoutes");
const adminRoutes = require("./routes/adminRoutes");

const db = require('./config/db');

const app = express();

// ----- GLOBAL MIDDLEWARE -----
// CORS_ORIGIN limits which website may call this API (e.g. https://mcisstudents.mvsu.edu).
// Comma-separate several origins. If unset (local development), any origin is allowed.
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : true;
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());   // MUST come before routes

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
app.use("/api/test", testRoutes);
app.use("/api/communication", communicationRoutes);
app.use("/api/admin", adminRoutes);


// ----- START SERVER -----
// On the school server, put a certificate in community-service-backend/ssl/
// (key.pem + cert.pem) and the API is served over HTTPS. Locally there are no
// certificate files, so it runs over plain HTTP.
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
