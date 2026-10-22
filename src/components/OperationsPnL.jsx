import { useEffect, useState } from "react";
import { api, money, num } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Truck, Users, Fuel, TrendingUp } from "lucide-react";

const TICK_STYLE = { fill: "#94A3B8", fontSize: 10 };
const TOOLTIP_STYLE = { background: "#0B0F17", border: "1px solid #2D3748", borderRadius: 8 };
const LEGEND_STYLE = { fontSize: 11 };
const BAR_RADIUS = [3, 3, 0, 0];
const fmtK = (v) => `$${(v / 1000).toFixed(0)}k`;

export function OperationsPnL() {
  const [ops, setOps] = useState(null);
  const [range, setRange] = useState({ start: "", end: "" });
  useEffect(() => {
    const params = {}; if (range.start) params.start = range.start; if (range.end) params.end = range.end;
    api.get("/accounting/operations", { params }).then(({ data }) => setOps(data));
  }, [range]);
  if (!ops) return null;
  const t = ops.totals;
  const inp = "bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm outline-none";
  return (
    <section data-testid="ops-pnl" className="mb-8">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Operations P&amp;L</div>
          <h2 className="font-display font-bold text-lg md:text-xl">Rate cons → driver pay → fuel</h2>
          <p className="text-xs text-slate-500 mt-1">Pulled live from your loads, settlements and fuel receipts — no double entry.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <input data-testid="ops-start-input" type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} className={inp} /> →
          <input data-testid="ops-end-input" type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} className={inp} />
          {(range.start || range.end) && <button onClick={() => setRange({ start: "", end: "" })} className="underline">clear</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {[["Rate con revenue", t.revenue, `${t.loads} loads · ${num(t.miles)} mi`, Truck, "text-emerald-400"],
          ["Driver settlements", t.driver_pay, `${t.settlements} settlements · gross ${money(t.settlement_gross)} + reimb ${money(t.reimbursements)}`, Users, "text-orange-400"],
          ["Fuel (company expense)", t.fuel, `${t.fuel_receipts} receipts · not charged to drivers`, Fuel, "text-cyan-300"],
          ["Operating margin", t.margin, t.revenue ? `${((t.margin / t.revenue) * 100).toFixed(1)}% · revenue − driver pay − fuel` : "—", TrendingUp, t.margin >= 0 ? "text-emerald-400" : "text-red-400"],
          ["Outstanding A/R", t.outstanding, `invoiced ${money(t.invoiced)} · collected ${money(t.collected)}`, null, "text-amber-400"],
        ].map(([l, v, sub, I, color]) => (
          <div key={l} className="card-noise rounded-xl border border-slate-800 p-4">
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 flex items-center gap-1.5">{I && <I className="h-3 w-3" />}{l}</div>
            <div className={`font-mono font-black text-2xl mt-1 ${color}`} data-testid={`ops-kpi-${l.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{money(v)}</div>
            <div className="text-[11px] text-slate-500 mt-1 truncate" title={sub}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-noise rounded-xl border border-slate-800 p-4 lg:col-span-1">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400 mb-2">By month</div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={ops.monthly}>
                <XAxis dataKey="month" tick={TICK_STYLE} />
                <YAxis tick={TICK_STYLE} tickFormatter={fmtK} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={money} />
                <Legend wrapperStyle={LEGEND_STYLE} />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={BAR_RADIUS} />
                <Bar dataKey="driver_pay" name="Driver pay" fill="#F97316" radius={BAR_RADIUS} />
                <Bar dataKey="fuel" name="Fuel" fill="#06B6D4" radius={BAR_RADIUS} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-noise rounded-xl border border-slate-800 overflow-hidden lg:col-span-2">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm" data-testid="ops-driver-table">
              <thead className="bg-slate-900/60 text-[10px] uppercase font-mono tracking-widest text-slate-400">
                <tr><th className="text-left px-3 py-2">Driver / truck</th><th className="text-right px-3 py-2">Loads</th><th className="text-right px-3 py-2">Revenue</th><th className="text-right px-3 py-2">RPM</th><th className="text-right px-3 py-2">Settlement gross</th><th className="text-right px-3 py-2">Reimb.</th><th className="text-right px-3 py-2">Driver margin</th><th className="text-right px-3 py-2 text-cyan-300/70">Fuel (company)</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ops.by_driver.map((r) => (
                  <tr key={r.driver_name + (r.truck_number || "")} data-testid={`ops-driver-row`} className="hover:bg-slate-900/40">
                    <td className="px-3 py-2"><div className="font-semibold">{r.driver_name}</div><div className="text-[11px] text-slate-500 font-mono">{r.truck_number || "—"}</div></td>
                    <td className="px-3 py-2 text-right font-mono">{r.loads}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400">{money(r.revenue)}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-400">{r.rpm != null ? `$${r.rpm.toFixed(2)}` : "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-orange-400">{money(r.settlement_gross)}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300">{r.reimbursements ? money(r.reimbursements) : "—"}</td>
                    <td className={`px-3 py-2 text-right font-mono font-bold ${r.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{money(r.margin)}{r.margin_pct != null && <span className="text-[10px] text-slate-500 ml-1">{r.margin_pct}%</span>}</td>
                    <td className="px-3 py-2 text-right font-mono text-cyan-300/70">{r.fuel ? money(r.fuel) : "—"}</td>
                  </tr>
                ))}
                {ops.by_driver.length === 0 && <tr><td colSpan="8" className="text-center py-10 text-slate-500">No loads, settlements or receipts in this range.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
