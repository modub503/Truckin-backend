import { useEffect, useState } from "react";
import { api, fmtErr, money, BACKEND_ORIGIN } from "@/lib/api";
import { useEscape } from "@/lib/hooks";
import { toast } from "sonner";
import { X, Copy, ExternalLink, FileDown, RefreshCw, CheckCircle2, Clock, Ban, Mail } from "lucide-react";

export function InvoiceModal({ load, onClose, onChanged }) {
  const [inv, setInv] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(load.rate || 0);
  const [terms, setTerms] = useState("Net 30");
  const [due, setDue] = useState("");
  useEscape(true, onClose);

  const fetch = async () => {
    try { const { data } = await api.get(`/loads/${load.id}/invoice`); setInv(data); }
    catch { setInv(null); }
  };
  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, [load.id]);

  const create = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/loads/${load.id}/invoice`, { amount: Number(amount), terms, due_date: due || null });
      setInv(data); toast.success("Invoice + Stripe payment link created"); onChanged?.();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); } finally { setBusy(false); }
  };
  const copy = () => { navigator.clipboard.writeText(inv.payment_url); toast.success("Payment link copied"); };
  const pdf = () => window.open(`${BACKEND_ORIGIN}/api/loads/${load.id}/invoice.pdf`, "_blank");
  const markPaid = async () => { const { data } = await api.post(`/invoices/${inv.id}/mark-paid`); setInv(data); toast.success("Marked paid · revenue logged"); onChanged?.(); };
  const voidInv = async () => { if (!window.confirm("Void this invoice and disable the payment link?")) return; await api.delete(`/invoices/${inv.id}`); setInv(null); toast.success("Invoice voided"); onChanged?.(); };
  const [sending, setSending] = useState(false);
  const sendEmail = async () => {
    setSending(true);
    try { const { data } = await api.post(`/loads/${load.id}/invoice/send`); toast.success(`Invoice emailed to ${data.sent_to}`); fetch(); }
    catch (e) { toast.error(fmtErr(e.response?.data?.detail)); } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div data-testid="invoice-modal" className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Broker invoice</div>
            <h3 className="font-display font-bold text-2xl">{load.load_number}</h3>
            <div className="text-sm text-slate-400">{load.broker || "No broker on load"}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        {inv === undefined && <div className="p-8 text-center text-slate-500 animate-pulse">Loading…</div>}

        {inv === null && (
          <div className="p-5 space-y-4">
            <label className="block">
              <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Amount ($)</span>
              <input data-testid="invoice-amount-input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 font-mono text-lg outline-none focus:border-orange-500" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Terms</span>
                <select value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none">
                  {["Due on receipt", "Net 15", "Net 30", "Net 45", "Quick Pay (2%)"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Due date</span>
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none" />
              </label>
            </div>
            <button data-testid="invoice-create-button" disabled={busy || Number(amount) <= 0} onClick={create}
              className="w-full px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 font-semibold text-white">
              {busy ? "Creating with Stripe…" : `Create invoice for ${money(amount)}`}
            </button>
            <p className="text-xs text-slate-500">Generates a Stripe payment link (card / ACH) and a PDF invoice you can email to the broker. Load status flips to Invoiced.</p>
          </div>
        )}

        {inv && (
          <div className="p-5 space-y-4">
            <div className={`rounded-lg border p-4 flex items-center gap-3 ${inv.paid ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
              {inv.paid ? <CheckCircle2 className="h-6 w-6 text-emerald-400" /> : <Clock className="h-6 w-6 text-amber-400" />}
              <div className="flex-1">
                <div className="font-mono font-bold" data-testid="invoice-number">{inv.invoice_number}</div>
                <div className="text-xs text-slate-400">{inv.paid ? `Paid ${(inv.paid_at || "").slice(0, 10)}` : `Unpaid · ${inv.terms || ""}${inv.due_date ? " · due " + inv.due_date : ""}`}</div>
              </div>
              <div className="font-mono font-black text-xl" data-testid="invoice-total">{money(inv.total)}</div>
            </div>

            <div>
              <div className="text-xs uppercase font-mono tracking-widest text-slate-400 mb-1">Stripe payment link</div>
              <div className="flex gap-2">
                <input readOnly value={inv.payment_url || ""} data-testid="invoice-payment-url" className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 outline-none" />
                <button data-testid="invoice-copy-button" onClick={copy} className="p-2 rounded-lg border border-slate-700 hover:border-orange-500/50" title="Copy"><Copy className="h-4 w-4" /></button>
                <a href={inv.payment_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg border border-slate-700 hover:border-orange-500/50" title="Open"><ExternalLink className="h-4 w-4" /></a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button data-testid="invoice-pdf-button" onClick={pdf} className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 font-semibold flex items-center justify-center gap-2"><FileDown className="h-4 w-4" /> Invoice PDF</button>
              <button data-testid="invoice-refresh-button" onClick={fetch} className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500 font-semibold flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4" /> Check status</button>
            </div>
            <button data-testid="invoice-send-button" disabled={sending} onClick={sendEmail}
              className="w-full px-4 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" /> {sending ? "Sending…" : inv.sent_at ? `Resend to broker (sent ${(inv.sent_at || "").slice(0, 10)})` : "Email invoice + pay link to broker"}
            </button>
            {inv.sent_to && <div className="text-xs text-slate-500 text-center" data-testid="invoice-sent-info">Last sent to {inv.sent_to}{inv.send_count > 1 ? ` · ${inv.send_count}×` : ""}</div>}
            {!inv.paid && (
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <button data-testid="invoice-void-button" onClick={voidInv} className="text-sm text-slate-400 hover:text-red-400 flex items-center gap-1"><Ban className="h-4 w-4" /> Void</button>
                <button data-testid="invoice-mark-paid-button" onClick={markPaid} className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Mark paid (check / ACH received)</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
