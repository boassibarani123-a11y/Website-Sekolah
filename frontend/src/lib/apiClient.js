import axios from "axios";
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const api = axios.create({ baseURL: API, withCredentials: true });

// Normalize FastAPI/Pydantic error payloads so UI code can safely render
// `err.response.data.detail` as text (it may otherwise be an array of
// validation-error objects, which crashes React when rendered directly).
export function extractErrorMessage(detail, fallback = "Terjadi kesalahan") {
  if (detail == null) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (typeof d === "string" ? d : d?.msg || JSON.stringify(d)))
      .filter(Boolean);
    return msgs.length ? msgs.join(", ") : fallback;
  }
  if (typeof detail === "object") return detail.msg || JSON.stringify(detail);
  return String(detail);
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const data = error?.response?.data;
    if (data && data.detail !== undefined && typeof data.detail !== "string") {
      // Replace the raw object/array with a human-readable string so existing
      // `data.detail` consumers across the app stay safe.
      data.detail = extractErrorMessage(data.detail);
    }
    return Promise.reject(error);
  }
);

export default api;
