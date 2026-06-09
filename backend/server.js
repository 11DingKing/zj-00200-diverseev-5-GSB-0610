const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = require("./database");
const vehiclesRouter = require("./routes/vehicles");
const suggestionsRouter = require("./routes/suggestions");
const decisionSupportRouter = require("./routes/decisionSupport");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/vehicles", vehiclesRouter);
app.use("/api/suggestions", suggestionsRouter);
app.use("/api/decision", decisionSupportRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "DiverseEV Monitor API 运行正常" });
});

app.get("/api/meta", (req, res) => {
  res.json({
    categories: ["微型代步", "家用紧凑", "中大型", "商用"],
    scenarios: ["城市通勤", "长途", "载货"],
    statuses: ["在售", "停售", "待上市"],
    weightRanges: [
      "<1200kg",
      "1200-1500kg",
      "1500-1800kg",
      "1800-2200kg",
      "2200-2800kg",
      ">=2800kg",
    ],
    terrainTypes: ["平原", "山区", "丘陵", "高原", "城市拥堵"],
    years: [2020, 2021, 2022, 2023, 2024, 2025],
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "服务器内部错误" });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`API文档: http://localhost:${PORT}/api/health`);
});

module.exports = app;
