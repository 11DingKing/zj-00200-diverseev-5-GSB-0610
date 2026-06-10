const express = require("express");
const router = express.Router();
const db = require("../database");

const MAX_COMPARISON_SIZE = 4;

router.get("/", (req, res) => {
  const sql = `SELECT v.* FROM comparison_set cs
    JOIN vehicles v ON cs.vehicle_id = v.id
    ORDER BY cs.created_at ASC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const result = rows.map((row) => ({
      ...row,
      scenarios: JSON.parse(row.scenarios),
    }));
    res.json({
      count: result.length,
      maxSize: MAX_COMPARISON_SIZE,
      vehicles: result,
    });
  });
});

router.post("/add/:vehicleId", (req, res) => {
  const vehicleId = parseInt(req.params.vehicleId);

  if (!vehicleId) {
    res.status(400).json({ error: "无效的车型ID" });
    return;
  }

  db.get("SELECT * FROM vehicles WHERE id = ?", [vehicleId], (err, vehicle) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!vehicle) {
      res.status(404).json({ error: "车型不存在" });
      return;
    }

    db.get(
      "SELECT COUNT(*) as count FROM comparison_set",
      [],
      (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        if (row.count >= MAX_COMPARISON_SIZE) {
          res.status(400).json({
            error: `对比集最多只能添加 ${MAX_COMPARISON_SIZE} 款车型`,
            maxSize: MAX_COMPARISON_SIZE,
          });
          return;
        }

        db.run(
          "INSERT OR IGNORE INTO comparison_set (vehicle_id) VALUES (?)",
          [vehicleId],
          function (err) {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }

            if (this.changes === 0) {
              res.status(400).json({ error: "该车型已在对比集中" });
              return;
            }

            res.json({
              message: "已添加到对比集",
              vehicleId,
              count: row.count + 1,
              maxSize: MAX_COMPARISON_SIZE,
            });
          },
        );
      },
    );
  });
});

router.post("/remove/:vehicleId", (req, res) => {
  const vehicleId = parseInt(req.params.vehicleId);

  if (!vehicleId) {
    res.status(400).json({ error: "无效的车型ID" });
    return;
  }

  db.run(
    "DELETE FROM comparison_set WHERE vehicle_id = ?",
    [vehicleId],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: "该车型不在对比集中" });
        return;
      }

      db.get(
        "SELECT COUNT(*) as count FROM comparison_set",
        [],
        (err, row) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({
            message: "已从对比集移除",
            vehicleId,
            count: row.count,
            maxSize: MAX_COMPARISON_SIZE,
          });
        },
      );
    },
  );
});

router.delete("/clear", (req, res) => {
  db.run("DELETE FROM comparison_set", [], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: "对比集已清空",
      count: 0,
      maxSize: MAX_COMPARISON_SIZE,
    });
  });
});

module.exports = router;
