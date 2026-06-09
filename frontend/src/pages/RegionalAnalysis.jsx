import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Select,
  List,
  Tag,
  Empty,
  Statistic,
  Alert,
  Space,
  Progress,
  Table,
  Divider,
  Typography,
} from "antd";
import {
  CarOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  CarTwoTone,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { vehicleAPI, metaAPI } from "../api.js";
import ExportReportButton from "../components/ExportReportButton.jsx";

const { Option } = Select;
const { Title, Text } = Typography;

function RegionalAnalysis() {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regionAnalysis, setRegionAnalysis] = useState(null);
  const [meta, setMeta] = useState({ categories: [], scenarios: [] });

  useEffect(() => {
    loadMeta();
    loadRegions();
  }, []);

  useEffect(() => {
    if (selectedRegion) {
      loadRegionAnalysis();
    }
  }, [selectedRegion]);

  const loadMeta = async () => {
    try {
      const res = await metaAPI.getMeta();
      setMeta(res.data);
    } catch (error) {
      console.error("加载元数据失败:", error);
    }
  };

  const loadRegions = async () => {
    try {
      const res = await vehicleAPI.getRegions();
      setRegions(res.data);
      if (res.data.length > 0) {
        setSelectedRegion(res.data[0].id);
      }
    } catch (error) {
      console.error("加载地区数据失败:", error);
    }
  };

  const loadRegionAnalysis = async () => {
    if (!selectedRegion) return;
    setLoading(true);
    try {
      const res = await vehicleAPI.getRegionAnalysis(selectedRegion);
      setRegionAnalysis(res.data);
    } catch (error) {
      console.error("加载地区分析失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTerrainIcon = (terrain) => {
    const icons = {
      平原: "🌾",
      山区: "⛰️",
      丘陵: "🏔️",
      高原: "🏔️",
      城市拥堵: "🏙️",
    };
    return icons[terrain] || "📍";
  };

  const getGapLevelColor = (level) => {
    const colors = {
      sufficient: { color: "#52c41a", text: "供给充足", bg: "#f6ffed" },
      moderate: { color: "#1890ff", text: "供给基本满足", bg: "#e6f7ff" },
      warning: { color: "#faad14", text: "供给存在缺口", bg: "#fffbe6" },
      critical: { color: "#ff4d4f", text: "供给严重不足", bg: "#fff2f0" },
    };
    return colors[level] || colors.sufficient;
  };

  const getCategoryColor = (category) => {
    const colors = {
      微型代步: "#52c41a",
      家用紧凑: "#1890ff",
      中大型: "#722ed1",
      商用: "#fa8c16",
    };
    return colors[category] || "#666";
  };

  const getCoverageChartOption = () => {
    if (!regionAnalysis?.categoryAnalyses) return {};

    const data = regionAnalysis.categoryAnalyses;
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      title: {
        text: "各类别供给覆盖度",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: {
        type: "category",
        data: data.map((d) => d.category),
        axisLabel: { fontSize: 12 },
      },
      yAxis: {
        type: "value",
        name: "覆盖度(%)",
        max: 100,
      },
      series: [
        {
          type: "bar",
          data: data.map((d) => ({
            value: d.coverage,
            itemStyle: {
              color: getGapLevelColor(d.gapLevel).color,
              borderRadius: [4, 4, 0, 0],
            },
          })),
          label: { show: true, position: "top", formatter: "{c}%" },
          barWidth: "50%",
          markLine: {
            silent: true,
            lineStyle: { color: "#52c41a", type: "dashed" },
            data: [
              {
                yAxis: 80,
                label: { formatter: "充足线 80%", position: "insideEndTop" },
              },
            ],
          },
        },
      ],
    };
  };

  const getCategoryColumns = [
    {
      title: "车型类别",
      dataIndex: "category",
      key: "category",
      render: (text) => (
        <Space>
          <span style={{ color: getCategoryColor(text), fontWeight: 600 }}>
            {text}
          </span>
        </Space>
      ),
    },
    {
      title: "匹配车型",
      dataIndex: "matchedCount",
      key: "matchedCount",
      render: (text, record) => (
        <span>
          {text} / {record.targetCount} 款
        </span>
      ),
    },
    {
      title: "覆盖度",
      dataIndex: "coverage",
      key: "coverage",
      render: (text, record) => (
        <Progress
          percent={text}
          status={
            record.gapLevel === "critical"
              ? "exception"
              : record.gapLevel === "warning"
                ? "normal"
                : "success"
          }
          format={(percent) => `${percent}%`}
        />
      ),
    },
    {
      title: "供给状态",
      dataIndex: "gapLevel",
      key: "gapLevel",
      render: (text) => {
        const level = getGapLevelColor(text);
        return <Tag color={level.color}>{level.text}</Tag>;
      },
    },
    {
      title: "续航要求",
      dataIndex: ["requirements", "range"],
      key: "range",
    },
    {
      title: "重量要求",
      dataIndex: ["requirements", "weight"],
      key: "weight",
    },
    {
      title: "价格要求",
      dataIndex: ["requirements", "price"],
      key: "price",
    },
  ];

  if (loading) return <div>加载中...</div>;

  const selectedRegionData = regions.find((r) => r.id === selectedRegion);

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
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>地域分析</h2>
          <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 13 }}>
            按地域路况和用车环境匹配适配车型，分析各地供给覆盖和缺口
          </p>
        </div>
        <Space>
          <ExportReportButton
            reportType="custom"
            title="导出地域分析报告"
            sections={["scenarioCoverage", "marketConcentration"]}
            customConfig={{
              customTitle: `${selectedRegionData?.name || "地域"}新能源汽车供给分析报告`,
            }}
            type="primary"
            ghost
          />
        </Space>
      </div>

      <Card className="chart-container">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <h2 style={{ marginBottom: 8 }}>
              <EnvironmentOutlined style={{ marginRight: 8 }} />
              地域供给分析
            </h2>
            <p style={{ color: "#666", fontSize: 13 }}>
              按地域路况和用车环境匹配适配车型，分析各地供给覆盖和缺口
            </p>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              value={selectedRegion}
              onChange={setSelectedRegion}
              style={{ width: "100%", fontSize: 16 }}
              size="large"
              placeholder="选择地区"
            >
              {regions.map((region) => (
                <Option key={region.id} value={region.id}>
                  {getTerrainIcon(region.terrain_type)} {region.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={8}>
            {regionAnalysis?.overall && (
              <Space size="large">
                <Statistic
                  title="总体覆盖度"
                  value={regionAnalysis.overall.coverage}
                  suffix="%"
                  prefix={<CarOutlined />}
                  valueStyle={{
                    color:
                      regionAnalysis.overall.level === "good"
                        ? "#52c41a"
                        : regionAnalysis.overall.level === "critical"
                          ? "#ff4d4f"
                          : "#faad14",
                  }}
                />
                <Statistic
                  title="匹配车型"
                  value={regionAnalysis.overall.totalMatched}
                  suffix="款"
                  prefix={<CarOutlined />}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Space>
            )}
          </Col>
        </Row>
      </Card>

      {regionAnalysis?.region && (
        <Card className="chart-container" style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card className="chart-container">
                <div className="chart-title">地区信息</div>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <span style={{ fontSize: 48, marginRight: 16 }}>
                      {getTerrainIcon(regionAnalysis.region.terrain_type)}
                    </span>
                    <div>
                      <Title level={4} style={{ margin: 0 }}>
                        {regionAnalysis.region.name}
                      </Title>
                      <Tag color="blue">
                        {regionAnalysis.region.terrain_type}
                      </Tag>
                      <Tag color="green">{regionAnalysis.region.climate}</Tag>
                    </div>
                  </div>
                  <div>
                    <Text type="secondary">典型用车场景：</Text>
                    <div>{regionAnalysis.region.typical_usage}</div>
                  </div>
                  <div>
                    <Text type="secondary">特点：</Text>
                    <div>{regionAnalysis.region.description}</div>
                  </div>
                </Space>

                <Divider />

                <div
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    background: getGapLevelColor(regionAnalysis.overall.level)
                      .bg,
                    border: `1px solid ${getGapLevelColor(regionAnalysis.overall.level).color}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 16 }}>
                      供给整体评估
                    </span>
                    <Tag
                      color={
                        getGapLevelColor(regionAnalysis.overall.level).color
                      }
                      style={{ fontSize: 14, padding: "4px 12px" }}
                    >
                      {regionAnalysis.overall.levelText}
                    </Tag>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                    {regionAnalysis.overall.categoryCount} 个车型类别中，
                    {regionAnalysis.overall.criticalGapCount > 0 && (
                      <span style={{ color: "#ff4d4f" }}>
                        {regionAnalysis.overall.criticalGapCount} 个严重不足，
                      </span>
                    )}
                    {regionAnalysis.overall.warningGapCount > 0 && (
                      <span style={{ color: "#faad14" }}>
                        {regionAnalysis.overall.warningGapCount} 个存在缺口
                      </span>
                    )}
                    {regionAnalysis.overall.criticalGapCount === 0 &&
                      regionAnalysis.overall.warningGapCount === 0 && (
                        <span style={{ color: "#52c41a" }}>
                          全部类别供给充足
                        </span>
                      )}
                  </div>
                </div>

                {regionAnalysis.overall.criticalGapCount > 0 && (
                  <Alert
                    message="存在严重供给缺口"
                    description="建议：部分类别车型供给严重不足，需重点关注和补充"
                    type="error"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card className="chart-container">
                <ReactECharts
                  option={getCoverageChartOption()}
                  style={{ height: "350px" }}
                />
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {regionAnalysis?.categoryAnalyses && (
        <Card className="chart-container" style={{ marginTop: 16 }}>
          <div className="chart-title">各类别供给详情</div>
          <Table
            dataSource={regionAnalysis.categoryAnalyses}
            columns={getCategoryColumns}
            rowKey="category"
            pagination={false}
          />
        </Card>
      )}

      {regionAnalysis?.matchingVehicles && (
        <Card className="chart-container" style={{ marginTop: 16 }}>
          <div className="chart-title">适配车型推荐</div>
          {regionAnalysis.matchingVehicles.map((group) => (
            <div key={group.category} style={{ marginBottom: 24 }}>
              <Title
                level={5}
                style={{
                  color: getCategoryColor(group.category),
                  marginBottom: 16,
                }}
              >
                <CarTwoTone twoToneColor={getCategoryColor(group.category)} />
                {group.category}
                <Tag
                  color={getCategoryColor(group.category)}
                  style={{ marginLeft: 8 }}
                >
                  {group.vehicles.length} 款适配
                </Tag>
              </Title>
              {group.vehicles.length > 0 ? (
                <List
                  grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
                  dataSource={group.vehicles}
                  renderItem={(item) => (
                    <List.Item>
                      <Card
                        size="small"
                        style={{
                          height: "100%",
                          borderTop: `3px solid ${getCategoryColor(item.category)}`,
                        }}
                        actions={[
                          <span>
                            <ThunderboltOutlined /> {item.range}km
                          </span>,
                          <span>
                            <EnvironmentOutlined /> {item.curb_weight}kg
                          </span>,
                          <span>
                            <DollarOutlined /> {item.price.toFixed(1)}万
                          </span>,
                        ]}
                      >
                        <Card.Meta
                          title={
                            <div
                              style={{ display: "flex", alignItems: "center" }}
                            >
                              <span>
                                {item.brand} {item.name}
                              </span>
                              {item.curb_weight < 1500 && (
                                <Tag color="green" style={{ marginLeft: 8 }}>
                                  轻量化
                                </Tag>
                              )}
                            </div>
                          }
                          description={
                            <div>
                              <div>
                                {item.scenarios.map((s) => (
                                  <Tag key={s} size="small">
                                    {s}
                                  </Tag>
                                ))}
                              </div>
                            </div>
                          }
                        />
                      </Card>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="暂无适配车型" />
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export default RegionalAnalysis;
