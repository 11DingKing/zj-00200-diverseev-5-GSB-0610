const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "data", "diverseev.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("数据库连接失败:", err.message);
  } else {
    console.log("数据库连接成功");
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      category TEXT NOT NULL,
      curb_weight INTEGER NOT NULL,
      range INTEGER NOT NULL,
      price REAL NOT NULL,
      scenarios TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '在售',
      material TEXT,
      energy_density REAL,
      launch_year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tech_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      weight_reduction REAL,
      efficiency_improvement REAL,
      maturity_level TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tier_trend_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stat_date TEXT NOT NULL,
      tier_name TEXT NOT NULL,
      vehicle_count INTEGER NOT NULL DEFAULT 0,
      indicator_type TEXT NOT NULL DEFAULT 'weight',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS annual_diversity_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stat_year INTEGER NOT NULL,
      total_vehicles INTEGER NOT NULL DEFAULT 0,
      diversity_score REAL NOT NULL DEFAULT 0,
      micro_count INTEGER DEFAULT 0,
      compact_count INTEGER DEFAULT 0,
      midsize_count INTEGER DEFAULT 0,
      commercial_count INTEGER DEFAULT 0,
      micro_ratio REAL DEFAULT 0,
      compact_ratio REAL DEFAULT 0,
      midsize_ratio REAL DEFAULT 0,
      commercial_ratio REAL DEFAULT 0,
      avg_weight REAL DEFAULT 0,
      heavy_ratio REAL DEFAULT 0,
      brand_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(stat_year)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      terrain_type TEXT NOT NULL,
      climate TEXT,
      typical_usage TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(code)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS region_vehicle_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      region_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      min_range INTEGER,
      max_range INTEGER,
      min_weight INTEGER,
      max_weight INTEGER,
      min_price REAL,
      max_price REAL,
      terrain_suitability TEXT,
      priority INTEGER DEFAULT 0,
      required_scenarios TEXT,
      FOREIGN KEY (region_id) REFERENCES regions(id),
      UNIQUE(region_id, category)
    )`);

    console.log("数据表初始化完成");
  });
}

module.exports = db;
