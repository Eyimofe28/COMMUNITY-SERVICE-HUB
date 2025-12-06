require('dotenv').config();
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
app.use(cors());
app.use(express.json());   // MUST come before routes

// ----- TEST DB CONNECTION -----
db.getConnection()
  .then(conn => {
    console.log("Connected to MySQL successfully.");
    conn.release();
  })
  .catch(err => {
    console.error("Failed to connect to MySQL:", err);
  });

// ----- ROUTES -----
app.use("/api/auth", authRoutes);
app.use("/api/opportunity", opportunityRoutes);
app.use("/api/test", testRoutes);
app.use("/api/communication", communicationRoutes);
app.use("/api/admin", adminRoutes);


// ----- START SERVER -----
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
