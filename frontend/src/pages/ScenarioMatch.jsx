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
  Tabs,
  Form,
  InputNumber,
  Checkbox,
  Button,
  Slider,
  Divider,
  Typography,
} from "antd";
import {
  CarOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  SettingOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { vehicleAPI, suggestionAPI, metaAPI } from "../api.js";
import ExportReportButton from "../components/ExportReportButton.jsx";

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

function ScenarioMatch() {
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ scenarios: [], categories: [] });
  const [selectedScenario, setSelectedScenario] = useState("城市通勤");
  const [matchedVehicles, setMatchedVehicles] = useState([]);
  const [scenarioCoverage, setScenarioCoverage] = useState([]);
  const [currentCoverage, setCurrentCoverage] = useState(null);
  const [customForm] = Form.useForm();
  const [customResult, setCustomResult] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("preset");

  useEffect(() => {
    loadMeta();
    loadCoverage();
  }, []);

  useEffect(() => {
    if (selectedScenario) {
      loadMatchedVehicles();
    }
  }, [selectedScenario]);

  const loadMeta = async () => {
    try {
      const res = await metaAPI.getMeta();
      setMeta(res.data);
    } catch (error) {
      console.error("加载元数据失败:", error);
    }
  };

  const loadCoverage = async () => {
    try {
      const res = await vehicleAPI.getScenarioCoverage();
      setScenarioCoverage(res.data);
    } catch (error) {
      console.error("加载场景覆盖度失败:", error);
    }
  };

  const loadMatchedVehicles = async () => {
    setLoading(true);
    try {
      const res = await vehicleAPI.matchByScenario(selectedScenario);
      setMatchedVehicles(res.data);
      const coverage = scenarioCoverage.find(
        (s) => s.scenario === selectedScenario,
      );
      setCurrentCoverage(coverage);
    } catch (error) {
      console.error("加载匹配车型失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScenarioIcon = (scenario) => {
    const icons = {
      城市通勤: "🏙️",
      长途: "🛣️",
      载货: "📦",
    };
    return icons[scenario] || "🚗";
  };

  const getScenarioDescription = (scenario) => {
    const descriptions = {
      城市通勤:
        "适合城市日常代步，需求特点：轻量化、经济性、灵活便捷，理想重量<1500kg",
      长途: "适合城际长途出行，需求特点：长续航、快充、舒适性，理想重量1800-2200kg",
      载货: "适合货物运输，需求特点：大空间、高承载、可靠性，理想重量2500-3500kg",
    };
    return descriptions[scenario] || "";
  };

  const getMatchPieOption = () => {
    if (!currentCoverage) return {};
    const lightweightCount = currentCoverage.lightweightVehicles;
    const nonLightweightCount =
      currentCoverage.matchedVehicles - lightweightCount;

    return {
      tooltip: { trigger: "item", formatter: "{b}: {c}辆 ({d}%)" },
      legend: { bottom: "5%", left: "center" },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: "#fff", borderWidth: 2 },
          label: {
            show: true,
            position: "center",
            formatter: "{d}%",
            fontSize: 24,
            fontWeight: "bold",
          },
          emphasis: { label: { show: true, fontSize: 20, fontWeight: "bold" } },
          data: [
            {
              value: lightweightCount,
              name: "轻量化车型(<1500kg)",
              itemStyle: { color: "#52c41a" },
            },
            {
              value: nonLightweightCount,
              name: "其他车型",
              itemStyle: { color: "#d9d9d9" },
            },
          ],
        },
      ],
    };
  };

  const getWeightScatterOption = () => {
    const data = matchedVehicles.map((v) => [
      v.curb_weight,
      v.range,
      v.price,
      v.name,
      v.brand,
      v.isLightweight,
    ]);
    return {
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const d = params.data;
          return `${d[4]} ${d[3]}<br/>重量: ${d[0]}kg<br/>续航: ${d[1]}km<br/>价格: ${d[2]}万元`;
        },
      },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: {
        type: "value",
        name: "整备质量(kg)",
        splitLine: { lineStyle: { type: "dashed" } },
      },
      yAxis: {
        type: "value",
        name: "续航里程(km)",
        splitLine: { lineStyle: { type: "dashed" } },
      },
      series: [
        {
          type: "scatter",
          symbolSize: (data) => Math.max(20, data[2] * 0.8),
          data: data.map((d) => ({
            value: [d[0], d[1], d[2], d[3], d[4]],
            itemStyle: { color: d[5] ? "#52c41a" : "#1890ff", opacity: 0.7 },
          })),
          markLine: {
            silent: true,
            lineStyle: { color: "#ff4d4f", type: "dashed" },
            data: [
              {
                xAxis: 1500,
                label: {
                  formatter: "轻量化界限 1500kg",
                  position: "insideEndTop",
                },
              },
            ],
          },
        },
      ],
    };
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      微型代步: "#52c41a",
      家用紧凑: "#1890ff",
      中大型: "#722ed1",
      商用: "#fa8c16",
    };
    return colorMap[category] || "#666";
  };

  const getStatusTag = (status) => {
    const colorMap = {
      在售: "green",
      停售: "red",
      待上市: "orange",
    };
    return <Tag color={colorMap[status]}>{status}</Tag>;
  };

  const lightweightVehicles = matchedVehicles.filter((v) => v.isLightweight);
  const nonLightweightVehicles = matchedVehicles.filter(
    (v) => !v.isLightweight,
  );

  const handleCustomScenarioSubmit = async (values) => {
    setCustomLoading(true);
    try {
      const payload = {
        ...values,
        categories: values.categories || [],
        scenarios: values.scenarios || [],
      };
      const res = await vehicleAPI.matchCustomScenario(payload);
      setCustomResult(res.data);
    } catch (error) {
      console.error("自定义场景匹配失败:", error);
    } finally {
      setCustomLoading(false);
    }
  };

  const handleCustomScenarioReset = () => {
    customForm.resetFields();
    setCustomResult(null);
  };

  const getCustomResultPieOption = () => {
    if (!customResult) return {};
    const lightweightCount = customResult.lightweightCount;
    const nonLightweightCount = customResult.matchedCount - lightweightCount;

    return {
      tooltip: { trigger: "item", formatter: "{b}: {c}辆 ({d}%)" },
      legend: { bottom: "5%", left: "center" },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: "#fff", borderWidth: 2 },
          label: {
            show: true,
            position: "center",
            formatter: "{d}%",
            fontSize: 24,
            fontWeight: "bold",
          },
          emphasis: { label: { show: true, fontSize: 20, fontWeight: "bold" } },
          data: [
            {
              value: lightweightCount,
              name: "轻量化车型(<1500kg)",
              itemStyle: { color: "#52c41a" },
            },
            {
              value: nonLightweightCount,
              name: "其他车型",
              itemStyle: { color: "#d9d9d9" },
            },
          ],
        },
      ],
    };
  };

  const getCustomCategoryBarOption = () => {
    if (!customResult || !customResult.categoryStats) return {};
    const categories = Object.keys(customResult.categoryStats);
    const colorMap = {
      微型代步: "#52c41a",
      家用紧凑: "#1890ff",
      中大型: "#722ed1",
      商用: "#fa8c16",
    };

    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      title: {
        text: "各类别匹配数量",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: { fontSize: 12 },
      },
      yAxis: { type: "value", name: "车型数量" },
      series: [
        {
          type: "bar",
          data: categories.map((cat) => ({
            value: customResult.categoryStats[cat].count,
            itemStyle: {
              color: colorMap[cat] || "#666",
              borderRadius: [4, 4, 0, 0],
            },
          })),
          label: { show: true, position: "top", formatter: "{c}辆" },
          barWidth: "50%",
        },
      ],
    };
  };

  const presetScenarioContent = (
    <>
      <Card className="chart-container">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <h2 style={{ marginBottom: 8 }}>
              {getScenarioIcon(selectedScenario)} {selectedScenario}场景
            </h2>
            <p style={{ color: "#666", fontSize: 13 }}>
              {getScenarioDescription(selectedScenario)}
            </p>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              value={selectedScenario}
              onChange={setSelectedScenario}
              style={{ width: "100%", fontSize: 16 }}
              size="large"
            >
              {meta.scenarios.map((s) => (
                <Option key={s} value={s}>
                  {getScenarioIcon(s)} {s}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={8}>
            {currentCoverage && (
              <Space size="large">
                <Statistic
                  title="匹配车型"
                  value={currentCoverage.matchedVehicles}
                  suffix="辆"
                  prefix={<CarOutlined />}
                  valueStyle={{ color: "#1890ff" }}
                />
                <Statistic
                  title="轻量化"
                  value={currentCoverage.lightweightRatio}
                  suffix="%"
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{
                    color:
                      currentCoverage.lightweightRatio < 20
                        ? "#ff4d4f"
                        : "#52c41a",
                  }}
                />
              </Space>
            )}
          </Col>
        </Row>
      </Card>

      {currentCoverage?.hasGap && (
        <Alert
          message="轻量化车型供给不足"
          description={`${selectedScenario}场景的轻量化车型占比仅 ${currentCoverage.lightweightRatio}%，低于20%的健康线，建议补充更多轻量型产品`}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card className="chart-container">
            <div className="chart-title">轻量化车型占比</div>
            <ReactECharts
              option={getMatchPieOption()}
              style={{ height: "280px" }}
            />
            <Row gutter={[8, 8]} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Card
                  size="small"
                  style={{
                    textAlign: "center",
                    borderTop: "3px solid #52c41a",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#999" }}>轻量化车型</div>
                  <div
                    style={{ fontSize: 24, fontWeight: 700, color: "#52c41a" }}
                  >
                    {lightweightVehicles.length}
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  size="small"
                  style={{
                    textAlign: "center",
                    borderTop: "3px solid #1890ff",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#999" }}>其他车型</div>
                  <div
                    style={{ fontSize: 24, fontWeight: 700, color: "#1890ff" }}
                  >
                    {nonLightweightVehicles.length}
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card className="chart-container">
            <div className="chart-title">
              车型重量-续航分布（点大小代表价格）
            </div>
            <ReactECharts
              option={getWeightScatterOption()}
              style={{ height: "350px" }}
            />
          </Card>
        </Col>
      </Row>

      {lightweightVehicles.length > 0 && (
        <Card className="chart-container" style={{ marginTop: 16 }}>
          <div className="chart-title">
            <span className="lightweight-badge" style={{ marginRight: 8 }}>
              轻量化
            </span>
            推荐车型（{lightweightVehicles.length}款）
          </div>
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }}
            dataSource={lightweightVehicles}
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
                      <CarOutlined /> {item.category}
                    </span>,
                    <span>
                      <ThunderboltOutlined /> {item.range}km
                    </span>,
                    <span>
                      <DollarOutlined /> {item.price.toFixed(1)}万
                    </span>,
                  ]}
                >
                  <Card.Meta
                    title={
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span>
                          {item.brand} {item.name}
                        </span>
                        <Tag color="green" style={{ marginLeft: 8 }}>
                          轻量化
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <EnvironmentOutlined style={{ marginRight: 4 }} />
                          {item.curb_weight} kg
                        </div>
                        <div>
                          {item.scenarios.map((s) => (
                            <Tag key={s} size="small">
                              {s}
                            </Tag>
                          ))}
                          {getStatusTag(item.status)}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        </Card>
      )}

      <Card className="chart-container" style={{ marginTop: 16 }}>
        <div className="chart-title">
          全部匹配车型（{matchedVehicles.length}款）
        </div>
        {matchedVehicles.length > 0 ? (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
            dataSource={matchedVehicles}
            renderItem={(item) => (
              <List.Item>
                <Card
                  size="small"
                  style={{
                    height: "100%",
                    opacity: item.isLightweight ? 1 : 0.85,
                    borderTop: `3px solid ${getCategoryColor(item.category)}`,
                  }}
                  actions={[
                    <span>
                      <CarOutlined /> {item.category}
                    </span>,
                    <span>
                      <ThunderboltOutlined /> {item.range}km
                    </span>,
                    <span>
                      <DollarOutlined /> {item.price.toFixed(1)}万
                    </span>,
                  ]}
                >
                  <Card.Meta
                    title={
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span>
                          {item.brand} {item.name}
                        </span>
                        {item.isLightweight && (
                          <Tag color="green" style={{ marginLeft: 8 }}>
                            轻量化
                          </Tag>
                        )}
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <EnvironmentOutlined style={{ marginRight: 4 }} />
                          <span
                            style={{
                              color:
                                item.curb_weight < 1500
                                  ? "#52c41a"
                                  : item.curb_weight < 1800
                                    ? "#faad14"
                                    : "#ff4d4f",
                              fontWeight: 600,
                            }}
                          >
                            {item.curb_weight} kg
                          </span>
                        </div>
                        <div>
                          {item.scenarios.map((s) => (
                            <Tag key={s} size="small">
                              {s}
                            </Tag>
                          ))}
                          {getStatusTag(item.status)}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无匹配车型" />
        )}
      </Card>
    </>
  );

  const customScenarioContent = (
    <div>
      <Card className="chart-container">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <h2 style={{ marginBottom: 8 }}>
              <SettingOutlined style={{ marginRight: 8 }} />
              自定义用车场景
            </h2>
            <p style={{ color: "#666", fontSize: 13 }}>
              设置关键指标门槛，系统按自定义场景筛选车型并计算覆盖度
            </p>
          </Col>
          <Col xs={24} sm={12} md={16}>
            {customResult && (
              <Space size="large">
                <Statistic
                  title="匹配车型"
                  value={customResult.matchedCount}
                  suffix="辆"
                  prefix={<CarOutlined />}
                  valueStyle={{ color: "#1890ff" }}
                />
                <Statistic
                  title="覆盖度"
                  value={customResult.coverage}
                  suffix="%"
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{
                    color: customResult.coverage < 20 ? "#ff4d4f" : "#52c41a",
                  }}
                />
                <Statistic
                  title="轻量化占比"
                  value={customResult.lightweightRatio}
                  suffix="%"
                  prefix={<EnvironmentOutlined />}
                  valueStyle={{
                    color:
                      customResult.lightweightRatio < 30
                        ? "#ff4d4f"
                        : "#52c41a",
                  }}
                />
              </Space>
            )}
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <Card className="chart-container">
            <div className="chart-title">场景配置</div>
            <Form
              form={customForm}
              layout="vertical"
              onFinish={handleCustomScenarioSubmit}
              initialValues={{
                lightweightPreferred: true,
              }}
            >
              <Form.Item label="场景名称" name="name">
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="例如：山区通勤"
                  formatter={(value) => value}
                  parser={(value) => value}
                />
              </Form.Item>

              <Divider orientation="left">
                <Text strong>重量范围 (kg)</Text>
              </Divider>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item label="最小重量" name="minWeight">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={500}
                      max={5000}
                      placeholder="最小"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="最大重量" name="maxWeight">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={500}
                      max={5000}
                      placeholder="最大"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">
                <Text strong>续航范围 (km)</Text>
              </Divider>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item label="最小续航" name="minRange">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={100}
                      max={1000}
                      placeholder="最小"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="最大续航" name="maxRange">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={100}
                      max={1000}
                      placeholder="最大"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">
                <Text strong>价格范围 (万元)</Text>
              </Divider>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item label="最低价格" name="minPrice">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={3}
                      max={100}
                      step={0.5}
                      placeholder="最低"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="最高价格" name="maxPrice">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={3}
                      max={100}
                      step={0.5}
                      placeholder="最高"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">
                <Text strong>车型类别</Text>
              </Divider>
              <Form.Item name="categories">
                <Checkbox.Group
                  options={meta.categories.map((c) => ({
                    label: c,
                    value: c,
                  }))}
                />
              </Form.Item>

              <Divider orientation="left">
                <Text strong>适用场景</Text>
              </Divider>
              <Form.Item name="scenarios">
                <Checkbox.Group
                  options={meta.scenarios.map((s) => ({
                    label: s,
                    value: s,
                  }))}
                />
              </Form.Item>

              <Divider orientation="left">
                <Text strong>偏好设置</Text>
              </Divider>
              <Form.Item name="lightweightPreferred" valuePropName="checked">
                <Checkbox>优先展示轻量化车型</Checkbox>
              </Form.Item>

              <Space style={{ width: "100%", justifyContent: "center" }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={customLoading}
                  icon={<PlayCircleOutlined />}
                  size="large"
                >
                  开始匹配
                </Button>
                <Button onClick={handleCustomScenarioReset} size="large">
                  重置条件
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          {customResult ? (
            <div>
              {customResult.suggestions &&
                customResult.suggestions.length > 0 && (
                  <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    {customResult.suggestions.map((suggestion, idx) => (
                      <Col xs={24} key={idx}>
                        <Alert
                          message={
                            suggestion.type === "warning" ? "注意" : "提示"
                          }
                          description={suggestion.content}
                          type={
                            suggestion.type === "warning" ? "warning" : "info"
                          }
                          showIcon
                        />
                      </Col>
                    ))}
                  </Row>
                )}

              {customResult.gapAnalysis &&
                customResult.gapAnalysis.length > 0 && (
                  <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    {customResult.gapAnalysis.map((gap, idx) => (
                      <Col xs={24} key={idx}>
                        <Alert
                          message="供给缺口"
                          description={gap.description}
                          type="error"
                          showIcon
                        />
                      </Col>
                    ))}
                  </Row>
                )}

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card className="chart-container">
                    <ReactECharts
                      option={getCustomResultPieOption()}
                      style={{ height: "300px" }}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card className="chart-container">
                    <ReactECharts
                      option={getCustomCategoryBarOption()}
                      style={{ height: "300px" }}
                    />
                  </Card>
                </Col>
              </Row>

              {customResult.categoryStats &&
                Object.keys(customResult.categoryStats).length > 0 && (
                  <Card className="chart-container" style={{ marginTop: 16 }}>
                    <div className="chart-title">各类别统计详情</div>
                    <Row gutter={[8, 8]}>
                      {Object.entries(customResult.categoryStats).map(
                        ([cat, stats]) => (
                          <Col xs={12} sm={6} key={cat}>
                            <Card
                              size="small"
                              style={{
                                borderTop: `3px solid ${getCategoryColor(cat)}`,
                                height: "100%",
                              }}
                            >
                              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                                {cat}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#666",
                                  lineHeight: 1.8,
                                }}
                              >
                                <div>匹配数量：{stats.count} 辆</div>
                                <div>占比：{stats.ratio}%</div>
                                <div>平均重量：{stats.avgWeight} kg</div>
                                <div>平均续航：{stats.avgRange} km</div>
                                <div>平均价格：{stats.avgPrice} 万</div>
                              </div>
                            </Card>
                          </Col>
                        ),
                      )}
                    </Row>
                  </Card>
                )}

              {customResult.vehicles && customResult.vehicles.length > 0 && (
                <Card className="chart-container" style={{ marginTop: 16 }}>
                  <div className="chart-title">
                    匹配车型列表（{customResult.vehicles.length}款）
                  </div>
                  <List
                    grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
                    dataSource={customResult.vehicles}
                    renderItem={(item) => (
                      <List.Item>
                        <Card
                          size="small"
                          style={{
                            height: "100%",
                            opacity: item.isLightweight ? 1 : 0.85,
                            borderTop: `3px solid ${getCategoryColor(item.category)}`,
                          }}
                          actions={[
                            <span>
                              <CarOutlined /> {item.category}
                            </span>,
                            <span>
                              <ThunderboltOutlined /> {item.range}km
                            </span>,
                            <span>
                              <DollarOutlined /> {item.price.toFixed(1)}万
                            </span>,
                          ]}
                        >
                          <Card.Meta
                            title={
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <span>
                                  {item.brand} {item.name}
                                </span>
                                {item.isLightweight && (
                                  <Tag color="green" style={{ marginLeft: 8 }}>
                                    轻量化
                                  </Tag>
                                )}
                              </div>
                            }
                            description={
                              <div>
                                <div style={{ marginBottom: 4 }}>
                                  <EnvironmentOutlined
                                    style={{ marginRight: 4 }}
                                  />
                                  <span
                                    style={{
                                      color:
                                        item.curb_weight < 1500
                                          ? "#52c41a"
                                          : item.curb_weight < 1800
                                            ? "#faad14"
                                            : "#ff4d4f",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {item.curb_weight} kg
                                  </span>
                                </div>
                                <div>
                                  {item.scenarios.map((s) => (
                                    <Tag key={s} size="small">
                                      {s}
                                    </Tag>
                                  ))}
                                  {getStatusTag(item.status)}
                                </div>
                              </div>
                            }
                          />
                        </Card>
                      </List.Item>
                    )}
                  />
                </Card>
              )}
            </div>
          ) : (
            <Card
              className="chart-container"
              style={{
                height: "600px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Empty
                description="请在左侧设置筛选条件并点击开始匹配"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );

  const getScenarioReportConfig = () => {
    if (activeTab === "custom" && customResult) {
      return {
        reportType: "custom",
        customTitle: `自定义场景分析报告 - ${customForm.getFieldValue("name") || "未命名场景"}`,
        sections: ["scenarioCoverage", "marketConcentration"],
      };
    }
    return {
      reportType: "custom",
      customTitle: `${selectedScenario}场景分析报告`,
      sections: ["scenarioCoverage", "marketConcentration"],
    };
  };

  const scenarioReportConfig = getScenarioReportConfig();

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
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>场景匹配</h2>
          <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 13 }}>
            根据使用场景智能匹配适合的新能源车型
          </p>
        </div>
        <Space>
          <ExportReportButton
            reportType={scenarioReportConfig.reportType}
            title="导出场景分析报告"
            sections={scenarioReportConfig.sections}
            customConfig={{ customTitle: scenarioReportConfig.customTitle }}
            type="primary"
            ghost
          />
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ marginBottom: 16 }}
      >
        <TabPane tab="预设场景" key="preset" />
        <TabPane tab="自定义场景" key="custom" />
      </Tabs>
      {activeTab === "preset" && presetScenarioContent}
      {activeTab === "custom" && customScenarioContent}
    </div>
  );
}

export default ScenarioMatch;
