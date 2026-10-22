import axios from "axios";

// Prefer the current browser origin so the app stays on whichever host the user
// visited (custom domain in production, preview URL in the editor). This keeps
// API calls same-origin so httpOnly auth cookies are issued for the same host
// the user is on, and the address bar never jumps to another domain post-login.
const FALLBACK_ORIGIN = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
export const BACKEND_ORIGIN =
  typeof window !== "undefined" && window.location && window.location.origin
    ? window.location.origin.replace(/\/$/, "")
    : FALLBACK_ORIGIN;
export const API = `${BACKEND_ORIGIN}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export function fmtErr(detail) {
  if (detail == null) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const money = (n) =>
  Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const num = (n) => Number(n || 0).toLocaleString("en-US");
