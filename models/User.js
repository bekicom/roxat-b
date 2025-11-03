const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const bcrypt = require("bcrypt"); // npm install bcrypt (agar yo'q bo'lsa)

// Branch1 connectionni olamiz
const { branch1Conn } = connectDB();

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // Avto lowercase qilish (katta harf muammosini hal qiladi)
    trim: true, // Space'larni olib tashlash
  },
  password: { type: String, required: true },
});

// Pre-save hook: Parolni avto hash qilish (register da kerak)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Agar parol o'zgartirilmagan bo'lsa, skip
  this.password = await bcrypt.hash(this.password, 10); // 10 rounds salt
  next();
});

module.exports = branch1Conn.model("User", userSchema, "users");
