const { getBranch1Conn, getBranch2Conn } = require("../config/db");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// User schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
  },
  password: { type: String, required: true },
});

// Password hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ----------------------
// SAFE MODEL GETTER
// ----------------------
function getUserModels() {
  const branch1Conn = getBranch1Conn();

  // Modelni faqat BITTA marta yaratish – asosiy muammo shu edi!
  const Branch1User =
    branch1Conn.models.User || branch1Conn.model("User", userSchema, "users");

  return { Branch1User };
}

// ----------------------
// REGISTER
// ----------------------
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    const cleanUsername = username?.trim().toLowerCase();
    const cleanPassword = password?.trim();

    if (!cleanUsername || !cleanPassword) {
      return res
        .status(400)
        .json({ message: "❌ Username va password majburiy" });
    }

    const { Branch1User } = getUserModels();

    const existing = await Branch1User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(400).json({ message: "❌ Bu login allaqachon mavjud" });
    }

    const user1 = await Branch1User.create({
      username: cleanUsername,
      password: cleanPassword,
    });

    const { password: _, ...safeUser } = user1.toObject();

    res.json({
      message: "✅ Foydalanuvchi yaratildi (Branch1 da)",
      branch1: safeUser,
    });
  } catch (err) {
    console.error("❌ Register xato:", err);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// ----------------------
// LOGIN
// ----------------------
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const cleanUsername = username?.trim().toLowerCase();
    const cleanPassword = password?.trim();

    if (!cleanUsername || !cleanPassword) {
      return res
        .status(400)
        .json({ message: "❌ Username va password majburiy" });
    }

    const { Branch1User } = getUserModels();

    const user = await Branch1User.findOne({ username: cleanUsername });
    if (!user) {
      return res.status(404).json({ message: "❌ Foydalanuvchi topilmadi" });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "❌ Parol noto'g'ri" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || "sora-secret",
      { expiresIn: "7d" }
    );

    const { password: _, ...safeUser } = user.toObject();

    res.json({
      message: "✅ Login muvaffaqiyatli",
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error("❌ Login xato:", err);
    res.status(500).json({ message: "Server xatosi" });
  }
};
