import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  CarOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  EnvironmentOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import Dashboard from "./pages/Dashboard.jsx";
import VehicleList from "./pages/VehicleList.jsx";
import Statistics from "./pages/Statistics.jsx";
import ScenarioMatch from "./pages/ScenarioMatch.jsx";
import Suggestions from "./pages/Suggestions.jsx";
import RegionalAnalysis from "./pages/RegionalAnalysis.jsx";
import DecisionSupport from "./pages/DecisionSupport.jsx";

const { Header, Content, Footer } = Layout;

function App() {
  const location = useLocation();

  const menuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link to="/">数据概览</Link>,
    },
    {
      key: "/vehicles",
      icon: <CarOutlined />,
      label: <Link to="/vehicles">车型管理</Link>,
    },
    {
      key: "/statistics",
      icon: <BarChartOutlined />,
      label: <Link to="/statistics">统计分析</Link>,
    },
    {
      key: "/regional",
      icon: <EnvironmentOutlined />,
      label: <Link to="/regional">地域分析</Link>,
    },
    {
      key: "/scenario",
      icon: <ThunderboltOutlined />,
      label: <Link to="/scenario">场景匹配</Link>,
    },
    {
      key: "/suggestions",
      icon: <BulbOutlined />,
      label: <Link to="/suggestions">发展建议</Link>,
    },
    {
      key: "/decision",
      icon: <RocketOutlined />,
      label: <Link to="/decision">决策支持</Link>,
    },
  ];

  return (
    <Layout className="app-container">
      <Header className="app-header">
        <div className="app-logo">
          <CarOutlined style={{ fontSize: "28px" }} />
          新能源汽车产品多元化供给监测平台
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ background: "transparent", minWidth: "600px" }}
        />
      </Header>
      <Content className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<VehicleList />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/regional" element={<RegionalAnalysis />} />
          <Route path="/scenario" element={<ScenarioMatch />} />
          <Route path="/suggestions" element={<Suggestions />} />
          <Route path="/decision" element={<DecisionSupport />} />
        </Routes>
      </Content>
      <Footer className="app-footer">
        DiverseEV Monitor ©2024 - 坚持多元供给，促进产业健康发展
      </Footer>
    </Layout>
  );
}

export default App;
