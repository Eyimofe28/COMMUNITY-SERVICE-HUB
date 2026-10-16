require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });
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
db.query("SELECT 1")
  .then(() => {
    console.log("Connected to the database successfully.");
  })
  .catch(err => {
    console.error("Failed to connect to the database:", err);
  });

// ----- ROUTES -----
app.use("/api/auth", authRoutes);
app.use("/api/opportunity", opportunityRoutes);
app.use("/api/test", testRoutes);
app.use("/api/communication", communicationRoutes);
app.use("/api/admin", adminRoutes);


// ----- START SERVER -----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
