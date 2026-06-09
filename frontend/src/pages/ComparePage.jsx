import React, { useEffect, useState, useMemo } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Tag,
  Empty,
  Space,
  Table,
  Popconfirm,
  message,
  Divider,
  Descriptions,
} from "antd";
import {
  SwapOutlined,
  DeleteOutlined,
  ClearOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import { comparisonAPI } from "../api.js";

const COLORS = [
  "#1890ff",
  "#52c41a",
  "#722ed1",
  "#fa8c16",
  "#eb2f96",
  "#13c2c2",
];

function estimateWeightBreakdown(vehicle) {
  const w = vehicle.curb_weight;
  const category = vehicle.category;
  const range = vehicle.range || 400;
  const ed = vehicle.energy_density || 160;

  let batteryRatio = 0.25 + (range / 1000) * 0.15 + (200 - ed) / 1000;
  batteryRatio = Math.min(0.42, Math.max(0.22, batteryRatio));

  let bodyRatio;
  switch (category) {
    case "微型代步":
      bodyRatio = 0.32;
      break;
    case "家用紧凑":
      bodyRatio = 0.28;
      break;
    case "中大型":
      bodyRatio = 0.26;
      break;
    case "商用":
      bodyRatio = 0.24;
      break;
    default:
      bodyRatio = 0.28;
  }

  let chassisRatio;
  switch (category) {
    case "微型代步":
      chassisRatio = 0.18;
      break;
    case "家用紧凑":
      chassisRatio = 0.19;
      break;
    case "中大型":
      chassisRatio = 0.2;
      break;
    case "商用":
      chassisRatio = 0.24;
      break;
    default:
      chassisRatio = 0.2;
  }

  const drivetrainRatio = 0.1;
  const interiorRatio =
    1 - batteryRatio - bodyRatio - chassisRatio - drivetrainRatio;

  return [
    {
      name: "电池系统",
      ratio: batteryRatio,
      weight: Math.round(w * batteryRatio),
    },
    { name: "车身车架", ratio: bodyRatio, weight: Math.round(w * bodyRatio) },
    {
      name: "底盘悬挂",
      ratio: chassisRatio,
      weight: Math.round(w * chassisRatio),
    },
    {
      name: "电驱系统",
      ratio: drivetrainRatio,
      weight: Math.round(w * drivetrainRatio),
    },
    {
      name: "内外饰件",
      ratio: Math.max(0.06, interiorRatio),
      weight: Math.round(w * Math.max(0.06, interiorRatio)),
    },
  ];
}

function normalize(value, min, max, inverse = false) {
  if (max === min) return 50;
  let n = ((value - min) / (max - min)) * 100;
  if (inverse) n = 100 - n;
  return Math.max(0, Math.min(100, n));
}

function ComparePage() {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [maxCount, setMaxCount] = useState(4);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await comparisonAPI.getComparison();
      setVehicles(res.data.vehicles);
      setMaxCount(res.data.maxCount);
    } catch (error) {
      message.error("加载对比数据失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRemove = async (id) => {
    try {
      await comparisonAPI.removeFromComparison(id);
      message.success("已移除");
      loadData();
    } catch (error) {
      message.error("移除失败");
    }
  };

  const handleClear = async () => {
    try {
      await comparisonAPI.clearComparison();
      message.success("对比集已清空");
      loadData();
    } catch (error) {
      message.error("清空失败");
    }
  };

  const weightBreakdowns = useMemo(() => {
    return vehicles.map((v) => ({
      vehicle: v,
      parts: estimateWeightBreakdown(v),
    }));
  }, [vehicles]);

  const radarOption = useMemo(() => {
    if (vehicles.length === 0) return null;

    const maxWeight = Math.max(...vehicles.map((v) => v.curb_weight));
    const minWeight = Math.min(...vehicles.map((v) => v.curb_weight));
    const maxRange = Math.max(...vehicles.map((v) => v.range));
    const minRange = Math.min(...vehicles.map((v) => v.range));
    const maxPrice = Math.max(...vehicles.map((v) => v.price));
    const minPrice = Math.min(...vehicles.map((v) => v.price));
    const maxEd = Math.max(...vehicles.map((v) => v.energy_density || 100));
    const minEd = Math.min(...vehicles.map((v) => v.energy_density || 100));
    const maxScenarios = Math.max(...vehicles.map((v) => v.scenarios.length));
    const minScenarios = Math.min(...vehicles.map((v) => v.scenarios.length));

    const indicators = [
      { name: "续航能力", max: 100 },
      { name: "轻量化水平", max: 100 },
      { name: "性价比", max: 100 },
      { name: "能量密度", max: 100 },
      { name: "场景适配", max: 100 },
    ];

    const series = vehicles.map((v, idx) => ({
      value: [
        normalize(v.range, minRange, maxRange),
        normalize(v.curb_weight, minWeight, maxWeight, true),
        normalize(v.price, minPrice, maxPrice, true),
        normalize(v.energy_density || 150, minEd, maxEd),
        normalize(v.scenarios.length, minScenarios, maxScenarios),
      ],
      name: `${v.brand} ${v.name}`,
      itemStyle: { color: COLORS[idx % COLORS.length] },
      areaStyle: { opacity: 0.15 },
      lineStyle: { width: 2 },
    }));

    return {
      tooltip: { trigger: "item" },
      legend: {
        data: vehicles.map((v, idx) => `${v.brand} ${v.name}`),
        bottom: 0,
        textStyle: { fontSize: 12 },
      },
      radar: {
        indicator: indicators,
        shape: "polygon",
        splitNumber: 5,
        axisName: { color: "#666", fontSize: 13 },
        splitArea: {
          areaStyle: {
            color: ["rgba(250,250,250,0.3)", "rgba(200,200,200,0.1)"],
          },
        },
      },
      series: [
        {
          type: "radar",
          data: series,
        },
      ],
    };
  }, [vehicles]);

  const stackBarOption = useMemo(() => {
    if (vehicles.length === 0) return null;
    const parts = ["电池系统", "车身车架", "底盘悬挂", "电驱系统", "内外饰件"];
    const partColors = ["#1890ff", "#52c41a", "#fa8c16", "#722ed1", "#8c8c8c"];
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          const v = vehicles[params[0].dataIndex];
          let html = `<strong>${v.brand} ${v.name}</strong><br/>整备质量: ${v.curb_weight} kg<br/>`;
          params.forEach((p) => {
            html += `${p.marker} ${p.seriesName}: ${p.value} kg (${((p.value / v.curb_weight) * 100).toFixed(1)}%)<br/>`;
          });
          return html;
        },
      },
      legend: { data: parts, bottom: 0 },
      grid: { left: 100, right: 30, top: 20, bottom: 50 },
      xAxis: { type: "value", name: "kg" },
      yAxis: {
        type: "category",
        data: vehicles.map((v) => `${v.brand} ${v.name}`),
        axisLabel: { fontSize: 12 },
      },
      series: parts.map((p, i) => ({
        name: p,
        type: "bar",
        stack: "total",
        emphasis: { focus: "series" },
        itemStyle: { color: partColors[i] },
        data: weightBreakdowns.map((wb) => {
          const part = wb.parts.find((x) => x.name === p);
          return part ? part.weight : 0;
        }),
      })),
    };
  }, [vehicles, weightBreakdowns]);

  const compareColumns = useMemo(() => {
    const cols = [
      {
        title: "指标",
        dataIndex: "label",
        key: "label",
        width: 130,
        fixed: "left",
        render: (text, record) => (
          <strong style={{ color: record.highlight ? "#1890ff" : "#333" }}>
            {text}
          </strong>
        ),
      },
    ];
    vehicles.forEach((v, idx) => {
      cols.push({
        title: (
          <div>
            <div style={{ fontWeight: 600 }}>{v.brand}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{v.name}</div>
          </div>
        ),
        key: `v${v.id}`,
        width: 180,
        render: (_, record) => record.render(v, idx),
      });
    });
    return cols;
  }, [vehicles]);

  const compareData = useMemo(() => {
    const rows = [
      {
        key: "category",
        label: "车型类别",
        highlight: false,
        render: (v) => (
          <Tag
            color={
              v.category === "微型代步"
                ? "#52c41a"
                : v.category === "家用紧凑"
                  ? "#1890ff"
                  : v.category === "中大型"
                    ? "#722ed1"
                    : "#fa8c16"
            }
          >
            {v.category}
          </Tag>
        ),
      },
      {
        key: "curb_weight",
        label: "整备质量",
        highlight: true,
        render: (v) => (
          <span>
            <strong>{v.curb_weight}</strong> kg{" "}
            {v.curb_weight < 1500 && (
              <Tag color="green" style={{ marginLeft: 4 }}>
                轻量化
              </Tag>
            )}
          </span>
        ),
      },
      {
        key: "range",
        label: "续航里程",
        highlight: false,
        render: (v) => <span>{v.range} km</span>,
      },
      {
        key: "price",
        label: "价格",
        highlight: false,
        render: (v) => <span>{v.price.toFixed(1)} 万元</span>,
      },
      {
        key: "energy_density",
        label: "能量密度",
        highlight: false,
        render: (v) =>
          v.energy_density ? (
            <span>{v.energy_density} Wh/kg</span>
          ) : (
            <span style={{ color: "#999" }}>-</span>
          ),
      },
      {
        key: "material",
        label: "车身材料",
        highlight: false,
        render: (v) =>
          v.material ? (
            <span>{v.material}</span>
          ) : (
            <span style={{ color: "#999" }}>未标注</span>
          ),
      },
      {
        key: "scenarios",
        label: "适配场景",
        highlight: false,
        render: (v) => (
          <Space size={[4, 4]} wrap>
            {v.scenarios.map((s) => (
              <Tag key={s} className="vehicle-tag">
                {s}
              </Tag>
            ))}
          </Space>
        ),
      },
      {
        key: "status",
        label: "状态",
        highlight: false,
        render: (v) => (
          <Tag
            color={
              v.status === "在售"
                ? "green"
                : v.status === "停售"
                  ? "red"
                  : "orange"
            }
          >
            {v.status}
          </Tag>
        ),
      },
      {
        key: "battery",
        label: "电池系统",
        highlight: true,
        render: (v, idx) => {
          const bp = weightBreakdowns[idx]?.parts.find(
            (p) => p.name === "电池系统",
          );
          return bp ? (
            <span>
              {bp.weight} kg{" "}
              <span style={{ color: "#999" }}>
                ({(bp.ratio * 100).toFixed(1)}%)
              </span>
            </span>
          ) : (
            "-"
          );
        },
      },
      {
        key: "body",
        label: "车身车架",
        highlight: true,
        render: (v, idx) => {
          const bp = weightBreakdowns[idx]?.parts.find(
            (p) => p.name === "车身车架",
          );
          return bp ? (
            <span>
              {bp.weight} kg{" "}
              <span style={{ color: "#999" }}>
                ({(bp.ratio * 100).toFixed(1)}%)
              </span>
            </span>
          ) : (
            "-"
          );
        },
      },
      {
        key: "chassis",
        label: "底盘悬挂",
        highlight: true,
        render: (v, idx) => {
          const bp = weightBreakdowns[idx]?.parts.find(
            (p) => p.name === "底盘悬挂",
          );
          return bp ? (
            <span>
              {bp.weight} kg{" "}
              <span style={{ color: "#999" }}>
                ({(bp.ratio * 100).toFixed(1)}%)
              </span>
            </span>
          ) : (
            "-"
          );
        },
      },
      {
        key: "drivetrain",
        label: "电驱系统",
        highlight: true,
        render: (v, idx) => {
          const bp = weightBreakdowns[idx]?.parts.find(
            (p) => p.name === "电驱系统",
          );
          return bp ? (
            <span>
              {bp.weight} kg{" "}
              <span style={{ color: "#999" }}>
                ({(bp.ratio * 100).toFixed(1)}%)
              </span>
            </span>
          ) : (
            "-"
          );
        },
      },
      {
        key: "action",
        label: "操作",
        highlight: false,
        render: (v) => (
          <Popconfirm
            title="确定从对比集移除？"
            onConfirm={() => handleRemove(v.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              移除
            </Button>
          </Popconfirm>
        ),
      },
    ];
    return rows;
  }, [vehicles, weightBreakdowns]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <div style={{ fontSize: 16, color: "#999" }}>加载中...</div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div>
        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Link to="/vehicles">
              <Button icon={<ArrowLeftOutlined />}>返回车型管理</Button>
            </Link>
          </Space>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <div style={{ fontSize: 16, marginBottom: 8 }}>对比集为空</div>
                <div style={{ color: "#999", fontSize: 13 }}>
                  请前往车型管理页，将感兴趣的车型加入对比集（最多 {maxCount}{" "}
                  款）
                </div>
              </div>
            }
          >
            <Link to="/vehicles">
              <Button type="primary" icon={<SwapOutlined />}>
                去选择车型
              </Button>
            </Link>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Link to="/vehicles">
                <Button icon={<ArrowLeftOutlined />}>车型管理</Button>
              </Link>
              <span style={{ fontSize: 18, fontWeight: 600 }}>
                <SwapOutlined style={{ marginRight: 8 }} />
                车型横向对比
              </span>
              <Tag color="blue">
                {vehicles.length} / {maxCount}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Popconfirm
              title="确定清空对比集？"
              onConfirm={handleClear}
              okText="清空"
              cancelText="取消"
            >
              <Button danger icon={<ClearOutlined />}>
                清空对比
              </Button>
            </Popconfirm>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginTop: 16 }} title="关键指标对比">
        <Table
          columns={compareColumns}
          dataSource={compareData}
          pagination={false}
          bordered
          size="middle"
          scroll={{ x: 130 + vehicles.length * 180 }}
        />
      </Card>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="多维能力雷达图" style={{ height: "100%" }}>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
              各维度基于对比集内车型归一化（0-100分），越靠外越强
            </div>
            {radarOption && (
              <ReactECharts option={radarOption} style={{ height: 400 }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="各部分重量占比" style={{ height: "100%" }}>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
              基于车型类别、续航与能量密度估算的整备质量构成（kg）
            </div>
            {stackBarOption && (
              <ReactECharts option={stackBarOption} style={{ height: 400 }} />
            )}
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }} title="各车型重量构成明细">
        <Row gutter={[16, 16]}>
          {weightBreakdowns.map((wb, idx) => (
            <Col
              xs={24}
              sm={12}
              md={vehicles.length <= 2 ? 12 : 8}
              xl={6}
              key={wb.vehicle.id}
            >
              <Card
                size="small"
                title={
                  <div>
                    <Tag
                      color={COLORS[idx % COLORS.length]}
                      style={{ marginRight: 4 }}
                    >
                      {idx + 1}
                    </Tag>
                    {wb.vehicle.brand} {wb.vehicle.name}
                  </div>
                }
                style={{
                  borderLeft: `3px solid ${COLORS[idx % COLORS.length]}`,
                }}
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="整备质量">
                    {wb.vehicle.curb_weight} kg
                  </Descriptions.Item>
                  {wb.parts.map((p) => (
                    <Descriptions.Item key={p.name} label={p.name}>
                      {p.weight} kg{" "}
                      <span style={{ color: "#999" }}>
                        ({(p.ratio * 100).toFixed(1)}%)
                      </span>
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}

export default ComparePage;
