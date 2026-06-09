import React, { useEffect, useState } from "react";
import { Row, Col, Card, Statistic, Progress, Tag, Alert, Space } from "antd";
import {
  CarOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { vehicleAPI, suggestionAPI } from "../api.js";
import ExportReportButton from "../components/ExportReportButton.jsx";

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [categoryStats, setCategoryStats] = useState([]);
  const [concentration, setConcentration] = useState(null);
  const [diversity, setDiversity] = useState(null);
  const [weightDist, setWeightDist] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [
        vehiclesRes,
        categoryRes,
        concentrationRes,
        diversityRes,
        weightRes,
      ] = await Promise.all([
        vehicleAPI.getVehicles({ status: "在售" }),
        vehicleAPI.getCategoryStats(),
        vehicleAPI.getMarketConcentration(),
        suggestionAPI.getDiversity(),
        vehicleAPI.getWeightDistribution(),
      ]);

      setOverview({
        total: vehiclesRes.data.length,
        avgWeight: concentrationRes.data.averageWeight,
        avgRange: Math.round(
          vehiclesRes.data.reduce((sum, v) => sum + v.range, 0) /
            vehiclesRes.data.length,
        ),
        avgPrice: (
          vehiclesRes.data.reduce((sum, v) => sum + v.price, 0) /
          vehiclesRes.data.length
        ).toFixed(1),
      });
      setCategoryStats(categoryRes.data);
      setConcentration(concentrationRes.data);
      setDiversity(diversityRes.data);
      setWeightDist(weightRes.data);
    } catch (error) {
      console.error("加载数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const categoryPieOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c}辆 ({d}%)" },
    legend: { bottom: "5%", left: "center" },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: "#fff", borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 16, fontWeight: "bold" } },
        labelLine: { show: false },
        data: categoryStats.map((c) => ({
          value: c.count,
          name: c.category,
          itemStyle: {
            color:
              c.category === "微型代步"
                ? "#52c41a"
                : c.category === "家用紧凑"
                  ? "#1890ff"
                  : c.category === "中大型"
                    ? "#722ed1"
                    : "#fa8c16",
          },
        })),
      },
    ],
  };

  const weightBarOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      data: weightDist.map((w) => w.weight_range),
      axisLabel: { rotate: 0 },
    },
    yAxis: { type: "value", name: "车型数量" },
    series: [
      {
        type: "bar",
        data: weightDist.map((w, idx) => ({
          value: w.count,
          itemStyle: {
            color: idx < 2 ? "#52c41a" : idx < 3 ? "#faad14" : "#ff4d4f",
          },
        })),
        label: { show: true, position: "top" },
        barWidth: "60%",
      },
    ],
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      <div
        className="page-header"
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>数据概览</h2>
          <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 13 }}>
            新能源汽车产品多元化供给综合数据总览
          </p>
        </div>
        <Space>
          <ExportReportButton
            reportType="comprehensive"
            title="导出综合报告"
            type="primary"
            ghost
          />
        </Space>
      </div>

      {concentration?.isOverConcentrated && (
        <Alert
          message="市场集中度预警"
          description={`当前市场${concentration.concentrationLevel}，重型车型占比${concentration.heavyRatio}%，建议关注多元化发展`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24 }}
          closable
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="在售车型总数"
              value={overview?.total || 0}
              suffix="辆"
              prefix={<CarOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
            <div className="stat-label">
              覆盖 {diversity?.brandCount || 0} 个品牌
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="平均整备质量"
              value={overview?.avgWeight || 0}
              suffix="kg"
              prefix={<ArrowUpOutlined />}
              valueStyle={{
                color: concentration?.heavyRatio > 40 ? "#ff4d4f" : "#52c41a",
              }}
            />
            <div className="stat-label">
              重型(≥1800kg)占比 {concentration?.heavyRatio || 0}%
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="平均续航里程"
              value={overview?.avgRange || 0}
              suffix="km"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
            <div className="stat-label">
              续航范围 {diversity?.rangeRange?.min || 0}-
              {diversity?.rangeRange?.max || 0}km
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="平均售价"
              value={overview?.avgPrice || 0}
              suffix="万元"
              valueStyle={{ color: "#fa8c16" }}
            />
            <div className="stat-label">
              价格区间 {diversity?.priceRange?.min || 0}-
              {diversity?.priceRange?.max || 0}万元
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card className="chart-container">
            <div className="chart-title">多元化评分</div>
            <div className="diversity-score">
              {diversity?.diversityScore || 0}
            </div>
            <div className="diversity-level">
              {diversity?.diversityLevel || "-"}
            </div>
            <div style={{ marginTop: 20 }}>
              <Progress
                percent={diversity?.diversityScore || 0}
                strokeColor={{ "0%": "#108ee9", "100%": "#87d068" }}
                size="large"
              />
            </div>
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <Tag color="blue">类别分布</Tag>
              <Tag color="green">品牌数量</Tag>
              <Tag color="orange">价格覆盖</Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="chart-container">
            <div className="chart-title">车型类别分布</div>
            <ReactECharts
              option={categoryPieOption}
              style={{ height: "280px" }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="chart-container">
            <div className="chart-title">市场集中度分析</div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span>中大型+商用占比</span>
                <span style={{ fontWeight: 600 }}>
                  {concentration?.largeCategoryRatio || 0}%
                </span>
              </div>
              <Progress
                percent={concentration?.largeCategoryRatio || 0}
                status={
                  concentration?.largeCategoryRatio > 50
                    ? "exception"
                    : "normal"
                }
                strokeColor={
                  concentration?.largeCategoryRatio > 50 ? "#ff4d4f" : "#52c41a"
                }
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span>重型车型(≥1800kg)占比</span>
                <span style={{ fontWeight: 600 }}>
                  {concentration?.heavyRatio || 0}%
                </span>
              </div>
              <Progress
                percent={concentration?.heavyRatio || 0}
                status={concentration?.heavyRatio > 40 ? "exception" : "normal"}
                strokeColor={
                  concentration?.heavyRatio > 40 ? "#ff4d4f" : "#52c41a"
                }
              />
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span>整体评估</span>
                <Tag
                  color={concentration?.isOverConcentrated ? "red" : "green"}
                >
                  {concentration?.concentrationLevel || "-"}
                </Tag>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="chart-container">
            <div className="chart-title">整备质量分布</div>
            <ReactECharts
              option={weightBarOption}
              style={{ height: "320px" }}
            />
            <div style={{ marginTop: 12, fontSize: "12px", color: "#999" }}>
              <Tag color="green">轻量化（{"<"}1500kg）</Tag>
              <Tag color="gold">中型（1500-1800kg）</Tag>
              <Tag color="red">重型（≥1800kg）</Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="chart-container">
            <div className="chart-title">各类别平均指标</div>
            <Row gutter={[8, 8]}>
              {categoryStats.map((cat) => (
                <Col xs={12} key={cat.category}>
                  <Card
                    size="small"
                    style={{
                      borderTop: `3px solid ${
                        cat.category === "微型代步"
                          ? "#52c41a"
                          : cat.category === "家用紧凑"
                            ? "#1890ff"
                            : cat.category === "中大型"
                              ? "#722ed1"
                              : "#fa8c16"
                      }`,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      {cat.category}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      <div>数量：{cat.count} 辆</div>
                      <div>均重：{Math.round(cat.avg_weight)} kg</div>
                      <div>均价：{cat.avg_price.toFixed(1)} 万元</div>
                      <div>均续航：{Math.round(cat.avg_range)} km</div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
