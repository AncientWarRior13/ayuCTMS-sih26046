const BASE = "/api/v1";
const ACCESS = "ayuctms.access";
const REFRESH = "ayuctms.refresh";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const tokens = {
  get access() {
    return sessionStorage.getItem(ACCESS);
  },
  set(access: string, refresh: string) {
    sessionStorage.setItem(ACCESS, access);
    sessionStorage.setItem(REFRESH, refresh);
  },
  clear() {
    sessionStorage.removeItem(ACCESS);
    sessionStorage.removeItem(REFRESH);
  },
};

let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  const rt = sessionStorage.getItem(REFRESH);
  if (!rt) return false;
  refreshing ??= fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: rt }),
  })
    .then(async (r) => {
      if (!r.ok) return false;
      const d = await r.json();
      tokens.set(d.access_token, d.refresh_token);
      return true;
    })
    .finally(() => (refreshing = null));
  return refreshing;
}

function detail(body: unknown, fallback: string): string {
  const d = (body as { detail?: unknown })?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => `${(e.loc ?? []).slice(1).join(".")}: ${e.msg}`).join("; ");
  return fallback;
}

async function raw(method: string, path: string, body?: unknown, retry = true): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 401 && retry && (await refresh())) return raw(method, path, body, false);
  if (res.status === 401) {
    tokens.clear();
    window.dispatchEvent(new Event("ayuctms:logout"));
  }
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new ApiError(res.status, detail(b, res.statusText));
  }
  return res;
}

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await raw(method, path, body);
  const ct = res.headers.get("content-type") ?? "";
  return (ct.includes("json") ? res.json() : res.text()) as Promise<T>;
}

export const get = <T = any>(path: string) => api<T>("GET", path);
export const post = <T = any>(path: string, body?: unknown) => api<T>("POST", path, body ?? {});
export const put = <T = any>(path: string, body?: unknown) => api<T>("PUT", path, body);
export const patch = <T = any>(path: string, body?: unknown) => api<T>("PATCH", path, body);

export async function download(path: string, fallbackName: string): Promise<void> {
  const res = await raw("GET", path);
  const cd = res.headers.get("content-disposition") ?? "";
  const name = /filename="?([^"]+)"?/.exec(cd)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can race the browser's read of the blob (especially once triggered
  // programmatically), silently dropping the download. Give it a moment first.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function login(email: string, password: string, totp?: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, totp: totp || undefined }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, detail(b, "Login failed"));
  tokens.set(b.access_token, b.refresh_token);
  return b as { role: string };
}

export function wsUrl(): string {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}${BASE}/ws/alerts?token=${encodeURIComponent(tokens.access ?? "")}`;
}
