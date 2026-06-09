const express = require("express");
const router = express.Router();
const db = require("../database");

const CATEGORIES = ["微型代步", "家用紧凑", "中大型", "商用"];
const SCENARIOS = ["城市通勤", "长途", "载货"];

function calculateDiversityScore(categoryDistribution, total) {
  const expectedPerCategory = total / 4;
  let maxDeviation = 0;
  categoryDistribution.forEach((c) => {
    const deviation = Math.abs((c.count - expectedPerCategory) / expectedPerCategory) * 100;
    if (deviation > maxDeviation) maxDeviation = deviation;
  });
  return Math.max(0, 100 - maxDeviation * 0.5);
}

function getCurrentBaseline() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.get(
        `SELECT 
          COUNT(*) as total,
          AVG(curb_weight) as avg_weight,
          AVG(energy_density) as avg_energy_density,
          SUM(CASE WHEN curb_weight < 1500 THEN 1 ELSE 0 END) as lightweight_count,
          SUM(CASE WHEN curb_weight >= 1800 THEN 1 ELSE 0 END) as heavy_count,
          SUM(CASE WHEN category = '中大型' OR category = '商用' THEN 1 ELSE 0 END) as large_category_count
        FROM vehicles WHERE status = '在售'`,
        (err, overall) => {
          if (err) return reject(err);

          db.all(
            `SELECT category, COUNT(*) as count FROM vehicles WHERE status = '在售' GROUP BY category`,
            (err, categories) => {
              if (err) return reject(err);

              const scenarioPromises = SCENARIOS.map((scenario) => {
                return new Promise((res, rej) => {
                  db.get(
                    `SELECT 
                      COUNT(*) as total,
                      SUM(CASE WHEN scenarios LIKE ? THEN 1 ELSE 0 END) as matched
                    FROM vehicles WHERE status = '在售'`,
                    [`%${scenario}%`],
                    (err, row) => {
                      if (err) rej(err);
                      else
                        res({
                          scenario,
                          coverage:
                            row.total > 0
                              ? parseFloat(((row.matched / row.total) * 100).toFixed(1))
                              : 0,
                        });
                    },
                  );
                });
              });

              Promise.all(scenarioPromises).then((scenarioCoverage) => {
                const categoryDistribution = categories.map((c) => ({
                  category: c.category,
                  count: c.count,
                  ratio:
                    overall.total > 0
                      ? parseFloat(((c.count / overall.total) * 100).toFixed(1))
                      : 0,
                }));

                const diversityScore = calculateDiversityScore(
                  categoryDistribution,
                  overall.total,
                );

                resolve({
                  totalVehicles: overall.total,
                  averageWeight: Math.round(overall.avg_weight),
                  avgEnergyDensity: overall.avg_energy_density
                    ? parseFloat(overall.avg_energy_density.toFixed(1))
                    : 150,
                  lightweightRatio:
                    overall.total > 0
                      ? parseFloat(
                          ((overall.lightweight_count / overall.total) * 100).toFixed(1),
                        )
                      : 0,
                  heavyRatio:
                    overall.total > 0
                      ? parseFloat(
                          ((overall.heavy_count / overall.total) * 100).toFixed(1),
                        )
                      : 0,
                  largeCategoryRatio:
                    overall.total > 0
                      ? parseFloat(
                          ((overall.large_category_count / overall.total) * 100).toFixed(1),
                        )
                      : 0,
                  categoryDistribution,
                  scenarioCoverage,
                  diversityScore: parseFloat(diversityScore.toFixed(1)),
                });
              });
            },
          );
        },
      );
    });
  });
}

router.post("/simulate/policy", async (req, res) => {
  try {
    const {
      lightweightMaterialAdoption = 0,
      batteryEnergyDensityImprovement = 0,
      newEnergyVehicleIncentive = 0,
      heavyVehicleRestriction = 0,
      microVehicleSubsidy = 0,
      simulationYears = 3,
    } = req.body;

    const baseline = await getCurrentBaseline();

    const results = [];
    let currentState = { ...baseline };

    for (let year = 1; year <= simulationYears; year++) {
      const yearFactor = year / simulationYears;

      const weightReduction = lightweightMaterialAdoption * 0.15 * yearFactor;
      const newAvgWeight = Math.round(
        baseline.averageWeight * (1 - weightReduction / 100),
      );

      const rangeImprovement = batteryEnergyDensityImprovement * 0.8 * yearFactor;

      const incentiveEffect = newEnergyVehicleIncentive * 0.12 * yearFactor;
      const heavyRestrictionEffect = heavyVehicleRestriction * 0.18 * yearFactor;
      const microSubsidyEffect = microVehicleSubsidy * 0.25 * yearFactor;

      const microGrowth = 1 + (incentiveEffect + microSubsidyEffect) / 100;
      const compactGrowth = 1 + incentiveEffect / 150;
      const midsizeGrowth = 1 + (incentiveEffect - heavyRestrictionEffect * 0.5) / 150;
      const commercialGrowth = 1 + (incentiveEffect - heavyRestrictionEffect) / 150;

      const categoryDistribution = currentState.categoryDistribution.map((c) => {
        let growthRate = 1;
        switch (c.category) {
          case "微型代步":
            growthRate = microGrowth;
            break;
          case "家用紧凑":
            growthRate = compactGrowth;
            break;
          case "中大型":
            growthRate = midsizeGrowth;
            break;
          case "商用":
            growthRate = commercialGrowth;
            break;
        }
        return {
          ...c,
          count: Math.round(c.count * growthRate),
        };
      });

      const newTotal = categoryDistribution.reduce((sum, c) => sum + c.count, 0);
      categoryDistribution.forEach((c) => {
        c.ratio = parseFloat(((c.count / newTotal) * 100).toFixed(1));
      });

      const newHeavyRatio = Math.max(
        0,
        parseFloat(
          (baseline.heavyRatio * (1 - heavyRestrictionEffect / 200)).toFixed(1),
        ),
      );
      const newLightweightRatio = Math.min(
        100,
        parseFloat(
          (
            baseline.lightweightRatio *
            (1 + lightweightMaterialAdoption / 200 + microSubsidyEffect / 300)
          ).toFixed(1),
        ),
      );
      const newLargeCategoryRatio = parseFloat(
        (
          categoryDistribution
            .filter((c) => c.category === "中大型" || c.category === "商用")
            .reduce((sum, c) => sum + c.ratio, 0)
        ).toFixed(1),
      );

      const scenarioCoverage = SCENARIOS.map((scenario) => {
        const base = baseline.scenarioCoverage.find((s) => s.scenario === scenario);
        let improvement = 0;
        if (scenario === "城市通勤") {
          improvement = microSubsidyEffect * 0.3 + lightweightMaterialAdoption * 0.15;
        } else if (scenario === "长途") {
          improvement = batteryEnergyDensityImprovement * 0.4;
        } else if (scenario === "载货") {
          improvement = newEnergyVehicleIncentive * 0.2;
        }
        return {
          scenario,
          coverage: Math.min(
            100,
            parseFloat((base.coverage * (1 + improvement / 100)).toFixed(1)),
          ),
          improvement: parseFloat(improvement.toFixed(1)),
        };
      });

      const diversityScore = calculateDiversityScore(categoryDistribution, newTotal);

      const concentrationLevel =
        newHeavyRatio > 55 || newLargeCategoryRatio > 60
          ? "高度集中"
          : newHeavyRatio > 40 || newLargeCategoryRatio > 50
            ? "中度集中"
            : "分布均衡";

      const yearResult = {
        year,
        yearLabel: `第${year}年`,
        totalVehicles: newTotal,
        averageWeight: newAvgWeight,
        avgRange: Math.round(
          baseline.scenarioCoverage.find((s) => s.scenario === "长途")
            ? 450 * (1 + rangeImprovement / 100)
            : 450,
        ),
        lightweightRatio: newLightweightRatio,
        heavyRatio: newHeavyRatio,
        largeCategoryRatio: newLargeCategoryRatio,
        categoryDistribution,
        scenarioCoverage,
        diversityScore: parseFloat(diversityScore.toFixed(1)),
        concentrationLevel,
        changes: {
          totalVehicles: parseFloat(
            (((newTotal - baseline.totalVehicles) / baseline.totalVehicles) * 100).toFixed(1),
          ),
          averageWeight: parseFloat(
            (((newAvgWeight - baseline.averageWeight) / baseline.averageWeight) * 100).toFixed(1),
          ),
          lightweightRatio: parseFloat(
            (newLightweightRatio - baseline.lightweightRatio).toFixed(1),
          ),
          diversityScore: parseFloat(
            (diversityScore - baseline.diversityScore).toFixed(1),
          ),
        },
      };

      results.push(yearResult);
      currentState = {
        ...currentState,
        categoryDistribution,
        totalVehicles: newTotal,
      };
    }

    const insights = generateSimulationInsights(results, baseline, {
      lightweightMaterialAdoption,
      batteryEnergyDensityImprovement,
      newEnergyVehicleIncentive,
      heavyVehicleRestriction,
      microVehicleSubsidy,
    });

    res.json({
      baseline,
      parameters: {
        lightweightMaterialAdoption,
        batteryEnergyDensityImprovement,
        newEnergyVehicleIncentive,
        heavyVehicleRestriction,
        microVehicleSubsidy,
        simulationYears,
      },
      results,
      insights,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

function generateSimulationInsights(results, baseline, params) {
  const insights = [];
  const finalYear = results[results.length - 1];

  if (params.lightweightMaterialAdoption > 20) {
    insights.push({
      type: "positive",
      title: "轻量化效果显著",
      content: `轻量化材料普及率提升${params.lightweightMaterialAdoption}%，预计${results.length}年后行业平均整备质量降低${Math.abs(finalYear.changes.averageWeight)}%，轻量化车型占比提升${finalYear.changes.lightweightRatio}个百分点。`,
    });
  }

  if (params.batteryEnergyDensityImprovement > 15) {
    insights.push({
      type: "positive",
      title: "续航能力大幅提升",
      content: `电池能量密度提升${params.batteryEnergyDensityImprovement}%，长途场景覆盖度预计提升${finalYear.scenarioCoverage.find((s) => s.scenario === "长途").improvement}个百分点，有效缓解里程焦虑。`,
    });
  }

  if (params.microVehicleSubsidy > 20) {
    insights.push({
      type: "positive",
      title: "微型代步市场活跃",
      content: `微型车补贴政策刺激下，微型代步车型占比预计显著提升，城市通勤场景覆盖度改善明显。`,
    });
  }

  if (params.heavyVehicleRestriction > 20) {
    insights.push({
      type: "info",
      title: "重型车受限影响供给结构",
      content: `重型车限制政策使重型车型占比下降${(baseline.heavyRatio - finalYear.heavyRatio).toFixed(1)}个百分点，市场向轻量化转型。`,
    });
  }

  if (finalYear.changes.diversityScore > 5) {
    insights.push({
      type: "positive",
      title: "多元化程度提升",
      content: `政策组合拳见效，多元化评分从${baseline.diversityScore}提升至${finalYear.diversityScore}，市场供给更加均衡。`,
    });
  } else if (finalYear.changes.diversityScore < -5) {
    insights.push({
      type: "warning",
      title: "多元化风险",
      content: `当前政策组合可能导致市场集中化风险，建议调整政策参数以维持供给多样性。`,
    });
  }

  if (finalYear.concentrationLevel === "分布均衡") {
    insights.push({
      type: "positive",
      title: "市场结构健康",
      content: `模拟结果显示市场集中度保持在合理区间，各类车型均衡发展。`,
    });
  }

  return insights;
}

router.post("/recommend", (req, res) => {
  const {
    minBudget,
    maxBudget,
    primaryScenario,
    secondaryScenarios = [],
    preferredCategories = [],
    minRange = 0,
    maxWeight = 9999,
    lightweightPreferred = false,
    topN = 5,
  } = req.body;

  if (!minBudget || !maxBudget || !primaryScenario) {
    return res.status(400).json({ error: "预算区间和主要场景为必填项" });
  }

  const params = [];
  let sql = `SELECT * FROM vehicles WHERE status = '在售' AND price >= ? AND price <= ?`;
  params.push(parseFloat(minBudget), parseFloat(maxBudget));

  if (minRange) {
    sql += ` AND range >= ?`;
    params.push(parseInt(minRange));
  }

  if (maxWeight && maxWeight < 9999) {
    sql += ` AND curb_weight <= ?`;
    params.push(parseInt(maxWeight));
  }

  if (preferredCategories && preferredCategories.length > 0) {
    const placeholders = preferredCategories.map(() => "?").join(",");
    sql += ` AND category IN (${placeholders})`;
    params.push(...preferredCategories);
  }

  sql += ` AND scenarios LIKE ?`;
  params.push(`%${primaryScenario}%`);

  secondaryScenarios.forEach((s) => {
    sql += ` AND scenarios LIKE ?`;
    params.push(`%${s}%`);
  });

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const vehicles = rows.map((row) => ({
      ...row,
      scenarios: JSON.parse(row.scenarios),
      isLightweight: row.curb_weight < 1500,
    }));

    const scoredVehicles = vehicles.map((v) => {
      const scores = [];

      scores.push({
        name: "价格匹配度",
        score: calculatePriceScore(v.price, minBudget, maxBudget),
        weight: 0.25,
      });

      scores.push({
        name: "场景匹配度",
        score: calculateScenarioScore(
          v.scenarios,
          primaryScenario,
          secondaryScenarios,
        ),
        weight: 0.3,
      });

      scores.push({
        name: "续航表现",
        score: calculateRangeScore(v.range, primaryScenario),
        weight: 0.2,
      });

      scores.push({
        name: "轻量化优势",
        score: calculateLightweightScore(v.curb_weight, lightweightPreferred),
        weight: lightweightPreferred ? 0.15 : 0.1,
      });

      scores.push({
        name: "能量密度",
        score: calculateEnergyDensityScore(v.energy_density),
        weight: 0.1,
      });

      const totalScore = scores.reduce(
        (sum, s) => sum + s.score * s.weight,
        0,
      );

      const reasons = generateRecommendationReasons(
        v,
        scores,
        primaryScenario,
        minBudget,
        maxBudget,
      );

      return {
        ...v,
        scores,
        totalScore: parseFloat(totalScore.toFixed(1)),
        reasons,
      };
    });

    scoredVehicles.sort((a, b) => b.totalScore - a.totalScore);

    const topVehicles = scoredVehicles.slice(0, topN);

    const summary = generateRecommendationSummary(
      topVehicles,
      {
        minBudget,
        maxBudget,
        primaryScenario,
        secondaryScenarios,
        preferredCategories,
        lightweightPreferred,
      },
      scoredVehicles.length,
    );

    res.json({
      criteria: {
        minBudget: parseFloat(minBudget),
        maxBudget: parseFloat(maxBudget),
        primaryScenario,
        secondaryScenarios,
        preferredCategories,
        minRange: parseInt(minRange) || 0,
        maxWeight: parseInt(maxWeight) || 9999,
        lightweightPreferred: !!lightweightPreferred,
      },
      totalMatched: scoredVehicles.length,
      topN,
      recommendations: topVehicles,
      summary,
    });
  });
});

function calculatePriceScore(price, minBudget, maxBudget) {
  const midBudget = (minBudget + maxBudget) / 2;
  const range = maxBudget - minBudget;
  if (range === 0) return 100;
  const deviation = Math.abs(price - midBudget) / (range / 2);
  return Math.max(0, Math.round(100 - deviation * 50));
}

function calculateScenarioScore(scenarios, primary, secondary) {
  let score = 0;
  if (scenarios.includes(primary)) score += 50;
  secondary.forEach((s) => {
    if (scenarios.includes(s)) score += 25;
  });
  return Math.min(100, score);
}

function calculateRangeScore(range, scenario) {
  const benchmarks = {
    城市通勤: 300,
    长途: 500,
    载货: 350,
  };
  const benchmark = benchmarks[scenario] || 400;
  const ratio = range / benchmark;
  if (ratio >= 1.2) return 100;
  if (ratio >= 1) return 90;
  if (ratio >= 0.8) return 75;
  if (ratio >= 0.6) return 60;
  return Math.round(ratio * 100);
}

function calculateLightweightScore(weight, preferred) {
  if (weight < 1200) return preferred ? 100 : 85;
  if (weight < 1500) return preferred ? 90 : 75;
  if (weight < 1800) return preferred ? 60 : 65;
  if (weight < 2200) return preferred ? 40 : 50;
  return preferred ? 20 : 35;
}

function calculateEnergyDensityScore(density) {
  if (!density) return 50;
  if (density >= 200) return 100;
  if (density >= 180) return 90;
  if (density >= 160) return 80;
  if (density >= 140) return 65;
  if (density >= 120) return 50;
  return 35;
}

function generateRecommendationReasons(vehicle, scores, scenario, minBudget, maxBudget) {
  const reasons = [];
  const priceScore = scores.find((s) => s.name === "价格匹配度");
  const scenarioScore = scores.find((s) => s.name === "场景匹配度");
  const rangeScore = scores.find((s) => s.name === "续航表现");
  const lightweightScore = scores.find((s) => s.name === "轻量化优势");

  if (priceScore && priceScore.score >= 80) {
    if (vehicle.price <= (minBudget + maxBudget) / 2) {
      reasons.push(`价格${vehicle.price}万元，在预算区间内极具性价比`);
    } else {
      reasons.push(`价格${vehicle.price}万元，符合预算预期`);
    }
  }

  if (scenarioScore && scenarioScore.score >= 80) {
    reasons.push(`完美适配${scenario}场景`);
  } else if (scenarioScore && scenarioScore.score >= 50) {
    reasons.push(`支持${scenario}场景使用`);
  }

  if (rangeScore && rangeScore.score >= 80) {
    reasons.push(`续航${vehicle.range}km，表现优秀`);
  } else if (rangeScore && rangeScore.score >= 60) {
    reasons.push(`续航${vehicle.range}km，满足日常需求`);
  }

  if (lightweightScore && lightweightScore.score >= 80) {
    reasons.push(`整备质量${vehicle.curb_weight}kg，轻量化优势明显`);
  }

  if (vehicle.energy_density && vehicle.energy_density >= 180) {
    reasons.push(`电池能量密度${vehicle.energy_density}Wh/kg，技术先进`);
  }

  if (reasons.length === 0) {
    reasons.push(`综合性能均衡，符合您的选择标准`);
  }

  return reasons.slice(0, 3);
}

function generateRecommendationSummary(vehicles, criteria, totalMatched) {
  if (vehicles.length === 0) {
    return {
      hasResults: false,
      message: "没有找到完全符合条件的车型，建议适当放宽筛选条件",
    };
  }

  const avgPrice =
    vehicles.reduce((sum, v) => sum + v.price, 0) / vehicles.length;
  const avgRange =
    vehicles.reduce((sum, v) => sum + v.range, 0) / vehicles.length;
  const avgWeight =
    vehicles.reduce((sum, v) => sum + v.curb_weight, 0) / vehicles.length;
  const avgScore =
    vehicles.reduce((sum, v) => sum + v.totalScore, 0) / vehicles.length;

  const categories = [...new Set(vehicles.map((v) => v.category))];
  const brands = [...new Set(vehicles.map((v) => v.brand))];

  let overallLevel = "一般";
  if (avgScore >= 85) overallLevel = "优秀";
  else if (avgScore >= 75) overallLevel = "良好";
  else if (avgScore >= 65) overallLevel = "较好";

  const suggestions = [];
  if (totalMatched > vehicles.length * 2) {
    suggestions.push({
      type: "info",
      content: `共有${totalMatched}款车型符合基本条件，以上是综合评分最高的${vehicles.length}款推荐`,
    });
  }
  if (avgPrice < criteria.minBudget * 1.2) {
    suggestions.push({
      type: "positive",
      content: `推荐车型平均价格${avgPrice.toFixed(1)}万元，预算充足，可考虑升级配置`,
    });
  }
  if (criteria.lightweightPreferred && avgWeight > 1600) {
    suggestions.push({
      type: "warning",
      content: `偏好轻量化但推荐车型平均整备质量${Math.round(avgWeight)}kg，可进一步降低重量上限`,
    });
  }

  return {
    hasResults: true,
    totalMatched,
    recommendedCount: vehicles.length,
    averageScore: parseFloat(avgScore.toFixed(1)),
    averagePrice: parseFloat(avgPrice.toFixed(1)),
    averageRange: Math.round(avgRange),
    averageWeight: Math.round(avgWeight),
    categories,
    brands,
    overallLevel,
    suggestions,
    priceRange: {
      min: Math.min(...vehicles.map((v) => v.price)),
      max: Math.max(...vehicles.map((v) => v.price)),
    },
    rangeSpan: {
      min: Math.min(...vehicles.map((v) => v.range)),
      max: Math.max(...vehicles.map((v) => v.range)),
    },
  };
}

router.post("/report/generate", async (req, res) => {
  try {
    const {
      reportType = "comprehensive",
      includeBaseline = true,
      includeSimulation = false,
      simulationParams = null,
      includeRecommendation = false,
      recommendationCriteria = null,
      customTitle = "",
      sections = [],
    } = req.body;

    const reportData = {
      reportId: `RPT-${Date.now()}`,
      reportType,
      title:
        customTitle ||
        (reportType === "comprehensive"
          ? "新能源汽车产品多元化供给综合分析报告"
          : reportType === "simulation"
            ? "政策效果模拟分析报告"
            : reportType === "recommendation"
              ? "车型选购推荐报告"
              : "定制化分析报告"),
      generatedAt: new Date().toISOString(),
      sections: [],
    };

    const baseline = await getCurrentBaseline();

    if (includeBaseline || sections.includes("baseline")) {
      reportData.sections.push({
        id: "baseline",
        title: "当前市场基准分析",
        data: baseline,
        analysis: generateBaselineAnalysis(baseline),
      });
    }

    if (includeSimulation && simulationParams) {
      const simulationResult = await runSimulationForReport(simulationParams);
      reportData.sections.push({
        id: "simulation",
        title: "政策效果模拟分析",
        parameters: simulationParams,
        data: simulationResult.results,
        insights: simulationResult.insights,
      });
    }

    if (includeRecommendation && recommendationCriteria) {
      const recommendationResult = await runRecommendationForReport(
        recommendationCriteria,
      );
      reportData.sections.push({
        id: "recommendation",
        title: "车型选购推荐",
        criteria: recommendationCriteria,
        data: recommendationResult,
      });
    }

    if (sections.includes("marketConcentration")) {
      const concentration = await getMarketConcentration();
      reportData.sections.push({
        id: "marketConcentration",
        title: "市场集中度分析",
        data: concentration,
      });
    }

    if (sections.includes("scenarioCoverage")) {
      const coverage = await getScenarioCoverage();
      reportData.sections.push({
        id: "scenarioCoverage",
        title: "场景覆盖度分析",
        data: coverage,
      });
    }

    if (sections.includes("diversityTrend")) {
      const trend = await getDiversityTrend();
      reportData.sections.push({
        id: "diversityTrend",
        title: "多元化趋势分析",
        data: trend,
      });
    }

    reportData.summary = generateReportSummary(reportData.sections);

    res.json(reportData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

function generateBaselineAnalysis(baseline) {
  const analysis = [];

  if (baseline.diversityScore >= 80) {
    analysis.push({
      type: "positive",
      content: `当前市场多元化评分为${baseline.diversityScore}分，供给结构优秀`,
    });
  } else if (baseline.diversityScore >= 60) {
    analysis.push({
      type: "info",
      content: `当前市场多元化评分为${baseline.diversityScore}分，供给结构良好`,
    });
  } else {
    analysis.push({
      type: "warning",
      content: `当前市场多元化评分为${baseline.diversityScore}分，供给结构有待优化`,
    });
  }

  if (baseline.heavyRatio > 40) {
    analysis.push({
      type: "warning",
      content: `重型车型占比${baseline.heavyRatio}%，市场有向重型化集中的趋势`,
    });
  }

  if (baseline.lightweightRatio < 30) {
    analysis.push({
      type: "warning",
      content: `轻量化车型占比仅${baseline.lightweightRatio}%，提升空间较大`,
    });
  }

  const lowCoverageScenarios = baseline.scenarioCoverage.filter(
    (s) => s.coverage < 60,
  );
  lowCoverageScenarios.forEach((s) => {
    analysis.push({
      type: "warning",
      content: `${s.scenario}场景覆盖度仅${s.coverage}%，存在供给缺口`,
    });
  });

  return analysis;
}

async function runSimulationForReport(params) {
  return new Promise((resolve, reject) => {
    const {
      lightweightMaterialAdoption = 0,
      batteryEnergyDensityImprovement = 0,
      newEnergyVehicleIncentive = 0,
      heavyVehicleRestriction = 0,
      microVehicleSubsidy = 0,
      simulationYears = 3,
    } = params;

    getCurrentBaseline().then((baseline) => {
      const results = [];
      let currentState = { ...baseline };

      for (let year = 1; year <= simulationYears; year++) {
        const yearFactor = year / simulationYears;
        const weightReduction = lightweightMaterialAdoption * 0.15 * yearFactor;
        const newAvgWeight = Math.round(
          baseline.averageWeight * (1 - weightReduction / 100),
        );
        const rangeImprovement =
          batteryEnergyDensityImprovement * 0.8 * yearFactor;
        const incentiveEffect = newEnergyVehicleIncentive * 0.12 * yearFactor;
        const heavyRestrictionEffect =
          heavyVehicleRestriction * 0.18 * yearFactor;
        const microSubsidyEffect = microVehicleSubsidy * 0.25 * yearFactor;

        const microGrowth =
          1 + (incentiveEffect + microSubsidyEffect) / 100;
        const compactGrowth = 1 + incentiveEffect / 150;
        const midsizeGrowth =
          1 + (incentiveEffect - heavyRestrictionEffect * 0.5) / 150;
        const commercialGrowth =
          1 + (incentiveEffect - heavyRestrictionEffect) / 150;

        const categoryDistribution = currentState.categoryDistribution.map(
          (c) => {
            let growthRate = 1;
            switch (c.category) {
              case "微型代步":
                growthRate = microGrowth;
                break;
              case "家用紧凑":
                growthRate = compactGrowth;
                break;
              case "中大型":
                growthRate = midsizeGrowth;
                break;
              case "商用":
                growthRate = commercialGrowth;
                break;
            }
            return { ...c, count: Math.round(c.count * growthRate) };
          },
        );

        const newTotal = categoryDistribution.reduce(
          (sum, c) => sum + c.count,
          0,
        );
        categoryDistribution.forEach((c) => {
          c.ratio = parseFloat(((c.count / newTotal) * 100).toFixed(1));
        });

        const newHeavyRatio = Math.max(
          0,
          parseFloat(
            (
              baseline.heavyRatio *
              (1 - heavyRestrictionEffect / 200)
            ).toFixed(1),
          ),
        );
        const newLightweightRatio = Math.min(
          100,
          parseFloat(
            (
              baseline.lightweightRatio *
              (1 +
                lightweightMaterialAdoption / 200 +
                microSubsidyEffect / 300)
            ).toFixed(1),
          ),
        );
        const newLargeCategoryRatio = parseFloat(
          categoryDistribution
            .filter((c) => c.category === "中大型" || c.category === "商用")
            .reduce((sum, c) => sum + c.ratio, 0)
            .toFixed(1),
        );

        const scenarioCoverage = SCENARIOS.map((scenario) => {
          const base = baseline.scenarioCoverage.find(
            (s) => s.scenario === scenario,
          );
          let improvement = 0;
          if (scenario === "城市通勤")
            improvement =
              microSubsidyEffect * 0.3 + lightweightMaterialAdoption * 0.15;
          else if (scenario === "长途")
            improvement = batteryEnergyDensityImprovement * 0.4;
          else if (scenario === "载货")
            improvement = newEnergyVehicleIncentive * 0.2;
          return {
            scenario,
            coverage: Math.min(
              100,
              parseFloat(
                (base.coverage * (1 + improvement / 100)).toFixed(1),
              ),
            ),
          };
        });

        const diversityScore = calculateDiversityScore(
          categoryDistribution,
          newTotal,
        );

        results.push({
          year,
          totalVehicles: newTotal,
          averageWeight: newAvgWeight,
          avgRange: Math.round(450 * (1 + rangeImprovement / 100)),
          lightweightRatio: newLightweightRatio,
          heavyRatio: newHeavyRatio,
          largeCategoryRatio: newLargeCategoryRatio,
          categoryDistribution,
          scenarioCoverage,
          diversityScore: parseFloat(diversityScore.toFixed(1)),
        });

        currentState = {
          ...currentState,
          categoryDistribution,
          totalVehicles: newTotal,
        };
      }

      const insights = generateSimulationInsights(
        results,
        baseline,
        params,
      );

      resolve({ results, insights });
    });
  });
}

async function runRecommendationForReport(criteria) {
  return new Promise((resolve, reject) => {
    const {
      minBudget,
      maxBudget,
      primaryScenario,
      secondaryScenarios = [],
      preferredCategories = [],
      minRange = 0,
      maxWeight = 9999,
      lightweightPreferred = false,
      topN = 5,
    } = criteria;

    const params = [];
    let sql = `SELECT * FROM vehicles WHERE status = '在售' AND price >= ? AND price <= ?`;
    params.push(parseFloat(minBudget), parseFloat(maxBudget));

    if (minRange) {
      sql += ` AND range >= ?`;
      params.push(parseInt(minRange));
    }
    if (maxWeight && maxWeight < 9999) {
      sql += ` AND curb_weight <= ?`;
      params.push(parseInt(maxWeight));
    }
    if (preferredCategories && preferredCategories.length > 0) {
      const placeholders = preferredCategories.map(() => "?").join(",");
      sql += ` AND category IN (${placeholders})`;
      params.push(...preferredCategories);
    }
    sql += ` AND scenarios LIKE ?`;
    params.push(`%${primaryScenario}%`);
    secondaryScenarios.forEach((s) => {
      sql += ` AND scenarios LIKE ?`;
      params.push(`%${s}%`);
    });

    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);

      const vehicles = rows.map((row) => ({
        ...row,
        scenarios: JSON.parse(row.scenarios),
        isLightweight: row.curb_weight < 1500,
      }));

      const scoredVehicles = vehicles.map((v) => {
        const scores = [
          {
            name: "价格匹配度",
            score: calculatePriceScore(v.price, minBudget, maxBudget),
            weight: 0.25,
          },
          {
            name: "场景匹配度",
            score: calculateScenarioScore(
              v.scenarios,
              primaryScenario,
              secondaryScenarios,
            ),
            weight: 0.3,
          },
          {
            name: "续航表现",
            score: calculateRangeScore(v.range, primaryScenario),
            weight: 0.2,
          },
          {
            name: "轻量化优势",
            score: calculateLightweightScore(v.curb_weight, lightweightPreferred),
            weight: lightweightPreferred ? 0.15 : 0.1,
          },
          {
            name: "能量密度",
            score: calculateEnergyDensityScore(v.energy_density),
            weight: 0.1,
          },
        ];
        const totalScore = scores.reduce(
          (sum, s) => sum + s.score * s.weight,
          0,
        );
        const reasons = generateRecommendationReasons(
          v,
          scores,
          primaryScenario,
          minBudget,
          maxBudget,
        );
        return { ...v, scores, totalScore: parseFloat(totalScore.toFixed(1)), reasons };
      });

      scoredVehicles.sort((a, b) => b.totalScore - a.totalScore);
      const topVehicles = scoredVehicles.slice(0, topN);
      const summary = generateRecommendationSummary(
        topVehicles,
        criteria,
        scoredVehicles.length,
      );

      resolve({ recommendations: topVehicles, summary });
    });
  });
}

function getMarketConcentration() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 
        COUNT(*) as total,
        AVG(curb_weight) as avg_weight,
        SUM(CASE WHEN curb_weight >= 1800 THEN 1 ELSE 0 END) as heavy_count,
        SUM(CASE WHEN category = '中大型' OR category = '商用' THEN 1 ELSE 0 END) as large_category_count
      FROM vehicles WHERE status = '在售'`,
      (err, overall) => {
        if (err) return reject(err);
        db.all(
          `SELECT category, COUNT(*) as count FROM vehicles WHERE status = '在售' GROUP BY category`,
          (err, categories) => {
            if (err) return reject(err);
            const heavyRatio =
              overall.total > 0
                ? parseFloat(((overall.heavy_count / overall.total) * 100).toFixed(1))
                : 0;
            const largeCategoryRatio =
              overall.total > 0
                ? parseFloat(
                    ((overall.large_category_count / overall.total) * 100).toFixed(1),
                  )
                : 0;
            resolve({
              totalVehicles: overall.total,
              heavyRatio,
              largeCategoryRatio,
              categoryDistribution: categories.map((c) => ({
                category: c.category,
                count: c.count,
                ratio:
                  overall.total > 0
                    ? parseFloat(((c.count / overall.total) * 100).toFixed(1))
                    : 0,
              })),
            });
          },
        );
      },
    );
  });
}

function getScenarioCoverage() {
  return new Promise((resolve, reject) => {
    const promises = SCENARIOS.map((scenario) => {
      return new Promise((res, rej) => {
        db.get(
          `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN scenarios LIKE ? THEN 1 ELSE 0 END) as matched
          FROM vehicles WHERE status = '在售'`,
          [`%${scenario}%`],
          (err, row) => {
            if (err) rej(err);
            else
              res({
                scenario,
                totalVehicles: row.total,
                matchedVehicles: row.matched,
                coverage:
                  row.total > 0
                    ? parseFloat(((row.matched / row.total) * 100).toFixed(1))
                    : 0,
              });
          },
        );
      });
    });
    Promise.all(promises).then(resolve).catch(reject);
  });
}

function getDiversityTrend() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        stat_year,
        total_vehicles,
        diversity_score,
        micro_ratio,
        compact_ratio,
        midsize_ratio,
        commercial_ratio,
        heavy_ratio
      FROM annual_diversity_stats 
      ORDER BY stat_year ASC`,
      (err, rows) => {
        if (err) return reject(err);
        resolve({
          years: rows.map((r) => r.stat_year),
          diversityScores: rows.map((r) => r.diversity_score),
          heavyRatios: rows.map((r) => r.heavy_ratio),
          categoryRatios: {
            micro: rows.map((r) => r.micro_ratio),
            compact: rows.map((r) => r.compact_ratio),
            midsize: rows.map((r) => r.midsize_ratio),
            commercial: rows.map((r) => r.commercial_ratio),
          },
        });
      },
    );
  });
}

function generateReportSummary(sections) {
  const keyMetrics = {};
  let overallAssessment = "数据不足，无法评估";

  const baselineSection = sections.find((s) => s.id === "baseline");
  if (baselineSection) {
    keyMetrics.currentDiversityScore = baselineSection.data.diversityScore;
    keyMetrics.currentTotalVehicles = baselineSection.data.totalVehicles;
    keyMetrics.currentLightweightRatio = baselineSection.data.lightweightRatio;

    if (baselineSection.data.diversityScore >= 80) {
      overallAssessment = "市场供给结构优秀，多元化程度高";
    } else if (baselineSection.data.diversityScore >= 60) {
      overallAssessment = "市场供给结构良好，多元化程度适中";
    } else {
      overallAssessment = "市场供给结构有待优化，多元化程度偏低";
    }
  }

  const simulationSection = sections.find((s) => s.id === "simulation");
  if (simulationSection && simulationSection.data.length > 0) {
    const finalYear = simulationSection.data[simulationSection.data.length - 1];
    keyMetrics.simulatedDiversityScore = finalYear.diversityScore;
    keyMetrics.simulatedLightweightRatio = finalYear.lightweightRatio;

    if (
      finalYear.diversityScore >
      (baselineSection?.data.diversityScore || 0) + 5
    ) {
      overallAssessment +=
        "。政策模拟显示多元化程度将显著提升，建议积极推进相关政策。";
    }
  }

  const recommendationSection = sections.find((s) => s.id === "recommendation");
  if (recommendationSection) {
    keyMetrics.recommendedCount =
      recommendationSection.data.recommendations?.length || 0;
  }

  return {
    keyMetrics,
    overallAssessment,
    sectionCount: sections.length,
    recommendations: [
      "持续关注市场供给结构变化，保持多元化发展方向",
      "加大轻量化技术研发投入，推进行业绿色转型",
      "建立政策效果评估机制，及时调整优化政策组合",
    ],
  };
}

router.get("/simulate/parameters", (req, res) => {
  res.json({
    parameters: [
      {
        key: "lightweightMaterialAdoption",
        name: "轻量化材料普及率",
        unit: "%",
        min: 0,
        max: 100,
        step: 5,
        default: 0,
        description: "假设高强度钢、铝合金、碳纤维等轻量化材料在新车中的应用比例提升幅度",
        impact:
          "普及率提升将降低行业平均整备质量，提高轻量化车型占比，改善城市通勤场景覆盖",
      },
      {
        key: "batteryEnergyDensityImprovement",
        name: "电池能量密度提升",
        unit: "%",
        min: 0,
        max: 100,
        step: 5,
        default: 0,
        description: "假设电池技术进步带来的能量密度提升幅度",
        impact: "能量密度提升将显著改善续航表现，提高长途场景覆盖度",
      },
      {
        key: "newEnergyVehicleIncentive",
        name: "新能源汽车补贴力度",
        unit: "%",
        min: 0,
        max: 100,
        step: 5,
        default: 0,
        description: "假设新能源汽车购置补贴、税收优惠等激励政策的力度变化",
        impact: "补贴力度提升将促进各类新能源汽车的市场推广",
      },
      {
        key: "heavyVehicleRestriction",
        name: "重型车限制政策",
        unit: "%",
        min: 0,
        max: 100,
        step: 5,
        default: 0,
        description: "假设对中大型、商用等重型车型的准入限制、限行政策力度",
        impact: "限制政策将降低重型车型占比，引导市场向轻量化转型",
      },
      {
        key: "microVehicleSubsidy",
        name: "微型车专项补贴",
        unit: "%",
        min: 0,
        max: 100,
        step: 5,
        default: 0,
        description: "假设针对微型代步车型的专项补贴、路权优先等政策力度",
        impact: "微型车补贴将显著提升微型代步车型占比，改善城市通勤场景供给",
      },
    ],
    simulationOptions: [
      {
        key: "simulationYears",
        name: "模拟周期",
        options: [
          { value: 1, label: "1年" },
          { value: 3, label: "3年" },
          { value: 5, label: "5年" },
        ],
        default: 3,
      },
    ],
  });
});

module.exports = router;
