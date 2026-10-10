// Antrean offline: simpan input ke penyimpanan lokal saat jaringan putus / lelet, kirim ulang otomatis saat online.
const QKEY = "sk_offline_queue_v1";
const CKEY = "sk_get_cache_v1";
const MAX_CACHE = 120;
const MAX_ENTRY = 250_000;
const SLOW_MS = 30_000;
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const listeners = new Set();
let forcedUntil = 0;
let syncing = false;
let lastSync = null;

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const emit = () => listeners.forEach((fn) => fn(getStatus()));

export const getQueue = () => read(QKEY, []);
export const isOffline = () => !navigator.onLine || Date.now() < forcedUntil;
export const getStatus = () => ({ offline: isOffline(), slow: navigator.onLine && Date.now() < forcedUntil, syncing, pending: getQueue().length, lastSync });
export function subscribe(fn) { listeners.add(fn); fn(getStatus()); return () => listeners.delete(fn); }

export function markSlow() { forcedUntil = Date.now() + SLOW_MS; emit(); }
function markOnline() { if (forcedUntil) { forcedUntil = 0; emit(); } }

const SCAN_URLS = ["/attendance/scan", "/attendance/face-scan", "/attendance/face-confirm"];
const LABELS = [[/attendance/, "Absensi"], [/posts|schoolgram/, "Schoolgram"], [/chat/, "Pesan"], [/timetable/, "Jadwal"], [/piket/, "Piket"]];

export function enqueue(config) {
  let data = config.data;
  if (typeof data === "string") { try { data = JSON.parse(data); } catch { /* keep raw */ } }
  const url = (config.url || "").replace(API, "");
  const at = new Date().toISOString();
  if (data && typeof data === "object" && SCAN_URLS.some((u) => url.startsWith(u))) data = { ...data, client_at: at };
  const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, method: config.method, url, data, params: config.params, at,
    label: (LABELS.find(([re]) => re.test(url)) || [null, "Data"])[1] };
  const q = getQueue();
  q.push(item);
  if (!write(QKEY, q)) throw new Error("Penyimpanan lokal penuh");
  emit();
  return item;
}

export function cacheKey(config) {
  const p = config.params ? `?${new URLSearchParams(config.params)}` : "";
  return `${(config.url || "").replace(API, "")}${p}`;
}
export function getCached(key) { return read(CKEY, {})[key]?.d; }
export function clearOfflineCache() { localStorage.removeItem(CKEY); }
export function putCache(key, d) {
  try {
    const s = JSON.stringify(d);
    if (s.length > MAX_ENTRY) return;
    const c = read(CKEY, {});
    c[key] = { d, t: Date.now() };
    const keys = Object.keys(c);
    if (keys.length > MAX_CACHE) keys.sort((a, b) => c[a].t - c[b].t).slice(0, keys.length - MAX_CACHE).forEach((k) => delete c[k]);
    if (!write(CKEY, c)) localStorage.removeItem(CKEY);
  } catch { /* ignore */ }
}

export async function syncQueue(api) {
  if (syncing || !navigator.onLine || !getQueue().length) return 0;
  syncing = true; emit();
  let sent = 0;
  try {
    for (const item of getQueue()) {
      try {
        await api.request({ method: item.method, url: item.url, data: item.data, params: item.params, _sync: true, timeout: 20000 });
        sent++;
      } catch (e) {
        if (!e.response) break;            // masih offline → hentikan, coba lagi nanti
        if (e.response.status >= 500) break;
      }
      write(QKEY, getQueue().filter((x) => x.id !== item.id));
    }
  } finally {
    syncing = false;
    if (sent) { lastSync = { at: new Date().toISOString(), sent }; markOnline(); window.dispatchEvent(new CustomEvent("offline-synced", { detail: { sent } })); }
    emit();
  }
  return sent;
}

async function probe() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch(`${API}/`, { signal: ctl.signal, cache: "no-store" });
    clearTimeout(t);
    if (r.ok) markOnline();
  } catch { /* still offline */ }
}

export function startOfflineSync(api) {
  window.addEventListener("online", () => { markOnline(); emit(); syncQueue(api); });
  window.addEventListener("offline", emit);
  setInterval(async () => {
    if (navigator.onLine && Date.now() < forcedUntil) await probe();
    if (!isOffline()) syncQueue(api);
  }, 10000);
  setTimeout(() => syncQueue(api), 3000);
}
