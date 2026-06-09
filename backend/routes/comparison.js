const express = require("express");
const router = express.Router();
const db = require("../database");

const MAX_COMPARISON_SIZE = 4;

function getComparisonVehicles() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT v.*, c.added_at
      FROM comparison_set c
      JOIN vehicles v ON v.id = c.vehicle_id
      ORDER BY c.added_at ASC`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      const result = rows.map((row) => ({
        ...row,
        scenarios: row.scenarios ? JSON.parse(row.scenarios) : [],
      }));
      resolve(result);
    });
  });
}

router.get("/", (req, res) => {
  getComparisonVehicles()
    .then((vehicles) => {
      res.json({
        count: vehicles.length,
        maxSize: MAX_COMPARISON_SIZE,
        vehicles,
      });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

router.post("/items", (req, res) => {
  const { vehicle_id } = req.body;

  if (!vehicle_id) {
    res.status(400).json({ error: "缺少 vehicle_id 参数" });
    return;
  }

  db.get(
    "SELECT id FROM vehicles WHERE id = ?",
    [vehicle_id],
    (err, vehicleRow) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!vehicleRow) {
        res.status(404).json({ error: "车型不存在" });
        return;
      }

      db.get(
        "SELECT id FROM comparison_set WHERE vehicle_id = ?",
        [vehicle_id],
        (err, existing) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          if (existing) {
            res.status(409).json({ error: "该车型已在对比集中，请勿重复添加" });
            return;
          }

          db.get(
            "SELECT COUNT(*) as cnt FROM comparison_set",
            [],
            (err, countRow) => {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }
              if (countRow.cnt >= MAX_COMPARISON_SIZE) {
                res.status(400).json({
                  error: `对比集最多容纳 ${MAX_COMPARISON_SIZE} 款车型，请先移除部分车型再添加`,
                });
                return;
              }

              db.run(
                "INSERT INTO comparison_set (vehicle_id) VALUES (?)",
                [vehicle_id],
                function (err) {
                  if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                  }
                  getComparisonVehicles()
                    .then((vehicles) => {
                      res.status(201).json({
                        message: "已加入对比集",
                        count: vehicles.length,
                        maxSize: MAX_COMPARISON_SIZE,
                        vehicles,
                      });
                    })
                    .catch((e) =>
                      res.status(500).json({ error: e.message }),
                    );
                },
              );
            },
          );
        },
      );
    },
  );
});

router.delete("/items/:vehicleId", (req, res) => {
  const vehicleId = req.params.vehicleId;
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
      getComparisonVehicles()
        .then((vehicles) => {
          res.json({
            message: "已从对比集移除",
            count: vehicles.length,
            maxSize: MAX_COMPARISON_SIZE,
            vehicles,
          });
        })
        .catch((e) => res.status(500).json({ error: e.message }));
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
      count: 0,
      maxSize: MAX_COMPARISON_SIZE,
      vehicles: [],
    });
  });
});

module.exports = router;
