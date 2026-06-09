import React from "react";
import { Button, Dropdown, Space, Tooltip } from "antd";
import { FileTextOutlined, DownOutlined } from "@ant-design/icons";
import { useReportExport } from "../hooks/useReportExport";

const ExportReportButton = ({
  reportType = "comprehensive",
  title = "导出报告",
  sections = ["marketConcentration", "scenarioCoverage", "diversityTrend"],
  customConfig = {},
  showDropdown = true,
  ...buttonProps
}) => {
  const { exportReport } = useReportExport();

  const handleExport = (type, additionalSections = []) => {
    const config = {
      reportType: type,
      customTitle: "",
      includeBaseline: true,
      includeSimulation: type === "simulation",
      includeRecommendation: type === "recommendation",
      sections: [...sections, ...additionalSections],
      ...customConfig,
    };
    exportReport(config);
  };

  const menuItems = [
    {
      key: "comprehensive",
      label: "综合分析报告",
      onClick: () =>
        handleExport("comprehensive", [
          "marketConcentration",
          "scenarioCoverage",
          "diversityTrend",
        ]),
    },
    {
      key: "market",
      label: "市场集中度分析报告",
      onClick: () => handleExport("custom", ["marketConcentration"]),
    },
    {
      key: "scenario",
      label: "场景覆盖度分析报告",
      onClick: () => handleExport("custom", ["scenarioCoverage"]),
    },
    {
      key: "diversity",
      label: "多元化趋势分析报告",
      onClick: () => handleExport("custom", ["diversityTrend"]),
    },
  ];

  if (!showDropdown) {
    return (
      <Tooltip title="将跳转到决策支持中心生成报告">
        <Button
          icon={<FileTextOutlined />}
          onClick={() => handleExport(reportType)}
          {...buttonProps}
        >
          {title}
        </Button>
      </Tooltip>
    );
  }

  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight">
      <Tooltip title="选择报告类型导出">
        <Button icon={<FileTextOutlined />} {...buttonProps}>
          <Space>
            {title}
            <DownOutlined />
          </Space>
        </Button>
      </Tooltip>
    </Dropdown>
  );
};

export default ExportReportButton;
