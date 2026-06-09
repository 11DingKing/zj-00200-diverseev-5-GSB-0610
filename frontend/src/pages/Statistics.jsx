import React, { useEffect, useState } from "react";
import { Row, Col, Card, Select, Tabs, Empty, Alert, Space } from "antd";
import ReactECharts from "echarts-for-react";
import { vehicleAPI, metaAPI } from "../api.js";
import ExportReportButton from "../components/ExportReportButton.jsx";

const { Option } = Select;
const { TabPane } = Tabs;

function Statistics() {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ categories: [], weightRanges: [] });
  const [weightDist, setWeightDist] = useState([]);
  const [weightDistByCategory, setWeightDistByCategory] = useState({});
  const [categoryStats, setCategoryStats] = useState([]);
  const [scenarioCoverage, setScenarioCoverage] = useState([]);
  const [concentration, setConcentration] = useState(null);
  const [tierTrend, setTierTrend] = useState(null);
  const [diversityTrend, setDiversityTrend] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState("1");

  useEffect(() => {
    loadMeta();
    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadWeightDistByCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const loadMeta = async () => {
    try {
      const res = await metaAPI.getMeta();
      setMeta(res.data);
    } catch (error) {
      console.error("加载元数据失败:", error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        weightRes,
        categoryRes,
        scenarioRes,
        concentrationRes,
        tierTrendRes,
        diversityTrendRes,
      ] = await Promise.all([
        vehicleAPI.getWeightDistribution(),
        vehicleAPI.getCategoryStats(),
        vehicleAPI.getScenarioCoverage(),
        vehicleAPI.getMarketConcentration(),
        vehicleAPI.getTierTrend(),
        vehicleAPI.getDiversityTrend(),
      ]);

      setWeightDist(weightRes.data);
      setCategoryStats(categoryRes.data);
      setScenarioCoverage(scenarioRes.data);
      setConcentration(concentrationRes.data);
      setTierTrend(tierTrendRes.data);
      setDiversityTrend(diversityTrendRes.data);
    } catch (error) {
      console.error("加载统计数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeightDistByCategory = async (category) => {
    try {
      const res = await vehicleAPI.getWeightDistribution({ category });
      setWeightDistByCategory((prev) => ({ ...prev, [category]: res.data }));
    } catch (error) {
      console.error("加载分类重量分布失败:", error);
    }
  };

  const getWeightDistOption = (data, title) => ({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    title: {
      text: title,
      left: "center",
      textStyle: { fontSize: 14, fontWeight: 600 },
    },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      data: data.map((w) => w.weight_range),
      axisLabel: { fontSize: 12 },
    },
    yAxis: { type: "value", name: "车型数量" },
    series: [
      {
        type: "bar",
        data: data.map((w, idx) => ({
          value: w.count,
          itemStyle: {
            color: idx < 2 ? "#52c41a" : idx < 3 ? "#faad14" : "#ff4d4f",
            borderRadius: [4, 4, 0, 0],
          },
        })),
        label: { show: true, position: "top", fontSize: 12 },
        barWidth: "50%",
      },
    ],
  });

  const getCategoryComparisonOption = () => {
    const categories = categoryStats.map((c) => c.category);
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
      title: {
        text: "各类别指标对比",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      legend: {
        data: ["平均重量(kg)", "平均续航(km÷10)", "平均价格(万元×10)"],
        bottom: 0,
      },
      grid: { left: "3%", right: "4%", bottom: "15%", containLabel: true },
      xAxis: { type: "category", data: categories },
      yAxis: { type: "value", name: "数值" },
      series: [
        {
          name: "平均重量(kg)",
          type: "bar",
          data: categoryStats.map((c) => Math.round(c.avg_weight)),
          itemStyle: { color: "#722ed1" },
          label: { show: true, position: "top" },
        },
        {
          name: "平均续航(km÷10)",
          type: "bar",
          data: categoryStats.map((c) => Math.round(c.avg_range / 10)),
          itemStyle: { color: "#1890ff" },
          label: { show: true, position: "top" },
        },
        {
          name: "平均价格(万元×10)",
          type: "bar",
          data: categoryStats.map((c) => Math.round(c.avg_price * 10)),
          itemStyle: { color: "#fa8c16" },
          label: { show: true, position: "top" },
        },
      ],
    };
  };

  const getWeightRangeStackOption = () => {
    const categories = categoryStats.map((c) => c.category);
    const weightRanges = meta.weightRanges;
    const colorMap = {
      "<1200kg": "#52c41a",
      "1200-1500kg": "#73d13d",
      "1500-1800kg": "#faad14",
      "1800-2200kg": "#fa8c16",
      "2200-2800kg": "#f5222d",
      ">=2800kg": "#a8071a",
    };

    const series = weightRanges.map((range) => ({
      name: range,
      type: "bar",
      stack: "total",
      data: categories.map((cat) => {
        const catData = weightDistByCategory[cat];
        if (!catData) return 0;
        const found = catData.find((w) => w.weight_range === range);
        return found ? found.count : 0;
      }),
      itemStyle: { color: colorMap[range] },
      label: { show: true, position: "inside", formatter: "{c}" },
    }));

    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      title: {
        text: "各车型类别重量分布构成",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      legend: { data: weightRanges, bottom: 0, type: "scroll" },
      grid: { left: "3%", right: "4%", bottom: "18%", containLabel: true },
      xAxis: { type: "category", data: categories },
      yAxis: { type: "value", name: "车型数量" },
      series,
    };
  };

  const getScenarioCoverageOption = () => ({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    title: {
      text: "各场景覆盖度与轻量化车型占比",
      left: "center",
      textStyle: { fontSize: 14, fontWeight: 600 },
    },
    legend: { data: ["覆盖度(%)", "轻量化车型占比(%)"], bottom: 0 },
    grid: { left: "3%", right: "4%", bottom: "15%", containLabel: true },
    xAxis: { type: "category", data: scenarioCoverage.map((s) => s.scenario) },
    yAxis: [
      { type: "value", name: "百分比(%)", max: 100 },
      { type: "value", name: "车型数量", show: false },
    ],
    series: [
      {
        name: "覆盖度(%)",
        type: "bar",
        data: scenarioCoverage.map((s) => ({
          value: s.coverage,
          itemStyle: { color: s.hasGap ? "#ff4d4f" : "#52c41a" },
        })),
        label: { show: true, position: "top", formatter: "{c}%" },
        yAxisIndex: 0,
      },
      {
        name: "轻量化车型占比(%)",
        type: "bar",
        data: scenarioCoverage.map((s) => ({
          value: s.lightweightRatio,
          itemStyle: { color: s.hasGap ? "#ffa940" : "#1890ff" },
        })),
        label: { show: true, position: "top", formatter: "{c}%" },
        yAxisIndex: 0,
      },
      {
        name: "匹配车型数",
        type: "line",
        data: scenarioCoverage.map((s) => s.matchedVehicles),
        smooth: true,
        lineStyle: { color: "#722ed1", width: 3 },
        itemStyle: { color: "#722ed1" },
        yAxisIndex: 1,
      },
    ],
  });

  const getConcentrationRadarOption = () => {
    if (!concentration) return {};
    return {
      tooltip: {},
      title: {
        text: "市场多元化维度评估",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      radar: {
        indicator: [
          { name: "类别均衡度", max: 100 },
          { name: "轻量化比例", max: 100 },
          { name: "价格覆盖度", max: 100 },
          { name: "品牌多样性", max: 100 },
          { name: "续航覆盖度", max: 100 },
        ],
        radius: "65%",
      },
      series: [
        {
          type: "radar",
          data: [
            {
              value: [
                Math.max(
                  0,
                  100 - Math.abs(concentration.largeCategoryRatio - 50),
                ),
                Math.max(0, 100 - concentration.heavyRatio),
                85,
                Math.min(
                  100,
                  (concentration.categoryDistribution.reduce(
                    (sum, c) => sum + c.count,
                    0,
                  ) /
                    8) *
                    10,
                ),
                90,
              ],
              name: "多元化指数",
              itemStyle: { color: "#1890ff" },
              areaStyle: { opacity: 0.3 },
            },
          ],
        },
      ],
    };
  };

  const getWeightBoxplotOption = () => {
    const categories = categoryStats.map((c) => c.category);
    return {
      tooltip: { trigger: "item", formatter: "{b}: {c} kg" },
      title: {
        text: "各类别整备质量范围",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: { type: "category", data: categories },
      yAxis: { type: "value", name: "整备质量(kg)" },
      series: [
        {
          type: "custom",
          renderItem: (params, api) => {
            const categoryIndex = api.value(0);
            const min = api.value(1);
            const q1 = api.value(2);
            const median = api.value(3);
            const q3 = api.value(4);
            const max = api.value(5);

            const color = ["#52c41a", "#1890ff", "#722ed1", "#fa8c16"][
              categoryIndex
            ];

            return {
              type: "group",
              children: [
                {
                  type: "line",
                  shape: {
                    x1: api.coord([categoryIndex, min])[0],
                    y1: api.coord([categoryIndex, min])[1],
                    x2: api.coord([categoryIndex, max])[0],
                    y2: api.coord([categoryIndex, max])[1],
                  },
                  style: { stroke: color, lineWidth: 2 },
                },
                {
                  type: "rect",
                  shape: {
                    x: api.coord([categoryIndex - 0.3, q1])[0],
                    y: api.coord([categoryIndex, q3])[1],
                    width: api.size([0.6, 0])[0],
                    height: Math.abs(api.size([0, q3 - q1])[1]),
                  },
                  style: { fill: color, opacity: 0.7 },
                },
                {
                  type: "line",
                  shape: {
                    x1: api.coord([categoryIndex - 0.3, median])[0],
                    y1: api.coord([categoryIndex, median])[1],
                    x2: api.coord([categoryIndex + 0.3, median])[0],
                    y2: api.coord([categoryIndex, median])[1],
                  },
                  style: { stroke: "#fff", lineWidth: 2 },
                },
              ],
            };
          },
          encode: { x: 0, y: [1, 2, 3, 4, 5] },
          data: categoryStats.map((c, idx) => [
            idx,
            c.min_weight,
            c.avg_weight * 0.85,
            c.avg_weight,
            c.avg_weight * 1.15,
            c.max_weight,
          ]),
        },
      ],
    };
  };

  const getTierTrendOption = () => {
    if (!tierTrend || !tierTrend.dates || !tierTrend.series) return {};

    const colorMap = {
      "<1200kg": "#52c41a",
      "1200-1500kg": "#73d13d",
      "1500-1800kg": "#faad14",
      "1800-2200kg": "#fa8c16",
      "2200-2800kg": "#f5222d",
      ">=2800kg": "#a8071a",
    };

    const series = tierTrend.series.map((s) => ({
      name: s.tier_name,
      type: "line",
      smooth: true,
      data: s.data,
      itemStyle: { color: colorMap[s.tier_name] },
      lineStyle: { width: 3 },
      symbol: "circle",
      symbolSize: 8,
      label: {
        show: true,
        position: "top",
        fontSize: 10,
        formatter: "{c}",
      },
    }));

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      },
      title: {
        text: "分档指标趋势（近12个月）",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      legend: {
        data: tierTrend.tierNames,
        bottom: 0,
        type: "scroll",
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: tierTrend.dates,
        axisLabel: { fontSize: 11, rotate: 30 },
      },
      yAxis: {
        type: "value",
        name: "车型数量",
        minInterval: 1,
      },
      series,
    };
  };

  const getTierTrendStackOption = () => {
    if (!tierTrend || !tierTrend.dates || !tierTrend.series) return {};

    const colorMap = {
      "<1200kg": "#52c41a",
      "1200-1500kg": "#73d13d",
      "1500-1800kg": "#faad14",
      "1800-2200kg": "#fa8c16",
      "2200-2800kg": "#f5222d",
      ">=2800kg": "#a8071a",
    };

    const series = tierTrend.series.map((s) => ({
      name: s.tier_name,
      type: "bar",
      stack: "total",
      data: s.data,
      itemStyle: { color: colorMap[s.tier_name] },
      label: {
        show: true,
        position: "inside",
        fontSize: 10,
        formatter: "{c}",
      },
    }));

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      title: {
        text: "各档位构成变化趋势（近12个月）",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      legend: {
        data: tierTrend.tierNames,
        bottom: 0,
        type: "scroll",
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: tierTrend.dates,
        axisLabel: { fontSize: 11, rotate: 30 },
      },
      yAxis: {
        type: "value",
        name: "车型数量",
        minInterval: 1,
      },
      series,
    };
  };

  const getDiversityScoreTrendOption = () => {
    if (!diversityTrend || !diversityTrend.years) return {};

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      },
      title: {
        text: "多元化评分年度趋势",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      legend: {
        data: ["多元化评分", "重型车型占比(%)", "品牌数量"],
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: diversityTrend.years,
        axisLabel: { fontSize: 12 },
      },
      yAxis: [
        { type: "value", name: "评分/占比(%)", max: 100, min: 0 },
        { type: "value", name: "品牌数量", min: 0 },
      ],
      series: [
        {
          name: "多元化评分",
          type: "line",
          data: diversityTrend.diversityScores,
          smooth: true,
          lineStyle: { color: "#1890ff", width: 3 },
          itemStyle: { color: "#1890ff" },
          symbol: "circle",
          symbolSize: 10,
          label: { show: true, position: "top", formatter: "{c}" },
          yAxisIndex: 0,
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(24, 144, 255, 0.3)" },
                { offset: 1, color: "rgba(24, 144, 255, 0.05)" },
              ],
            },
          },
          markLine: {
            silent: true,
            lineStyle: { color: "#52c41a", type: "dashed" },
            data: [
              {
                yAxis: 60,
                label: { formatter: "健康线 60分", position: "insideEndTop" },
              },
            ],
          },
        },
        {
          name: "重型车型占比(%)",
          type: "line",
          data: diversityTrend.heavyRatios,
          smooth: true,
          lineStyle: { color: "#ff4d4f", width: 2, type: "dashed" },
          itemStyle: { color: "#ff4d4f" },
          symbol: "square",
          symbolSize: 8,
          yAxisIndex: 0,
        },
        {
          name: "品牌数量",
          type: "bar",
          data: diversityTrend.brandCounts,
          itemStyle: { color: "#722ed1", opacity: 0.5 },
          yAxisIndex: 1,
          label: { show: true, position: "top" },
        },
      ],
    };
  };

  const getCategoryRatioTrendOption = () => {
    if (
      !diversityTrend ||
      !diversityTrend.years ||
      !diversityTrend.categoryTrend
    )
      return {};

    const series = diversityTrend.categoryTrend.map((cat) => ({
      name: cat.category,
      type: "line",
      data: cat.ratios,
      smooth: true,
      lineStyle: { color: cat.color, width: 3 },
      itemStyle: { color: cat.color },
      symbol: "circle",
      symbolSize: 8,
      label: { show: true, position: "top", formatter: "{c}%", fontSize: 10 },
    }));

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      },
      title: {
        text: "各类别占比年度变化",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      legend: {
        data: diversityTrend.categoryTrend.map((c) => c.category),
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: diversityTrend.years,
        axisLabel: { fontSize: 12 },
      },
      yAxis: {
        type: "value",
        name: "占比(%)",
        max: 50,
        min: 0,
        axisLabel: { formatter: "{value}%" },
      },
      series,
    };
  };

  const getCategoryCountStackOption = () => {
    if (
      !diversityTrend ||
      !diversityTrend.years ||
      !diversityTrend.categoryTrend
    )
      return {};

    const series = diversityTrend.categoryTrend.map((cat) => ({
      name: cat.category,
      type: "bar",
      stack: "total",
      data: cat.data,
      itemStyle: { color: cat.color },
      label: {
        show: true,
        position: "inside",
        formatter: "{c}",
        fontSize: 11,
      },
    }));

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      title: {
        text: "各类别车型数量年度变化",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      legend: {
        data: diversityTrend.categoryTrend.map((c) => c.category),
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: diversityTrend.years,
        axisLabel: { fontSize: 12 },
      },
      yAxis: {
        type: "value",
        name: "车型数量",
        minInterval: 1,
      },
      series,
    };
  };

  const getReportConfigForTab = (tabKey) => {
    const configs = {
      1: {
        reportType: "custom",
        customTitle: "重量分布分析报告",
        sections: ["marketConcentration"],
      },
      2: {
        reportType: "custom",
        customTitle: "类别统计分析报告",
        sections: ["marketConcentration"],
      },
      3: {
        reportType: "custom",
        customTitle: "场景覆盖分析报告",
        sections: ["scenarioCoverage"],
      },
      4: {
        reportType: "custom",
        customTitle: "市场集中度分析报告",
        sections: ["marketConcentration"],
      },
      5: {
        reportType: "custom",
        customTitle: "分档指标趋势报告",
        sections: ["diversityTrend", "marketConcentration"],
      },
      6: {
        reportType: "custom",
        customTitle: "多元化趋势分析报告",
        sections: ["diversityTrend"],
      },
    };
    return (
      configs[tabKey] || {
        reportType: "comprehensive",
        sections: ["marketConcentration", "scenarioCoverage", "diversityTrend"],
      }
    );
  };

  if (loading) return <div>加载中...</div>;

  const tabReportConfig = getReportConfigForTab(activeTab);

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
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>统计分析</h2>
          <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 13 }}>
            多维度统计分析市场供给结构与变化趋势
          </p>
        </div>
        <Space>
          <ExportReportButton
            reportType={tabReportConfig.reportType}
            title={`导出当前分析报告`}
            sections={tabReportConfig.sections}
            customConfig={{ customTitle: tabReportConfig.customTitle }}
            type="primary"
            ghost
          />
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="重量分布分析" key="1">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card className="chart-container">
                <ReactECharts
                  option={getWeightDistOption(weightDist, "整体重量分布")}
                  style={{ height: "350px" }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card className="chart-container">
                <div style={{ marginBottom: 16 }}>
                  <Select
                    placeholder="选择类别查看详细分布"
                    style={{ width: 200 }}
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    allowClear
                  >
                    {meta.categories.map((c) => (
                      <Option key={c} value={c}>
                        {c}
                      </Option>
                    ))}
                  </Select>
                </div>
                {selectedCategory && weightDistByCategory[selectedCategory] ? (
                  <ReactECharts
                    option={getWeightDistOption(
                      weightDistByCategory[selectedCategory],
                      `${selectedCategory}重量分布`,
                    )}
                    style={{ height: "300px" }}
                  />
                ) : (
                  <Empty description="请选择类别查看分布" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card className="chart-container">
                {Object.keys(weightDistByCategory).length >= 2 ? (
                  <ReactECharts
                    option={getWeightRangeStackOption()}
                    style={{ height: "400px" }}
                  />
                ) : (
                  <Empty description="请先选择至少两个类别查看构成" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card className="chart-container">
                <ReactECharts
                  option={getWeightBoxplotOption()}
                  style={{ height: "400px" }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="类别统计分析" key="2">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card className="chart-container">
                <ReactECharts
                  option={getCategoryComparisonOption()}
                  style={{ height: "400px" }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card className="chart-container">
                <div className="chart-title">各类别详细数据</div>
                <Row gutter={[8, 8]}>
                  {categoryStats.map((cat) => (
                    <Col xs={12} key={cat.category}>
                      <Card
                        size="small"
                        style={{
                          borderTop: `3px solid ${
                            cat.category === "微型代步"
                              ? "#52c41a"
                              : cat.category === "家用紧凑"
                                ? "#1890ff"
                                : cat.category === "中大型"
                                  ? "#722ed1"
                                  : "#fa8c16"
                          }`,
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>
                          {cat.category}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            lineHeight: 1.8,
                          }}
                        >
                          <div>车型数量：{cat.count} 辆</div>
                          <div>平均重量：{Math.round(cat.avg_weight)} kg</div>
                          <div>
                            重量范围：{cat.min_weight}-{cat.max_weight} kg
                          </div>
                          <div>平均价格：{cat.avg_price.toFixed(1)} 万元</div>
                          <div>平均续航：{Math.round(cat.avg_range)} km</div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="场景覆盖分析" key="3">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card className="chart-container">
                <ReactECharts
                  option={getScenarioCoverageOption()}
                  style={{ height: "400px" }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card className="chart-container">
                <div className="chart-title">场景覆盖详情</div>
                {scenarioCoverage.map((sc) => (
                  <Card
                    size="small"
                    key={sc.scenario}
                    style={{ marginBottom: 12 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 16 }}>
                        {sc.scenario}
                      </span>
                      {sc.hasGap ? (
                        <span className="gap-warning">⚠ 轻量化供给缺口</span>
                      ) : (
                        <span className="gap-normal">✓ 供给充足</span>
                      )}
                    </div>
                    <Row gutter={8}>
                      <Col span={8}>
                        <div style={{ fontSize: "12px", color: "#999" }}>
                          匹配车型
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 600,
                            color: "#1890ff",
                          }}
                        >
                          {sc.matchedVehicles}
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ fontSize: "12px", color: "#999" }}>
                          覆盖度
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 600,
                            color: sc.hasGap ? "#ff4d4f" : "#52c41a",
                          }}
                        >
                          {sc.coverage}%
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ fontSize: "12px", color: "#999" }}>
                          轻量化占比
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 600,
                            color:
                              sc.lightweightRatio < 20 ? "#ff4d4f" : "#52c41a",
                          }}
                        >
                          {sc.lightweightRatio}%
                        </div>
                      </Col>
                    </Row>
                    {sc.hasGap && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 8,
                          background: "#fff2f0",
                          borderRadius: 4,
                          fontSize: 12,
                          color: "#ff4d4f",
                        }}
                      >
                        建议：该场景轻量化车型（{"<"}1500kg）仅{" "}
                        {sc.lightweightVehicles}{" "}
                        款，占比不足20%，需补充轻量型产品供给
                      </div>
                    )}
                  </Card>
                ))}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="市场集中度" key="4">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card className="chart-container">
                <ReactECharts
                  option={getConcentrationRadarOption()}
                  style={{ height: "400px" }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card className="chart-container">
                <div className="chart-title">集中度评估指标</div>
                <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                  <Col xs={12}>
                    <Card
                      size="small"
                      style={{
                        textAlign: "center",
                        background: concentration?.isOverConcentrated
                          ? "#fff2f0"
                          : "#f6ffed",
                      }}
                    >
                      <div
                        style={{ fontSize: 12, color: "#999", marginBottom: 4 }}
                      >
                        整体评估
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: concentration?.isOverConcentrated
                            ? "#ff4d4f"
                            : "#52c41a",
                        }}
                      >
                        {concentration?.concentrationLevel}
                      </div>
                    </Card>
                  </Col>
                  <Col xs={12}>
                    <Card size="small" style={{ textAlign: "center" }}>
                      <div
                        style={{ fontSize: 12, color: "#999", marginBottom: 4 }}
                      >
                        在售车型
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#1890ff",
                        }}
                      >
                        {concentration?.totalVehicles} 辆
                      </div>
                    </Card>
                  </Col>
                </Row>
                <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                  <Col xs={12}>
                    <Card size="small" style={{ textAlign: "center" }}>
                      <div
                        style={{ fontSize: 12, color: "#999", marginBottom: 4 }}
                      >
                        平均重量
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#722ed1",
                        }}
                      >
                        {concentration?.averageWeight} kg
                      </div>
                    </Card>
                  </Col>
                  <Col xs={12}>
                    <Card size="small" style={{ textAlign: "center" }}>
                      <div
                        style={{ fontSize: 12, color: "#999", marginBottom: 4 }}
                      >
                        重型车型占比
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color:
                            concentration?.heavyRatio > 40
                              ? "#ff4d4f"
                              : "#52c41a",
                        }}
                      >
                        {concentration?.heavyRatio}%
                      </div>
                    </Card>
                  </Col>
                </Row>
                <div className="chart-title" style={{ marginTop: 16 }}>
                  各类别占比
                </div>
                {concentration?.categoryDistribution.map((cd) => (
                  <div key={cd.category} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span>{cd.category}</span>
                      <span>
                        {cd.count}辆 ({cd.ratio}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        background: "#f0f0f0",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${cd.ratio}%`,
                          background:
                            cd.category === "微型代步"
                              ? "#52c41a"
                              : cd.category === "家用紧凑"
                                ? "#1890ff"
                                : cd.category === "中大型"
                                  ? "#722ed1"
                                  : "#fa8c16",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="分档指标趋势" key="5">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card className="chart-container">
                {tierTrend && tierTrend.dates ? (
                  <ReactECharts
                    option={getTierTrendOption()}
                    style={{ height: "400px" }}
                  />
                ) : (
                  <Empty description="暂无分档趋势数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card className="chart-container">
                {tierTrend && tierTrend.dates ? (
                  <ReactECharts
                    option={getTierTrendStackOption()}
                    style={{ height: "400px" }}
                  />
                ) : (
                  <Empty description="暂无分档趋势数据" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24}>
              <Card className="chart-container">
                <div className="chart-title" style={{ marginBottom: 16 }}>
                  各档位趋势分析
                </div>
                <Row gutter={[8, 8]}>
                  {tierTrend?.tierNames?.map((tier, idx) => {
                    const tierData = tierTrend.series.find(
                      (s) => s.tier_name === tier,
                    );
                    const current =
                      tierData?.data[tierData.data.length - 1] || 0;
                    const previous =
                      tierData?.data[tierData.data.length - 2] || 0;
                    const growth =
                      previous > 0
                        ? (((current - previous) / previous) * 100).toFixed(1)
                        : 0;
                    const colors = [
                      "#52c41a",
                      "#73d13d",
                      "#faad14",
                      "#fa8c16",
                      "#f5222d",
                      "#a8071a",
                    ];

                    return (
                      <Col xs={12} sm={8} md={4} key={tier}>
                        <Card
                          size="small"
                          style={{
                            borderTop: `3px solid ${colors[idx]}`,
                            height: "100%",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 8 }}>
                            {tier}
                          </div>
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 700,
                              color: colors[idx],
                              marginBottom: 4,
                            }}
                          >
                            {current} 辆
                          </div>
                          <div style={{ fontSize: 12, color: "#999" }}>
                            环比上月:{" "}
                            <span
                              style={{
                                color:
                                  parseFloat(growth) >= 0
                                    ? "#52c41a"
                                    : "#ff4d4f",
                                fontWeight: 600,
                              }}
                            >
                              {parseFloat(growth) >= 0 ? "+" : ""}
                              {growth}%
                            </span>
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="多元化趋势" key="6">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card className="chart-container">
                {diversityTrend && diversityTrend.years ? (
                  <ReactECharts
                    option={getDiversityScoreTrendOption()}
                    style={{ height: "400px" }}
                  />
                ) : (
                  <Empty description="暂无多元化趋势数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card className="chart-container">
                <div className="chart-title" style={{ marginBottom: 16 }}>
                  趋势分析结论
                </div>
                {diversityTrend?.trendAnalysis ? (
                  <div>
                    <Card
                      size="small"
                      style={{
                        marginBottom: 16,
                        background:
                          diversityTrend.trendAnalysis.overallTrend ===
                          "improving"
                            ? "#f6ffed"
                            : diversityTrend.trendAnalysis.overallTrend ===
                                "declining"
                              ? "#fff2f0"
                              : "#e6f7ff",
                        borderColor:
                          diversityTrend.trendAnalysis.overallTrend ===
                          "improving"
                            ? "#52c41a"
                            : diversityTrend.trendAnalysis.overallTrend ===
                                "declining"
                              ? "#ff4d4f"
                              : "#1890ff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          marginBottom: 8,
                          color:
                            diversityTrend.trendAnalysis.overallTrend ===
                            "improving"
                              ? "#52c41a"
                              : diversityTrend.trendAnalysis.overallTrend ===
                                  "declining"
                                ? "#ff4d4f"
                                : "#1890ff",
                        }}
                      >
                        {diversityTrend.trendAnalysis.overallTrend ===
                        "improving"
                          ? "📈 供给多元化趋势向好"
                          : diversityTrend.trendAnalysis.overallTrend ===
                              "declining"
                            ? "📉 供给多元化呈下降趋势"
                            : "➡️ 供给结构保持稳定"}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {diversityTrend.trendAnalysis.description}
                      </div>
                    </Card>

                    <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                      <Col xs={12}>
                        <Card size="small" style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#999" }}>
                            多元化评分变化
                          </div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color:
                                diversityTrend.trendAnalysis.scoreChange >= 0
                                  ? "#52c41a"
                                  : "#ff4d4f",
                            }}
                          >
                            {diversityTrend.trendAnalysis.scoreChange >= 0
                              ? "+"
                              : ""}
                            {diversityTrend.trendAnalysis.scoreChange}
                          </div>
                        </Card>
                      </Col>
                      <Col xs={12}>
                        <Card size="small" style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#999" }}>
                            重型占比变化
                          </div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color:
                                diversityTrend.trendAnalysis.heavyChange <= 0
                                  ? "#52c41a"
                                  : "#ff4d4f",
                            }}
                          >
                            {diversityTrend.trendAnalysis.heavyChange >= 0
                              ? "+"
                              : ""}
                            {diversityTrend.trendAnalysis.heavyChange}%
                          </div>
                        </Card>
                      </Col>
                    </Row>

                    <div className="chart-title">关键洞察</div>
                    {diversityTrend.trendAnalysis.insights?.length > 0 ? (
                      diversityTrend.trendAnalysis.insights.map(
                        (insight, idx) => (
                          <Alert
                            key={idx}
                            message={insight.title}
                            description={insight.content}
                            type={
                              insight.type === "warning"
                                ? "warning"
                                : insight.type === "positive"
                                  ? "success"
                                  : "info"
                            }
                            showIcon
                            style={{ marginBottom: 12 }}
                          />
                        ),
                      )
                    ) : (
                      <Empty
                        description="暂无洞察数据"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </div>
                ) : (
                  <Empty description="暂无趋势分析数据" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card className="chart-container">
                {diversityTrend && diversityTrend.years ? (
                  <ReactECharts
                    option={getCategoryRatioTrendOption()}
                    style={{ height: "400px" }}
                  />
                ) : (
                  <Empty description="暂无类别占比数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card className="chart-container">
                {diversityTrend && diversityTrend.years ? (
                  <ReactECharts
                    option={getCategoryCountStackOption()}
                    style={{ height: "400px" }}
                  />
                ) : (
                  <Empty description="暂无类别数量数据" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24}>
              <Card className="chart-container">
                <div className="chart-title" style={{ marginBottom: 16 }}>
                  年度数据详情
                </div>
                {diversityTrend?.rawData ? (
                  <Row gutter={[8, 8]}>
                    {diversityTrend.rawData.map((row, idx) => (
                      <Col xs={12} sm={8} md={4} key={row.stat_year}>
                        <Card
                          size="small"
                          style={{
                            borderTop: `3px solid ${
                              row.diversity_score >= 70
                                ? "#52c41a"
                                : row.diversity_score >= 50
                                  ? "#faad14"
                                  : "#ff4d4f"
                            }`,
                            height: "100%",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 8 }}>
                            {row.stat_year}年
                          </div>
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 700,
                              color:
                                row.diversity_score >= 70
                                  ? "#52c41a"
                                  : row.diversity_score >= 50
                                    ? "#faad14"
                                    : "#ff4d4f",
                              marginBottom: 4,
                            }}
                          >
                            {row.diversity_score} 分
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#999",
                              lineHeight: 1.8,
                            }}
                          >
                            <div>总车型: {row.total_vehicles} 辆</div>
                            <div>平均重量: {Math.round(row.avg_weight)} kg</div>
                            <div>重型占比: {row.heavy_ratio.toFixed(1)}%</div>
                            <div>品牌数量: {row.brand_count} 个</div>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty description="暂无年度数据" />
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
}

export default Statistics;
