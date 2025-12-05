const { getBranch1Conn, getBranch2Conn } = require("../config/db");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// User schema (o'zgarmasdi)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Model olish helper (o'zgarmasdi)
function getUserModels() {
  const branch1Conn = getBranch1Conn();
  const branch2Conn = getBranch2Conn();

  const Branch1User = branch1Conn.model("User", userSchema, "users");
  const Branch2User = branch2Conn.model("User", userSchema, "users");

  return { Branch1User, Branch2User };
}

// 🔹 Foydalanuvchi yaratish (ikkala bazaga yoziladi)
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;
    const { Branch1User, Branch2User } = getUserModels();

    // Avval Branch1 da borligini tekshiramiz
    const existing = await Branch1User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "❌ Bu login allaqachon mavjud" });
    }

    // Ikkala bazaga ham yozamiz
    const user1 = await Branch1User.create({ username, password });
    const user2 = await Branch2User.create({ username, password });

    res.json({
      message: "✅ Foydalanuvchi yaratildi (ikkala filialda)",
      branch1: user1,
      branch2: user2,
    });
  } catch (err) {
    // 🔄 To'liq xato log qilish
    console.error("❌ Register xatosi - To'liq ma'lumotlar:");
    console.error("Xato xabari:", err.message);
    console.error("Stack trace:", err.stack); // Bu eng muhimi - qayerda xato bo'lganini ko'rsatadi
    console.error("Qo'shimcha ma'lumotlar:", err); // Barcha err ob'ekti

    // Development da to'liq xato response ga qo'shish
    if (process.env.NODE_ENV === "development") {
      return res.status(500).json({
        message: "Server xatosi (development rejimida)",
        error: {
          message: err.message,
          stack: err.stack,
          details: err,
        },
      });
    }

    // Production da faqat umumiy xabar
    res.status(500).json({ message: "Server xatosi" });
  }
};

// 🔹 Login (faqat Branch1 dan tekshiramiz)
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const { Branch1User } = getUserModels();

    const user = await Branch1User.findOne({ username });
    if (!user)
      return res.status(404).json({ message: "❌ Foydalanuvchi topilmadi" });

    if (user.password !== password) {
      return res.status(400).json({ message: "❌ Parol noto'g'ri" });
    }

    // 🔑 Token generatsiya qilamiz
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || "sora-secret",
      { expiresIn: "7d" }
    );

    res.json({
      message: "✅ Login muvaffaqiyatli",
      token,
      user: {
        id: user._id,
        username: user.username,
      },
    });
  } catch (err) {
    // 🔄 To'liq xato log qilish
    console.error("❌ Login xatosi - To'liq ma'lumotlar:");
    console.error("Xato xabari:", err.message);
    console.error("Stack trace:", err.stack);
    console.error("Qo'shimcha ma'lumotlar:", err);

    // Development da to'liq xato response ga qo'shish
    if (process.env.NODE_ENV === "development") {
      return res.status(500).json({
        message: "Server xatosi (development rejimida)",
        error: {
          message: err.message,
          stack: err.stack,
          details: err,
        },
      });
    }

    // Production da faqat umumiy xabar
    res.status(500).json({ message: "Server xatosi" });
  }
};
