import { useEffect, useState } from "react";
import { api, fmtErr, money } from "@/lib/api";
import { useEscape } from "@/lib/hooks";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Search, BookUser, Repeat, Mail, Phone, MapPin } from "lucide-react";

const EMPTY = { name: "", contact_name: "", email: "", phone: "", address: "", mc_number: "", payment_terms: "Net 30", notes: "" };
const FIELDS = [["name", "Broker / Customer name"], ["contact_name", "Contact"], ["email", "AP Email"], ["phone", "Phone"],
  ["address", "Address"], ["mc_number", "MC #"], ["payment_terms", "Payment terms"]];

export default function Brokers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [detail, setDetail] = useState(null);
  const [detailLoads, setDetailLoads] = useState([]);
  useEscape(open, () => setOpen(false));
  useEscape(!!detail, () => setDetail(null));

  const load = async () => { const { data } = await api.get("/brokers"); setItems(data); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (edit) await api.put(`/brokers/${edit.id}`, form); else await api.post("/brokers", form);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };
  const del = async (b) => { if (!window.confirm(`Remove ${b.name} from address book? Loads are kept.`)) return; await api.delete(`/brokers/${b.id}`); load(); };
  const showLoads = async (b) => { setDetail(b); const { data } = await api.get(`/brokers/${b.id}/loads`); setDetailLoads(data); };

  const filtered = items.filter((b) => !q || [b.name, b.contact_name, b.email, b.contact_hint].join(" ").toLowerCase().includes(q.toLowerCase()));
  const totals = items.reduce((a, b) => ({ loads: a.loads + b.load_count, rev: a.rev + b.total_revenue, open: a.open + b.open_balance }), { loads: 0, rev: 0, open: 0 });
  const max = Math.max(1, ...items.map((b) => b.load_count));

  return (
    <div className="p-6 lg:p-8 max-w-[1600px]">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Address book</div>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">Brokers</h1>
          <p className="text-slate-400 mt-2 text-sm">Every broker from your rate cons, auto-logged with a repeat-load counter.</p>
        </div>
        <button data-testid="broker-add-button" onClick={() => { setEdit(null); setForm(EMPTY); setOpen(true); }}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold flex items-center gap-2 text-white"><Plus className="h-4 w-4" /> Add Broker</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[["Brokers", items.length, BookUser], ["Loads booked", totals.loads, Repeat], ["Open receivables", money(totals.open), null]].map(([l, v, Icon]) => (
          <div key={l} className="card-noise rounded-xl border border-slate-800 p-4">
            <div className="text-xs uppercase font-mono tracking-widest text-slate-400 flex items-center gap-2">{Icon && <Icon className="h-3.5 w-3.5" />}{l}</div>
            <div className="font-display font-black text-3xl mt-1" data-testid={`broker-kpi-${l.toLowerCase().replace(/ /g, "-")}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 mb-4 max-w-md">
        <Search className="h-4 w-4 text-slate-500" />
        <input data-testid="broker-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brokers…" className="bg-transparent py-2 w-full outline-none text-sm" />
      </div>

      <div data-testid="brokers-table" className="card-noise rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase font-mono tracking-widest text-slate-400">
            <tr><th className="text-left px-4 py-3">Broker</th><th className="text-left px-4 py-3">Contact</th><th className="text-left px-4 py-3 w-56">Loads</th><th className="text-right px-4 py-3">Revenue</th><th className="text-right px-4 py-3">Open</th><th className="text-left px-4 py-3">Last load</th><th className="text-right px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 && <tr><td colSpan="7" className="text-center py-12 text-slate-500">No brokers yet — they appear automatically when you add or import loads.</td></tr>}
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-slate-900/40">
                <td className="px-4 py-3">
                  <button onClick={() => showLoads(b)} className="font-semibold hover:text-orange-400 text-left" data-testid={`broker-name-${b.id}`}>{b.name}</button>
                  {b.mc_number && <div className="text-xs text-slate-500 font-mono">MC {b.mc_number}</div>}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  <div>{b.contact_name || b.contact_hint || "—"}</div>
                  <div className="text-xs text-slate-500 flex gap-3">{b.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{b.email}</span>}{b.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{b.phone}</span>}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-500 to-cyan-400" style={{ width: `${(b.load_count / max) * 100}%` }} /></div>
                    <span className="font-mono font-bold w-8 text-right" data-testid={`broker-count-${b.id}`}>{b.load_count}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">{money(b.total_revenue)}</td>
                <td className={`px-4 py-3 text-right font-mono ${b.open_balance > 0 ? "text-amber-400" : "text-slate-500"}`}>{money(b.open_balance)}</td>
                <td className="px-4 py-3 text-slate-400">{b.last_load || "—"}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button data-testid={`broker-edit-${b.id}`} onClick={() => { setEdit(b); setForm({ ...EMPTY, ...b }); setOpen(true); }} className="p-1.5 rounded hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(b)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-2xl">{edit ? "Edit Broker" : "New Broker"}</h3>
              <button onClick={() => setOpen(false)} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {FIELDS.map(([k, l]) => (
                <label key={k} className={`block ${k === "address" || k === "name" ? "md:col-span-2" : ""}`}>
                  <span className="text-xs uppercase font-mono tracking-widest text-slate-400">{l}</span>
                  <input data-testid={`broker-${k}-input`} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
                </label>
              ))}
              <label className="block md:col-span-2">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Notes</span>
                <textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
              </label>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700">Cancel</button>
              <button data-testid="broker-save-button" onClick={save} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={() => setDetail(null)}>
          <div data-testid="broker-detail-panel" className="w-full max-w-2xl h-full bg-[#0B0F17] border-l border-slate-800 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="text-xs uppercase font-mono tracking-widest text-slate-400">{detail.load_count} loads · {money(detail.total_revenue)}</div>
                <h3 className="font-display font-bold text-2xl">{detail.name}</h3>
                <div className="text-sm text-slate-400 flex flex-wrap gap-3 mt-1">
                  {detail.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{detail.email}</span>}
                  {detail.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{detail.phone}</span>}
                  {detail.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{detail.address}</span>}
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-slate-800">
              {detailLoads.map((l) => (
                <div key={l.id} className="p-4 flex items-center gap-4 text-sm">
                  <div className="font-mono font-semibold w-36">{l.load_number}</div>
                  <div className="flex-1 text-slate-300">{l.origin || "—"} → {l.destination || "—"}<div className="text-xs text-slate-500">{l.pickup_date || (l.created_at || "").slice(0, 10)}</div></div>
                  <span className={`status-pill status-${l.status || "Booked"}`}>{l.status}</span>
                  <div className="font-mono font-semibold w-24 text-right">{money(l.rate)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
