import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

export const vehicleAPI = {
  getVehicles: (params) => api.get("/vehicles", { params }),
  getVehicle: (id) => api.get(`/vehicles/${id}`),
  createVehicle: (data) => api.post("/vehicles", data),
  updateVehicle: (id, data) => api.put(`/vehicles/${id}`, data),
  deleteVehicle: (id) => api.delete(`/vehicles/${id}`),
  getCategoryStats: () => api.get("/vehicles/stats/category"),
  getWeightDistribution: (params) =>
    api.get("/vehicles/stats/weight-distribution", { params }),
  getScenarioCoverage: () => api.get("/vehicles/stats/scenario-coverage"),
  getMarketConcentration: () => api.get("/vehicles/stats/market-concentration"),
  getTierTrend: (params) => api.get("/vehicles/stats/tier-trend", { params }),
  matchByScenario: (scenario) =>
    api.get(`/vehicles/match/scenario/${scenario}`),
  getDiversityTrend: () => api.get("/vehicles/stats/diversity-trend"),
  getRegions: () => api.get("/vehicles/stats/regions"),
  getRegionAnalysis: (regionId) =>
    api.get(`/vehicles/stats/region/${regionId}/analysis`),
  matchCustomScenario: (data) =>
    api.post("/vehicles/match/custom-scenario", data),
};

export const suggestionAPI = {
  getLightweight: () => api.get("/suggestions/lightweight"),
  getDiversity: () => api.get("/suggestions/diversity"),
  getTechProgress: () => api.get("/suggestions/tech-progress"),
  createTechProgress: (data) => api.post("/suggestions/tech-progress", data),
};

export const metaAPI = {
  getMeta: () => api.get("/meta"),
};

export const decisionAPI = {
  getSimulationParameters: () => api.get("/decision/simulate/parameters"),
  simulatePolicy: (params) => api.post("/decision/simulate/policy", params),
  recommendVehicles: (criteria) => api.post("/decision/recommend", criteria),
  generateReport: (reportConfig) =>
    api.post("/decision/report/generate", reportConfig),
};

export default api;
