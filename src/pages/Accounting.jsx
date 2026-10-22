import { useCallback, useEffect, useMemo, useState } from "react";
import { api, money } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, X, TrendingUp, TrendingDown, ArrowRightLeft, Percent } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { OperationsPnL } from "@/components/OperationsPnL";

const CATS = [
  { key: "revenue", label: "Revenue", icon: TrendingUp, color: "#10B981" },
  { key: "expense", label: "Expense", icon: TrendingDown, color: "#EF4444" },
  { key: "transfer_out", label: "Transfer Out", icon: ArrowRightLeft, color: "#06B6D4" },
  { key: "tax", label: "Tax", icon: Percent, color: "#F59E0B" },
];

const AXIS_FONT = 11;
const TOOLTIP_STYLE = { background: "#0B0F17", border: "1px solid #2D3748", borderRadius: 8 };
const LEGEND_STYLE = { fontSize: 12 };

const EMPTY = { date: new Date().toISOString().slice(0, 10), category: "revenue", subcategory: "", description: "", amount: 0, reference: "" };

export default function Accounting() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [view, setView] = useState("ledger");
  const [opsMonthly, setOpsMonthly] = useState(null);
  useEffect(() => { api.get("/drivers").then(({ data }) => setDrivers(data)); }, []);
  useEffect(() => {
    if (view === "ledger") { setOpsMonthly(null); return; }
    const params = {}; if (view !== "fleet") params.driver = view;
    api.get("/accounting/operations", { params }).then(({ data }) => setOpsMonthly(data));
  }, [view]);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    const [i, s] = await Promise.all([
      api.get("/accounting", { params: filter ? { category: filter } : {} }),
      api.get("/accounting/summary"),
    ]);
    setItems(i.data); setSummary(s.data);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post("/accounting", form); toast.success("Entry added"); setOpen(false); setForm(EMPTY); load(); }
    catch { toast.error("Save failed"); }
  };
  const del = async (r) => { if (!window.confirm("Delete entry?")) return; await api.delete(`/accounting/${r.id}`); load(); };

  const pieData = useMemo(() => summary?.totals ? CATS.map(c => ({ name: c.label, value: summary.totals[c.key] || 0, fill: c.color })).filter(x => x.value > 0) : [], [summary]);

  return (
    <div className="p-6 lg:p-8 max-w-[1600px]">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Books</div>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">Accounting</h1>
          <p className="text-slate-400 mt-2 text-sm">Revenue · Expenses · Transfers Out · Taxes owed. Rate-con revenue and driver settlements roll in automatically; log everything else as entries.</p>
        </div>
        <button data-testid="accounting-add-button" onClick={() => { setForm(EMPTY); setOpen(true); }}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Entry
        </button>
      </div>

      <OperationsPnL />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {CATS.map((c) => {
          const Icon = c.icon;
          const val = summary?.totals?.[c.key] || 0;
          return (
            <div key={c.key} data-testid={`accounting-${c.key}-card`} className="card-noise rounded-xl border border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">{c.label}</span>
                <Icon className="h-4 w-4" style={{ color: c.color }} />
              </div>
              <div className="mt-3 font-mono text-2xl font-bold tabular-nums">{money(val)}</div>
              {c.key === "revenue" && summary?.sources && (
                <div className="mt-1 text-[11px] text-slate-500" data-testid="accounting-revenue-sources">{money(summary.sources.rate_con_revenue)} rate cons · {money(summary.sources.ledger.revenue)} booked</div>
              )}
              {c.key === "expense" && summary?.sources && (
                <div className="mt-1 text-[11px] text-slate-500" data-testid="accounting-expense-sources">{money(summary.sources.driver_settlements)} settlements · {money(summary.sources.ledger.expense)} fuel &amp; other</div>
              )}
              {c.key === "transfer_out" && <div className="mt-1 text-[11px] text-slate-500">dispatcher pay &amp; owner draws</div>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div data-testid="accounting-chart-monthly" className="lg:col-span-2 card-noise rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Monthly breakdown</div>
              <h3 className="font-display font-bold text-xl mt-1">{view === "ledger" ? "Revenue vs Expenses" : view === "fleet" ? "Fleet: loads vs driver pay vs fuel" : `${drivers.find((d) => d.id === view)?.name || "Driver"}: revenue vs settlements`}</h3>
            </div>
            <select data-testid="monthly-view-select" value={view} onChange={(e) => setView(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500">
              <option value="ledger">Books ledger</option>
              <option value="fleet">Fleet operations</option>
              <optgroup label="Per driver (loads vs settlements)">
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}{d.truck_number ? ` · ${d.truck_number}` : ""}</option>)}
              </optgroup>
            </select>
          </div>
          {view !== "ledger" && opsMonthly && (
            <div className="grid grid-cols-3 gap-3 mb-3 text-sm" data-testid="monthly-ops-totals">
              <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-2"><div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Load revenue</div><div className="font-mono font-bold text-emerald-400">{money(opsMonthly.totals.revenue)}</div></div>
              <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-2"><div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Settlements (driver pay)</div><div className="font-mono font-bold text-orange-400">{money(opsMonthly.totals.driver_pay)}</div></div>
              <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-2"><div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">{view === "fleet" ? "Margin after fuel" : "Driver margin (fuel excluded)"}</div><div className={`font-mono font-bold ${(view === "fleet" ? opsMonthly.totals.margin : opsMonthly.totals.driver_margin) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{money(view === "fleet" ? opsMonthly.totals.margin : opsMonthly.totals.driver_margin)}</div></div>
            </div>
          )}
          <div className="h-72">
            <ResponsiveContainer>
              {view === "ledger" ? (
                <BarChart data={summary?.monthly || []}>
                  <CartesianGrid stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="month" stroke="#6B7280" fontSize={AXIS_FONT} />
                  <YAxis stroke="#6B7280" fontSize={AXIS_FONT} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
                  <Bar dataKey="expense" fill="#EF4444" name="Expense" />
                  <Bar dataKey="transfer_out" fill="#06B6D4" name="Transfer Out" />
                  <Bar dataKey="tax" fill="#F59E0B" name="Tax" />
                </BarChart>
              ) : (
                <BarChart data={opsMonthly?.monthly || []}>
                  <CartesianGrid stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="month" stroke="#6B7280" fontSize={AXIS_FONT} />
                  <YAxis stroke="#6B7280" fontSize={AXIS_FONT} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => money(v)} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="revenue" fill="#10B981" name="Load revenue (rate cons)" />
                  <Bar dataKey="driver_pay" fill="#F97316" name="Settlements (driver pay)" />
                  {view === "fleet" && <Bar dataKey="fuel" fill="#06B6D4" name="Fuel (company)" />}
                  <Bar dataKey={view === "fleet" ? "margin" : "driver_margin"} fill="#A3E635" name={view === "fleet" ? "Margin after fuel" : "Driver margin"} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-noise rounded-xl border border-slate-800 p-5">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Distribution</div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {pieData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Net Profit</span><span className={`font-mono font-bold ${summary?.net_profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{money(summary?.net_profit)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Est. Tax Owed (25%)</span><span className="font-mono font-bold text-amber-400">{money(summary?.estimated_tax_owed)}</span></div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <button onClick={() => setFilter("")} className={`px-3 py-1.5 rounded-lg text-xs uppercase font-mono tracking-widest ${!filter ? "bg-orange-500 text-white" : "border border-slate-800 text-slate-400 hover:text-white"}`}>All</button>
        {CATS.map((c) => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className={`px-3 py-1.5 rounded-lg text-xs uppercase font-mono tracking-widest ${filter === c.key ? "bg-orange-500 text-white" : "border border-slate-800 text-slate-400 hover:text-white"}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="card-noise rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase font-mono tracking-widest text-slate-400">
              <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Description</th><th className="text-left px-4 py-3">Ref</th><th className="text-right px-4 py-3">Amount</th><th className="text-right px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.length === 0 && <tr><td colSpan="6" className="text-center py-12 text-slate-500">No entries yet.</td></tr>}
              {items.map((r) => {
                const cat = CATS.find(c => c.key === r.category);
                return (
                  <tr key={r.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-mono text-slate-300">{(r.date || r.created_at || "").slice(0, 10)}</td>
                    <td className="px-4 py-3"><span style={{ color: cat?.color }} className="text-xs uppercase font-mono tracking-widest">{cat?.label || r.category}</span></td>
                    <td className="px-4 py-3">{r.description || r.subcategory || "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{r.reference || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{money(r.amount)}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => del(r)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-lg">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-2xl">New Entry</h3>
              <button onClick={() => setOpen(false)} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Date</span>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
              </label>
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Category</span>
                <select data-testid="acct-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500">
                  {CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </label>
              <label className="block col-span-2">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Description</span>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
              </label>
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Reference</span>
                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
              </label>
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Amount ($)</span>
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
              </label>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700">Cancel</button>
              <button data-testid="accounting-save-button" onClick={save} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
