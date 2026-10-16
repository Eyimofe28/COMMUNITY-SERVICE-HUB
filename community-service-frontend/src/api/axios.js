import axios from "axios";

// Backend address. Set REACT_APP_API_URL in community-service-frontend/.env
// (e.g. on the school server); defaults to the local backend for development.
// Note: REACT_APP_* values are baked in when you run `npm run build`.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// Attach JWT automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
