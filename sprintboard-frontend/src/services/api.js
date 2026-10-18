const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE ?? "false").toLowerCase() === "true";

function readCsrfCookie() {
  if (typeof document === "undefined") return "";
  const entry = document.cookie.split("; ").find((item) => item.startsWith("csrfToken="));
  return entry ? decodeURIComponent(entry.split("=").slice(1).join("=")) : "";
}

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  const isForm = options.body instanceof FormData;
  if (!isForm && options.body !== undefined) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = readCsrfCookie();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
      ...options,
      method,
      headers,
      credentials: "include",
      redirect: "error",
      cache: "no-store",
      referrerPolicy: "strict-origin-when-cross-origin"
    });
  } catch {
    throw new ApiError("Unable to reach the server. Check your connection and try again.");
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  let payload = null;
  if (contentType.includes("application/json")) {
    try { payload = await response.json(); } catch { payload = null; }
  } else {
    try { payload = { message: await response.text() }; } catch { payload = null; }
  }

  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new CustomEvent("sprintboard:unauthorized"));
    const message = payload?.message || (response.status === 403 ? "You do not have permission to do that." : "The request could not be completed.");
    throw new ApiError(message, response.status, payload?.errors || null);
  }
  return payload?.data ?? payload;
}

export const authApi = {
  me: () => apiRequest("/auth/me"),
  login: (credentials) => apiRequest("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  logout: () => apiRequest("/auth/logout", { method: "POST", body: JSON.stringify({}) }),
  forgotPassword: (email) => apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => apiRequest("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) })
};

export const workspaceApi = {
  dashboard: () => apiRequest("/dashboard"),
  tasks: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null));
    return apiRequest(`/tasks${query.size ? `?${query}` : ""}`);
  },
  createTask: (task) => apiRequest("/tasks", { method: "POST", body: JSON.stringify(task) }),
  updateTask: (id, task) => apiRequest(`/tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(task) }),
  updateTaskStatus: (id, status) => apiRequest(`/tasks/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  uploadTaskAttachment: (id, file) => {
    const body = new FormData();
    body.append("attachment", file);
    return apiRequest(`/tasks/${encodeURIComponent(id)}/attachments`, { method: "POST", body });
  },
  teams: () => apiRequest("/teams"),
  createTeam: (team) => apiRequest("/teams", { method: "POST", body: JSON.stringify(team) }),
  members: () => apiRequest("/users"),
  inviteMember: (member) => apiRequest("/users/invite", { method: "POST", body: JSON.stringify(member) }),
  updateMember: (id, updates) => apiRequest(`/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(updates) }),
  deactivateMember: (id) => apiRequest(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  notifications: () => apiRequest("/notifications"),
  markNotificationRead: (id) => apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH", body: JSON.stringify({}) }),
  markAllNotificationsRead: () => apiRequest("/notifications/read-all", { method: "PATCH", body: JSON.stringify({}) }),
  updateProfile: (profile) => apiRequest("/users/me", { method: "PATCH", body: JSON.stringify(profile) }),
  uploadAvatar: (file) => {
    const body = new FormData();
    body.append("avatar", file);
    return apiRequest("/users/me/avatar", { method: "POST", body });
  }
};
