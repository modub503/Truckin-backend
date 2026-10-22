/**
 * Lead handoff — getting a visitor's details from the marketing site into the
 * dispatch app.
 *
 * The marketing site and the dispatch app are two separate Netlify projects,
 * so they are two separate origins. A browser will not let one origin read
 * another origin's localStorage, so the details cannot simply be parked in
 * the browser and picked up on the other side.
 *
 * They travel as a one-time token instead:
 *
 *   1. The site posts the lead to POST /api/leads. The API stores it and
 *      answers with { id, handoff }.
 *   2. The site sends the visitor to this app with ?handoff=<token>.
 *   3. This module exchanges the token for the details via
 *      GET /api/leads/handoff/<token> and hands them to the pages.
 *
 * The token is captured and stashed before the app redirects an
 * unauthenticated visitor to the login page, so it survives that hop.
 *
 * localStorage is still checked as a fallback. It is what the site writes,
 * and it is what makes the handoff work when both live on the same origin.
 */

import { api } from "@/lib/api";

/** Where the site parks the details for the same-origin case. */
export const STORAGE_KEY = "pendingUserInfo";
/** Where the token waits while the visitor passes through the login page. */
const TOKEN_KEY = "apextms_handoff_token";

/**
 * Take the token out of the query string and put it in sessionStorage.
 *
 * Called once, before React renders, so the token is captured before any
 * route change can drop it. The token is also removed from the address bar
 * so it does not linger in history, a screenshot or a shared link.
 */
export function captureHandoffToken() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("handoff");
  if (!token) return null;

  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private browsing — the token is simply not carried across */
  }

  params.delete("handoff");
  const qs = params.toString();
  const clean =
    window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
  window.history.replaceState({}, "", clean);
  return token;
}

function takeToken() {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    return token;
  } catch {
    return null;
  }
}

function takeLocalInfo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Exchange the handoff token for the details the visitor submitted.
 * Returns null when there is nothing to hand over.
 */
export async function resolveHandoff() {
  const token = takeToken();
  if (token) {
    try {
      const { data } = await api.get(`/leads/handoff/${encodeURIComponent(token)}`);
      if (data && Object.keys(data).length) {
        // Keep a copy where the site can see it, so the same browser carries
        // the details if the visitor goes back to the site.
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              name: data.customer_name || "",
              email: data.customer_email || "",
              phone: data.customer_phone || "",
            }),
          );
        } catch {
          /* not fatal — the details are already in hand */
        }
        return data;
      }
    } catch {
      /* an expired or already used token just means no prefill */
    }
  }

  // Same-origin fallback: the site parked the details in localStorage.
  const local = takeLocalInfo();
  if (local) {
    return {
      customer_name: local.name || "",
      customer_email: local.email || "",
      customer_phone: local.phone || "",
    };
  }
  return null;
}

/**
 * Map a handoff payload onto the fields of the estimate form, so a new
 * estimate opens with the visitor's details already filled in.
 */
export function handoffToEstimateForm(handoff) {
  if (!handoff) return null;
  const patch = {};
  if (handoff.customer_name) patch.customer_name = handoff.customer_name;
  if (handoff.customer_email) patch.customer_email = handoff.customer_email;
  if (handoff.customer_phone) patch.customer_phone = handoff.customer_phone;
  if (handoff.customer_address) patch.customer_address = handoff.customer_address;
  if (handoff.service_type) patch.service_type = handoff.service_type;
  if (handoff.service_location) patch.service_location = handoff.service_location;
  if (handoff.equipment) patch.equipment = handoff.equipment;
  if (handoff.notes) patch.notes = handoff.notes;
  if (handoff.pickup || handoff.delivery) {
    patch.notes = [
      handoff.pickup ? `Pickup: ${handoff.pickup}` : "",
      handoff.delivery ? `Delivery: ${handoff.delivery}` : "",
      handoff.weight ? `Weight: ${handoff.weight} lbs` : "",
      handoff.dimensions ? `Dimensions: ${handoff.dimensions}` : "",
      handoff.access ? `Access: ${handoff.access}` : "",
      handoff.notes || "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return Object.keys(patch).length ? patch : null;
}
