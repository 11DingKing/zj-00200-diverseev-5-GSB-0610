import React, { useState } from "react";
import {
  Card,
  Form,
  InputNumber,
  Select,
  Button,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Typography,
  Divider,
  Empty,
  Spin,
  Switch,
  Progress,
  Alert,
  List,
  Avatar,
  Tooltip,
  Modal,
} from "antd";
import {
  CarOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  StarOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import { decisionAPI } from "../api";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Meta } = Card;

const CATEGORIES = ["微型代步", "家用紧凑", "中大型", "商用"];
const SCENARIOS = ["城市通勤", "长途", "载货"];

const VehicleRecommendation = ({ onExportReport }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const handleSearch = async (values) => {
    setLoading(true);
    try {
      const criteria = {
        ...values,
        secondaryScenarios: values.secondaryScenarios || [],
        preferredCategories: values.preferredCategories || [],
        topN: values.topN || 5,
      };
      const res = await decisionAPI.recommendVehicles(criteria);
      setResult(res.data);
    } catch (err) {
      console.error("推荐失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setResult(null);
  };

  const handleViewDetail = (vehicle) => {
    setSelectedVehicle(vehicle);
    setDetailModalVisible(true);
  };

  const handleExportReport = () => {
    if (onExportReport && result) {
      onExportReport({
        type: "recommendation",
        recommendationCriteria: result.criteria,
        recommendationResult: result,
      });
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return "#52c41a";
    if (score >= 75) return "#1890ff";
    if (score >= 65) return "#fa8c16";
    return "#ff4d4f";
  };

  const getScoreLabel = (score) => {
    if (score >= 85) return "优秀";
    if (score >= 75) return "良好";
    if (score >= 65) return "较好";
    return "一般";
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "微型代步":
        return "green";
      case "家用紧凑":
        return "blue";
      case "中大型":
        return "purple";
      case "商用":
        return "orange";
      default:
        return "default";
    }
  };

  const getRadarOption = (vehicle) => {
    if (!vehicle?.scores) return {};
    return {
      tooltip: {},
      radar: {
        indicator: vehicle.scores.map((s) => ({
          name: s.name,
          max: 100,
        })),
        radius: 100,
      },
      series: [
        {
          type: "radar",
          data: [
            {
              value: vehicle.scores.map((s) => s.score),
              name: "评分",
              areaStyle: { opacity: 0.3 },
            },
          ],
        },
      ],
    };
  };

  return (
    <div className="vehicle-recommendation">
      <div className="page-header">
        <Title level={3} style={{ margin: 0 }}>
          <CarOutlined /> 智能选车推荐
        </Title>
        <Text type="secondary">
          根据您的预算和使用场景，从在售车型中智能推荐最合适的选择
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            title="筛选条件"
            extra={
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSearch}
              initialValues={{
                topN: 5,
                lightweightPreferred: false,
              }}
            >
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item
                    name="minBudget"
                    label="最低预算"
                    rules={[{ required: true, message: "请输入最低预算" }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={3}
                      max={200}
                      step={1}
                      placeholder="万元"
                      addonAfter="万"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="maxBudget"
                    label="最高预算"
                    rules={[{ required: true, message: "请输入最高预算" }]}
                    dependencies={["minBudget"]}
                  >
                    {({ getFieldValue }) => (
                      <InputNumber
                        style={{ width: "100%" }}
                        min={getFieldValue("minBudget") || 3}
                        max={200}
                        step={1}
                        placeholder="万元"
                        addonAfter="万"
                      />
                    )}
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="primaryScenario"
                label="主要使用场景"
                rules={[{ required: true, message: "请选择主要场景" }]}
              >
                <Select placeholder="请选择主要使用场景">
                  {SCENARIOS.map((s) => (
                    <Option key={s} value={s}>
                      {s}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="secondaryScenarios" label="其他使用场景">
                <Select
                  mode="multiple"
                  placeholder="可多选次要场景"
                  allowClear
                >
                  {SCENARIOS.map((s) => (
                    <Option key={s} value={s}>
                      {s}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="preferredCategories" label="偏好车型类别">
                <Select
                  mode="multiple"
                  placeholder="可多选偏好类别（不选则不限）"
                  allowClear
                >
                  {CATEGORIES.map((c) => (
                    <Option key={c} value={c}>
                      {c}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="minRange" label="最低续航要求">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={100}
                      max={1000}
                      step={50}
                      placeholder="km"
                      addonAfter="km"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="maxWeight" label="最高重量限制">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={500}
                      max={10000}
                      step={100}
                      placeholder="kg"
                      addonAfter="kg"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="lightweightPreferred"
                label="偏好轻量化车型"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={<CheckCircleOutlined />}
                  unCheckedChildren="否"
                />
              </Form.Item>

              <Form.Item name="topN" label="推荐数量">
                <Select>
                  <Option value={3}>3 款</Option>
                  <Option value={5}>5 款</Option>
                  <Option value={10}>10 款</Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SearchOutlined />}
                  loading={loading}
                  block
                  size="large"
                >
                  开始推荐
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Spin spinning={loading}>
            {!result ? (
              <Card
                style={{
                  height: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Empty
                  description={
                    <Space direction="vertical" align="center">
                      <Text>设置筛选条件后点击"开始推荐"获取车型推荐</Text>
                      <Text type="secondary">
                        系统将综合价格、场景匹配、续航、轻量化等多维度进行评分排序
                      </Text>
                    </Space>
                  }
                />
              </Card>
            ) : (
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                {result.summary && (
                  <Card
                    title="推荐概览"
                    extra={
                      onExportReport && (
                        <Button
                          type="primary"
                          ghost
                          icon={<FileTextOutlined />}
                          onClick={handleExportReport}
                        >
                          导出推荐报告
                        </Button>
                      )
                    }
                  >
                    {!result.summary.hasResults ? (
                      <Alert
                        message="未找到合适车型"
                        description={result.summary.message}
                        type="warning"
                        showIcon
                      />
                    ) : (
                      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                        {result.summary.suggestions?.map((s, idx) => (
                          <Alert
                            key={idx}
                            description={s.content}
                            type={s.type === "warning" ? "warning" : s.type === "positive" ? "success" : "info"}
                            showIcon
                          />
                        ))}
                        <Row gutter={[16, 16]}>
                          <Col span={6}>
                            <Statistic
                              title="匹配车型数"
                              value={result.summary.totalMatched}
                              suffix="款"
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title="平均综合评分"
                              value={result.summary.averageScore}
                              suffix="分"
                              valueStyle={{ color: getScoreColor(result.summary.averageScore) }}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title="平均价格"
                              value={result.summary.averagePrice}
                              suffix="万"
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title="平均续航"
                              value={result.summary.averageRange}
                              suffix="km"
                            />
                          </Col>
                        </Row>
                        <Divider style={{ margin: "12px 0" }} />
                        <Space>
                          <Text type="secondary">涵盖类别：</Text>
                          {result.summary.categories?.map((c) => (
                            <Tag key={c} color={getCategoryColor(c)}>
                              {c}
                            </Tag>
                          ))}
                        </Space>
                        <Space>
                          <Text type="secondary">涉及品牌：</Text>
                          {result.summary.brands?.slice(0, 8).map((b) => (
                            <Tag key={b}>{b}</Tag>
                          ))}
                          {result.summary.brands?.length > 8 && (
                            <Tag>等{result.summary.brands.length}个品牌</Tag>
                          )}
                        </Space>
                        <Space>
                          <Text type="secondary">整体评价：</Text>
                          <Tag
                            color={
                              result.summary.overallLevel === "优秀"
                                ? "green"
                                : result.summary.overallLevel === "良好"
                                  ? "blue"
                                  : result.summary.overallLevel === "较好"
                                    ? "orange"
                                    : "default"
                            }
                          >
                            <StarOutlined /> {result.summary.overallLevel}
                          </Tag>
                        </Space>
                      </Space>
                    )}
                  </Card>
                )}

                {result.recommendations?.length > 0 && (
                  <Card title={`Top ${result.recommendations.length} 推荐车型`}>
                    <List
                      itemLayout="vertical"
                      size="large"
                      dataSource={result.recommendations}
                      renderItem={(vehicle, index) => (
                        <List.Item
                          key={vehicle.id}
                          extra={
                            <Button
                              type="link"
                              icon={<InfoCircleOutlined />}
                              onClick={() => handleViewDetail(vehicle)}
                            >
                              查看详情
                            </Button>
                          }
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                size={48}
                                style={{
                                  backgroundColor: getScoreColor(vehicle.totalScore),
                                  fontSize: 20,
                                  fontWeight: "bold",
                                }}
                              >
                                {index + 1}
                              </Avatar>
                            }
                            title={
                              <Space>
                                <Text strong style={{ fontSize: 16 }}>
                                  {vehicle.brand} {vehicle.name}
                                </Text>
                                <Tag color={getCategoryColor(vehicle.category)}>
                                  {vehicle.category}
                                </Tag>
                                {vehicle.isLightweight && (
                                  <Tag color="green" icon={<RiseOutlined />}>
                                    轻量化
                                  </Tag>
                                )}
                              </Space>
                            }
                            description={
                              <Space wrap>
                                <Text type="secondary">
                                  <strong style={{ color: "#fa8c16", fontSize: 18 }}>
                                    ¥{vehicle.price}
                                  </strong>{" "}
                                  万
                                </Text>
                                <Text type="secondary">
                                  续航 {vehicle.range}km
                                </Text>
                                <Text type="secondary">
                                  整备质量 {vehicle.curb_weight}kg
                                </Text>
                                {vehicle.energy_density && (
                                  <Text type="secondary">
                                    能量密度 {vehicle.energy_density}Wh/kg
                                  </Text>
                                )}
                              </Space>
                            }
                          />
                          <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                            <Col xs={24} md={6}>
                              <div style={{ textAlign: "center" }}>
                                <div
                                  style={{
                                    fontSize: 32,
                                    fontWeight: "bold",
                                    color: getScoreColor(vehicle.totalScore),
                                  }}
                                >
                                  {vehicle.totalScore}
                                </div>
                                <Text type="secondary">
                                  综合评分 · {getScoreLabel(vehicle.totalScore)}
                                </Text>
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                                {vehicle.scores?.map((s) => (
                                  <div key={s.name}>
                                    <div style={{ marginBottom: 4 }}>
                                      <Text>{s.name}</Text>
                                      <Text type="secondary" style={{ float: "right" }}>
                                        {s.score}分 (权重{(s.weight * 100).toFixed(0)}%)
                                      </Text>
                                    </div>
                                    <Progress
                                      percent={s.score}
                                      size="small"
                                      showInfo={false}
                                      strokeColor={getScoreColor(s.score)}
                                    />
                                  </div>
                                ))}
                              </Space>
                            </Col>
                            <Col xs={24} md={6}>
                              <Text type="secondary">推荐理由：</Text>
                              <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
                                {vehicle.reasons?.map((r, idx) => (
                                  <li key={idx} style={{ marginBottom: 4 }}>
                                    <Text>{r}</Text>
                                  </li>
                                ))}
                              </ul>
                            </Col>
                          </Row>
                        </List.Item>
                      )}
                    />
                  </Card>
                )}
              </Space>
            )}
          </Spin>
        </Col>
      </Row>

      <Modal
        title={
          <Space>
            <CarOutlined />
            <Text strong>{selectedVehicle?.brand} </Text>
            <Text>{selectedVehicle?.name}</Text>
            <Tag color={getCategoryColor(selectedVehicle?.category)}>
              {selectedVehicle?.category}
            </Tag>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={
          <Button onClick={() => setDetailModalVisible(false)}>关闭</Button>
        }
        width={800}
      >
        {selectedVehicle && (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="综合评分"
                    value={selectedVehicle.totalScore}
                    suffix="分"
                    valueStyle={{ color: getScoreColor(selectedVehicle.totalScore) }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="指导价格" value={selectedVehicle.price} suffix="万" />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="续航里程" value={selectedVehicle.range} suffix="km" />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="基本参数" size="small">
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <div>
                      <Text type="secondary">品牌：</Text>
                      <Text>{selectedVehicle.brand}</Text>
                    </div>
                    <div>
                      <Text type="secondary">车型：</Text>
                      <Text>{selectedVehicle.name}</Text>
                    </div>
                    <div>
                      <Text type="secondary">类别：</Text>
                      <Tag color={getCategoryColor(selectedVehicle.category)}>
                        {selectedVehicle.category}
                      </Tag>
                    </div>
                    <div>
                      <Text type="secondary">整备质量：</Text>
                      <Text>
                        {selectedVehicle.curb_weight}kg
                        {selectedVehicle.isLightweight && (
                          <Tag color="green" style={{ marginLeft: 8 }}>
                            轻量化
                          </Tag>
                        )}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">能量密度：</Text>
                      <Text>{selectedVehicle.energy_density || "—"} Wh/kg</Text>
                    </div>
                    <div>
                      <Text type="secondary">车身材料：</Text>
                      <Text>{selectedVehicle.material || "—"}</Text>
                    </div>
                    <div>
                      <Text type="secondary">适用场景：</Text>
                      <Space wrap>
                        {selectedVehicle.scenarios?.map((s) => (
                          <Tag key={s}>{s}</Tag>
                        ))}
                      </Space>
                    </div>
                    <div>
                      <Text type="secondary">状态：</Text>
                      <Tag color={selectedVehicle.status === "在售" ? "green" : "default"}>
                        {selectedVehicle.status}
                      </Tag>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="各项评分" size="small">
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    {selectedVehicle.scores?.map((s) => (
                      <div key={s.name}>
                        <Space style={{ width: "100%", justifyContent: "space-between" }}>
                          <Text>{s.name}</Text>
                          <Text strong style={{ color: getScoreColor(s.score) }}>
                            {s.score}分
                          </Text>
                        </Space>
                        <Progress
                          percent={s.score}
                          size="small"
                          showInfo={false}
                          strokeColor={getScoreColor(s.score)}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          权重占比 {(s.weight * 100).toFixed(0)}%
                        </Text>
                      </div>
                    ))}
                  </Space>
                </Card>
              </Col>
            </Row>

            <Card title="推荐理由" size="small">
              <List
                dataSource={selectedVehicle.reasons}
                renderItem={(item) => (
                  <List.Item>
                    <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
                    {item}
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default VehicleRecommendation;
