const express = require("express");
const router = express.Router();
const db = require("../database");

const MAX_COMPARE = 4;

router.get("/", (req, res) => {
  const sql = `SELECT cs.id as comp_id, cs.added_at, v.* 
    FROM comparison_set cs 
    JOIN vehicles v ON cs.vehicle_id = v.id 
    ORDER BY cs.added_at ASC`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const result = rows.map((row) => ({
      ...row,
      scenarios: JSON.parse(row.scenarios),
    }));
    res.json({ vehicles: result, count: result.length, maxCount: MAX_COMPARE });
  });
});

router.post("/add/:vehicleId", (req, res) => {
  const vehicleId = parseInt(req.params.vehicleId);

  db.get("SELECT id FROM vehicles WHERE id = ?", [vehicleId], (err, vehicle) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!vehicle) {
      res.status(404).json({ error: "车型不存在" });
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
        if (countRow.cnt >= MAX_COMPARE) {
          res
            .status(400)
            .json({ error: `对比集最多只能添加 ${MAX_COMPARE} 款车型` });
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
            res.json({ message: "已加入对比集", vehicleId });
          },
        );
      },
    );
  });
});

router.delete("/remove/:vehicleId", (req, res) => {
  const vehicleId = parseInt(req.params.vehicleId);
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
      res.json({ message: "已从对比集移除", vehicleId });
    },
  );
});

router.delete("/clear", (req, res) => {
  db.run("DELETE FROM comparison_set", [], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: "对比集已清空" });
  });
});

module.exports = router;
