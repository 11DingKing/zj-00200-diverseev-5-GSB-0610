import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Tag,
  Tabs,
  Progress,
  Statistic,
  List,
  Alert,
  Space,
} from "antd";
import {
  ThunderboltOutlined,
  RiseOutlined,
  WarningOutlined,
  BulbOutlined,
  ExperimentOutlined,
  CarOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { suggestionAPI, vehicleAPI } from "../api.js";
import ExportReportButton from "../components/ExportReportButton.jsx";

const { TabPane } = Tabs;

function Suggestions() {
  const [loading, setLoading] = useState(true);
  const [lightweightData, setLightweightData] = useState(null);
  const [diversityData, setDiversityData] = useState(null);
  const [techProgress, setTechProgress] = useState([]);
  const [concentration, setConcentration] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lightweightRes, diversityRes, techRes, concentrationRes] =
        await Promise.all([
          suggestionAPI.getLightweight(),
          suggestionAPI.getDiversity(),
          suggestionAPI.getTechProgress(),
          vehicleAPI.getMarketConcentration(),
        ]);

      setLightweightData(lightweightRes.data);
      setDiversityData(diversityRes.data);
      setTechProgress(techRes.data);
      setConcentration(concentrationRes.data);
    } catch (error) {
      console.error("加载建议数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      urgent: <WarningOutlined style={{ color: "#ff4d4f" }} />,
      technology: <ExperimentOutlined style={{ color: "#1890ff" }} />,
      category: <CarOutlined style={{ color: "#722ed1" }} />,
      policy: <BulbOutlined style={{ color: "#13c2c2" }} />,
      scenario: <RiseOutlined style={{ color: "#fa8c16" }} />,
    };
    return icons[type] || <BulbOutlined />;
  };

  const getTypeClass = (type) => {
    const classes = {
      urgent: "suggestion-urgent",
      technology: "suggestion-technology",
      category: "suggestion-category",
      policy: "suggestion-policy",
      scenario: "suggestion-scenario",
    };
    return classes[type] || "";
  };

  const getTypeLabel = (type) => {
    const labels = {
      urgent: "紧急建议",
      technology: "技术应用",
      category: "品类优化",
      policy: "政策引导",
      scenario: "场景适配",
    };
    return labels[type] || type;
  };

  const getTechTypeColor = (type) => {
    const colors = {
      material: "#52c41a",
      battery: "#1890ff",
      structure: "#722ed1",
    };
    return colors[type] || "#666";
  };

  const getTechTypeLabel = (type) => {
    const labels = {
      material: "材料技术",
      battery: "电池技术",
      structure: "结构技术",
    };
    return labels[type] || type;
  };

  const getMaturityColor = (level) => {
    const colors = {
      量产应用: "#52c41a",
      小批量应用: "#faad14",
      研发阶段: "#ff4d4f",
    };
    return colors[level] || "#666";
  };

  const getTechRadarOption = () => {
    const materialTech = techProgress.filter((t) => t.type === "material");
    const batteryTech = techProgress.filter((t) => t.type === "battery");
    const structureTech = techProgress.filter((t) => t.type === "structure");

    return {
      tooltip: {},
      title: {
        text: "技术成熟度与减重潜力",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      legend: { data: ["材料技术", "电池技术", "结构技术"], bottom: 0 },
      radar: {
        indicator: [
          { name: "减重潜力(%)", max: 40 },
          { name: "效率提升(%)", max: 40 },
          { name: "成熟度", max: 100 },
          { name: "应用前景", max: 100 },
        ],
        radius: "60%",
      },
      series: [
        {
          type: "radar",
          data: [
            {
              value: [
                Math.max(...materialTech.map((t) => t.weight_reduction)),
                Math.max(...materialTech.map((t) => t.efficiency_improvement)),
                70,
                80,
              ],
              name: "材料技术",
              itemStyle: { color: "#52c41a" },
              areaStyle: { opacity: 0.3 },
            },
            {
              value: [
                Math.max(...batteryTech.map((t) => t.weight_reduction)),
                Math.max(...batteryTech.map((t) => t.efficiency_improvement)),
                75,
                90,
              ],
              name: "电池技术",
              itemStyle: { color: "#1890ff" },
              areaStyle: { opacity: 0.3 },
            },
            {
              value: [
                Math.max(...structureTech.map((t) => t.weight_reduction)),
                Math.max(...structureTech.map((t) => t.efficiency_improvement)),
                65,
                75,
              ],
              name: "结构技术",
              itemStyle: { color: "#722ed1" },
              areaStyle: { opacity: 0.3 },
            },
          ],
        },
      ],
    };
  };

  const getTechBarOption = () => {
    const sortedTech = [...techProgress]
      .sort((a, b) => b.weight_reduction - a.weight_reduction)
      .slice(0, 10);
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      title: {
        text: "Top10 减重技术",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: { type: "value", name: "减重效果(%)" },
      yAxis: {
        type: "category",
        data: sortedTech.map((t) => t.name),
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          type: "bar",
          data: sortedTech.map((t) => ({
            value: t.weight_reduction,
            itemStyle: {
              color: getTechTypeColor(t.type),
              borderRadius: [0, 4, 4, 0],
            },
          })),
          label: { show: true, position: "right", formatter: "{c}%" },
          barWidth: "60%",
        },
      ],
    };
  };

  const getLightweightTrendOption = () => {
    if (!lightweightData) return {};
    const categories = lightweightData.categoryStats.map((c) => c.category);
    return {
      tooltip: { trigger: "axis" },
      title: {
        text: "各类别轻量化比例",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      legend: { data: ["车型总数", "轻量化车型数"], bottom: 0 },
      grid: { left: "3%", right: "4%", bottom: "15%", containLabel: true },
      xAxis: { type: "category", data: categories },
      yAxis: { type: "value", name: "车型数量" },
      series: [
        {
          name: "车型总数",
          type: "bar",
          data: lightweightData.categoryStats.map((c) => c.count),
          itemStyle: { color: "#1890ff" },
          label: { show: true, position: "top" },
        },
        {
          name: "轻量化车型数",
          type: "bar",
          data: lightweightData.categoryStats.map((c) => c.lightweightCount),
          itemStyle: { color: "#52c41a" },
          label: { show: true, position: "top" },
        },
      ],
    };
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
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>发展建议</h2>
          <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 13 }}>
            基于数据分析的行业发展建议与技术进步方向
          </p>
        </div>
        <Space>
          <ExportReportButton
            reportType="custom"
            title="导出建议分析报告"
            sections={[
              "diversityTrend",
              "marketConcentration",
              "scenarioCoverage",
            ]}
            customConfig={{ customTitle: "新能源汽车发展建议分析报告" }}
            type="primary"
            ghost
          />
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="整体多元化评分"
              value={diversityData?.diversityScore || 0}
              suffix="/100"
              prefix={<BulbOutlined />}
              valueStyle={{
                color:
                  diversityData?.diversityScore >= 60 ? "#52c41a" : "#ff4d4f",
              }}
            />
            <div className="stat-label">
              <Tag
                color={
                  diversityData?.diversityScore >= 80
                    ? "green"
                    : diversityData?.diversityScore >= 60
                      ? "blue"
                      : diversityData?.diversityScore >= 40
                        ? "orange"
                        : "red"
                }
              >
                {diversityData?.diversityLevel}
              </Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="轻量化车型占比"
              value={lightweightData?.overall.lightweightRatio || 0}
              suffix="%"
              prefix={<ThunderboltOutlined />}
              valueStyle={{
                color:
                  lightweightData?.overall.lightweightRatio >= 30
                    ? "#52c41a"
                    : "#ff4d4f",
              }}
            />
            <div className="stat-label">
              共 {lightweightData?.overall.lightweightVehicles || 0}{" "}
              款轻量化车型
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="行业平均整备质量"
              value={lightweightData?.overall.averageWeight || 0}
              suffix="kg"
              valueStyle={{
                color:
                  lightweightData?.overall.averageWeight <= 1800
                    ? "#52c41a"
                    : "#ff4d4f",
              }}
            />
            <div className="stat-label">
              {lightweightData?.overall.averageWeight > 1800
                ? "偏高，建议减重"
                : "处于健康区间"}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="平均能量密度"
              value={lightweightData?.overall.avgEnergyDensity || 0}
              suffix="Wh/kg"
              prefix={<RiseOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
            <div className="stat-label">目标：250+ Wh/kg</div>
          </Card>
        </Col>
      </Row>

      {concentration?.isOverConcentrated && (
        <Alert
          message="市场集中度偏高"
          description={`当前市场${concentration.concentrationLevel}，重型车型占比${concentration.heavyRatio}%，中大型+商用占比${concentration.largeCategoryRatio}%，建议加快多元化发展`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}

      <Tabs defaultActiveKey="1">
        <TabPane tab="多元化与轻量化建议" key="1">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card className="chart-container">
                <div className="chart-title">发展建议</div>
                {lightweightData?.suggestions?.map((suggestion, index) => (
                  <Card
                    key={index}
                    className={`suggestion-card ${getTypeClass(suggestion.type)}`}
                    size="small"
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <Space style={{ marginBottom: 8 }}>
                          {getTypeIcon(suggestion.type)}
                          <Tag
                            color={
                              suggestion.type === "urgent"
                                ? "red"
                                : suggestion.type === "technology"
                                  ? "blue"
                                  : suggestion.type === "category"
                                    ? "purple"
                                    : suggestion.type === "policy"
                                      ? "cyan"
                                      : "orange"
                            }
                          >
                            {getTypeLabel(suggestion.type)}
                          </Tag>
                          <span style={{ fontWeight: 600, fontSize: 15 }}>
                            {suggestion.category}
                          </span>
                        </Space>
                        <h4 style={{ marginBottom: 8 }}>{suggestion.title}</h4>
                        <p style={{ color: "#666", marginBottom: 8 }}>
                          {suggestion.description}
                        </p>
                        <p style={{ color: "#52c41a", fontSize: 13 }}>
                          <RiseOutlined style={{ marginRight: 4 }} />
                          预期效果：{suggestion.expectedImpact}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card className="chart-container">
                <ReactECharts
                  option={getLightweightTrendOption()}
                  style={{ height: "350px" }}
                />
              </Card>
              <Card className="chart-container" style={{ marginTop: 16 }}>
                <div className="chart-title">各类别轻量化指标</div>
                {lightweightData?.categoryStats?.map((cat, index) => (
                  <div key={index} style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{cat.category}</span>
                      <span>{cat.lightweightRatio}% 轻量化</span>
                    </div>
                    <Progress
                      percent={cat.lightweightRatio}
                      strokeColor={
                        cat.lightweightRatio >= 30
                          ? "#52c41a"
                          : cat.lightweightRatio >= 15
                            ? "#faad14"
                            : "#ff4d4f"
                      }
                      size="small"
                    />
                    <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                      {cat.lightweightCount}/{cat.count} 款 | 均重{" "}
                      {cat.avgWeight} kg
                    </div>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="技术进展与应用" key="2">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={10}>
              <Card className="chart-container">
                <ReactECharts
                  option={getTechRadarOption()}
                  style={{ height: "400px" }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card className="chart-container">
                <ReactECharts
                  option={getTechBarOption()}
                  style={{ height: "400px" }}
                />
              </Card>
            </Col>
          </Row>

          <Card className="chart-container" style={{ marginTop: 16 }}>
            <div className="chart-title">技术详情</div>
            <Row gutter={[16, 16]}>
              {["material", "battery", "structure"].map((type) => (
                <Col xs={24} lg={8} key={type}>
                  <Card
                    size="small"
                    title={
                      <Space>
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 16,
                            background: getTechTypeColor(type),
                            borderRadius: 2,
                          }}
                        />
                        {getTechTypeLabel(type)}
                      </Space>
                    }
                  >
                    <List
                      size="small"
                      dataSource={techProgress.filter((t) => t.type === type)}
                      renderItem={(item) => (
                        <List.Item>
                          <List.Item.Meta
                            title={
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>
                                  {item.name}
                                </span>
                                <Tag
                                  color={getMaturityColor(item.maturity_level)}
                                >
                                  {item.maturity_level}
                                </Tag>
                              </div>
                            }
                            description={
                              <div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#666",
                                    marginBottom: 4,
                                  }}
                                >
                                  {item.description}
                                </div>
                                <Space size="middle">
                                  <span style={{ color: "#52c41a" }}>
                                    <ThunderboltOutlined /> 减重{" "}
                                    {item.weight_reduction}%
                                  </span>
                                  <span style={{ color: "#1890ff" }}>
                                    <RiseOutlined /> 提效{" "}
                                    {item.efficiency_improvement}%
                                  </span>
                                </Space>
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </TabPane>

        <TabPane tab="多元化发展建议" key="3">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card className="chart-container">
                <div className="chart-title">多元化发展建议</div>

                <Alert
                  message="核心结论"
                  description={
                    <div>
                      <p>
                        • 当前在售车型 {diversityData?.totalVehicles} 款，覆盖{" "}
                        {diversityData?.brandCount} 个品牌
                      </p>
                      <p>
                        • 价格覆盖 {diversityData?.priceRange?.min}-
                        {diversityData?.priceRange?.max} 万元
                      </p>
                      <p>
                        • 续航覆盖 {diversityData?.rangeRange?.min}-
                        {diversityData?.rangeRange?.max} km
                      </p>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                {diversityData?.suggestions?.map((suggestion, index) => (
                  <Alert
                    key={index}
                    message={suggestion.content}
                    type={suggestion.priority === "high" ? "warning" : "info"}
                    showIcon
                    style={{ marginBottom: 12 }}
                  />
                ))}

                <Card
                  size="small"
                  style={{ marginTop: 16 }}
                  title="各状态车型分布"
                >
                  <Row gutter={[16, 16]}>
                    {diversityData?.statusDistribution?.map((status, index) => (
                      <Col xs={8} key={index}>
                        <Card size="small" style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#999",
                              marginBottom: 4,
                            }}
                          >
                            {status.status}
                          </div>
                          <div
                            style={{
                              fontSize: 24,
                              fontWeight: 700,
                              color:
                                status.status === "在售"
                                  ? "#52c41a"
                                  : status.status === "待上市"
                                    ? "#faad14"
                                    : "#ff4d4f",
                            }}
                          >
                            {status.count}
                          </div>
                          <Progress
                            percent={Math.round(
                              (status.count / diversityData.totalVehicles) *
                                100,
                            )}
                            size="small"
                            showInfo={false}
                            strokeColor={
                              status.status === "在售"
                                ? "#52c41a"
                                : status.status === "待上市"
                                  ? "#faad14"
                                  : "#ff4d4f"
                            }
                          />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card className="chart-container">
                <div className="chart-title">各类别分布偏差</div>
                {diversityData?.categoryDistribution?.map((cd, index) => (
                  <div key={index} style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{cd.category}</span>
                      <Space>
                        <span>{cd.count} 辆</span>
                        <span
                          style={{
                            color: cd.deviation > 0 ? "#ff4d4f" : "#52c41a",
                          }}
                        >
                          {cd.deviation > 0 ? "+" : ""}
                          {cd.deviation}%
                        </span>
                      </Space>
                    </div>
                    <div
                      style={{
                        position: "relative",
                        height: 24,
                        background: "#f0f0f0",
                        borderRadius: 4,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: 0,
                          width: 1,
                          height: "100%",
                          background: "#999",
                          zIndex: 2,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left:
                            cd.deviation >= 0
                              ? "50%"
                              : `${50 + cd.deviation / 2}%`,
                          top: 0,
                          width: `${Math.abs(cd.deviation) / 2}%`,
                          height: "100%",
                          background: cd.deviation >= 0 ? "#ff4d4f" : "#52c41a",
                          borderRadius: 4,
                          opacity: 0.6,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "#999",
                      }}
                    >
                      <span>供给不足</span>
                      <span>均衡（25%）</span>
                      <span>供给过剩</span>
                    </div>
                  </div>
                ))}
              </Card>

              <Card className="chart-container" style={{ marginTop: 16 }}>
                <div className="chart-title">发展路径建议</div>
                <List
                  size="small"
                  dataSource={[
                    {
                      title: "短期（1年内）",
                      content:
                        "聚焦微型代步和家用紧凑级别，推出3-5款轻量化车型，将轻量化比例提升至30%以上",
                    },
                    {
                      title: "中期（2-3年）",
                      content:
                        "完善技术体系，推广铝合金、高强度钢等轻量化材料，能量密度提升至200Wh/kg",
                    },
                    {
                      title: "长期（3-5年）",
                      content:
                        "实现固态电池量产应用，建立完善的整备质量标准体系，多元化评分达到80分以上",
                    },
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <span style={{ fontWeight: 600, color: "#1890ff" }}>
                            {item.title}
                          </span>
                        }
                        description={item.content}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
}

export default Suggestions;
