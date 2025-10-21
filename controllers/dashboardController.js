const orderSchema = require("../models/Order");
const {
  getBranch1Conn,
  getBranch2Conn,
  getBranch3Conn,
} = require("../config/db");

const Branch1Order = getBranch1Conn().model(
  "Order",
  orderSchema,
  "globalorders"
);
const Branch2Order = getBranch2Conn().model(
  "Order",
  orderSchema,
  "globalorders"
);
const Branch3Order = getBranch3Conn().model(
  "Order",
  orderSchema,
  "globalorders"
);

// ✅ Universal yordamchi funksiya (filialni tanlash)
function getModel(branch) {
  if (branch === "1") return Branch1Order;
  if (branch === "2") return Branch2Order;
  if (branch === "3") return Branch3Order;
  throw new Error("Noto‘g‘ri filial tanlandi");
}

// ✅ 1. Umumiy summary (har uch filialdan)
exports.getAllSummary = async (req, res) => {
  try {
    const branches = [Branch1Order, Branch2Order, Branch3Order];
    const results = await Promise.all(
      branches.map(async (Model) => {
        const orders = await Model.find({ status: "completed" });

        const summary = {
          total_cash: 0,
          total_card: 0,
          total_click: 0,
          total_service: 0,
        };

        orders.forEach((order) => {
          if (order.paymentMethod === "cash")
            summary.total_cash += order.totalPrice || 0;
          if (order.paymentMethod === "card")
            summary.total_card += order.totalPrice || 0;
          if (order.paymentMethod === "click")
            summary.total_click += order.totalPrice || 0;
          if (order.service_amount)
            summary.total_service += order.service_amount;
        });

        return summary;
      })
    );

    // Hammasini jamlash
    const total = results.reduce(
      (acc, curr) => ({
        total_cash: acc.total_cash + curr.total_cash,
        total_card: acc.total_card + curr.total_card,
        total_click: acc.total_click + curr.total_click,
        total_service: acc.total_service + curr.total_service,
      }),
      { total_cash: 0, total_card: 0, total_click: 0, total_service: 0 }
    );

    res.json({ success: true, total });
  } catch (err) {
    console.error("❌ getAllSummary xato:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ 2. Filial bo‘yicha orderlar
exports.getBranchOrders = async (req, res) => {
  try {
    const { branch } = req.params;
    const { startDate, endDate } = req.query;
    const Model = getModel(branch);

    const filter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filter.$or = [
        { createdAt: { $gte: start, $lte: end } },
        { order_date: { $gte: start, $lte: end } },
      ];
    }

    const orders = await Model.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, items: orders });
  } catch (err) {
    console.error("❌ getBranchOrders xato:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ 3. Filial bo‘yicha guruhlangan mahsulotlar
exports.getBranchOrdersGrouped = async (req, res) => {
  try {
    const { branch, startDate, endDate } = req.params;
    const Model = getModel(branch);

    const match = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // 🇺🇿 UTC → Toshkent (UTC+5)
      start.setHours(start.getHours() + 5);
      end.setHours(end.getHours() + 5);

      filter.$or = [
        { createdAt: { $gte: start, $lte: end } },
        { order_date: { $gte: start, $lte: end } },
      ];
    }

    const grouped = await Model.aggregate([
      { $match: match },
      {
        $project: {
          items: { $ifNull: ["$items", "$ordered_items"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          quantity: { $sum: "$items.quantity" },
          subtotal: {
            $sum: { $multiply: ["$items.quantity", "$items.price"] },
          },
        },
      },
      { $sort: { quantity: -1 } },
    ]);

    res.json(grouped);
  } catch (err) {
    console.error("❌ getBranchOrdersGrouped xato:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getBranchReport = async (req, res) => {
  try {
    const { branch } = req.params;
    const { startDate, endDate } = req.query;

    // ✅ Modelni getModel orqali tanlaymiz
    const OrderModel = getModel(branch);

    // 🔹 Sana filtri (UTC+5)
    const filter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(start.getHours() + 5);
      end.setHours(end.getHours() + 5);

      filter.$or = [
        { createdAt: { $gte: start, $lte: end } },
        { order_date: { $gte: start, $lte: end } },
      ];
    }

    // 🔹 Ma’lumotlarni olish
    const orders = await OrderModel.find(filter);

    // 🔹 Hisoblash
    let cash = 0,
      card = 0,
      click = 0,
      service = 0;

    orders.forEach((o) => {
      const total = o.final_total || o.total_price || 0;
      const method = o.paymentMethod || "";
      const serv = o.service_amount || 0;

      if (method === "cash") cash += total;
      else if (method === "card") card += total;
      else if (method === "click") click += total;
      else if (o.mixedPaymentDetails) {
        cash += o.mixedPaymentDetails.cashAmount || 0;
        card += o.mixedPaymentDetails.cardAmount || 0;
      }

      service += serv;
    });

    res.json({ cash, card, click, service });
  } catch (err) {
    console.error("❌ getBranchReport xato:", err);
    res.status(500).json({ message: "Server xatosi" });
  }
};
