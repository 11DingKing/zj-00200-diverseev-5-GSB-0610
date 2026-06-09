const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/tech-progress', (req, res) => {
  db.all('SELECT * FROM tech_progress ORDER BY type, created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

router.post('/tech-progress', (req, res) => {
  const { type, name, description, weight_reduction, efficiency_improvement, maturity_level } = req.body;
  
  if (!type || !name) {
    res.status(400).json({ error: '必填字段缺失' });
    return;
  }

  const sql = `INSERT INTO tech_progress 
    (type, name, description, weight_reduction, efficiency_improvement, maturity_level)
    VALUES (?, ?, ?, ?, ?, ?)`;
  
  const params = [type, name, description, weight_reduction, efficiency_improvement, maturity_level];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, message: '技术进展创建成功' });
  });
});

router.get('/lightweight', (req, res) => {
  db.serialize(() => {
    db.get(`SELECT 
      COUNT(*) as total,
      AVG(curb_weight) as avg_weight,
      SUM(CASE WHEN curb_weight < 1500 THEN 1 ELSE 0 END) as lightweight_count,
      AVG(energy_density) as avg_energy_density
    FROM vehicles WHERE status = '在售'`, (err, overall) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      db.all(`SELECT category,
        COUNT(*) as count,
        AVG(curb_weight) as avg_weight,
        SUM(CASE WHEN curb_weight < 1500 THEN 1 ELSE 0 END) as lightweight_count
      FROM vehicles WHERE status = '在售'
      GROUP BY category`, (err, categoryStats) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        db.all('SELECT * FROM tech_progress ORDER BY weight_reduction DESC', (err, techProgress) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          const lightweightRatio = overall.total > 0 ? (overall.lightweight_count / overall.total * 100).toFixed(1) : 0;
          
          const suggestions = generateSuggestions(overall, categoryStats, techProgress);

          res.json({
            overall: {
              totalVehicles: overall.total,
              averageWeight: Math.round(overall.avg_weight),
              lightweightVehicles: overall.lightweight_count,
              lightweightRatio: parseFloat(lightweightRatio),
              avgEnergyDensity: overall.avg_energy_density ? parseFloat(overall.avg_energy_density.toFixed(1)) : null
            },
            categoryStats: categoryStats.map(c => ({
              category: c.category,
              count: c.count,
              avgWeight: Math.round(c.avg_weight),
              lightweightCount: c.lightweight_count,
              lightweightRatio: c.count > 0 ? parseFloat((c.lightweight_count / c.count * 100).toFixed(1)) : 0
            })),
            techProgress,
            suggestions
          });
        });
      });
    });
  });
});

function generateSuggestions(overall, categoryStats, techProgress) {
  const suggestions = [];
  const lightweightRatio = overall.total > 0 ? (overall.lightweight_count / overall.total * 100) : 0;

  if (lightweightRatio < 30) {
    suggestions.push({
      type: 'urgent',
      category: '整体策略',
      title: '提升轻量化车型供给比例',
      description: `当前轻量化车型（<1500kg）占比仅为${lightweightRatio.toFixed(1)}%，建议在未来1-2年内将该比例提升至40%以上。重点发展微型代步和家用紧凑级别的纯电车型。`,
      expectedImpact: '预计可降低行业平均整备质量5-8%，提升能效10-15%'
    });
  }

  const heavyCategories = categoryStats.filter(c => c.avg_weight > 2000);
  heavyCategories.forEach(cat => {
    suggestions.push({
      type: 'category',
      category: cat.category,
      title: `${cat.category}车型减重优化`,
      description: `${cat.category}车型平均整备质量达${Math.round(cat.avg_weight)}kg，轻量化车型占比仅${cat.count > 0 ? (cat.lightweight_count / cat.count * 100).toFixed(1) : 0}%。建议优化车身结构设计，引入轻量化材料。`,
      expectedImpact: `该类别减重15%可带来续航提升约10-12%`
    });
  });

  const materialTech = techProgress.filter(t => t.type === 'material' && t.weight_reduction > 0);
  if (materialTech.length > 0) {
    const topMaterial = materialTech[0];
    suggestions.push({
      type: 'technology',
      category: '材料应用',
      title: `推广${topMaterial.name}的应用`,
      description: `${topMaterial.name}可实现减重${topMaterial.weight_reduction}%，建议在${topMaterial.maturity_level === '量产应用' ? '主力车型中加速推广' : '原型车阶段加快验证'}。${topMaterial.description || ''}`,
      expectedImpact: `单车减重可达${topMaterial.weight_reduction > 10 ? '200-300kg' : '100-200kg'}`
    });
  }

  const batteryTech = techProgress.filter(t => t.type === 'battery');
  if (batteryTech.length > 0 && overall.avg_energy_density) {
    suggestions.push({
      type: 'technology',
      category: '电池技术',
      title: '提升电池能量密度',
      description: `当前行业平均能量密度约${overall.avg_energy_density.toFixed(1)}Wh/kg。建议加大固态电池、高镍三元等技术的研发投入。`,
      expectedImpact: '能量密度提升20%可在相同重量下增加续航25%'
    });
  }

  if (overall.avg_weight > 1800) {
    suggestions.push({
      type: 'policy',
      category: '标准引导',
      title: '建立整备质量分级管理标准',
      description: '建议行业协会建立新能源汽车整备质量分级标准，对轻量化达标车型给予政策支持，遏制"大而重"的盲目发展倾向。',
      expectedImpact: '引导行业健康多元化发展，避免同质化竞争'
    });
  }

  const cityGap = categoryStats.find(c => c.category === '微型代步' && c.count < 10);
  if (cityGap) {
    suggestions.push({
      type: 'scenario',
      category: '场景适配',
      title: '补充城市通勤场景的轻量化供给',
      description: '微型代步车型数量不足，城市通勤场景缺乏经济实用的轻量选择。建议开发1000-1200kg级别的城市通勤专用车型。',
      expectedImpact: '满足城市短途出行需求，降低用户购车和使用成本'
    });
  }

  return suggestions;
}

router.get('/diversity', (req, res) => {
  db.serialize(() => {
    db.all(`SELECT category, COUNT(*) as count FROM vehicles WHERE status = '在售' GROUP BY category`, (err, categoryCounts) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      db.get(`SELECT COUNT(*) as total FROM vehicles WHERE status = '在售'`, (err, overall) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        db.get(`SELECT 
          COUNT(DISTINCT brand) as brand_count,
          MIN(price) as min_price,
          MAX(price) as max_price,
          MIN(range) as min_range,
          MAX(range) as max_range
        FROM vehicles WHERE status = '在售'`, (err, diversityStats) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          db.all(`SELECT 
            status,
            COUNT(*) as count
          FROM vehicles 
          GROUP BY status`, (err, statusCounts) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }

            const total = overall.total;
            const expectedPerCategory = total / 4;
            const categoryDistribution = categoryCounts.map(c => ({
              category: c.category,
              count: c.count,
              ratio: total > 0 ? parseFloat((c.count / total * 100).toFixed(1)) : 0,
              deviation: expectedPerCategory > 0 ? parseFloat(((c.count - expectedPerCategory) / expectedPerCategory * 100).toFixed(1)) : 0
            }));

            const maxDeviation = Math.max(...categoryDistribution.map(c => Math.abs(c.deviation)));
            const diversityScore = Math.max(0, 100 - maxDeviation * 0.5);

            const diversityLevel = diversityScore >= 80 ? '优秀' : diversityScore >= 60 ? '良好' : diversityScore >= 40 ? '一般' : '待提升';

            const suggestions = [];
            if (diversityScore < 70) {
              suggestions.push({
                priority: 'high',
                content: '车型类别分布不均衡，建议加大薄弱类别的产品投入'
              });
            }
            if (diversityStats.brand_count < 15) {
              suggestions.push({
                priority: 'medium',
                content: '品牌数量相对较少，建议引入更多品牌参与竞争'
              });
            }

            res.json({
              totalVehicles: total,
              brandCount: diversityStats.brand_count,
              priceRange: { min: diversityStats.min_price, max: diversityStats.max_price },
              rangeRange: { min: diversityStats.min_range, max: diversityStats.max_range },
              categoryDistribution,
              statusDistribution: statusCounts,
              diversityScore: parseFloat(diversityScore.toFixed(1)),
              diversityLevel,
              suggestions
            });
          });
        });
      });
    });
  });
});

module.exports = router;
