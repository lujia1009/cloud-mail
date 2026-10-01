import i18n from "../i18n";
export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}
type Params = Record<string, string | number | boolean | null | undefined>;
function expireSession() {
  localStorage.removeItem("token");
  if (location.pathname !== "/login") location.assign("/login");
}
export async function request<T>(
  path: string,
  opts: {
    method?: string;
    params?: Params;
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const url = new URL(
    (import.meta.env.VITE_BASE_URL || "/api") + path,
    location.origin,
  );
  Object.entries(opts.params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "")
      url.searchParams.set(k, String(v));
  });
  const response = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      Authorization: localStorage.getItem("token") || "",
      "accept-language": i18n.language || "zh",
      ...(opts.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });
  let payload: { code: number; message: string; data: T };
  try {
    payload = await response.json();
  } catch {
    if (response.status === 401) expireSession();
    throw new ApiError(response.status, `HTTP ${response.status}`);
  }
  if (response.status === 401 || payload.code === 401) expireSession();
  if (!response.ok || payload.code !== 200)
    throw new ApiError(
      payload.code || response.status,
      payload.message || `HTTP ${response.status}`,
    );
  return payload.data;
}
export const get = <T>(path: string, params?: Params) =>
  request<T>(path, { params });
export const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body });
export function postUpload<T>(
  path: string,
  body: unknown,
  onProgress: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      new URL(
        (import.meta.env.VITE_BASE_URL || "/api") + path,
        location.origin,
      ),
    );
    xhr.setRequestHeader("Authorization", localStorage.getItem("token") || "");
    xhr.setRequestHeader("accept-language", i18n.language || "zh");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded * 98) / event.total));
    };
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as {
          code: number;
          message: string;
          data: T;
        };
        if (xhr.status === 401 || payload.code === 401) expireSession();
        if (xhr.status < 200 || xhr.status >= 300 || payload.code !== 200)
          reject(
            new ApiError(
              payload.code || xhr.status,
              payload.message || `HTTP ${xhr.status}`,
            ),
          );
        else {
          onProgress(100);
          resolve(payload.data);
        }
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new ApiError(0, "Network error"));
    xhr.ontimeout = () => reject(new ApiError(0, "Request timed out"));
    xhr.send(JSON.stringify(body));
  });
}
export const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PUT", body });
export const del = <T>(path: string, params?: Params) =>
  request<T>(path, { method: "DELETE", params });
