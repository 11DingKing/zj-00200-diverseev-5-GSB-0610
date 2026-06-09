const express = require("express");
const router = express.Router();
const db = require("../database");

const MAX_COMPARE = 4;

router.get("/", (req, res) => {
  const sql = `
    SELECT cs.id as comparison_id, cs.added_at,
      v.id, v.name, v.brand, v.category, v.curb_weight,
      v.range, v.price, v.scenarios, v.status, v.material,
      v.energy_density, v.launch_year
    FROM comparison_set cs
    JOIN vehicles v ON cs.vehicle_id = v.id
    ORDER BY cs.added_at ASC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const result = rows.map((row) => ({
      comparisonId: row.comparison_id,
      addedAt: row.added_at,
      id: row.id,
      name: row.name,
      brand: row.brand,
      category: row.category,
      curb_weight: row.curb_weight,
      range: row.range,
      price: row.price,
      scenarios: JSON.parse(row.scenarios),
      status: row.status,
      material: row.material,
      energy_density: row.energy_density,
      launch_year: row.launch_year,
    }));
    res.json(result);
  });
});

router.post("/:vehicleId", (req, res) => {
  const { vehicleId } = req.params;

  db.get("SELECT * FROM vehicles WHERE id = ?", [vehicleId], (err, vehicle) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!vehicle) {
      res.status(404).json({ error: "车型不存在" });
      return;
    }

    db.get("SELECT COUNT(*) as count FROM comparison_set", [], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (row.count >= MAX_COMPARE) {
        res.status(400).json({
          error: `对比集最多容纳 ${MAX_COMPARE} 款车型，请先移除后再添加`,
        });
        return;
      }

      db.run(
        "INSERT INTO comparison_set (vehicle_id) VALUES (?)",
        [vehicleId],
        function (err) {
          if (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
              res
                .status(409)
                .json({ error: "该车型已在对比集中，请勿重复添加" });
              return;
            }
            res.status(500).json({ error: err.message });
            return;
          }
          res.status(201).json({
            id: this.lastID,
            message: "已加入对比集",
          });
        },
      );
    });
  });
});

router.delete("/:vehicleId", (req, res) => {
  db.run(
    "DELETE FROM comparison_set WHERE vehicle_id = ?",
    [req.params.vehicleId],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: "该车型不在对比集中" });
        return;
      }
      res.json({ message: "已从对比集移除" });
    },
  );
});

router.delete("/", (req, res) => {
  db.run("DELETE FROM comparison_set", [], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: "对比集已清空",
      removedCount: this.changes,
    });
  });
});

router.get("/count", (req, res) => {
  db.get("SELECT COUNT(*) as count FROM comparison_set", [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ count: row.count, max: MAX_COMPARE });
  });
});

module.exports = router;
