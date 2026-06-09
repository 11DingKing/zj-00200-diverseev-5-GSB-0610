import React, { useState, useEffect } from "react";
import {
  Card,
  Slider,
  Button,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Alert,
  Tag,
  Space,
  Select,
  Typography,
  Divider,
  Empty,
  Spin,
  Tooltip,
} from "antd";
import {
  ThunderboltOutlined,
  RiseOutlined,
  FallOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { decisionAPI } from "../api";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const PolicySimulator = ({ onExportReport }) => {
  const [loading, setLoading] = useState(false);
  const [paramConfig, setParamConfig] = useState(null);
  const [parameters, setParameters] = useState({
    lightweightMaterialAdoption: 0,
    batteryEnergyDensityImprovement: 0,
    newEnergyVehicleIncentive: 0,
    heavyVehicleRestriction: 0,
    microVehicleSubsidy: 0,
    simulationYears: 3,
  });
  const [simulationResult, setSimulationResult] = useState(null);

  useEffect(() => {
    loadParamConfig();
  }, []);

  const loadParamConfig = async () => {
    try {
      const res = await decisionAPI.getSimulationParameters();
      setParamConfig(res.data);
    } catch (err) {
      console.error("加载参数配置失败:", err);
    }
  };

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await decisionAPI.simulatePolicy(parameters);
      setSimulationResult(res.data);
    } catch (err) {
      console.error("模拟失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setParameters({
      lightweightMaterialAdoption: 0,
      batteryEnergyDensityImprovement: 0,
      newEnergyVehicleIncentive: 0,
      heavyVehicleRestriction: 0,
      microVehicleSubsidy: 0,
      simulationYears: 3,
    });
    setSimulationResult(null);
  };

  const handleParamChange = (key, value) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportReport = () => {
    if (onExportReport && simulationResult) {
      onExportReport({
        type: "simulation",
        simulationParams: parameters,
        simulationResult,
      });
    }
  };

  const getTrendChartOption = () => {
    if (!simulationResult) return {};
    const { baseline, results } = simulationResult;
    const years = ["基准年", ...results.map((r) => r.yearLabel)];

    return {
      tooltip: { trigger: "axis" },
      legend: { data: ["多元化评分", "轻量化占比(%)", "重型车占比(%)"] },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: { type: "category", data: years },
      yAxis: { type: "value", min: 0, max: 100 },
      series: [
        {
          name: "多元化评分",
          type: "line",
          smooth: true,
          data: [baseline.diversityScore, ...results.map((r) => r.diversityScore)],
          lineStyle: { width: 3 },
          itemStyle: { color: "#1890ff" },
        },
        {
          name: "轻量化占比(%)",
          type: "line",
          smooth: true,
          data: [baseline.lightweightRatio, ...results.map((r) => r.lightweightRatio)],
          lineStyle: { width: 3 },
          itemStyle: { color: "#52c41a" },
        },
        {
          name: "重型车占比(%)",
          type: "line",
          smooth: true,
          data: [baseline.heavyRatio, ...results.map((r) => r.heavyRatio)],
          lineStyle: { width: 3 },
          itemStyle: { color: "#fa8c16" },
        },
      ],
    };
  };

  const getCategoryChartOption = () => {
    if (!simulationResult) return {};
    const { baseline, results } = simulationResult;
    const categories = ["微型代步", "家用紧凑", "中大型", "商用"];
    const finalYear = results[results.length - 1];

    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { data: ["基准年", `第${results.length}年`] },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: { type: "category", data: categories },
      yAxis: { type: "value", name: "占比(%)" },
      series: [
        {
          name: "基准年",
          type: "bar",
          data: categories.map(
            (c) => baseline.categoryDistribution.find((d) => d.category === c)?.ratio || 0,
          ),
          itemStyle: { color: "#1890ff" },
        },
        {
          name: `第${results.length}年`,
          type: "bar",
          data: categories.map(
            (c) => finalYear.categoryDistribution.find((d) => d.category === c)?.ratio || 0,
          ),
          itemStyle: { color: "#52c41a" },
        },
      ],
    };
  };

  const getScenarioChartOption = () => {
    if (!simulationResult) return {};
    const { baseline, results } = simulationResult;
    const scenarios = ["城市通勤", "长途", "载货"];
    const finalYear = results[results.length - 1];

    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { data: ["基准年", `第${results.length}年`] },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: { type: "category", data: scenarios },
      yAxis: { type: "value", name: "覆盖度(%)", max: 100 },
      series: [
        {
          name: "基准年",
          type: "bar",
          data: scenarios.map(
            (s) => baseline.scenarioCoverage.find((d) => d.scenario === s)?.coverage || 0,
          ),
          itemStyle: { color: "#722ed1" },
        },
        {
          name: `第${results.length}年`,
          type: "bar",
          data: scenarios.map(
            (s) => finalYear.scenarioCoverage.find((d) => d.scenario === s)?.coverage || 0,
          ),
          itemStyle: { color: "#13c2c2" },
        },
      ],
    };
  };

  const comparisonColumns = [
    {
      title: "指标",
      dataIndex: "name",
      key: "name",
      width: 150,
    },
    {
      title: "基准年",
      dataIndex: "baseline",
      key: "baseline",
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          {record.unit}
        </Space>
      ),
    },
    ...(simulationResult?.results || []).map((r, idx) => ({
      title: r.yearLabel,
      dataIndex: `year${r.year}`,
      key: `year${r.year}`,
      render: (text, record) => {
        const change = record[`change${r.year}`];
        return (
          <Space>
            <span style={{ fontWeight: idx === simulationResult.results.length - 1 ? 600 : 400 }}>
              {text}
            </span>
            {record.unit}
            {change !== undefined && change !== 0 && (
              <Tag
                color={change > 0 ? "green" : "red"}
                icon={change > 0 ? <RiseOutlined /> : <FallOutlined />}
              >
                {change > 0 ? "+" : ""}
                {change}
                {record.unit === "分" ? "" : "%"}
              </Tag>
            )}
          </Space>
        );
      },
    })),
  ];

  const getComparisonData = () => {
    if (!simulationResult) return [];
    const { baseline, results } = simulationResult;
    const data = [
      {
        name: "车型总数",
        unit: "款",
        baseline: baseline.totalVehicles,
        ...Object.fromEntries(results.map((r) => [`year${r.year}`, r.totalVehicles])),
        ...Object.fromEntries(results.map((r) => [`change${r.year}`, r.changes.totalVehicles])),
      },
      {
        name: "平均整备质量",
        unit: "kg",
        baseline: baseline.averageWeight,
        ...Object.fromEntries(results.map((r) => [`year${r.year}`, r.averageWeight])),
        ...Object.fromEntries(results.map((r) => [`change${r.year}`, r.changes.averageWeight])),
      },
      {
        name: "轻量化占比",
        unit: "%",
        baseline: baseline.lightweightRatio,
        ...Object.fromEntries(results.map((r) => [`year${r.year}`, r.lightweightRatio])),
        ...Object.fromEntries(results.map((r) => [`change${r.year}`, r.changes.lightweightRatio])),
      },
      {
        name: "重型车占比",
        unit: "%",
        baseline: baseline.heavyRatio,
        ...Object.fromEntries(results.map((r) => [`year${r.year}`, r.heavyRatio])),
        ...Object.fromEntries(
          results.map((r) => [`change${r.year}`, (r.heavyRatio - baseline.heavyRatio).toFixed(1)]),
        ),
      },
      {
        name: "多元化评分",
        unit: "分",
        baseline: baseline.diversityScore,
        ...Object.fromEntries(results.map((r) => [`year${r.year}`, r.diversityScore])),
        ...Object.fromEntries(results.map((r) => [`change${r.year}`, r.changes.diversityScore])),
      },
      {
        name: "市场集中度",
        unit: "",
        baseline: "—",
        ...Object.fromEntries(results.map((r) => [`year${r.year}`, r.concentrationLevel])),
      },
    ];
    return data;
  };

  const getConcentrationTagColor = (level) => {
    switch (level) {
      case "高度集中":
        return "red";
      case "中度集中":
        return "orange";
      case "分布均衡":
        return "green";
      default:
        return "default";
    }
  };

  return (
    <div className="policy-simulator">
      <div className="page-header">
        <Title level={3} style={{ margin: 0 }}>
          <ThunderboltOutlined /> 政策模拟器
        </Title>
        <Text type="secondary">
          通过调整政策参数，模拟分析对市场集中度、场景覆盖和多元化评分的影响
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            title="参数调节"
            extra={
              <Space>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleSimulate}
                  loading={loading}
                >
                  运行模拟
                </Button>
              </Space>
            }
          >
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              {paramConfig?.parameters.map((param) => (
                <div key={param.key}>
                  <div style={{ marginBottom: 8 }}>
                    <Space>
                      <Text strong>{param.name}</Text>
                      <Tooltip title={param.description}>
                        <InfoCircleOutlined style={{ color: "#1890ff" }} />
                      </Tooltip>
                    </Space>
                    <Text type="secondary" style={{ float: "right" }}>
                      {parameters[param.key]}
                      {param.unit}
                    </Text>
                  </div>
                  <Slider
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={parameters[param.key]}
                    onChange={(value) => handleParamChange(param.key, value)}
                    marks={{
                      [param.min]: param.min,
                      [param.max / 2]: param.max / 2,
                      [param.max]: param.max,
                    }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {param.impact}
                  </Text>
                </div>
              ))}

              <Divider />

              <div>
                <Text strong>模拟周期</Text>
                <Select
                  style={{ width: "100%", marginTop: 8 }}
                  value={parameters.simulationYears}
                  onChange={(value) => handleParamChange("simulationYears", value)}
                >
                  {paramConfig?.simulationOptions[0]?.options.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Spin spinning={loading}>
            {!simulationResult ? (
              <Card style={{ height: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Empty
                  description={
                    <Space direction="vertical" align="center">
                      <Text>调整左侧参数后点击"运行模拟"查看结果</Text>
                      <Text type="secondary">系统将预测未来1-5年的市场变化趋势</Text>
                    </Space>
                  }
                />
              </Card>
            ) : (
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                {simulationResult.insights?.length > 0 && (
                  <Card title="模拟洞察">
                    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                      {simulationResult.insights.map((insight, idx) => (
                        <Alert
                          key={idx}
                          message={insight.title}
                          description={insight.content}
                          type={insight.type === "warning" ? "warning" : insight.type === "info" ? "info" : "success"}
                          showIcon
                        />
                      ))}
                    </Space>
                  </Card>
                )}

                <Row gutter={[16, 16]}>
                  {simulationResult.results.map((result, idx) => (
                    <Col xs={24} md={8} key={result.year}>
                      <Card
                        title={result.yearLabel}
                        size="small"
                        style={{
                          borderTop: `3px solid ${idx === simulationResult.results.length - 1 ? "#52c41a" : "#1890ff"}`,
                        }}
                      >
                        <Row gutter={[8, 16]}>
                          <Col span={12}>
                            <Statistic
                              title="多元化评分"
                              value={result.diversityScore}
                              suffix="分"
                              valueStyle={{
                                color:
                                  result.changes.diversityScore > 0
                                    ? "#3f8600"
                                    : result.changes.diversityScore < 0
                                      ? "#cf1322"
                                      : "inherit",
                              }}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title="车型总数"
                              value={result.totalVehicles}
                              suffix="款"
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title="平均重量"
                              value={result.averageWeight}
                              suffix="kg"
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title="平均续航"
                              value={result.avgRange}
                              suffix="km"
                            />
                          </Col>
                        </Row>
                        <Divider style={{ margin: "12px 0" }} />
                        <Space direction="vertical" size="small" style={{ width: "100%" }}>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              轻量化占比
                            </Text>
                            <Progress
                              percent={result.lightweightRatio}
                              size="small"
                              strokeColor="#52c41a"
                            />
                          </div>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              重型车占比
                            </Text>
                            <Progress
                              percent={result.heavyRatio}
                              size="small"
                              strokeColor="#fa8c16"
                            />
                          </div>
                          <Tag color={getConcentrationTagColor(result.concentrationLevel)}>
                            {result.concentrationLevel}
                          </Tag>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>

                <Card
                  title="核心指标趋势对比"
                  extra={
                    onExportReport && (
                      <Button
                        type="primary"
                        ghost
                        icon={<FileTextOutlined />}
                        onClick={handleExportReport}
                      >
                        导出分析报告
                      </Button>
                    )
                  }
                >
                  <Table
                    columns={comparisonColumns}
                    dataSource={getComparisonData()}
                    pagination={false}
                    size="middle"
                  />
                </Card>

                <Card title="多元化与结构趋势">
                  <ReactECharts option={getTrendChartOption()} style={{ height: 350 }} />
                </Card>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card title="车型类别占比变化">
                      <ReactECharts option={getCategoryChartOption()} style={{ height: 300 }} />
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card title="场景覆盖度变化">
                      <ReactECharts option={getScenarioChartOption()} style={{ height: 300 }} />
                    </Card>
                  </Col>
                </Row>
              </Space>
            )}
          </Spin>
        </Col>
      </Row>
    </div>
  );
};

export default PolicySimulator;
