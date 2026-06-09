import { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Empty,
  Button,
  Space,
  Tag,
  Table,
  Typography,
  Popconfirm,
  message,
  Progress,
} from "antd";
import {
  SwapOutlined,
  DeleteOutlined,
  ClearOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import { comparisonAPI } from "../api.js";

const { Title, Text } = Typography;

const SERIES_COLORS = ["#1890ff", "#52c41a", "#fa8c16", "#722ed1"];

const WEIGHT_RATIOS = {
  微型代步: {
    电池: 0.32,
    车身: 0.26,
    底盘: 0.18,
    动力总成: 0.13,
    内饰其他: 0.11,
  },
  家用紧凑: {
    电池: 0.3,
    车身: 0.25,
    底盘: 0.2,
    动力总成: 0.14,
    内饰其他: 0.11,
  },
  中大型: {
    电池: 0.28,
    车身: 0.26,
    底盘: 0.22,
    动力总成: 0.13,
    内饰其他: 0.11,
  },
  商用: { 电池: 0.26, 车身: 0.28, 底盘: 0.24, 动力总成: 0.12, 内饰其他: 0.1 },
};

const DEFAULT_RATIO = WEIGHT_RATIOS["家用紧凑"];

function getWeightBreakdown(vehicle) {
  const ratios = WEIGHT_RATIOS[vehicle.category] || DEFAULT_RATIO;
  const breakdown = {};
  Object.keys(ratios).forEach((key) => {
    breakdown[key] = {
      ratio: ratios[key],
      weight: Math.round(vehicle.curb_weight * ratios[key]),
    };
  });
  return breakdown;
}

function Comparison() {
  const [data, setData] = useState({ count: 0, maxSize: 4, vehicles: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComparison();
  }, []);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const res = await comparisonAPI.getComparison();
      setData(res.data);
    } catch (error) {
      console.error("加载对比集失败:", error);
      message.error("加载对比集失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (vehicle) => {
    try {
      const res = await comparisonAPI.removeFromComparison(vehicle.id);
      setData(res.data);
      message.success(`已移除 ${vehicle.brand} ${vehicle.name}`);
    } catch (error) {
      const msg = error?.response?.data?.error || "移除失败";
      message.error(msg);
    }
  };

  const handleClear = async () => {
    try {
      const res = await comparisonAPI.clearComparison();
      setData(res.data);
      message.success("对比集已清空");
    } catch (error) {
      message.error("清空失败");
    }
  };

  const { vehicles, count, maxSize } = data;

  if (!loading && vehicles.length === 0) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size="small">
              <Text>对比集为空</Text>
              <Text type="secondary">
                请前往「车型管理」页，点击各车型行的"加入对比"按钮，最多可同时对比{" "}
                {maxSize} 款车型
              </Text>
            </Space>
          }
        >
          <Link to="/vehicles">
            <Button type="primary" icon={<CarOutlined />}>
              去选车
            </Button>
          </Link>
        </Empty>
      </Card>
    );
  }

  // 关键指标并排表
  const metricRows = [
    { key: "brand", label: "品牌" },
    { key: "category", label: "车型类别" },
    { key: "curb_weight", label: "整备质量 (kg)" },
    { key: "range", label: "续航 (km)" },
    { key: "price", label: "价格 (万元)" },
    { key: "energy_density", label: "能量密度 (Wh/kg)" },
    { key: "scenarios", label: "适配场景" },
    { key: "status", label: "状态" },
  ];

  const renderMetricCell = (vehicle, key) => {
    const value = vehicle[key];
    if (key === "scenarios") {
      return (
        <>
          {(value || []).map((s) => (
            <Tag key={s} color="blue" style={{ marginBottom: 4 }}>
              {s}
            </Tag>
          ))}
        </>
      );
    }
    if (key === "price") {
      return value != null ? `${Number(value).toFixed(1)} 万元` : "-";
    }
    if (value === null || value === undefined || value === "") return "-";
    return value;
  };

  // 重量占比表
  const weightTableColumns = [
    {
      title: "组成部分",
      dataIndex: "part",
      key: "part",
      width: 140,
      fixed: "left",
    },
    ...vehicles.map((v, idx) => ({
      title: (
        <span style={{ color: SERIES_COLORS[idx % SERIES_COLORS.length] }}>
          {v.brand} {v.name}
        </span>
      ),
      dataIndex: `v_${v.id}`,
      key: `v_${v.id}`,
      render: (cell) => (
        <div>
          <Progress
            percent={Number((cell.ratio * 100).toFixed(1))}
            size="small"
            strokeColor={SERIES_COLORS[cell.idx % SERIES_COLORS.length]}
            format={(p) => `${p}%`}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            约 {cell.weight} kg
          </Text>
        </div>
      ),
    })),
  ];

  const breakdowns = vehicles.map((v) => ({
    vehicle: v,
    breakdown: getWeightBreakdown(v),
  }));
  const partKeys = Object.keys(DEFAULT_RATIO);
  const weightTableData = partKeys.map((part) => {
    const row = { key: part, part };
    breakdowns.forEach(({ vehicle, breakdown }, idx) => {
      row[`v_${vehicle.id}`] = { ...breakdown[part], idx };
    });
    return row;
  });

  // 雷达图：归一化各指标
  const maxRange = Math.max(...vehicles.map((v) => v.range));
  const maxEnergy = Math.max(...vehicles.map((v) => v.energy_density || 0), 1);
  const minWeight = Math.min(...vehicles.map((v) => v.curb_weight));
  const minPrice = Math.min(...vehicles.map((v) => v.price));

  const radarIndicators = [
    { name: "续航能力", max: 100 },
    { name: "能量密度", max: 100 },
    { name: "轻量化指数", max: 100 },
    { name: "价格亲民度", max: 100 },
    { name: "场景覆盖度", max: 100 },
  ];

  const radarSeries = vehicles.map((v, idx) => {
    const rangeScore = (v.range / maxRange) * 100;
    const energyScore = ((v.energy_density || 0) / maxEnergy) * 100;
    // 重量越轻评分越高
    const lightScore = (minWeight / v.curb_weight) * 100;
    // 价格越低评分越高
    const priceScore = (minPrice / v.price) * 100;
    const scenarioScore = ((v.scenarios?.length || 0) / 3) * 100;
    return {
      value: [
        Number(rangeScore.toFixed(1)),
        Number(energyScore.toFixed(1)),
        Number(lightScore.toFixed(1)),
        Number(priceScore.toFixed(1)),
        Number(scenarioScore.toFixed(1)),
      ],
      name: `${v.brand} ${v.name}`,
      itemStyle: { color: SERIES_COLORS[idx % SERIES_COLORS.length] },
      lineStyle: { color: SERIES_COLORS[idx % SERIES_COLORS.length] },
      areaStyle: { opacity: 0.15 },
    };
  });

  const radarOption = {
    tooltip: { trigger: "item" },
    legend: {
      data: radarSeries.map((s) => s.name),
      bottom: 0,
      type: "scroll",
    },
    radar: {
      indicator: radarIndicators,
      radius: "65%",
      splitNumber: 4,
      axisName: { color: "#333", fontSize: 13 },
    },
    series: [
      {
        type: "radar",
        data: radarSeries,
      },
    ],
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="middle">
              <SwapOutlined style={{ fontSize: 20, color: "#1890ff" }} />
              <Title level={4} style={{ margin: 0 }}>
                车型横向对比
              </Title>
              <Tag color="blue">
                {count} / {maxSize} 款
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              <Link to="/vehicles">
                <Button icon={<CarOutlined />}>继续添加车型</Button>
              </Link>
              <Popconfirm
                title="确定清空当前对比集？"
                onConfirm={handleClear}
                okText="确定"
                cancelText="取消"
              >
                <Button danger icon={<ClearOutlined />}>
                  清空对比集
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title="关键指标对比" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          {vehicles.map((v, idx) => (
            <Col key={v.id} xs={24} sm={12} md={12} lg={6}>
              <Card
                size="small"
                style={{
                  borderTop: `3px solid ${SERIES_COLORS[idx % SERIES_COLORS.length]}`,
                }}
                title={
                  <span>
                    <Tag color={SERIES_COLORS[idx % SERIES_COLORS.length]}>
                      #{idx + 1}
                    </Tag>
                    {v.brand} {v.name}
                  </span>
                }
                extra={
                  <Popconfirm
                    title={`从对比集移除 ${v.brand} ${v.name}？`}
                    onConfirm={() => handleRemove(v)}
                    okText="移除"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                }
              >
                <table style={{ width: "100%", fontSize: 13 }}>
                  <tbody>
                    {metricRows.map((row) => (
                      <tr key={row.key}>
                        <td
                          style={{
                            color: "#999",
                            padding: "4px 8px 4px 0",
                            verticalAlign: "top",
                            width: 90,
                          }}
                        >
                          {row.label}
                        </td>
                        <td style={{ padding: "4px 0", verticalAlign: "top" }}>
                          {renderMetricCell(v, row.key)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="各部分重量占比" style={{ marginBottom: 16 }}>
            <Table
              columns={weightTableColumns}
              dataSource={weightTableData}
              pagination={false}
              size="small"
              scroll={{ x: 200 + vehicles.length * 180 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              注：占比依据车型类别经验系数估算，绝对重量 = 整备质量 × 占比。
            </Text>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="多维雷达图对比">
            <ReactECharts
              option={radarOption}
              style={{ height: 420 }}
              notMerge
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              所有维度均归一化到
              0-100，越靠外越优；轻量化指数与价格亲民度按"越小越优"反向归一化。
            </Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Comparison;
