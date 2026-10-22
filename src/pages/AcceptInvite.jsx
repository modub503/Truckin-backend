import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, fmtErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast, Toaster } from "sonner";
import { LockKeyhole, Truck } from "lucide-react";

export default function AcceptInvite() {
  const { token } = useParams();
  const { acceptInvite } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/invitations/${token}`).then(({ data }) => setInvite(data)).catch((requestError) => {
      setError(fmtErr(requestError.response?.data?.detail));
    });
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    const result = await acceptInvite(token, password);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Your employee account is ready");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0B0F17]">
      <Toaster theme="dark" richColors position="top-right" />
      <main data-testid="invite-setup-screen" className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-11 w-11 rounded-xl bg-orange-500 flex items-center justify-center"><Truck className="h-6 w-6 text-white" /></div>
          <div><div className="font-display font-black text-2xl">APEX<span className="text-orange-500">TMS</span></div><div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Employee access</div></div>
        </div>
        {error ? <div data-testid="invite-error" className="border border-red-500/30 bg-red-500/5 rounded-lg p-5"><h1 className="font-display text-3xl font-bold">Invite unavailable</h1><p className="mt-2 text-sm text-slate-400">{error}</p></div> : !invite ? <div data-testid="invite-loading" className="text-slate-400 animate-pulse">Loading your invitation…</div> : <form onSubmit={submit} className="card-noise rounded-xl border border-slate-800 p-6">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">You’re invited to</div>
          <h1 data-testid="invite-business-name" className="font-display text-4xl font-black mt-2">{invite.business_name}</h1>
          <p data-testid="invite-recipient-email" className="mt-2 text-sm text-slate-400">{invite.name} · {invite.email}</p>
          <div className="mt-7 space-y-4">
            <label className="block"><span className="text-xs uppercase font-mono tracking-widest text-slate-400">Create your password</span><input data-testid="invite-password-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 outline-none focus:border-orange-500" required /></label>
            <label className="block"><span className="text-xs uppercase font-mono tracking-widest text-slate-400">Confirm password</span><input data-testid="invite-confirm-password-input" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 outline-none focus:border-orange-500" required /></label>
            <button data-testid="invite-accept-button" disabled={saving} className="w-full px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold inline-flex items-center justify-center gap-2"><LockKeyhole className="h-4 w-4" /> {saving ? "Setting up…" : "Create my employee account"}</button>
          </div>
          <p className="mt-5 text-xs text-slate-500">This secure one-time link expires in 7 days. Your administrator cannot see your password.</p>
        </form>}
      </main>
    </div>
  );
}