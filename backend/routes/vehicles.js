const express = require("express");
const router = express.Router();
const db = require("../database");

const CATEGORIES = ["微型代步", "家用紧凑", "中大型", "商用"];
const SCENARIOS = ["城市通勤", "长途", "载货"];
const STATUSES = ["在售", "停售", "待上市"];

router.get("/", (req, res) => {
  const { category, scenario, status, minPrice, maxPrice, minRange, maxRange } =
    req.query;

  let sql = "SELECT * FROM vehicles WHERE 1=1";
  const params = [];

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  if (minPrice) {
    sql += " AND price >= ?";
    params.push(parseFloat(minPrice));
  }
  if (maxPrice) {
    sql += " AND price <= ?";
    params.push(parseFloat(maxPrice));
  }
  if (minRange) {
    sql += " AND range >= ?";
    params.push(parseInt(minRange));
  }
  if (maxRange) {
    sql += " AND range <= ?";
    params.push(parseInt(maxRange));
  }
  if (scenario) {
    sql += " AND scenarios LIKE ?";
    params.push(`%${scenario}%`);
  }

  sql += " ORDER BY created_at DESC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const result = rows.map((row) => ({
      ...row,
      scenarios: JSON.parse(row.scenarios),
    }));
    res.json(result);
  });
});

router.get("/:id", (req, res) => {
  db.get("SELECT * FROM vehicles WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "车型不存在" });
      return;
    }
    row.scenarios = JSON.parse(row.scenarios);
    res.json(row);
  });
});

router.post("/", (req, res) => {
  const {
    name,
    brand,
    category,
    curb_weight,
    range,
    price,
    scenarios,
    status,
    material,
    energy_density,
  } = req.body;

  if (
    !name ||
    !brand ||
    !category ||
    !curb_weight ||
    !range ||
    !price ||
    !scenarios
  ) {
    res.status(400).json({ error: "必填字段缺失" });
    return;
  }

  if (!CATEGORIES.includes(category)) {
    res.status(400).json({ error: "无效的车型类别" });
    return;
  }

  if (status && !STATUSES.includes(status)) {
    res.status(400).json({ error: "无效的状态" });
    return;
  }

  const scenariosStr = JSON.stringify(scenarios);
  const vehicleStatus = status || "在售";

  const sql = `INSERT INTO vehicles 
    (name, brand, category, curb_weight, range, price, scenarios, status, material, energy_density)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    name,
    brand,
    category,
    curb_weight,
    range,
    price,
    scenariosStr,
    vehicleStatus,
    material,
    energy_density,
  ];

  db.run(sql, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, message: "车型创建成功" });
  });
});

router.put("/:id", (req, res) => {
  const {
    name,
    brand,
    category,
    curb_weight,
    range,
    price,
    scenarios,
    status,
    material,
    energy_density,
  } = req.body;

  const updates = [];
  const params = [];

  if (name) {
    updates.push("name = ?");
    params.push(name);
  }
  if (brand) {
    updates.push("brand = ?");
    params.push(brand);
  }
  if (category) {
    if (!CATEGORIES.includes(category)) {
      res.status(400).json({ error: "无效的车型类别" });
      return;
    }
    updates.push("category = ?");
    params.push(category);
  }
  if (curb_weight) {
    updates.push("curb_weight = ?");
    params.push(curb_weight);
  }
  if (range) {
    updates.push("range = ?");
    params.push(range);
  }
  if (price !== undefined) {
    updates.push("price = ?");
    params.push(price);
  }
  if (scenarios) {
    updates.push("scenarios = ?");
    params.push(JSON.stringify(scenarios));
  }
  if (status) {
    if (!STATUSES.includes(status)) {
      res.status(400).json({ error: "无效的状态" });
      return;
    }
    updates.push("status = ?");
    params.push(status);
  }
  if (material !== undefined) {
    updates.push("material = ?");
    params.push(material);
  }
  if (energy_density !== undefined) {
    updates.push("energy_density = ?");
    params.push(energy_density);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  params.push(req.params.id);

  const sql = `UPDATE vehicles SET ${updates.join(", ")} WHERE id = ?`;

  db.run(sql, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: "车型不存在" });
      return;
    }
    res.json({ message: "车型更新成功" });
  });
});

router.delete("/:id", (req, res) => {
  db.run("DELETE FROM vehicles WHERE id = ?", [req.params.id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: "车型不存在" });
      return;
    }
    res.json({ message: "车型删除成功" });
  });
});

router.get("/stats/category", (req, res) => {
  const sql = `SELECT 
    category,
    COUNT(*) as count,
    AVG(curb_weight) as avg_weight,
    MIN(curb_weight) as min_weight,
    MAX(curb_weight) as max_weight,
    AVG(price) as avg_price,
    AVG(range) as avg_range
  FROM vehicles 
  WHERE status = '在售'
  GROUP BY category 
  ORDER BY category`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

router.get("/stats/weight-distribution", (req, res) => {
  const { category } = req.query;

  let sql = `SELECT 
    CASE 
      WHEN curb_weight < 1200 THEN '<1200kg'
      WHEN curb_weight >= 1200 AND curb_weight < 1500 THEN '1200-1500kg'
      WHEN curb_weight >= 1500 AND curb_weight < 1800 THEN '1500-1800kg'
      WHEN curb_weight >= 1800 AND curb_weight < 2200 THEN '1800-2200kg'
      WHEN curb_weight >= 2200 AND curb_weight < 2800 THEN '2200-2800kg'
      ELSE '>=2800kg'
    END as weight_range,
    COUNT(*) as count,
    GROUP_CONCAT(category) as categories
  FROM vehicles 
  WHERE status = '在售'`;

  const params = [];
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }

  sql += ` GROUP BY weight_range 
    ORDER BY MIN(curb_weight)`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

router.get("/stats/scenario-coverage", (req, res) => {
  const scenarioList = ["城市通勤", "长途", "载货"];

  const results = scenarioList.map((scenario) => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN scenarios LIKE ? THEN 1 ELSE 0 END) as matched,
        SUM(CASE WHEN scenarios LIKE ? AND curb_weight < 1500 THEN 1 ELSE 0 END) as lightweight_matched
      FROM vehicles 
      WHERE status = '在售'`;

      db.get(sql, [`%${scenario}%`, `%${scenario}%`], (err, row) => {
        if (err) reject(err);
        else {
          const coverage =
            row.total > 0 ? ((row.matched / row.total) * 100).toFixed(1) : 0;
          const lightweightRatio =
            row.matched > 0
              ? ((row.lightweight_matched / row.matched) * 100).toFixed(1)
              : 0;
          resolve({
            scenario,
            totalVehicles: row.total,
            matchedVehicles: row.matched,
            lightweightVehicles: row.lightweight_matched,
            coverage: parseFloat(coverage),
            lightweightRatio: parseFloat(lightweightRatio),
            hasGap: row.lightweight_matched === 0 || lightweightRatio < 20,
          });
        }
      });
    });
  });

  Promise.all(results)
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json({ error: err.message }));
});

router.get("/match/scenario/:scenario", (req, res) => {
  const { scenario } = req.params;

  if (!SCENARIOS.includes(scenario)) {
    res.status(400).json({ error: "无效的场景" });
    return;
  }

  const sql = `SELECT * FROM vehicles 
    WHERE status = '在售' AND scenarios LIKE ?
    ORDER BY 
      CASE 
        WHEN curb_weight < 1500 THEN 0
        WHEN curb_weight < 1800 THEN 1
        ELSE 2
      END,
      range DESC,
      price ASC`;

  db.all(sql, [`%${scenario}%`], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const result = rows.map((row) => ({
      ...row,
      scenarios: JSON.parse(row.scenarios),
      isLightweight: row.curb_weight < 1500,
    }));
    res.json(result);
  });
});

router.get("/stats/market-concentration", (req, res) => {
  db.serialize(() => {
    db.get(
      `SELECT 
      COUNT(*) as total,
      AVG(curb_weight) as avg_weight,
      SUM(CASE WHEN curb_weight >= 1800 THEN 1 ELSE 0 END) as heavy_count,
      SUM(CASE WHEN category = '中大型' OR category = '商用' THEN 1 ELSE 0 END) as large_category_count
    FROM vehicles WHERE status = '在售'`,
      (err, overall) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        db.all(
          `SELECT category, COUNT(*) as count
        FROM vehicles WHERE status = '在售'
        GROUP BY category`,
          (err, categories) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }

            const heavyRatio =
              overall.total > 0
                ? ((overall.heavy_count / overall.total) * 100).toFixed(1)
                : 0;
            const largeCategoryRatio =
              overall.total > 0
                ? (
                    (overall.large_category_count / overall.total) *
                    100
                  ).toFixed(1)
                : 0;

            const categoryDistribution = categories.map((c) => ({
              category: c.category,
              count: c.count,
              ratio:
                overall.total > 0
                  ? ((c.count / overall.total) * 100).toFixed(1)
                  : 0,
            }));

            const isOverConcentrated =
              parseFloat(heavyRatio) > 40 ||
              parseFloat(largeCategoryRatio) > 50;

            res.json({
              totalVehicles: overall.total,
              averageWeight: Math.round(overall.avg_weight),
              heavyVehicles: overall.heavy_count,
              heavyRatio: parseFloat(heavyRatio),
              largeCategoryVehicles: overall.large_category_count,
              largeCategoryRatio: parseFloat(largeCategoryRatio),
              categoryDistribution,
              isOverConcentrated,
              concentrationLevel: isOverConcentrated
                ? parseFloat(heavyRatio) > 55
                  ? "高度集中"
                  : "中度集中"
                : "分布均衡",
            });
          },
        );
      },
    );
  });
});

router.get("/stats/tier-trend", (req, res) => {
  const { indicator_type = "weight" } = req.query;

  const sql = `SELECT 
    stat_date,
    tier_name,
    vehicle_count,
    indicator_type
  FROM tier_trend_stats 
  WHERE indicator_type = ?
  ORDER BY stat_date ASC, tier_name ASC`;

  db.all(sql, [indicator_type], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const dates = [...new Set(rows.map((r) => r.stat_date))].sort();
    const tierNames = [...new Set(rows.map((r) => r.tier_name))];

    const tierOrder = [
      "<1200kg",
      "1200-1500kg",
      "1500-1800kg",
      "1800-2200kg",
      "2200-2800kg",
      ">=2800kg",
    ];
    tierNames.sort((a, b) => tierOrder.indexOf(a) - tierOrder.indexOf(b));

    const series = tierNames.map((tier) => ({
      tier_name: tier,
      data: dates.map((date) => {
        const row = rows.find(
          (r) => r.stat_date === date && r.tier_name === tier,
        );
        return row ? row.vehicle_count : 0;
      }),
    }));

    res.json({
      dates,
      tierNames,
      series,
      indicator_type,
    });
  });
});

router.get("/stats/diversity-trend", (req, res) => {
  const sql = `SELECT 
    stat_year,
    total_vehicles,
    diversity_score,
    micro_count,
    compact_count,
    midsize_count,
    commercial_count,
    micro_ratio,
    compact_ratio,
    midsize_ratio,
    commercial_ratio,
    avg_weight,
    heavy_ratio,
    brand_count
  FROM annual_diversity_stats 
  ORDER BY stat_year ASC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const years = rows.map((r) => r.stat_year);
    const categoryTrend = [
      {
        category: "微型代步",
        data: rows.map((r) => r.micro_count),
        ratios: rows.map((r) => r.micro_ratio),
        color: "#52c41a",
      },
      {
        category: "家用紧凑",
        data: rows.map((r) => r.compact_count),
        ratios: rows.map((r) => r.compact_ratio),
        color: "#1890ff",
      },
      {
        category: "中大型",
        data: rows.map((r) => r.midsize_count),
        ratios: rows.map((r) => r.midsize_ratio),
        color: "#722ed1",
      },
      {
        category: "商用",
        data: rows.map((r) => r.commercial_count),
        ratios: rows.map((r) => r.commercial_ratio),
        color: "#fa8c16",
      },
    ];

    const trendAnalysis = analyzeDiversityTrend(rows);

    res.json({
      years,
      categoryTrend,
      diversityScores: rows.map((r) => r.diversity_score),
      heavyRatios: rows.map((r) => r.heavy_ratio),
      avgWeights: rows.map((r) => Math.round(r.avg_weight)),
      brandCounts: rows.map((r) => r.brand_count),
      totalVehicles: rows.map((r) => r.total_vehicles),
      trendAnalysis,
      rawData: rows,
    });
  });
});

function analyzeDiversityTrend(data) {
  if (data.length < 2) {
    return {
      overallTrend: "stable",
      description: "数据不足，无法分析趋势",
      insights: [],
    };
  }

  const first = data[0];
  const last = data[data.length - 1];
  const scoreChange = last.diversity_score - first.diversity_score;
  const heavyChange = last.heavy_ratio - first.heavy_ratio;

  let overallTrend = "stable";
  if (scoreChange > 5) overallTrend = "improving";
  else if (scoreChange < -5) overallTrend = "declining";

  const insights = [];

  if (heavyChange > 10) {
    insights.push({
      type: "warning",
      title: "重型化趋势明显",
      content: `重型车型占比从${first.heavy_ratio.toFixed(1)}%上升至${last.heavy_ratio.toFixed(1)}%，市场呈现向大型车集中的趋势`,
    });
  } else if (heavyChange < -10) {
    insights.push({
      type: "positive",
      title: "轻量化趋势向好",
      content: `重型车型占比从${first.heavy_ratio.toFixed(1)}%下降至${last.heavy_ratio.toFixed(1)}%，市场供给更加均衡`,
    });
  }

  const microChange = last.micro_ratio - first.micro_ratio;
  if (microChange < -15) {
    insights.push({
      type: "warning",
      title: "微型代步供给萎缩",
      content: `微型代步车型占比下降${Math.abs(microChange).toFixed(1)}个百分点，城市通勤场景供给可能不足`,
    });
  }

  const compactChange = last.compact_ratio - first.compact_ratio;
  if (compactChange > 20) {
    insights.push({
      type: "info",
      title: "家用紧凑快速增长",
      content: `家用紧凑车型占比提升${compactChange.toFixed(1)}个百分点，成为市场主力`,
    });
  }

  if (scoreChange > 10) {
    insights.push({
      type: "positive",
      title: "多元化显著提升",
      content: `多元化评分从${first.diversity_score.toFixed(1)}提升至${last.diversity_score.toFixed(1)}，市场供给更加丰富`,
    });
  } else if (scoreChange < -10) {
    insights.push({
      type: "warning",
      title: "多元化程度下降",
      content: `多元化评分从${first.diversity_score.toFixed(1)}降至${last.diversity_score.toFixed(1)}，市场有集中化风险`,
    });
  }

  return {
    overallTrend,
    scoreChange: parseFloat(scoreChange.toFixed(1)),
    heavyChange: parseFloat(heavyChange.toFixed(1)),
    description:
      overallTrend === "improving"
        ? "供给多元化趋势向好"
        : overallTrend === "declining"
          ? "供给多元化呈下降趋势"
          : "供给结构保持稳定",
    insights,
  };
}

router.get("/stats/regions", (req, res) => {
  const sql = `SELECT 
    r.id,
    r.name,
    r.code,
    r.terrain_type,
    r.climate,
    r.typical_usage,
    r.description
  FROM regions r
  ORDER BY r.name`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

router.get("/stats/region/:id/analysis", (req, res) => {
  const regionId = req.params.id;

  db.serialize(() => {
    db.get(`SELECT * FROM regions WHERE id = ?`, [regionId], (err, region) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!region) {
        res.status(404).json({ error: "地区不存在" });
        return;
      }

      db.all(
        `SELECT * FROM region_vehicle_requirements WHERE region_id = ? ORDER BY priority DESC`,
        [regionId],
        (err, requirements) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          const categoryAnalyses = requirements.map((req) => {
            return new Promise((resolve, reject) => {
              const params = [];
              let sql = `SELECT COUNT(*) as total FROM vehicles WHERE status = '在售' AND category = ?`;
              params.push(req.category);

              if (req.min_range) {
                sql += ` AND range >= ?`;
                params.push(req.min_range);
              }
              if (req.max_range) {
                sql += ` AND range <= ?`;
                params.push(req.max_range);
              }
              if (req.min_weight) {
                sql += ` AND curb_weight >= ?`;
                params.push(req.min_weight);
              }
              if (req.max_weight) {
                sql += ` AND curb_weight <= ?`;
                params.push(req.max_weight);
              }
              if (req.min_price) {
                sql += ` AND price >= ?`;
                params.push(req.min_price);
              }
              if (req.max_price) {
                sql += ` AND price <= ?`;
                params.push(req.max_price);
              }
              if (req.required_scenarios) {
                const scenarios = JSON.parse(req.required_scenarios);
                scenarios.forEach((s) => {
                  sql += ` AND scenarios LIKE ?`;
                  params.push(`%${s}%`);
                });
              }

              db.get(sql, params, (err, matchedRow) => {
                if (err) reject(err);

                db.get(
                  `SELECT COUNT(*) as category_total FROM vehicles WHERE status = '在售' AND category = ?`,
                  [req.category],
                  (err, totalRow) => {
                    if (err) reject(err);

                    const matched = matchedRow.total;
                    const categoryTotal = totalRow.category_total;
                    const targetCount = 10;
                    const coverage =
                      targetCount > 0
                        ? Math.min(100, (matched / targetCount) * 100)
                        : 0;

                    let gapLevel = "sufficient";
                    if (coverage < 30) gapLevel = "critical";
                    else if (coverage < 60) gapLevel = "warning";
                    else if (coverage < 80) gapLevel = "moderate";

                    resolve({
                      category: req.category,
                      matchedCount: matched,
                      categoryTotal,
                      targetCount,
                      coverage: parseFloat(coverage.toFixed(1)),
                      gapLevel,
                      requirements: {
                        range:
                          req.min_range || req.max_range
                            ? `${req.min_range || "-"}-${req.max_range || "-"}km`
                            : "无限制",
                        weight:
                          req.min_weight || req.max_weight
                            ? `${req.min_weight || "-"}-${req.max_weight || "-"}kg`
                            : "无限制",
                        price:
                          req.min_price || req.max_price
                            ? `${req.min_price || "-"}-${req.max_price || "-"}万元`
                            : "无限制",
                        scenarios: req.required_scenarios
                          ? JSON.parse(req.required_scenarios)
                          : [],
                      },
                    });
                  },
                );
              });
            });
          });

          Promise.all(categoryAnalyses)
            .then((analyses) => {
              const overallCoverage =
                analyses.length > 0
                  ? parseFloat(
                      (
                        analyses.reduce((sum, a) => sum + a.coverage, 0) /
                        analyses.length
                      ).toFixed(1),
                    )
                  : 0;

              const criticalGaps = analyses.filter(
                (a) => a.gapLevel === "critical",
              );
              const warningGaps = analyses.filter(
                (a) => a.gapLevel === "warning",
              );

              let overallLevel = "good";
              if (criticalGaps.length > 0) overallLevel = "critical";
              else if (warningGaps.length > 0) overallLevel = "warning";
              else if (overallCoverage < 80) overallLevel = "moderate";

              const matchingVehiclesPromises = requirements.map((req) => {
                return new Promise((resolve, reject) => {
                  const params = [];
                  let sql = `SELECT * FROM vehicles WHERE status = '在售' AND category = ?`;
                  params.push(req.category);

                  if (req.min_range) {
                    sql += ` AND range >= ?`;
                    params.push(req.min_range);
                  }
                  if (req.max_range) {
                    sql += ` AND range <= ?`;
                    params.push(req.max_range);
                  }
                  if (req.min_weight) {
                    sql += ` AND curb_weight >= ?`;
                    params.push(req.min_weight);
                  }
                  if (req.max_weight) {
                    sql += ` AND curb_weight <= ?`;
                    params.push(req.max_weight);
                  }

                  sql += ` ORDER BY range DESC, price ASC LIMIT 5`;

                  db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    resolve({
                      category: req.category,
                      vehicles: rows.map((v) => ({
                        ...v,
                        scenarios: JSON.parse(v.scenarios),
                      })),
                    });
                  });
                });
              });

              Promise.all(matchingVehiclesPromises)
                .then((matchingResults) => {
                  res.json({
                    region,
                    categoryAnalyses: analyses,
                    matchingVehicles: matchingResults,
                    overall: {
                      coverage: overallCoverage,
                      level: overallLevel,
                      levelText:
                        overallLevel === "good"
                          ? "供给充足"
                          : overallLevel === "moderate"
                            ? "供给基本满足"
                            : overallLevel === "warning"
                              ? "供给存在缺口"
                              : "供给严重不足",
                      categoryCount: analyses.length,
                      criticalGapCount: criticalGaps.length,
                      warningGapCount: warningGaps.length,
                      totalMatched: analyses.reduce(
                        (sum, a) => sum + a.matchedCount,
                        0,
                      ),
                    },
                  });
                })
                .catch((err) => res.status(500).json({ error: err.message }));
            })
            .catch((err) => res.status(500).json({ error: err.message }));
        },
      );
    });
  });
});

router.post("/match/custom-scenario", (req, res) => {
  const {
    name,
    minWeight,
    maxWeight,
    minRange,
    maxRange,
    minPrice,
    maxPrice,
    categories,
    scenarios,
    minEnergyDensity,
    maxEnergyDensity,
    lightweightPreferred,
  } = req.body;

  const params = [];
  let sql = `SELECT * FROM vehicles WHERE status = '在售'`;

  if (minWeight) {
    sql += ` AND curb_weight >= ?`;
    params.push(parseInt(minWeight));
  }
  if (maxWeight) {
    sql += ` AND curb_weight <= ?`;
    params.push(parseInt(maxWeight));
  }
  if (minRange) {
    sql += ` AND range >= ?`;
    params.push(parseInt(minRange));
  }
  if (maxRange) {
    sql += ` AND range <= ?`;
    params.push(parseInt(maxRange));
  }
  if (minPrice) {
    sql += ` AND price >= ?`;
    params.push(parseFloat(minPrice));
  }
  if (maxPrice) {
    sql += ` AND price <= ?`;
    params.push(parseFloat(maxPrice));
  }
  if (minEnergyDensity) {
    sql += ` AND energy_density >= ?`;
    params.push(parseFloat(minEnergyDensity));
  }
  if (maxEnergyDensity) {
    sql += ` AND energy_density <= ?`;
    params.push(parseFloat(maxEnergyDensity));
  }
  if (categories && categories.length > 0) {
    const placeholders = categories.map(() => "?").join(",");
    sql += ` AND category IN (${placeholders})`;
    params.push(...categories);
  }
  if (scenarios && scenarios.length > 0) {
    scenarios.forEach((s) => {
      sql += ` AND scenarios LIKE ?`;
      params.push(`%${s}%`);
    });
  }

  if (lightweightPreferred) {
    sql += ` ORDER BY curb_weight ASC, range DESC, price ASC`;
  } else {
    sql += ` ORDER BY range DESC, price ASC`;
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const result = rows.map((row) => ({
      ...row,
      scenarios: JSON.parse(row.scenarios),
      isLightweight: row.curb_weight < 1500,
    }));

    db.get(
      `SELECT COUNT(*) as total FROM vehicles WHERE status = '在售'`,
      (err, totalRow) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        const totalVehicles = totalRow.total;
        const matchedCount = result.length;
        const coverage =
          totalVehicles > 0
            ? parseFloat(((matchedCount / totalVehicles) * 100).toFixed(1))
            : 0;

        const lightweightCount = result.filter((v) => v.isLightweight).length;
        const lightweightRatio =
          matchedCount > 0
            ? parseFloat(((lightweightCount / matchedCount) * 100).toFixed(1))
            : 0;

        const categoryStats = {};
        result.forEach((v) => {
          if (!categoryStats[v.category]) {
            categoryStats[v.category] = {
              count: 0,
              avgWeight: 0,
              avgRange: 0,
              avgPrice: 0,
            };
          }
          categoryStats[v.category].count++;
          categoryStats[v.category].avgWeight += v.curb_weight;
          categoryStats[v.category].avgRange += v.range;
          categoryStats[v.category].avgPrice += v.price;
        });

        Object.keys(categoryStats).forEach((cat) => {
          const stats = categoryStats[cat];
          stats.avgWeight = Math.round(stats.avgWeight / stats.count);
          stats.avgRange = Math.round(stats.avgRange / stats.count);
          stats.avgPrice = parseFloat(
            (stats.avgPrice / stats.count).toFixed(1),
          );
          stats.ratio =
            matchedCount > 0
              ? parseFloat(((stats.count / matchedCount) * 100).toFixed(1))
              : 0;
        });

        let gapAnalysis = null;
        if (categories && categories.length > 0) {
          gapAnalysis = categories
            .filter((cat) => !categoryStats[cat])
            .map((cat) => ({
              category: cat,
              hasGap: true,
              description: `${cat}类别没有符合条件的车型`,
            }));
        }

        const suggestions = [];
        if (coverage < 20) {
          suggestions.push({
            type: "warning",
            content: `当前条件覆盖度仅${coverage}%，建议适当放宽筛选条件`,
          });
        }
        if (lightweightPreferred && lightweightRatio < 30 && matchedCount > 5) {
          suggestions.push({
            type: "info",
            content: `轻量化偏好已启用，但符合条件的轻量化车型占比仅${lightweightRatio}%，可考虑降低重量上限`,
          });
        }
        if (minRange && matchedCount > 0) {
          const avgRange = Math.round(
            result.reduce((sum, v) => sum + v.range, 0) / matchedCount,
          );
          if (avgRange < minRange + 50) {
            suggestions.push({
              type: "info",
              content: `匹配车型平均续航${avgRange}km，接近最低要求${minRange}km`,
            });
          }
        }

        res.json({
          scenarioName: name || "自定义场景",
          criteria: {
            minWeight: minWeight ? parseInt(minWeight) : null,
            maxWeight: maxWeight ? parseInt(maxWeight) : null,
            minRange: minRange ? parseInt(minRange) : null,
            maxRange: maxRange ? parseInt(maxRange) : null,
            minPrice: minPrice ? parseFloat(minPrice) : null,
            maxPrice: maxPrice ? parseFloat(maxPrice) : null,
            categories: categories || [],
            scenarios: scenarios || [],
            lightweightPreferred: !!lightweightPreferred,
          },
          totalVehicles,
          matchedCount,
          coverage,
          lightweightCount,
          lightweightRatio,
          vehicles: result,
          categoryStats,
          gapAnalysis,
          suggestions,
        });
      },
    );
  });
});

module.exports = router;
