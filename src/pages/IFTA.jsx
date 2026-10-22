import { useEffect, useState } from "react";
import { api, money, num, fmtErr, BACKEND_ORIGIN } from "@/lib/api";
import { toast } from "sonner";
import { Download, Fuel, Route, AlertTriangle, Save } from "lucide-react";

const now = new Date();
const curQ = Math.floor(now.getMonth() / 3) + 1;

function StateMilesEditor({ load, onSaved }) {
  const [rows, setRows] = useState([{ state: "", miles: "" }, { state: "", miles: "" }]);
  const save = async () => {
    const sm = {};
    rows.forEach((r) => { if (r.state && Number(r.miles) > 0) sm[r.state.toUpperCase()] = Number(r.miles); });
    if (!Object.keys(sm).length) return toast.error("Enter at least one state + miles");
    try { await api.put(`/loads/${load.id}/state-miles`, { state_miles: sm }); toast.success(`State miles saved for ${load.load_number}`); onSaved(); }
    catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid={`state-miles-editor-${load.id}`}>
      {rows.map((r, i) => (
        <div key={`row-${i}`} className="flex gap-1">
          <input placeholder="ST" maxLength={2} value={r.state} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, state: e.target.value.toUpperCase() } : x))} className="w-12 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono uppercase outline-none" />
          <input placeholder="mi" type="number" value={r.miles} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, miles: e.target.value } : x))} className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono outline-none" />
        </div>
      ))}
      <button onClick={() => setRows([...rows, { state: "", miles: "" }])} className="text-xs text-slate-400 hover:text-white">+ state</button>
      <button data-testid={`state-miles-save-${load.id}`} onClick={save} className="px-2 py-1 rounded bg-orange-500 text-white text-xs font-semibold flex items-center gap-1"><Save className="h-3 w-3" /> Save</button>
    </div>
  );
}

export default function IFTA() {
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(curQ);
  const [truck, setTruck] = useState("");
  const [rep, setRep] = useState(null);
  const [trucks, setTrucks] = useState([]);

  const load = async () => {
    const params = { year, quarter }; if (truck) params.truck_number = truck;
    const { data } = await api.get("/ifta/report", { params }); setRep(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year, quarter, truck]);
  useEffect(() => { api.get("/drivers").then(({ data }) => setTrucks([...new Set(data.map((d) => d.truck_number).filter(Boolean))])); }, []);

  const csv = () => window.open(`${BACKEND_ORIGIN}/api/ifta/report.csv?year=${year}&quarter=${quarter}${truck ? `&truck_number=${encodeURIComponent(truck)}` : ""}`, "_blank");
  const sel = "bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none";

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Fuel tax</div>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">IFTA Quarterly</h1>
          <p className="text-slate-400 mt-2 text-sm">Miles and tax-paid gallons by jurisdiction, rolled up from your loads and fuel receipts.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select data-testid="ifta-year-select" value={year} onChange={(e) => setYear(Number(e.target.value))} className={sel}>{[0, 1, 2].map((i) => <option key={i} value={now.getFullYear() - i}>{now.getFullYear() - i}</option>)}</select>
          <select data-testid="ifta-quarter-select" value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className={sel}>{[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}</select>
          <select data-testid="ifta-truck-select" value={truck} onChange={(e) => setTruck(e.target.value)} className={sel}><option value="">All trucks</option>{trucks.map((t) => <option key={t}>{t}</option>)}</select>
          <button data-testid="ifta-csv-button" onClick={csv} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-2 text-sm"><Download className="h-4 w-4" /> Export CSV</button>
        </div>
      </div>

      {rep && (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[["Total miles", num(rep.total_miles), Route], ["Tax-paid gallons", num(rep.total_gallons), Fuel], ["Fleet MPG", rep.fleet_mpg || "—", null], ["Fuel spend", money(rep.total_fuel_cost), null]].map(([l, v, I]) => (
            <div key={l} className="card-noise rounded-xl border border-slate-800 p-4">
              <div className="text-xs uppercase font-mono tracking-widest text-slate-400 flex items-center gap-2">{I && <I className="h-3.5 w-3.5" />}{l}</div>
              <div className="font-display font-black text-3xl mt-1" data-testid={`ifta-kpi-${l.toLowerCase().replace(/ /g, "-")}`}>{v}</div>
            </div>
          ))}
        </div>

        <div data-testid="ifta-table" className="card-noise rounded-xl border border-slate-800 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase font-mono tracking-widest text-slate-400">
              <tr><th className="text-left px-4 py-3">Jurisdiction</th><th className="text-right px-4 py-3">Miles</th><th className="text-right px-4 py-3">Taxable gal (mi ÷ MPG)</th><th className="text-right px-4 py-3">Tax-paid gal</th><th className="text-right px-4 py-3">Net taxable gal</th><th className="text-right px-4 py-3">Fuel $</th><th className="text-right px-4 py-3">Receipts</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rep.states.length === 0 && <tr><td colSpan="7" className="text-center py-12 text-slate-500">No loads or receipts in Q{quarter} {year}.</td></tr>}
              {rep.states.map((s) => (
                <tr key={s.state} data-testid={`ifta-row-${s.state}`} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-mono font-bold">{s.state}</td>
                  <td className="px-4 py-3 text-right font-mono">{num(s.miles)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{num(s.taxable_gallons)}</td>
                  <td className="px-4 py-3 text-right font-mono">{num(s.gallons)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${s.net_taxable_gallons > 0 ? "text-amber-400" : "text-emerald-400"}`}>{s.net_taxable_gallons > 0 ? "+" : ""}{num(s.net_taxable_gallons)}</td>
                  <td className="px-4 py-3 text-right font-mono">{money(s.fuel_cost)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">{s.receipts}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900/40 font-mono text-sm"><tr><td className="px-4 py-3 font-bold">TOTAL</td><td className="px-4 py-3 text-right">{num(rep.total_miles)}</td><td></td><td className="px-4 py-3 text-right">{num(rep.total_gallons)}</td><td></td><td className="px-4 py-3 text-right">{money(rep.total_fuel_cost)}</td><td className="px-4 py-3 text-right text-slate-400">{rep.receipt_count}</td></tr></tfoot>
          </table>
        </div>
        <p className="text-xs text-slate-500 mb-6">Positive net taxable gallons = you owe tax to that state; negative = credit. Multiply by each state's rate on your IFTA return.</p>

        {(rep.estimated_split_loads.length > 0 || rep.receipts_missing_state > 0) && (
          <div data-testid="ifta-warnings" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 font-semibold text-amber-300 mb-2"><AlertTriangle className="h-4 w-4" /> Accuracy check</div>
            {rep.receipts_missing_state > 0 && <div className="text-sm text-slate-300 mb-3">{rep.receipts_missing_state} fuel receipt{rep.receipts_missing_state > 1 ? "s" : ""} have no state — edit them in Fuel Receipts.</div>}
            {rep.estimated_split_loads.length > 0 && (<>
              <div className="text-sm text-slate-300 mb-3">{rep.estimated_split_loads.length} load{rep.estimated_split_loads.length > 1 ? "s" : ""} have no per-state mileage; miles were split evenly between origin and destination states. Enter the real breakdown (from your ELD / trip sheet) for a filing-ready report:</div>
              <div className="space-y-3">
                {rep.estimated_split_loads.map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center gap-3 text-sm border-t border-slate-800 pt-3">
                    <div className="w-40 font-mono font-semibold">{l.load_number}</div>
                    <div className="flex-1 min-w-[200px] text-slate-400">{l.origin || "—"} → {l.destination || "—"} · {num(l.miles)} mi</div>
                    <StateMilesEditor load={l} onSaved={load} />
                  </div>
                ))}
              </div>
            </>)}
          </div>
        )}
      </>)}
    </div>
  );
}
