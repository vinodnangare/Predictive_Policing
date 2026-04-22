const FALLBACK_API_BASE = "http://localhost:5000";

export const API_BASE = (import.meta.env.VITE_BACKEND_URL || FALLBACK_API_BASE).replace(/\/$/, "");

const buildUrl = (path) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

export const buildApiUrl = (path) => buildUrl(path);

const buildHeaders = (headers = {}, body) => {
  const token = localStorage.getItem("token");
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const baseHeaders = isFormData ? {} : { "Content-Type": "application/json" };

  return {
    ...baseHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
};

export const apiFetch = async (path, options = {}) => {
  const { method = "GET", body, headers = {}, signal } = options;

  const requestOptions = {
    method,
    headers: buildHeaders(headers, body),
    signal,
    credentials: "include",
  };

  if (body !== undefined) {
    requestOptions.body = requestOptions.headers["Content-Type"] === "application/json"
      ? JSON.stringify(body)
      : body;
  }

  const response = await fetch(buildUrl(path), requestOptions);
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && (data.error || data.message || data.details)) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
};

export const apiGet = (path, options = {}) => apiFetch(path, { ...options, method: "GET" });
export const apiPost = (path, body, options = {}) => apiFetch(path, { ...options, method: "POST", body });
export const apiPut = (path, body, options = {}) => apiFetch(path, { ...options, method: "PUT", body });
export const apiDelete = (path, options = {}) => apiFetch(path, { ...options, method: "DELETE" });
