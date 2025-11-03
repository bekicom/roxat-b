const { getBranch1Conn, getBranch2Conn } = require("../config/db");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt"); // npm install bcrypt

// User schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    
    
    lowercase: true, // Avto lowercase qilish
    trim: true, // Space'larni olib tashlash
  },
  password: { type: String, required: true },
});

// Pre-save hook: Password'ni hash qilish
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10); // Salt rounds = 10
  next();
});

// Model olish helper (hozircha faqat Branch1 ishlatamiz, Branch2 ni keyinroq qo'shing)
function getUserModels() {
  const branch1Conn = getBranch1Conn();
  // const branch2Conn = getBranch2Conn();  // Agar kerak bo'lsa, oching

  const Branch1User = branch1Conn.model("User", userSchema, "users");
  // const Branch2User = branch2Conn.model("User", userSchema, "users");

  return { Branch1User /*, Branch2User */ };
}

// 🔹 Foydalanuvchi yaratish (faqat Branch1 ga yozamiz – Branch2 ni keyinroq qo'shing)
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Input'larni tozalash
    const cleanUsername = username?.trim().toLowerCase();
    const cleanPassword = password?.trim();

    if (!cleanUsername || !cleanPassword) {
      return res
        .status(400)
        .json({ message: "❌ Username va password majburiy" });
    }

    const { Branch1User } = getUserModels();

    // Mavjudligini tekshirish
    const existing = await Branch1User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(400).json({ message: "❌ Bu login allaqachon mavjud" });
    }

    // Yaratish (hash avto bo'ladi)
    const user1 = await Branch1User.create({
      username: cleanUsername,
      password: cleanPassword,
    });
    // const user2 = await Branch2User.create({ username: cleanUsername, password: cleanPassword });

    // Password'ni response'da yubormaymiz (xavfsizlik)
    const { password: _, ...userWithoutPassword } = user1.toObject();

    res.json({
      message: "✅ Foydalanuvchi yaratildi (Branch1 da)",
      branch1: userWithoutPassword,
      // branch2: user2,
    });
  } catch (err) {
    console.error("❌ Register xato:", err.message);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// 🔹 Login (Branch1 dan tekshiramiz)
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Input'larni tozalash
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

    // Hash bilan solishtirish
    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "❌ Parol noto'g'ri" });
    }

    // 🔑 Token generatsiya qilamiz
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || "sora-secret", // .env da haqiqiy secret qo'ying!
      { expiresIn: "7d" }
    );

    // Password'ni yubormaymiz
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.json({
      message: "✅ Login muvaffaqiyatli",
      token, // Frontend shu tokenni oladi
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error("❌ Login xato:", err.message);
    res.status(500).json({ message: "Server xatosi" });
  }
};
