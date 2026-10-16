// =============================================================================
// Shared API client - every page talks to the backend through this
// -----------------------------------------------------------------------------
// CLIENT/SERVER COMMUNICATION: one configured axios instance:
//   - baseURL points at the backend (REACT_APP_API_URL; HTTPS on the school server)
//   - the login token is attached to every request as "Authorization: Bearer <token>"
//   - data is sent and received as JSON
// ERROR HANDLING: if the backend says the session is no longer valid (401), the
//   user is logged out and sent to the login page with an explanation.
//   getErrorMessage() turns any failed request into a readable message.
// REUSABILITY: pages import `api` instead of repeating URLs and headers.
// =============================================================================

import axios from "axios";
import { logout } from "../utils/auth";

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

// Expired / invalid session on any protected request -> log out.
// (Login itself returns 401 for wrong credentials, so it is excluded.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.startsWith("/auth/login");
    if (error.response?.status === 401 && !isLoginRequest) {
      logout(error.response.data?.message || "Your session has expired. Please log in again.");
    }
    return Promise.reject(error);
  }
);

// Readable message for a failed request:
//   - the backend's own message when it sent one (validation errors, wrong password...)
//   - a connection hint when the server could not be reached at all
//   - otherwise the caller's fallback text
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error.response?.data?.message) return error.response.data.message;
  if (!error.response) {
    return "Cannot reach the server. Check your internet connection and try again.";
  }
  return fallback;
}

export default api;
