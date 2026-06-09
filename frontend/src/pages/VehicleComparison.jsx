import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Empty,
  Popconfirm,
  message,
  Statistic,
  Table,
} from "antd";
import { DeleteOutlined, ClearOutlined, SwapOutlined } from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { comparisonAPI } from "../api.js";

const COLORS = ["#1890ff", "#52c41a", "#722ed1", "#fa8c16"];

const getCategoryColor = (category) => {
  const colorMap = {
    微型代步: "#52c41a",
    家用紧凑: "#1890ff",
    中大型: "#722ed1",
    商用: "#fa8c16",
  };
  return colorMap[category] || "#666";
};

function VehicleComparison() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadComparison = useCallback(async () => {
    setLoading(true);
    try {
      const res = await comparisonAPI.getList();
      setVehicles(res.data);
    } catch (error) {
      message.error("加载对比集失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  const handleRemove = async (vehicleId) => {
    try {
      await comparisonAPI.removeVehicle(vehicleId);
      message.success("已从对比集移除");
      loadComparison();
    } catch (error) {
      message.error("移除失败");
      console.error(error);
    }
  };

  const handleClearAll = async () => {
    try {
      await comparisonAPI.clearAll();
      message.success("对比集已清空");
      loadComparison();
    } catch (error) {
      message.error("清空失败");
      console.error(error);
    }
  };

  const getRadarOption = () => {
    if (vehicles.length === 0) return {};

    const maxWeight = Math.max(...vehicles.map((v) => v.curb_weight), 1);
    const maxRange = Math.max(...vehicles.map((v) => v.range), 1);
    const maxPrice = Math.max(...vehicles.map((v) => v.price), 1);
    const maxEnergy = Math.max(
      ...vehicles.map((v) => v.energy_density || 0),
      1,
    );

    const indicators = [
      { name: "整备质量", max: Math.ceil(maxWeight * 1.2) },
      { name: "续航里程", max: Math.ceil(maxRange * 1.2) },
      { name: "价格", max: Math.ceil(maxPrice * 1.2) },
      { name: "能量密度", max: Math.ceil(maxEnergy * 1.2) || 300 },
    ];

    const series = vehicles.map((v, idx) => ({
      value: [v.curb_weight, v.range, v.price, v.energy_density || 0],
      name: `${v.brand} ${v.name}`,
      itemStyle: { color: COLORS[idx % COLORS.length] },
      areaStyle: { opacity: 0.15 },
      lineStyle: { width: 2 },
    }));

    return {
      tooltip: {
        trigger: "item",
      },
      legend: {
        data: vehicles.map((v) => `${v.brand} ${v.name}`),
        bottom: 0,
        textStyle: { fontSize: 12 },
      },
      radar: {
        indicator: indicators,
        shape: "polygon",
        splitNumber: 5,
        axisName: {
          color: "#666",
          fontSize: 13,
        },
        splitArea: {
          areaStyle: {
            color: ["rgba(24,144,255,0.02)", "rgba(24,144,255,0.05)"],
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
  };

  const getWeightBreakdownOption = () => {
    if (vehicles.length === 0) return {};

    const bodyRatio = 0.35;
    const batteryRatio = 0.3;
    const chassisRatio = 0.2;
    const otherRatio = 0.15;

    const categories = ["车身", "电池组", "底盘", "其他"];
    const series = vehicles.map((v, idx) => ({
      name: `${v.brand} ${v.name}`,
      type: "bar",
      stack: "total",
      barWidth: vehicles.length <= 2 ? 50 : 40,
      itemStyle: { color: COLORS[idx % COLORS.length] },
      data: [
        Math.round(v.curb_weight * bodyRatio),
        Math.round(v.curb_weight * batteryRatio),
        Math.round(v.curb_weight * chassisRatio),
        Math.round(v.curb_weight * otherRatio),
      ],
    }));

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          let html = `<b>${params[0].axisValueLabel}</b><br/>`;
          params.forEach((p) => {
            html += `${p.marker} ${p.seriesName}: ${p.value} kg<br/>`;
          });
          return html;
        },
      },
      legend: {
        data: vehicles.map((v) => `${v.brand} ${v.name}`),
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        top: "8%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: categories,
      },
      yAxis: {
        type: "value",
        name: "重量 (kg)",
      },
      series,
    };
  };

  const comparisonColumns = [
    {
      title: "指标",
      dataIndex: "metric",
      key: "metric",
      width: 120,
      fixed: "left",
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    ...vehicles.map((v, idx) => ({
      title: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span style={{ color: COLORS[idx % COLORS.length], fontWeight: 600 }}>
            {v.brand} {v.name}
          </span>
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemove(v.id)}
          />
        </div>
      ),
      key: v.id,
      width: 160,
      render: (_, row) => row.values[idx],
    })),
  ];

  const getComparisonData = () => {
    if (vehicles.length === 0) return [];

    const bestWeight = Math.min(...vehicles.map((v) => v.curb_weight));
    const bestRange = Math.max(...vehicles.map((v) => v.range));
    const bestPrice = Math.min(...vehicles.map((v) => v.price));
    const bestEnergy = Math.max(...vehicles.map((v) => v.energy_density || 0));

    return [
      {
        metric: "类别",
        values: vehicles.map((v) => (
          <Tag color={getCategoryColor(v.category)}>{v.category}</Tag>
        )),
      },
      {
        metric: "整备质量",
        values: vehicles.map((v) => {
          const isBest = v.curb_weight === bestWeight;
          return (
            <span
              style={{
                color: isBest ? "#52c41a" : undefined,
                fontWeight: isBest ? 700 : 400,
              }}
            >
              {v.curb_weight} kg {isBest ? "★" : ""}
            </span>
          );
        }),
      },
      {
        metric: "续航里程",
        values: vehicles.map((v) => {
          const isBest = v.range === bestRange;
          return (
            <span
              style={{
                color: isBest ? "#52c41a" : undefined,
                fontWeight: isBest ? 700 : 400,
              }}
            >
              {v.range} km {isBest ? "★" : ""}
            </span>
          );
        }),
      },
      {
        metric: "价格",
        values: vehicles.map((v) => {
          const isBest = v.price === bestPrice;
          return (
            <span
              style={{
                color: isBest ? "#52c41a" : undefined,
                fontWeight: isBest ? 700 : 400,
              }}
            >
              {v.price.toFixed(1)} 万元 {isBest ? "★" : ""}
            </span>
          );
        }),
      },
      {
        metric: "能量密度",
        values: vehicles.map((v) => {
          const ed = v.energy_density || 0;
          const isBest = ed === bestEnergy && ed > 0;
          return (
            <span
              style={{
                color: isBest ? "#52c41a" : undefined,
                fontWeight: isBest ? 700 : 400,
              }}
            >
              {ed > 0 ? `${ed} Wh/kg` : "-"} {isBest ? "★" : ""}
            </span>
          );
        }),
      },
      {
        metric: "车身材料",
        values: vehicles.map((v) => v.material || "-"),
      },
      {
        metric: "适配场景",
        values: vehicles.map((v) => (
          <div>
            {v.scenarios.map((s) => (
              <Tag key={s} style={{ marginBottom: 2 }}>
                {s}
              </Tag>
            ))}
          </div>
        )),
      },
      {
        metric: "状态",
        values: vehicles.map((v) => {
          const colorMap = { 在售: "green", 停售: "red", 待上市: "orange" };
          return <Tag color={colorMap[v.status]}>{v.status}</Tag>;
        }),
      },
    ];
  };

  if (!loading && vehicles.length === 0) {
    return (
      <div style={{ padding: "60px 0" }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: "#999", fontSize: 16 }}>
              对比集为空，请先在「车型管理」页面添加车型到对比集
            </span>
          }
        >
          <Button
            type="primary"
            icon={<SwapOutlined />}
            onClick={() => (window.location.href = "/vehicles")}
          >
            前往车型管理
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <Card className="filter-section">
        <Row justify="space-between" align="middle">
          <Col>
            <h3 style={{ margin: 0 }}>
              <SwapOutlined style={{ marginRight: 8 }} />
              车型横向对比
              <Tag color="blue" style={{ marginLeft: 12 }}>
                {vehicles.length} / 4 款车型
              </Tag>
            </h3>
          </Col>
          <Col>
            <Popconfirm
              title="确定清空对比集？"
              onConfirm={handleClearAll}
              okText="确定"
              cancelText="取消"
            >
              <Button
                danger
                icon={<ClearOutlined />}
                disabled={vehicles.length === 0}
              >
                清空对比集
              </Button>
            </Popconfirm>
          </Col>
        </Row>
      </Card>

      <Card className="chart-container" title="关键指标对比" loading={loading}>
        <Table
          columns={comparisonColumns}
          dataSource={getComparisonData()}
          rowKey="metric"
          pagination={false}
          bordered
          size="middle"
          scroll={{ x: 120 + vehicles.length * 160 }}
        />
      </Card>

      {vehicles.length >= 2 && (
        <>
          <Card
            className="chart-container"
            title="多维雷达图对比"
            loading={loading}
          >
            <ReactECharts
              option={getRadarOption()}
              style={{ height: 420 }}
              notMerge={true}
            />
          </Card>

          <Card
            className="chart-container"
            title="各部分重量占比对比"
            loading={loading}
          >
            <ReactECharts
              option={getWeightBreakdownOption()}
              style={{ height: 380 }}
              notMerge={true}
            />
          </Card>
        </>
      )}

      {vehicles.length === 1 && (
        <Card className="chart-container" title="车型概览">
          <Row gutter={24}>
            <Col span={6}>
              <Statistic
                title="整备质量"
                value={vehicles[0].curb_weight}
                suffix="kg"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="续航里程"
                value={vehicles[0].range}
                suffix="km"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="价格"
                value={vehicles[0].price}
                suffix="万元"
                precision={1}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="能量密度"
                value={vehicles[0].energy_density || "-"}
                suffix={vehicles[0].energy_density ? "Wh/kg" : ""}
              />
            </Col>
          </Row>
          <div style={{ marginTop: 16, color: "#999", textAlign: "center" }}>
            至少需要 2 款车型才能生成雷达图和重量占比对比图
          </div>
        </Card>
      )}
    </div>
  );
}

export default VehicleComparison;
