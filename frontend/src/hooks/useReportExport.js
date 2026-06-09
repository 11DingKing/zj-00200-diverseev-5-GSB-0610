import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const REPORT_CONFIG_KEY = "diverseev_report_config";

export function useReportExport() {
  const navigate = useNavigate();

  const exportReport = useCallback(
    (config) => {
      const reportConfig = {
        timestamp: Date.now(),
        ...config,
      };
      localStorage.setItem(REPORT_CONFIG_KEY, JSON.stringify(reportConfig));
      navigate("/decision?action=export");
    },
    [navigate],
  );

  const getPendingReport = useCallback(() => {
    try {
      const config = localStorage.getItem(REPORT_CONFIG_KEY);
      if (config) {
        const parsed = JSON.parse(config);
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed;
        }
        localStorage.removeItem(REPORT_CONFIG_KEY);
      }
    } catch (e) {
      console.error("读取报告配置失败:", e);
    }
    return null;
  }, []);

  const clearPendingReport = useCallback(() => {
    localStorage.removeItem(REPORT_CONFIG_KEY);
  }, []);

  return {
    exportReport,
    getPendingReport,
    clearPendingReport,
  };
}

export function useReportSections() {
  const [selectedSections, setSelectedSections] = useState([
    "marketConcentration",
    "scenarioCoverage",
    "diversityTrend",
  ]);

  const toggleSection = useCallback((section) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  }, []);

  return {
    selectedSections,
    setSelectedSections,
    toggleSection,
  };
}

export default useReportExport;
