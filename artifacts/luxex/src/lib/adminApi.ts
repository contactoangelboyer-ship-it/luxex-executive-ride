const BASE = "/api/admin";

function getToken(): string {
  return localStorage.getItem("luxex_admin_token") ?? "";
}

function headers(): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

function getLoginPath(): string {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  return normalized + "/admin/login";
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: headers(), body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem("luxex_admin_token");
    window.location.href = getLoginPath();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const adminApi = {
  login: (username: string, password: string) =>
    fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) })
      .then(r => r.ok ? r.json() : r.json().then((e: any) => Promise.reject(new Error(e.error)))),

  isAuthenticated: () => !!localStorage.getItem("luxex_admin_token"),
  setToken: (t: string) => localStorage.setItem("luxex_admin_token", t),
  logout: () => localStorage.removeItem("luxex_admin_token"),

  dashboard: () => req<any>("GET", "/dashboard"),

  bookings: {
    list: (params?: Record<string, string>) => {
      const q = params ? "?" + new URLSearchParams(params).toString() : "";
      return req<any[]>("GET", `/bookings${q}`);
    },
    get: (id: number) => req<any>("GET", `/bookings/${id}`),
    create: (body: any) => req<any>("POST", "/bookings", body),
    update: (id: number, body: any) => req<any>("PATCH", `/bookings/${id}`, body),
    resendConfirmation: (id: number) => req<any>("POST", `/bookings/${id}/resend-confirmation`),
  },

  drivers: {
    list: () => req<any[]>("GET", "/drivers"),
    create: (body: any) => req<any>("POST", "/drivers", body),
    update: (id: number, body: any) => req<any>("PATCH", `/drivers/${id}`, body),
    delete: (id: number) => req<any>("DELETE", `/drivers/${id}`),
  },

  vehicles: {
    list: () => req<any[]>("GET", "/vehicles"),
    create: (body: any) => req<any>("POST", "/vehicles", body),
    update: (id: number, body: any) => req<any>("PATCH", `/vehicles/${id}`, body),
    delete: (id: number) => req<any>("DELETE", `/vehicles/${id}`),
  },

  pricing: {
    list: () => req<any[]>("GET", "/pricing"),
    update: (vehicleType: string, body: any) => req<any>("PATCH", `/pricing/${vehicleType}`, body),
  },

  zones: {
    list: () => req<any[]>("GET", "/zones"),
    create: (body: any) => req<any>("POST", "/zones", body),
    update: (id: number, body: any) => req<any>("PATCH", `/zones/${id}`, body),
    delete: (id: number) => req<any>("DELETE", `/zones/${id}`),
  },

  promotions: {
    list: () => req<any[]>("GET", "/promotions"),
    create: (body: any) => req<any>("POST", "/promotions", body),
    update: (id: number, body: any) => req<any>("PATCH", `/promotions/${id}`, body),
    delete: (id: number) => req<any>("DELETE", `/promotions/${id}`),
  },
};
