const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { connectDB } = require("./config/db");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🍽️ Restaurant Dashboard API ishlayapti 🚀");
});

// ✅ To‘g‘ri ulanishlar
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🔥 Server ${PORT} portda ishlayapti`));
// fsfsdxsd
