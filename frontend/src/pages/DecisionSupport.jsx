import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Tabs,
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
  Checkbox,
  Select,
  Input,
  Modal,
  List,
  Alert,
  message,
  Tooltip,
} from "antd";
import {
  ThunderboltOutlined,
  CarOutlined,
  FileTextOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  EnvironmentOutlined,
  BulbOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import PolicySimulator from "./PolicySimulator";
import VehicleRecommendation from "./VehicleRecommendation";
import { decisionAPI, vehicleAPI, suggestionAPI } from "../api";
import { useReportExport } from "../hooks/useReportExport";

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const DecisionSupport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getPendingReport, clearPendingReport } = useReportExport();

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    reportType: "comprehensive",
    customTitle: "",
    includeBaseline: true,
    includeSimulation: false,
    includeRecommendation: false,
    sections: ["marketConcentration", "scenarioCoverage"],
    simulationParams: null,
    recommendationCriteria: null,
  });
  const [reportData, setReportData] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [quickStats, setQuickStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const checkPendingReport = useCallback(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get("action");

    if (action === "export") {
      const pendingConfig = getPendingReport();
      if (pendingConfig) {
        setReportConfig({
          reportType: "comprehensive",
          customTitle: "",
          includeBaseline: true,
          includeSimulation: false,
          includeRecommendation: false,
          sections: ["marketConcentration", "scenarioCoverage", "diversityTrend"],
          simulationParams: null,
          recommendationCriteria: null,
          ...pendingConfig,
        });
        setReportData(null);
        setReportModalVisible(true);
        clearPendingReport();
        navigate("/decision", { replace: true });
        message.info("已为您准备好报告生成配置");
      }
    }
  }, [location.search, navigate, getPendingReport, clearPendingReport]);

  useEffect(() => {
    loadQuickStats();
    checkPendingReport();
  }, [checkPendingReport]);

  const loadQuickStats = async () => {
    setLoadingStats(true);
    try {
      const [concentration, coverage, diversity] = await Promise.all([
        vehicleAPI.getMarketConcentration(),
        vehicleAPI.getScenarioCoverage(),
        suggestionAPI.getDiversity(),
      ]);

      setQuickStats({
        concentration: concentration.data,
        coverage: coverage.data,
        diversity: diversity.data,
      });
    } catch (err) {
      console.error("加载统计数据失败:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleExportFromSimulator = (data) => {
    setReportConfig((prev) => ({
      ...prev,
      reportType: "simulation",
      includeSimulation: true,
      simulationParams: data.simulationParams,
      includeBaseline: true,
    }));
    setReportModalVisible(true);
  };

  const handleExportFromRecommendation = (data) => {
    setReportConfig((prev) => ({
      ...prev,
      reportType: "recommendation",
      includeRecommendation: true,
      recommendationCriteria: data.recommendationCriteria,
      includeBaseline: true,
    }));
    setReportModalVisible(true);
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await decisionAPI.generateReport(reportConfig);
      setReportData(res.data);
      setReportHistory((prev) => [res.data, ...prev].slice(0, 10));
      message.success("报告生成成功！");
    } catch (err) {
      console.error("生成报告失败:", err);
      message.error("生成报告失败，请重试");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reportData) return;

    const reportContent = formatReportAsText(reportData);
    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportData.title}_${new Date().toLocaleDateString()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success("报告已下载");
  };

  const handleDownloadJSON = () => {
    if (!reportData) return;

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportData.reportId}_raw_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success("原始数据已下载");
  };

  const formatReportAsText = (data) => {
    let text = `# ${data.title}\n`;
    text += `报告编号: ${data.reportId}\n`;
    text += `生成时间: ${new Date(data.generatedAt).toLocaleString()}\n\n`;
    text += `---\n\n`;

    if (data.summary) {
      text += `## 报告摘要\n\n`;
      text += `${data.summary.overallAssessment}\n\n`;
      text += `### 关键指标\n`;
      Object.entries(data.summary.keyMetrics || {}).forEach(([key, value]) => {
        text += `- ${formatMetricName(key)}: ${value}\n`;
      });
      text += `\n### 建议\n`;
      data.summary.recommendations?.forEach((r, i) => {
        text += `${i + 1}. ${r}\n`;
      });
      text += `\n---\n\n`;
    }

    data.sections?.forEach((section) => {
      text += `## ${section.title}\n\n`;

      if (section.analysis) {
        section.analysis.forEach((a) => {
          text += `- [${a.type.toUpperCase()}] ${a.content}\n`;
        });
        text += `\n`;
      }

      if (section.insights) {
        text += `### 核心洞察\n`;
        section.insights.forEach((insight) => {
          text += `**${insight.title}**\n`;
          text += `${insight.content}\n\n`;
        });
      }

      if (section.data && section.data.totalVehicles !== undefined) {
        text += `### 市场基准数据\n`;
        text += `- 车型总数: ${section.data.totalVehicles}款\n`;
        text += `- 平均整备质量: ${section.data.averageWeight}kg\n`;
        text += `- 多元化评分: ${section.data.diversityScore}分\n`;
        text += `- 轻量化占比: ${section.data.lightweightRatio}%\n`;
        text += `- 重型车占比: ${section.data.heavyRatio}%\n\n`;
      }

      if (section.data && Array.isArray(section.data) && section.data[0]?.year) {
        text += `### 模拟预测结果\n`;
        section.data.forEach((year) => {
          text += `#### 第${year.year}年\n`;
          text += `- 多元化评分: ${year.diversityScore}分\n`;
          text += `- 车型总数: ${year.totalVehicles}款\n`;
          text += `- 平均整备质量: ${year.averageWeight}kg\n`;
          text += `- 轻量化占比: ${year.lightweightRatio}%\n`;
          text += `- 市场集中度: ${year.concentrationLevel}\n\n`;
        });
      }

      if (section.data?.recommendations) {
        text += `### 推荐车型\n`;
        section.data.recommendations.forEach((v, i) => {
          text += `${i + 1}. **${v.brand} ${v.name}**\n`;
          text += `   - 价格: ${v.price}万元\n`;
          text += `   - 续航: ${v.range}km\n`;
          text += `   - 综合评分: ${v.totalScore}分\n`;
          v.reasons?.forEach((r) => {
            text += `   - ${r}\n`;
          });
          text += `\n`;
        });
      }

      text += `---\n\n`;
    });

    text += `\n*本报告由 DiverseEV Monitor 自动生成，数据仅供参考*`;
    return text;
  };

  const formatMetricName = (key) => {
    const names = {
      currentDiversityScore: "当前多元化评分",
      currentTotalVehicles: "当前车型总数",
      currentLightweightRatio: "当前轻量化占比",
      simulatedDiversityScore: "模拟后多元化评分",
      simulatedLightweightRatio: "模拟后轻量化占比",
      recommendedCount: "推荐车型数量",
    };
    return names[key] || key;
  };

  const handleSectionToggle = (section) => {
    setReportConfig((prev) => {
      const sections = prev.sections.includes(section)
        ? prev.sections.filter((s) => s !== section)
        : [...prev.sections, section];
      return { ...prev, sections };
    });
  };

  const sectionOptions = [
    {
      key: "marketConcentration",
      label: "市场集中度分析",
      icon: <BarChartOutlined />,
      description: "分析当前市场的集中度水平和车型分布",
    },
    {
      key: "scenarioCoverage",
      label: "场景覆盖度分析",
      icon: <EnvironmentOutlined />,
      description: "分析各使用场景的车型覆盖情况",
    },
    {
      key: "diversityTrend",
      label: "多元化趋势分析",
      icon: <DashboardOutlined />,
      description: "展示历年多元化评分变化趋势",
    },
  ];

  return (
    <div className="decision-support">
      <div className="page-header">
        <Title level={3} style={{ margin: 0 }}>
          <ThunderboltOutlined /> 决策支持中心
        </Title>
        <Text type="secondary">
          政策模拟、智能推荐、报告导出，为行业决策提供数据支撑
        </Text>
      </div>

      <Spin spinning={loadingStats}>
        {quickStats && (
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="在售车型"
                  value={quickStats.concentration.totalVehicles}
                  suffix="款"
                  prefix={<CarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="多元化评分"
                  value={quickStats.diversity.diversityScore}
                  suffix="分"
                  valueStyle={{
                    color:
                      quickStats.diversity.diversityScore >= 80
                        ? "#52c41a"
                        : quickStats.diversity.diversityScore >= 60
                          ? "#1890ff"
                          : "#fa8c16",
                  }}
                  prefix={<BulbOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="轻量化占比"
                  value={quickStats.concentration.heavyRatio < 50 ? 100 - quickStats.concentration.heavyRatio : 35}
                  suffix="%"
                  prefix={<ThunderboltOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="覆盖品牌"
                  value={quickStats.diversity.brandCount}
                  suffix="个"
                  prefix={<CarOutlined />}
                />
              </Card>
            </Col>
          </Row>
        )}
      </Spin>

      <Card
        title={
          <Space>
            <FileTextOutlined />
            快速生成报告
          </Space>
        }
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                setReportConfig({
                  reportType: "comprehensive",
                  customTitle: "",
                  includeBaseline: true,
                  includeSimulation: false,
                  includeRecommendation: false,
                  sections: ["marketConcentration", "scenarioCoverage", "diversityTrend"],
                  simulationParams: null,
                  recommendationCriteria: null,
                });
                setReportData(null);
                setReportModalVisible(true);
              }}
            >
              生成综合报告
            </Button>
            {reportHistory.length > 0 && (
              <Tooltip title="查看历史报告">
                <Button icon={<FileTextOutlined />} type="dashed">
                  历史报告 ({reportHistory.length})
                </Button>
              </Tooltip>
            )}
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card
              size="small"
              hoverable
              onClick={() => {
                setReportConfig({
                  reportType: "comprehensive",
                  customTitle: "",
                  includeBaseline: true,
                  includeSimulation: false,
                  includeRecommendation: false,
                  sections: ["marketConcentration", "scenarioCoverage", "diversityTrend"],
                  simulationParams: null,
                  recommendationCriteria: null,
                });
                setReportData(null);
                setReportModalVisible(true);
              }}
              style={{ cursor: "pointer", height: "100%" }}
            >
              <Space direction="vertical" size="small">
                <DashboardOutlined style={{ fontSize: 24, color: "#1890ff" }} />
                <Text strong>综合分析报告</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  包含市场基准、集中度、场景覆盖、多元化趋势等完整分析
                </Text>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              size="small"
              hoverable
              onClick={() => message.info("请先在政策模拟器中运行模拟，再导出报告")}
              style={{ cursor: "pointer", height: "100%" }}
            >
              <Space direction="vertical" size="small">
                <ThunderboltOutlined style={{ fontSize: 24, color: "#722ed1" }} />
                <Text strong>政策模拟报告</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  基于政策模拟器的参数设置，生成政策效果预测分析报告
                </Text>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              size="small"
              hoverable
              onClick={() => message.info("请先在智能选车中获取推荐，再导出报告")}
              style={{ cursor: "pointer", height: "100%" }}
            >
              <Space direction="vertical" size="small">
                <CarOutlined style={{ fontSize: 24, color: "#52c41a" }} />
                <Text strong>车型推荐报告</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  基于选车条件的推荐结果，生成个性化选购分析报告
                </Text>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      <Tabs
        defaultActiveKey="simulator"
        size="large"
        items={[
          {
            key: "simulator",
            label: (
              <span>
                <ThunderboltOutlined />
                政策模拟器
              </span>
            ),
            children: <PolicySimulator onExportReport={handleExportFromSimulator} />,
          },
          {
            key: "recommendation",
            label: (
              <span>
                <CarOutlined />
                智能选车推荐
              </span>
            ),
            children: (
              <VehicleRecommendation onExportReport={handleExportFromRecommendation} />
            ),
          },
        ]}
      />

      <Modal
        title={
          <Space>
            <FileTextOutlined />
            生成分析报告
          </Space>
        }
        open={reportModalVisible}
        onCancel={() => setReportModalVisible(false)}
        width={900}
        footer={
          <Space>
            <Button onClick={() => setReportModalVisible(false)}>取消</Button>
            {reportData && (
              <>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadJSON}>
                  下载原始数据
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadReport}
                >
                  下载报告
                </Button>
              </>
            )}
            {!reportData && (
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={handleGenerateReport}
                loading={generatingReport}
              >
                生成报告
              </Button>
            )}
          </Space>
        }
      >
        {!reportData ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <Text strong>报告类型</Text>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                value={reportConfig.reportType}
                onChange={(value) =>
                  setReportConfig((prev) => ({ ...prev, reportType: value }))
                }
              >
                <Option value="comprehensive">综合分析报告</Option>
                <Option value="simulation">政策效果模拟报告</Option>
                <Option value="recommendation">车型选购推荐报告</Option>
                <Option value="custom">定制化分析报告</Option>
              </Select>
            </div>

            <div>
              <Text strong>报告标题（可选）</Text>
              <Input
                placeholder="输入自定义报告标题"
                style={{ marginTop: 8 }}
                value={reportConfig.customTitle}
                onChange={(e) =>
                  setReportConfig((prev) => ({ ...prev, customTitle: e.target.value }))
                }
              />
            </div>

            <div>
              <Text strong>包含内容</Text>
              <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
                <Checkbox
                  checked={reportConfig.includeBaseline}
                  onChange={(e) =>
                    setReportConfig((prev) => ({
                      ...prev,
                      includeBaseline: e.target.checked,
                    }))
                  }
                >
                  <Space>
                    <InfoCircleOutlined />
                    当前市场基准分析
                  </Space>
                </Checkbox>
                {reportConfig.includeSimulation ||
                reportConfig.reportType === "simulation" ? (
                  <Checkbox checked disabled>
                    <Space>
                      <ThunderboltOutlined />
                      政策效果模拟分析
                      <Tag color="purple">已包含</Tag>
                    </Space>
                  </Checkbox>
                ) : null}
                {reportConfig.includeRecommendation ||
                reportConfig.reportType === "recommendation" ? (
                  <Checkbox checked disabled>
                    <Space>
                      <CarOutlined />
                      车型选购推荐
                      <Tag color="green">已包含</Tag>
                    </Space>
                  </Checkbox>
                ) : null}
              </Space>
            </div>

            <div>
              <Text strong>附加分析模块</Text>
              <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                {sectionOptions.map((opt) => (
                  <Col xs={24} md={8} key={opt.key}>
                    <Card
                      size="small"
                      onClick={() => handleSectionToggle(opt.key)}
                      style={{
                        cursor: "pointer",
                        borderColor: reportConfig.sections.includes(opt.key)
                          ? "#1890ff"
                          : "#d9d9d9",
                        backgroundColor: reportConfig.sections.includes(opt.key)
                          ? "#e6f7ff"
                          : "white",
                      }}
                    >
                      <Space>
                        <Checkbox
                          checked={reportConfig.sections.includes(opt.key)}
                          onChange={() => handleSectionToggle(opt.key)}
                        />
                        <Space direction="vertical" size={0}>
                          <Space>
                            {opt.icon}
                            <Text strong>{opt.label}</Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {opt.description}
                          </Text>
                        </Space>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>

            {(reportConfig.includeSimulation ||
              reportConfig.includeRecommendation) && (
              <Alert
                message="报告参数已就绪"
                description={
                  reportConfig.includeSimulation
                    ? "已包含政策模拟数据，将生成政策效果预测分析"
                    : "已包含选车推荐数据，将生成个性化选购分析"
                }
                type="success"
                showIcon
              />
            )}
          </Space>
        ) : (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Alert
              message="报告生成成功"
              description={
                <Space>
                  <Text>
                    {reportData.title}（{reportData.reportId}）
                  </Text>
                  <Tag color="green">
                    共 {reportData.sections?.length || 0} 个分析模块
                  </Tag>
                </Space>
              }
              type="success"
              showIcon
            />

            {reportData.summary && (
              <Card title="报告摘要" size="small">
                <Paragraph>{reportData.summary.overallAssessment}</Paragraph>
                <Row gutter={[16, 8]}>
                  {Object.entries(reportData.summary.keyMetrics || {}).map(
                    ([key, value]) => (
                      <Col span={8} key={key}>
                        <Statistic
                          title={formatMetricName(key)}
                          value={value}
                          suffix={
                            key.includes("Ratio") || key.includes("Score") ? "" : ""
                          }
                        />
                      </Col>
                    ),
                  )}
                </Row>
                <Divider style={{ margin: "12px 0" }} />
                <Text type="secondary">核心建议：</Text>
                <List
                  size="small"
                  dataSource={reportData.summary.recommendations}
                  renderItem={(item) => (
                    <List.Item>
                      <CheckCircleOutlined
                        style={{ color: "#52c41a", marginRight: 8 }}
                      />
                      {item}
                    </List.Item>
                  )}
                />
              </Card>
            )}

            <Card title="报告内容预览" size="small">
              <List
                dataSource={reportData.sections}
                renderItem={(section) => (
                  <List.Item>
                    <List.Item.Meta
                      title={section.title}
                      description={
                        section.analysis?.length
                          ? `${section.analysis.length} 条分析结论`
                          : section.data?.recommendations?.length
                            ? `${section.data.recommendations.length} 款推荐车型`
                            : section.data?.length
                              ? `${section.data.length} 年预测数据`
                              : "数据分析模块"
                      }
                    />
                    <Tag color="blue">已包含</Tag>
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

export default DecisionSupport;
