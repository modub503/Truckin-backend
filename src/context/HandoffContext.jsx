import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { resolveHandoff, handoffToEstimateForm } from "@/lib/handoff";

const HandoffCtx = createContext(null);
export const useHandoff = () => useContext(HandoffCtx);

/**
 * Holds the details a visitor submitted on the marketing site until the app
 * has used them.
 *
 * The details arrive in the URL as a one-time token, which is exchanged for
 * the lead as soon as the app loads. See src/lib/handoff.js for why they
 * cannot travel in localStorage when the two sites are on different origins.
 */
export function HandoffProvider({ children }) {
  const [handoff, setHandoff] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await resolveHandoff();
      if (cancelled) return;
      if (data) setHandoff(data);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ handoff, ready, estimatePatch: handoffToEstimateForm(handoff) }),
    [handoff, ready],
  );

  return <HandoffCtx.Provider value={value}>{children}</HandoffCtx.Provider>;
}
