const API = import.meta.env.VITE_API_URL || '/api';
const ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

export const assetUrl = (path) => (/^https?:/.test(path) ? path : `${ORIGIN}${path}`);

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

let memoryId = null;
/** Anonymous per-browser id so people can save artwork without an account. */
export function getClientId() {
  try {
    let id = localStorage.getItem('airdraw-client-id');
    if (!id) {
      id = uuid();
      localStorage.setItem('airdraw-client-id', id);
    }
    return id;
  } catch {
    memoryId = memoryId || uuid();
    return memoryId;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-client-id': getClientId() },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the AirDraw server. Make sure the backend is running (npm run dev in /backend).');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.errors?.map((e) => e.message).join(', ');
    throw new Error(detail || data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const health = () => request('/health');
export const listDrawings = () => request('/drawings').then((d) => d.data);
export const getDrawing = (id) => request(`/drawings/${id}`).then((d) => d.data);
export const saveDrawing = (payload) => request('/drawings', { method: 'POST', body: payload }).then((d) => d.data);
export const updateDrawing = (id, title) => request(`/drawings/${id}`, { method: 'PATCH', body: { title } }).then((d) => d.data);
export const deleteDrawing = (id) => request(`/drawings/${id}`, { method: 'DELETE' });