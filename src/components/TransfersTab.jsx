import { useCallback, useEffect, useState } from "react";
import { api, money, fmtErr } from "@/lib/api";
import { useEscape } from "@/lib/hooks";
import { toast } from "sonner";
import { ArrowRightLeft, CheckCircle2, Undo2, Trash2, Wand2, Pencil, X } from "lucide-react";
import { payLabel } from "./DispatchersTab";

export function TransfersTab({ dispatchers }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [disp, setDisp] = useState("");
  const [gen, setGen] = useState({ period_start: "", period_end: "" });
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);
  const [editForm, setEditForm] = useState({ dispatcher_id: "", paid_date: "" });
  useEscape(Boolean(edit), () => setEdit(null));

  const load = useCallback(async () => {
    const params = {};
    if (status) params.status = status;
    if (disp) params.dispatcher_id = disp;
    const { data } = await api.get("/transfers", { params });
    setItems(data);
  }, [disp, status]);
  useEffect(() => {
    load();
  }, [load]);

  const pay = async (t) => { await api.post(`/transfers/${t.id}/pay`); toast.success(`${money(t.amount)} to ${t.dispatcher_name} logged as Transfer Out`); load(); };
  const unpay = async (t) => { await api.post(`/transfers/${t.id}/unpay`); toast.success("Moved back to pending"); load(); };
  const del = async (t) => { if (!window.confirm("Remove this transfer? The settlement fee will be recalculated.")) return; await api.delete(`/transfers/${t.id}`); load(); };
  const openEdit = (t) => {
    setEdit(t);
    setEditForm({
      dispatcher_id: t.dispatcher_id,
      paid_date: (t.paid_date || t.paid_at || "").slice(0, 10),
    });
  };
  const saveEdit = async () => {
    try {
      await api.put(`/transfers/${edit.id}`, editForm);
      toast.success("Dispatcher payment updated");
      setEdit(null);
      load();
    } catch (e) {
      toast.error(fmtErr(e.response?.data?.detail));
    }
  };
  const generate = async () => {
    if (!gen.period_start || !gen.period_end) return toast.error("Pick both dates");
    setBusy(true);
    try { const { data } = await api.post("/transfers/generate", gen); toast.success(`${data.settlements_processed} settlements processed · ${data.pending} pending transfers`); load(); }
    catch (e) { toast.error(fmtErr(e.response?.data?.detail)); } finally { setBusy(false); }
  };
  const pending = items.filter((t) => t.status === "pending").reduce((a, t) => a + Number(t.amount || 0), 0);
  const paid = items.filter((t) => t.status === "paid").reduce((a, t) => a + Number(t.amount || 0), 0);
  const sel = "bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none";

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card-noise rounded-xl border border-slate-800 p-4"><div className="text-xs uppercase font-mono tracking-widest text-slate-400">Pending to dispatchers</div><div className="font-display font-black text-3xl mt-1 text-amber-400" data-testid="transfers-pending-total">{money(pending)}</div></div>
        <div className="card-noise rounded-xl border border-slate-800 p-4"><div className="text-xs uppercase font-mono tracking-widest text-slate-400">Paid (in view)</div><div className="font-display font-black text-3xl mt-1 text-emerald-400" data-testid="transfers-paid-total">{money(paid)}</div></div>
        <div className="card-noise rounded-xl border border-slate-800 p-4">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400 mb-2">Generate dispatcher pay for a period</div>
          <div className="flex gap-2 items-center flex-wrap">
            <input data-testid="transfers-gen-start" type="date" value={gen.period_start} onChange={(e) => setGen({ ...gen, period_start: e.target.value })} className={sel} />
            <input data-testid="transfers-gen-end" type="date" value={gen.period_end} onChange={(e) => setGen({ ...gen, period_end: e.target.value })} className={sel} />
            <button data-testid="transfers-gen-button" disabled={busy} onClick={generate} className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-sm flex items-center gap-1"><Wand2 className="h-4 w-4" /> Generate</button>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Re-computes fees on every settlement in the period (paid transfers untouched).</div>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {[["", "All"], ["pending", "Pending"], ["paid", "Paid"]].map(([k, l]) => (
          <button key={k} data-testid={`transfers-filter-${k || "all"}`} onClick={() => setStatus(k)} className={`px-3 py-1.5 rounded-lg text-xs uppercase font-mono tracking-widest ${status === k ? "bg-orange-500 text-white" : "border border-slate-800 text-slate-400 hover:text-white"}`}>{l}</button>
        ))}
        <select data-testid="transfers-dispatcher-filter" value={disp} onChange={(e) => setDisp(e.target.value)} className={`${sel} ml-auto`}><option value="">All dispatchers</option>{dispatchers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      </div>

      <div data-testid="transfers-table" className="card-noise rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase font-mono tracking-widest text-slate-400">
            <tr><th className="text-left px-4 py-3">Transfer</th><th className="text-left px-4 py-3">Period</th><th className="text-left px-4 py-3">Basis</th><th className="text-right px-4 py-3">Amount</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.length === 0 && <tr><td colSpan="6" className="text-center py-12 text-slate-500">No transfers yet. They appear when a settlement is saved for a driver who has a dispatcher, or use Generate above.</td></tr>}
            {items.map((t) => (
              <tr key={t.id} className="hover:bg-slate-900/40" data-testid={`transfer-row-${t.id}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-semibold"><span className="text-slate-300">{t.driver_name}</span><ArrowRightLeft className="h-3.5 w-3.5 text-orange-400" /><span>{t.dispatcher_name}</span></div>
                  <div className="text-xs text-slate-500">Settlement → dispatcher · {payLabel(t.pay_type, t.rate)}</div>
                </td>
                <td className="px-4 py-3 text-slate-300">{t.period_start || "—"} → {t.period_end || "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{t.basis?.load_count ?? 0} loads · {money(t.basis?.revenue)} revenue</td>
                <td className="px-4 py-3 text-right font-mono font-bold">{money(t.amount)}</td>
                <td className="px-4 py-3"><span className={`status-pill ${t.status === "paid" ? "status-Paid" : "status-Booked"}`}>{t.status}</span>{(t.paid_date || t.paid_at) && <div className="text-[10px] text-slate-500 mt-0.5">Paid {String(t.paid_date || t.paid_at).slice(0, 10)}</div>}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {t.status === "pending"
                    ? <button data-testid={`transfer-pay-${t.id}`} onClick={() => pay(t)} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Mark paid</button>
                    : <button data-testid={`transfer-unpay-${t.id}`} onClick={() => unpay(t)} className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1"><Undo2 className="h-3.5 w-3.5" /> Undo</button>}
                  <button data-testid={`transfer-edit-${t.id}`} onClick={() => openEdit(t)} title="Edit dispatcher and paid date" className="ml-1 p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"><Pencil className="h-4 w-4" /></button>
                  <button data-testid={`transfer-delete-${t.id}`} onClick={() => del(t)} className="ml-1 p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEdit(null)}>
          <div data-testid="transfer-edit-modal" className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Dispatcher payment</div>
                <h3 className="font-display font-bold text-2xl">Correct transfer</h3>
              </div>
              <button data-testid="transfer-edit-close" onClick={() => setEdit(null)} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Paid to dispatcher</span>
                <select data-testid="transfer-dispatcher-select" value={editForm.dispatcher_id} onChange={(e) => setEditForm({ ...editForm, dispatcher_id: e.target.value })} className={`mt-1 w-full ${sel}`}>
                  {dispatchers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Date payment was sent</span>
                <input data-testid="transfer-paid-date-input" type="date" value={editForm.paid_date} onChange={(e) => setEditForm({ ...editForm, paid_date: e.target.value })} className={`mt-1 w-full ${sel}`} />
              </label>
              <p className="text-xs text-slate-500">The transfer amount stays the same. For a pending transfer, this date is used when you mark it paid. A paid transfer also updates its matching Accounting entry.</p>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2">
              <button data-testid="transfer-edit-cancel" onClick={() => setEdit(null)} className="px-4 py-2 rounded-lg border border-slate-700">Cancel</button>
              <button data-testid="transfer-edit-save" onClick={saveEdit} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold">Save changes</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
