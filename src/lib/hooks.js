import { useEffect } from "react";

export function useEscape(active, onClose) {
  useEffect(() => {
    if (!active) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [active, onClose]);
}
