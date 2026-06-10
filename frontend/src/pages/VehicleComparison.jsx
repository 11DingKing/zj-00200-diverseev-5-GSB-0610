import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  Button,
  Tag,
  Empty,
  Row,
  Col,
  Descriptions,
  Space,
  message,
  Popconfirm,
  Statistic,
  Divider,
} from "antd";
import {
  DeleteOutlined,
  SwapOutlined,
  ClearOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { useNavigate } from "react-router-dom";
import { comparisonAPI } from "../api.js";

const COLORS = ["#1890ff", "#52c41a", "#fa8c16", "#722ed1"];

function VehicleComparison() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [comparisonSet, setComparisonSet] = useState({
    count: 0,
    maxSize: 4,
    vehicles: [],
  });

  useEffect(() => {
    loadComparisonSet();
  }, []);

  const loadComparisonSet = async () => {
    setLoading(true);
    try {
      const res = await comparisonAPI.getComparisonSet();
      setComparisonSet(res.data);
    } catch (error) {
      message.error("加载对比集失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (vehicle) => {
    try {
      await comparisonAPI.removeFromComparison(vehicle.id);
      message.success(`${vehicle.brand} ${vehicle.name} 已移出对比`);
      loadComparisonSet();
    } catch (error) {
      message.error(error.response?.data?.error || "移除失败");
      console.error(error);
    }
  };

  const handleClear = async () => {
    try {
      await comparisonAPI.clearComparison();
      message.success("对比集已清空");
      loadComparisonSet();
    } catch (error) {
      message.error("清空失败");
      console.error(error);
    }
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

  const radarOption = useMemo(() => {
    const vehicles = comparisonSet.vehicles;
    if (vehicles.length === 0) return {};

    const maxWeight = Math.max(...vehicles.map((v) => v.curb_weight)) * 1.1;
    const maxRange = Math.max(...vehicles.map((v) => v.range)) * 1.1;
    const maxPrice = Math.max(...vehicles.map((v) => v.price)) * 1.1;
    const maxEnergyDensity =
      Math.max(...vehicles.map((v) => v.energy_density || 0)) * 1.1 || 200;

    const indicators = [
      { name: "轻量化", max: 100 },
      { name: "续航", max: 100 },
      { name: "经济性", max: 100 },
      { name: "能量密度", max: 100 },
      { name: "场景适配", max: 100 },
    ];

    const series = vehicles.map((vehicle, index) => {
      const lightweightScore = Math.round(
        ((maxWeight - vehicle.curb_weight) / maxWeight) * 100,
      );
      const rangeScore = Math.round((vehicle.range / maxRange) * 100);
      const priceScore = Math.round(
        ((maxPrice - vehicle.price) / maxPrice) * 100,
      );
      const energyDensityScore = Math.round(
        ((vehicle.energy_density || 0) / maxEnergyDensity) * 100,
      );
      const scenarioScore = Math.round((vehicle.scenarios.length / 3) * 100);

      return {
        value: [
          lightweightScore,
          rangeScore,
          priceScore,
          energyDensityScore,
          scenarioScore,
        ],
        name: `${vehicle.brand} ${vehicle.name}`,
        itemStyle: { color: COLORS[index] },
        areaStyle: { opacity: 0.2 },
      };
    });

    return {
      tooltip: { trigger: "item" },
      legend: {
        data: vehicles.map((v) => `${v.brand} ${v.name}`),
        bottom: 10,
      },
      radar: {
        indicator: indicators,
        shape: "polygon",
        splitNumber: 4,
        axisName: {
          color: "#666",
          fontSize: 12,
        },
        splitArea: {
          areaStyle: {
            color: ["#fafafa", "#f5f5f5", "#fafafa", "#f5f5f5"],
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
  }, [comparisonSet.vehicles]);

  if (!loading && comparisonSet.count === 0) {
    return (
      <div style={{ padding: "40px 0" }}>
        <Card className="chart-container">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <p style={{ fontSize: 16, marginBottom: 8 }}>对比集为空</p>
                <p style={{ color: "#999", marginBottom: 20 }}>
                  请先到车型管理页选择需要对比的车型
                </p>
                <Button
                  type="primary"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate("/vehicles")}
                >
                  去选择车型
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card
        className="chart-container"
        title={
          <Space>
            <SwapOutlined />
            <span>车型对比</span>
            <Tag color="blue">
              {comparisonSet.count}/{comparisonSet.maxSize}
            </Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/vehicles")}>
              返回列表
            </Button>
            <Popconfirm
              title="确定清空对比集？"
              onConfirm={handleClear}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<ClearOutlined />}>
                清空对比
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {comparisonSet.vehicles.map((vehicle, index) => (
            <Col xs={24} sm={12} md={6} key={vehicle.id}>
              <Card
                size="small"
                style={{
                  borderTop: `3px solid ${COLORS[index]}`,
                  height: "100%",
                }}
                extra={
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemove(vehicle)}
                  >
                    移除
                  </Button>
                }
              >
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <Tag color={getCategoryColor(vehicle.category)}>
                    {vehicle.category}
                  </Tag>
                  <h3 style={{ margin: "8px 0 4px 0", fontSize: 16 }}>
                    {vehicle.brand}
                  </h3>
                  <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
                    {vehicle.name}
                  </p>
                </div>
                <Divider style={{ margin: "8px 0" }} />
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="整备质量">
                    <strong>{vehicle.curb_weight}</strong> kg
                    {vehicle.curb_weight < 1500 && (
                      <Tag color="green" style={{ marginLeft: 4 }}>
                        轻量化
                      </Tag>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="续航">
                    <strong>{vehicle.range}</strong> km
                  </Descriptions.Item>
                  <Descriptions.Item label="价格">
                    <strong>{vehicle.price.toFixed(1)}</strong> 万元
                  </Descriptions.Item>
                  <Descriptions.Item label="能量密度">
                    {vehicle.energy_density ? (
                      <>
                        <strong>{vehicle.energy_density}</strong> Wh/kg
                      </>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="车身材料">
                    {vehicle.material || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag
                      color={
                        vehicle.status === "在售"
                          ? "green"
                          : vehicle.status === "停售"
                            ? "red"
                            : "orange"
                      }
                    >
                      {vehicle.status}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>
                    适配场景:
                  </div>
                  <div>
                    {vehicle.scenarios.map((s) => (
                      <Tag key={s} className="vehicle-tag">
                        {s}
                      </Tag>
                    ))}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Divider orientation="left">综合对比雷达图</Divider>

        <Card size="small">
          <ReactECharts
            option={radarOption}
            style={{ height: 400 }}
            notMerge={true}
          />
        </Card>

        <Divider orientation="left">详细参数对比</Divider>

        <Card size="small">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #f0f0f0", width: 120 }}>
                    对比项
                  </th>
                  {comparisonSet.vehicles.map((vehicle, index) => (
                    <th
                      key={vehicle.id}
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        borderBottom: `2px solid ${COLORS[index]}`,
                        minWidth: 150,
                      }}
                    >
                      <Tag color={COLORS[index]}>
                        {vehicle.brand} {vehicle.name}
                      </Tag>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", color: "#666" }}>
                    车型类别
                  </td>
                  {comparisonSet.vehicles.map((vehicle) => (
                    <td
                      key={vehicle.id}
                      style={{ padding: "12px 16px", textAlign: "center", borderBottom: "1px solid #f0f0f0" }}
                    >
                      <Tag color={getCategoryColor(vehicle.category)}>
                        {vehicle.category}
                      </Tag>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", color: "#666" }}>
                    整备质量
                  </td>
                  {comparisonSet.vehicles.map((vehicle) => (
                    <td
                      key={vehicle.id}
                      style={{ padding: "12px 16px", textAlign: "center", borderBottom: "1px solid #f0f0f0", fontWeight: 600 }}
                    >
                      {vehicle.curb_weight} kg
                      {vehicle.curb_weight < 1500 && (
                        <Tag color="green" style={{ marginLeft: 4 }}>
                          轻
                        </Tag>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", color: "#666" }}>
                    续航里程
                  </td>
                  {comparisonSet.vehicles.map((vehicle) => (
                    <td
                      key={vehicle.id}
                      style={{ padding: "12px 16px", textAlign: "center", borderBottom: "1px solid #f0f0f0", fontWeight: 600 }}
                    >
                      {vehicle.range} km
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", color: "#666" }}>
                    价格
                  </td>
                  {comparisonSet.vehicles.map((vehicle) => (
                    <td
                      key={vehicle.id}
                      style={{ padding: "12px 16px", textAlign: "center", borderBottom: "1px solid #f0f0f0", fontWeight: 600 }}
                    >
                      {vehicle.price.toFixed(1)} 万元
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", color: "#666" }}>
                    能量密度
                  </td>
                  {comparisonSet.vehicles.map((vehicle) => (
                    <td
                      key={vehicle.id}
                      style={{ padding: "12px 16px", textAlign: "center", borderBottom: "1px solid #f0f0f0", fontWeight: 600 }}
                    >
                      {vehicle.energy_density ? `${vehicle.energy_density} Wh/kg` : "-"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", color: "#666" }}>
                    车身材料
                  </td>
                  {comparisonSet.vehicles.map((vehicle) => (
                    <td
                      key={vehicle.id}
                      style={{ padding: "12px 16px", textAlign: "center", borderBottom: "1px solid #f0f0f0" }}
                    >
                      {vehicle.material || "-"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", color: "#666" }}>
                    适配场景
                  </td>
                  {comparisonSet.vehicles.map((vehicle) => (
                    <td
                      key={vehicle.id}
                      style={{ padding: "12px 16px", textAlign: "center", borderBottom: "1px solid #f0f0f0" }}
                    >
                      {vehicle.scenarios.map((s) => (
                        <Tag key={s} className="vehicle-tag">
                          {s}
                        </Tag>
                      ))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", color: "#666" }}>
                    状态
                  </td>
                  {comparisonSet.vehicles.map((vehicle) => (
                    <td
                      key={vehicle.id}
                      style={{ padding: "12px 16px", textAlign: "center", borderBottom: "1px solid #f0f0f0" }}
                    >
                      <Tag
                        color={
                          vehicle.status === "在售"
                            ? "green"
                            : vehicle.status === "停售"
                              ? "red"
                              : "orange"
                        }
                      >
                        {vehicle.status}
                      </Tag>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </Card>
    </div>
  );
}

export default VehicleComparison;
