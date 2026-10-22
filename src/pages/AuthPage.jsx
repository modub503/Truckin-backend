import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useHandoff } from "@/context/HandoffContext";
import { LogIn } from "lucide-react";
import { Toaster, toast } from "sonner";
import { api } from "@/lib/api";

const DEFAULT_BRAND = {
  name: "Burnett Towing and Hauling Services LLC",
  logo_url: null,
  brand_color: "#F97316",
};

function BrandMark({ brand }) {
  // Styled "BT" monogram shown until the owner uploads a real logo via
  // Company Settings. The uploaded logo flows through /api/public/branding.
  if (brand.logo_url) {
    return (
      <img
        data-testid="auth-brand-logo"
        src={brand.logo_url}
        alt={brand.name}
        className="h-14 w-14 rounded-xl object-contain bg-white/5 border border-slate-800 p-1.5"
      />
    );
  }
  return (
    <div
      data-testid="auth-brand-monogram"
      className="h-14 w-14 rounded-xl flex items-center justify-center font-display font-black text-xl text-white relative overflow-hidden flag-ribbon"
      style={{ background: `linear-gradient(135deg, #DC2626 0%, #1E3A8A 100%)` }}
    >
      <span className="relative tracking-tighter drop-shadow-sm">BT</span>
      <span className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -14px 24px rgba(0,0,0,0.4)" }} />
    </div>
  );
}

export default function AuthPage() {
  const { login } = useAuth();
  const { handoff, ready } = useHandoff();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState(DEFAULT_BRAND);

  // A visitor who came from the marketing site already gave their email, so
  // the login form opens with it filled in.
  useEffect(() => {
    if (ready && handoff?.customer_email) setEmail(handoff.customer_email);
  }, [ready, handoff]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/public/branding");
        if (!cancelled && data) {
          setBrand({
            name: data.name || DEFAULT_BRAND.name,
            logo_url: data.logo_url || null,
            brand_color: data.brand_color || DEFAULT_BRAND.brand_color,
          });
        }
      } catch (err) { console.debug("Public branding fetch failed, keeping defaults:", err?.message || err); }
    })();
    return () => { cancelled = true; };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (!r.ok) toast.error(r.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#050B1E] relative overflow-hidden">
      {/* Patriotic ambient layer — soft star canton top-left, red stripe accent right */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 -left-20 w-72 h-56 opacity-30 blur-[2px] rounded-br-3xl flag-canton" />
        <div className="absolute top-0 right-0 w-1.5 h-full flag-stripes opacity-70" />
      </div>
      <Toaster theme="dark" richColors position="top-right" />
      <main data-testid="public-login-screen" className="w-full max-w-md relative">
        <div className="mb-10 flex items-center gap-4">
          <BrandMark brand={brand} />
          <div>
            <div data-testid="login-domain-name" className="font-display font-black text-xl leading-tight gradient-text">
              {brand.name}
            </div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mt-1">
              Secure employee access
            </div>
          </div>
        </div>
        <section className="card-noise rounded-xl border border-slate-800 p-6 sm:p-8 flag-ribbon">
          <div className="mb-7">
            <div className="text-xs uppercase font-mono tracking-widest text-slate-400">
              Driver &amp; employee sign in
            </div>
            <h2 className="font-display font-black text-4xl mt-2">Sign in.</h2>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs uppercase font-mono tracking-widest text-slate-400">Email</label>
              <input
                data-testid="auth-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 transition"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase font-mono tracking-widest text-slate-400">Password</label>
              <input
                data-testid="auth-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 transition"
                required
              />
            </div>
            <button
              data-testid="auth-submit-button"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Working..." : "Sign in"}
            </button>
          </form>
          <p data-testid="auth-employee-notice" className="mt-6 text-center text-sm text-slate-400">
            Use the email and password you set up from your secure invitation.
          </p>
        </section>
      </main>
    </div>
  );
}
