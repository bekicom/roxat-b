const mongoose = require("mongoose");
const orderSchema = require("../models/Order");

// Global o'zgaruvchilar
let OrderBranch1, OrderBranch2, OrderBranch3;
let branch1Conn, branch2Conn, branch3Conn;

// Filial DB ulanishlari
function connectDB() {
  try {
    // Branch1 (asosiy: users ham shu yerda)
    branch1Conn = mongoose.createConnection(process.env.MONGO_URI_BRANCH1, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Branch2
    // Agar branch2/3 environment qiymatlari o'rnatilmagan bo'lsa,
    // branch1 URI sini fallback sifatida ishlatamiz (local dev uchun qulay)
    branch2Conn = mongoose.createConnection(
      process.env.MONGO_URI_BRANCH2 || process.env.MONGO_URI_BRANCH1,
      {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
    );

    // Branch3
    branch3Conn = mongoose.createConnection(
      process.env.MONGO_URI_BRANCH3 || process.env.MONGO_URI_BRANCH1,
      {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
    );

    // Order modellarni aniqlash
    OrderBranch1 = branch1Conn.model("Order", orderSchema, "globalorders");
    OrderBranch2 = branch2Conn.model("Order", orderSchema, "globalorders");
    OrderBranch3 = branch3Conn.model("Order", orderSchema, "globalorders");

    // Ulanish holatini log qilish
    branch1Conn.on("connected", () =>
      console.log("✅ Branch1 DB ulandi (users + orders)")
    );
    branch2Conn.on("connected", () => console.log("✅ Branch2 DB ulandi"));
    branch3Conn.on("connected", () => console.log("✅ Branch3 DB ulandi"));

    branch1Conn.on("error", (err) =>
      console.error("❌ Branch1 ulanish xatosi:", err.message)
    );
    branch2Conn.on("error", (err) =>
      console.error("❌ Branch2 ulanish xatosi:", err.message)
    );
    branch3Conn.on("error", (err) =>
      console.error("❌ Branch3 ulanish xatosi:", err.message)
    );

    // ✅ endi uchalasi ham qaytadi
    return { branch1Conn, branch2Conn, branch3Conn };
  } catch (error) {
    console.error("❌ DB ulanish xatosi:", error.message);
    process.exit(1);
  }
}

// Ulanishlarni qaytaruvchi funksiyalar
function getBranch1Conn() {
  if (!branch1Conn) {
    throw new Error(
      "Branch1 connection not initialized. Call connectDB first."
    );
  }
  return branch1Conn;
}

function getBranch2Conn() {
  if (!branch2Conn) {
    throw new Error(
      "Branch2 connection not initialized. Call connectDB first."
    );
  }
  return branch2Conn;
}

function getBranch3Conn() {
  if (!branch3Conn) {
    throw new Error(
      "Branch3 connection not initialized. Call connectDB first."
    );
  }
  return branch3Conn;
}

// Order modellarini qaytaruvchi funksiyalar
function getOrderBranch1() {
  if (!OrderBranch1) {
    throw new Error(
      "OrderBranch1 model not initialized. Call connectDB first."
    );
  }
  return OrderBranch1;
}

function getOrderBranch2() {
  if (!OrderBranch2) {
    throw new Error(
      "OrderBranch2 model not initialized. Call connectDB first."
    );
  }
  return OrderBranch2;
}

function getOrderBranch3() {
  if (!OrderBranch3) {
    throw new Error(
      "OrderBranch3 model not initialized. Call connectDB first."
    );
  }
  return OrderBranch3;
}

module.exports = {
  connectDB,
  getBranch1Conn,
  getBranch2Conn,
  getBranch3Conn,
  getOrderBranch1,
  getOrderBranch2,
  getOrderBranch3,
};
