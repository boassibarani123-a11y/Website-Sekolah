import axios from "axios";
import { isOffline, markSlow, enqueue, cacheKey, getCached, putCache, startOfflineSync } from "@/lib/offlineQueue";
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

const MUTATING = ["post", "put", "patch", "delete"];
const NO_QUEUE = /^\/?(auth\/|upload|ws\/|cron\/|ai\/)/;
const queueable = (c) => MUTATING.includes(c.method) && !c._sync &&
  !(typeof FormData !== "undefined" && c.data instanceof FormData) && !NO_QUEUE.test((c.url || "").replace(API, ""));
const queuedResponse = (config) => {
  const item = enqueue(config);
  return { data: { ok: true, offline: true, queued: true, queue_id: item.id }, status: 202, statusText: "Queued", headers: {}, config };
};
const isJsonGet = (c) => c.method === "get" && (!c.responseType || c.responseType === "json");

api.interceptors.request.use((config) => {
  if (queueable(config)) {
    config.timeout = config.timeout || 12000;
    if (isOffline()) config.adapter = async () => queuedResponse(config);
  } else if (isJsonGet(config) && isOffline()) {
    const hit = getCached(cacheKey(config));
    if (hit !== undefined) config.adapter = async () => ({ data: hit, status: 200, statusText: "OK (cache)", headers: {}, config, offline: true });
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (isJsonGet(res.config) && !res.offline && res.status === 200) putCache(cacheKey(res.config), res.data);
    return res;
  },
  (error) => {
    const config = error?.config;
    if (config && !error.response && !axios.isCancel(error)) {
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") markSlow();
      if (queueable(config)) return queuedResponse(config);
      if (isJsonGet(config)) {
        const hit = getCached(cacheKey(config));
        if (hit !== undefined) return { data: hit, status: 200, statusText: "OK (cache)", headers: {}, config, offline: true };
      }
    }
    const data = error?.response?.data;
    if (data && data.detail !== undefined && typeof data.detail !== "string") {
      // Replace the raw object/array with a human-readable string so existing
      // `data.detail` consumers across the app stay safe.
      data.detail = extractErrorMessage(data.detail);
    }
    return Promise.reject(error);
  }
);

startOfflineSync(api);

export default api;
