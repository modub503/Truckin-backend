import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function GoogleAuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const processed = useRef(false);
  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const sessionId = new URLSearchParams(location.hash.slice(1)).get("session_id");
    api.post("/auth/google/session", { session_id: sessionId }).then(() => {
      window.history.replaceState({}, "", "/");
      navigate("/", { replace: true });
    }).catch((error) => {
      toast.error(error.response?.data?.detail || "Google sign-in failed");
      window.history.replaceState({}, "", "/login");
      navigate("/login", { replace: true });
    });
  }, [location.hash, navigate]);
  return <div className="min-h-screen bg-[#0B0F17]" data-testid="google-auth-callback" />;
}