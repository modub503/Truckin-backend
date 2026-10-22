import { useEffect, useState } from "react";
import { api, money, fmtErr } from "@/lib/api";
import { useEscape } from "@/lib/hooks";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Headset } from "lucide-react";

const PAY_TYPES = [
  ["percent_of_revenue", "% of load revenue", "%"],
  ["flat_per_load", "Flat $ per load", "$"],
  ["flat_per_settlement", "Flat $ per settlement / week", "$"],
];
const EMPTY = { name: "", email: "", phone: "", pay_type: "percent_of_revenue", rate: 0, driver_ids: [], overrides: {}, active: true, notes: "" };
const inp = "mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500";
export const payLabel = (t, r) => t === "percent_of_revenue" ? `${r}% of revenue` : t === "flat_per_load" ? `${money(r)} / load` : `${money(r)} / settlement`;

export function DispatchersTab({ drivers, openSignal }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(EMPTY);
  useEscape(open, () => setOpen(false));

  const load = async () => { const { data } = await api.get("/dispatchers"); setItems(data); };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (openSignal) { setEdit(null); setForm(EMPTY); setOpen(true); } }, [openSignal]);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    try {
      const payload = { ...form, rate: Number(form.rate) || 0 };
      if (edit) await api.put(`/dispatchers/${edit.id}`, payload); else await api.post("/dispatchers", payload);
      toast.success("Dispatcher saved · fees recalc on next settlement save"); setOpen(false); load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };
  const del = async (d) => { if (!window.confirm(`Remove ${d.name}? Pending transfers are removed, paid ones kept.`)) return; await api.delete(`/dispatchers/${d.id}`); load(); };
  const toggleDriver = (id) => setForm({ ...form, driver_ids: form.driver_ids.includes(id) ? form.driver_ids.filter((x) => x !== id) : [...form.driver_ids, id] });
  const setOverride = (id, k, v) => {
    const ov = { ...(form.overrides || {}) }; ov[id] = { ...(ov[id] || {}), [k]: v };
    if (!ov[id].pay_type && ov[id].rate === "") delete ov[id];
    setForm({ ...form, overrides: ov });
  };
  const unit = PAY_TYPES.find((p) => p[0] === form.pay_type)?.[2];

  return (
    <>
      <div data-testid="dispatchers-table" className="card-noise rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase font-mono tracking-widest text-slate-400">
            <tr><th className="text-left px-4 py-3">Dispatcher</th><th className="text-left px-4 py-3">Pay</th><th className="text-left px-4 py-3">Drivers</th><th className="text-right px-4 py-3">Pending</th><th className="text-right px-4 py-3">Paid to date</th><th className="text-right px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.length === 0 && <tr><td colSpan="6" className="text-center py-12 text-slate-500"><Headset className="h-6 w-6 mx-auto mb-2 opacity-50" />No dispatchers yet. Add one and assign drivers — their cut is taken from each driver settlement automatically.</td></tr>}
            {items.map((d) => (
              <tr key={d.id} className="hover:bg-slate-900/40" data-testid={`dispatcher-row-${d.id}`}>
                <td className="px-4 py-3"><div className="font-semibold">{d.name}{d.active === false && <span className="ml-2 text-[10px] uppercase text-slate-500">inactive</span>}</div><div className="text-xs text-slate-500">{d.email || d.phone || ""}</div></td>
                <td className="px-4 py-3 font-mono text-orange-400">{payLabel(d.pay_type, d.rate)}{d.overrides && Object.keys(d.overrides).length > 0 && <span className="ml-1 text-[10px] text-slate-500">+{Object.keys(d.overrides).length} override</span>}</td>
                <td className="px-4 py-3 text-slate-300">{(d.driver_ids || []).map((id) => drivers.find((x) => x.id === id)?.name || "?").join(", ") || <span className="text-slate-600">none</span>}</td>
                <td className="px-4 py-3 text-right font-mono text-amber-400">{money(d.pending_amount)}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-400">{money(d.paid_amount)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button data-testid={`dispatcher-edit-${d.id}`} onClick={() => { setEdit(d); setForm({ ...EMPTY, ...d, overrides: d.overrides || {} }); setOpen(true); }} className="p-1.5 rounded hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(d)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div data-testid="dispatcher-modal" className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#0B0F17]">
              <h3 className="font-display font-bold text-2xl">{edit ? "Edit Dispatcher" : "New Dispatcher"}</h3>
              <button onClick={() => setOpen(false)} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block md:col-span-2"><span className="text-xs uppercase font-mono tracking-widest text-slate-400">Name</span>
                <input data-testid="dispatcher-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></label>
              <label className="block"><span className="text-xs uppercase font-mono tracking-widest text-slate-400">Email</span>
                <input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} /></label>
              <label className="block"><span className="text-xs uppercase font-mono tracking-widest text-slate-400">Phone</span>
                <input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} /></label>
              <label className="block"><span className="text-xs uppercase font-mono tracking-widest text-slate-400">Pay variant</span>
                <select data-testid="dispatcher-paytype-select" value={form.pay_type} onChange={(e) => setForm({ ...form, pay_type: e.target.value })} className={inp}>
                  {PAY_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></label>
              <label className="block"><span className="text-xs uppercase font-mono tracking-widest text-slate-400">Rate ({unit})</span>
                <input data-testid="dispatcher-rate-input" type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className={`${inp} font-mono`} /></label>
              <div className="md:col-span-2">
                <div className="text-xs uppercase font-mono tracking-widest text-slate-400 mb-2">Drivers this dispatcher handles</div>
                <div className="space-y-2">
                  {drivers.map((d) => {
                    const on = form.driver_ids.includes(d.id); const ov = (form.overrides || {})[d.id] || {};
                    return (
                      <div key={d.id} className={`rounded-lg border p-3 ${on ? "border-orange-500/40 bg-orange-500/5" : "border-slate-800"}`}>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input data-testid={`dispatcher-driver-${d.id}`} type="checkbox" checked={on} onChange={() => toggleDriver(d.id)} className="accent-orange-500 h-4 w-4" />
                          <span className="font-semibold">{d.name}</span><span className="text-xs text-slate-500 font-mono">{d.truck_number}</span>
                        </label>
                        {on && (
                          <div className="mt-2 ml-7 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-500">Override:</span>
                            <select value={ov.pay_type || ""} onChange={(e) => setOverride(d.id, "pay_type", e.target.value || undefined)} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 outline-none">
                              <option value="">Same as default</option>{PAY_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                            </select>
                            <input type="number" step="0.01" placeholder="rate" value={ov.rate ?? ""} onChange={(e) => setOverride(d.id, "rate", e.target.value === "" ? undefined : Number(e.target.value))} className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono outline-none" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-orange-500 h-4 w-4" /> Active (inactive dispatchers stop earning on new settlements)</label>
              <label className="block md:col-span-2"><span className="text-xs uppercase font-mono tracking-widest text-slate-400">Notes</span>
                <textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inp} /></label>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700">Cancel</button>
              <button data-testid="dispatcher-save-button" onClick={save} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
