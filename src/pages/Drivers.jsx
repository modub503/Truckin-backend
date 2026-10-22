import { useCallback, useEffect, useState } from "react";
import { api, money, num, fmtErr, BACKEND_ORIGIN } from "@/lib/api";
import { useEscape } from "@/lib/hooks";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Truck, FileUp, Sparkles, FileDown, Wand2 } from "lucide-react";
import { DispatchersTab } from "@/components/DispatchersTab";
import { TransfersTab } from "@/components/TransfersTab";

const D_EMPTY = { name: "", truck_number: "", pay_type: "per_mile", rate: 0, phone: "", cdl: "" };
const S_EMPTY = {
  driver_id: "", period_start: "", period_end: "", truck_number: "",
  loaded_miles: 0, empty_miles: 0, gross_pay: 0,
  fuel_deduction: 0, escrow: 0, insurance: 0, other_deductions: 0,
  reimbursements: 0, reimbursement_notes: "", net_pay: 0, notes: "",
};
const calcNet = (s) => (Number(s.gross_pay) || 0) - (Number(s.fuel_deduction) || 0) - (Number(s.escrow) || 0)
  - (Number(s.insurance) || 0) - (Number(s.other_deductions) || 0) - (Number(s.dispatcher_fee) || 0) + (Number(s.reimbursements) || 0);

export default function Drivers() {
  const [tab, setTab] = useState("drivers");
  const [dispatchers, setDispatchers] = useState([]);
  const [dispOpenSignal, setDispOpenSignal] = useState(0);
  useEffect(() => { api.get("/dispatchers").then(({ data }) => setDispatchers(data)); }, [tab]);
  const [drivers, setDrivers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [dOpen, setDOpen] = useState(false);
  const [dEdit, setDEdit] = useState(null);
  const [dForm, setDForm] = useState(D_EMPTY);
  const [sOpen, setSOpen] = useState(false);
  const [sEdit, setSEdit] = useState(null);
  const [sForm, setSForm] = useState(S_EMPTY);
  const [extracting, setExtracting] = useState(false);
  const [aiMeta, setAiMeta] = useState(null);
  const [bOpen, setBOpen] = useState(false);
  const [bForm, setBForm] = useState({ driver_id: "", period_start: "", period_end: "" });
  const [building, setBuilding] = useState(false);
  useEscape(bOpen, () => setBOpen(false));

  const buildSettlement = async () => {
    if (!bForm.driver_id || !bForm.period_start || !bForm.period_end) return toast.error("Pick a driver and both dates");
    setBuilding(true);
    try {
      const { data } = await api.post("/settlements/build", bForm);
      setSEdit(null); setSForm({ ...S_EMPTY, ...data, loads: data.loads });
      setAiMeta({ built: true, loads: data.loads.length, fuel: data.fuel_receipts, pay_type: data.pay_type, rate: data.rate });
      setBOpen(false); setSOpen(true);
      toast.success(`${data.loads.length} load${data.loads.length === 1 ? "" : "s"} · ${data.fuel_receipts} fuel receipt${data.fuel_receipts === 1 ? "" : "s"} pulled in`);
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); } finally { setBuilding(false); }
  };
  const stubPdf = (s) => window.open(`${BACKEND_ORIGIN}/api/settlements/${s.id}/pdf`, "_blank");
  useEscape(dOpen, () => setDOpen(false));
  useEscape(sOpen, () => setSOpen(false));

  const load = useCallback(async () => {
    const [d, s] = await Promise.all([api.get("/drivers"), api.get("/settlements")]);
    setDrivers(d.data); setSettlements(s.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveDriver = async () => {
    try {
      if (dEdit) await api.put(`/drivers/${dEdit.id}`, dForm);
      else await api.post("/drivers", dForm);
      toast.success("Saved"); setDOpen(false); load();
    } catch { toast.error("Save failed"); }
  };
  const delDriver = async (r) => { if (!window.confirm("Delete driver?")) return; await api.delete(`/drivers/${r.id}`); load(); };

  const saveSettlement = async () => {
    if (!sForm.driver_id) return toast.error("Select a driver");
    const payload = { ...sForm, net_pay: calcNet(sForm), source_file_id: aiMeta?.file_id || sForm.source_file_id || null };
    try {
      if (sEdit) await api.put(`/settlements/${sEdit.id}`, payload);
      else await api.post("/settlements", payload);
      toast.success("Settlement saved"); setSOpen(false); setAiMeta(null); load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };

  const extractSettlement = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setExtracting(true);
    const fd = new FormData(); fd.append("file", f);
    try {
      const { data } = await api.post("/settlements/extract", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const fl = data.fields || {};
      const next = { ...S_EMPTY };
      Object.keys(S_EMPTY).forEach((k) => { if (fl[k] !== null && fl[k] !== undefined) next[k] = fl[k]; });
      setSEdit(null); setSForm(next);
      setAiMeta({ file_id: data.file_id, confidence: fl.confidence, filename: f.name, driver_name: fl.driver_name, matched: !!fl.driver_id });
      setTab("settlements"); setSOpen(true);
      toast.success(fl.driver_id ? "Settlement read — review and save" : `Settlement read — pick the driver (statement says "${fl.driver_name || "?"}")`);
    } catch (err) { toast.error(fmtErr(err.response?.data?.detail)); } finally { setExtracting(false); }
  };
  const delSettlement = async (r) => { if (!window.confirm("Delete settlement?")) return; await api.delete(`/settlements/${r.id}`); load(); };

  const driverName = (id) => drivers.find((d) => d.id === id)?.name || "—";

  return (
    <div className="p-6 lg:p-8 max-w-[1600px]">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Payroll</div>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">Drivers & Pay</h1>
        </div>
        <div className="flex gap-2">
          {tab === "drivers" ? (
            <button data-testid="driver-add-button" onClick={() => { setDEdit(null); setDForm(D_EMPTY); setDOpen(true); }}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold flex items-center gap-2 text-white">
              <Plus className="h-4 w-4" /> Add Driver
            </button>
          ) : tab === "dispatchers" ? (
            <button data-testid="dispatcher-add-button" onClick={() => setDispOpenSignal((n) => n + 1)}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold flex items-center gap-2 text-white">
              <Plus className="h-4 w-4" /> Add Dispatcher
            </button>
          ) : tab === "transfers" ? null : (
            <>
              <button data-testid="settlement-build-button" onClick={() => { setBForm({ driver_id: drivers[0]?.id || "", period_start: "", period_end: "" }); setBOpen(true); }}
                className="px-4 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 font-semibold flex items-center gap-2">
                <Wand2 className="h-4 w-4" /> Auto-build
              </button>
              <label data-testid="settlement-upload-button"
                className={`px-4 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 font-semibold flex items-center gap-2 cursor-pointer ${extracting ? "opacity-60 pointer-events-none" : ""}`}>
                {extracting ? <Sparkles className="h-4 w-4 animate-pulse" /> : <FileUp className="h-4 w-4" />}
                {extracting ? "Reading statement…" : "Upload Settlement"}
                <input data-testid="settlement-file-input" type="file" accept="application/pdf,image/*" onChange={extractSettlement} className="hidden" />
              </label>
              <button data-testid="settlement-add-button" onClick={() => { setSEdit(null); setSForm(S_EMPTY); setAiMeta(null); setSOpen(true); }}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold flex items-center gap-2 text-white">
                <Plus className="h-4 w-4" /> Log Settlement
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[["drivers", "Drivers"], ["settlements", "Settlements"], ["dispatchers", "Dispatchers"], ["transfers", "Transfers"]].map(([k, l]) => (
          <button key={k} data-testid={`drivers-tab-${k}`} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === k ? "bg-orange-500 text-white" : "text-slate-400 border border-slate-800 hover:text-white"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "drivers" && (
        <div className="card-noise rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-xs uppercase font-mono tracking-widest text-slate-400">
                <tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Truck #</th><th className="text-left px-4 py-3">Pay Type</th><th className="text-right px-4 py-3">Rate</th><th className="text-left px-4 py-3">Phone</th><th className="text-left px-4 py-3">CDL</th><th className="text-right px-4 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {drivers.length === 0 && <tr><td colSpan="7" className="text-center py-12 text-slate-500">No drivers yet.</td></tr>}
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-semibold">{d.name}</td>
                    <td className="px-4 py-3 font-mono">{d.truck_number || "—"}</td>
                    <td className="px-4 py-3">{d.pay_type}</td>
                    <td className="px-4 py-3 text-right font-mono">{d.pay_type === "percentage" ? `${d.rate}%` : money(d.rate)}</td>
                    <td className="px-4 py-3 text-slate-400">{d.phone || "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{d.cdl || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setDEdit(d); setDForm({ ...D_EMPTY, ...d }); setDOpen(true); }} className="p-1.5 rounded hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => delDriver(d)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "dispatchers" && <DispatchersTab drivers={drivers} openSignal={dispOpenSignal} />}
      {tab === "transfers" && <TransfersTab dispatchers={dispatchers} />}

      {tab === "settlements" && (
        <div className="card-noise rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-xs uppercase font-mono tracking-widest text-slate-400">
                <tr><th className="text-left px-4 py-3">Period</th><th className="text-left px-4 py-3">Driver</th><th className="text-left px-4 py-3">Truck</th><th className="text-right px-4 py-3">Miles</th><th className="text-right px-4 py-3">Gross</th><th className="text-right px-4 py-3">Deductions</th><th className="text-right px-4 py-3">Reimb.</th><th className="text-right px-4 py-3">Net</th><th className="text-right px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {settlements.length === 0 && <tr><td colSpan="9" className="text-center py-12 text-slate-500">No settlements yet.</td></tr>}
                {settlements.map((s) => {
                  const totalMiles = (Number(s.loaded_miles) || 0) + (Number(s.empty_miles) || 0);
                  const totalDed = (Number(s.fuel_deduction) || 0) + (Number(s.escrow) || 0) + (Number(s.insurance) || 0) + (Number(s.other_deductions) || 0) + (Number(s.dispatcher_fee) || 0);
                  return (
                    <tr key={s.id} className="hover:bg-slate-900/40" data-testid={`settlement-row-${s.id}`}>
                      <td className="px-4 py-3 text-slate-300">{s.period_start || "—"} → {s.period_end || "—"}</td>
                      <td className="px-4 py-3 font-semibold">{s.driver_name || driverName(s.driver_id)}</td>
                      <td className="px-4 py-3 font-mono">{s.truck_number || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono">{num(totalMiles)}</td>
                      <td className="px-4 py-3 text-right font-mono">{money(s.gross_pay)}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-400" title={s.dispatcher_fee ? `incl. dispatcher ${money(s.dispatcher_fee)}` : ""}>-{money(totalDed)}{Number(s.dispatcher_fee) > 0 && <div className="text-[10px] text-orange-400/80">disp {money(s.dispatcher_fee)}</div>}</td>
                      <td className="px-4 py-3 text-right font-mono text-cyan-300" title={s.reimbursement_notes || ""}>{Number(s.reimbursements) ? `+${money(s.reimbursements)}` : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{money(s.net_pay)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button data-testid={`settlement-pdf-${s.id}`} onClick={() => stubPdf(s)} title="Pay stub PDF" className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-orange-400"><FileDown className="h-4 w-4" /></button>
                        <button onClick={() => { setSEdit(s); setSForm({ ...S_EMPTY, ...s }); setAiMeta(null); setSOpen(true); }} className="p-1.5 rounded hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => delSettlement(s)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-2xl">{dEdit ? "Edit Driver" : "New Driver"}</h3>
              <button onClick={() => setDOpen(false)} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[["name", "Name"], ["truck_number", "Truck #"], ["phone", "Phone"], ["cdl", "CDL #"]].map(([k, l]) => (
                <label key={k} className="block">
                  <span className="text-xs uppercase font-mono tracking-widest text-slate-400">{l}</span>
                  <input value={dForm[k] ?? ""} onChange={(e) => setDForm({ ...dForm, [k]: e.target.value })}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
                </label>
              ))}
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Pay Type</span>
                <select value={dForm.pay_type} onChange={(e) => setDForm({ ...dForm, pay_type: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500">
                  <option value="per_mile">Per Mile ($)</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat rate ($)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Rate</span>
                <input type="number" step="0.01" value={dForm.rate ?? 0}
                  onChange={(e) => setDForm({ ...dForm, rate: Number(e.target.value) })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
              </label>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setDOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700">Cancel</button>
              <button data-testid="driver-save-button" onClick={saveDriver} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}

      {bOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setBOpen(false)}>
          <div data-testid="settlement-build-modal" className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Auto settlement builder</div>
                <h3 className="font-display font-bold text-2xl">Pick driver & period</h3>
              </div>
              <button onClick={() => setBOpen(false)} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Driver</span>
                <select data-testid="build-driver-select" value={bForm.driver_id} onChange={(e) => setBForm({ ...bForm, driver_id: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500">
                  <option value="">Select driver…</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.truck_number || "no truck"} · {d.pay_type === "percentage" ? `${d.rate}%` : money(d.rate)}{d.pay_type === "per_mile" ? "/mi" : ""}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-xs uppercase font-mono tracking-widest text-slate-400">Period start</span>
                  <input data-testid="build-start-input" type="date" value={bForm.period_start} onChange={(e) => setBForm({ ...bForm, period_start: e.target.value })} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" /></label>
                <label className="block"><span className="text-xs uppercase font-mono tracking-widest text-slate-400">Period end</span>
                  <input data-testid="build-end-input" type="date" value={bForm.period_end} onChange={(e) => setBForm({ ...bForm, period_end: e.target.value })} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" /></label>
              </div>
              <p className="text-xs text-slate-500">Loads delivered in the period (by delivery date, or pickup/created date if missing) are matched to the driver by name, truck # or assignment. Gross pay comes from the driver's pay type; fuel receipts for the truck are totaled as a suggested deduction.</p>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setBOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700">Cancel</button>
              <button data-testid="build-run-button" disabled={building} onClick={buildSettlement} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold flex items-center gap-2"><Wand2 className="h-4 w-4" /> {building ? "Building…" : "Build settlement"}</button>
            </div>
          </div>
        </div>
      )}

      {sOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#0B0F17]">
              <h3 className="font-display font-bold text-2xl">{sEdit ? "Edit Settlement" : aiMeta?.built ? "Review Auto-built Settlement" : aiMeta ? "Review Imported Settlement" : "Log Settlement"}</h3>
              <button onClick={() => setSOpen(false)} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            {aiMeta?.built && (
              <div data-testid="settlement-built-banner" className="mx-5 mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-3 text-sm">
                <Wand2 className="h-4 w-4 text-emerald-300 shrink-0" />
                <div className="flex-1">Pulled <b>{aiMeta.loads}</b> load{aiMeta.loads === 1 ? "" : "s"} and <b>{aiMeta.fuel}</b> fuel receipt{aiMeta.fuel === 1 ? "" : "s"} for this period. Gross uses the driver's {String(aiMeta.pay_type || "").replace("_", " ")} rate ({aiMeta.pay_type === "percentage" ? `${aiMeta.rate}%` : money(aiMeta.rate)}). Fuel receipts are pre-filled as the fuel deduction — clear it if the company pays fuel.</div>
              </div>
            )}
            {aiMeta && !aiMeta.built && (
              <div data-testid="settlement-ai-banner" className={`mx-5 mt-4 rounded-lg border p-3 flex items-center gap-3 text-sm ${aiMeta.matched ? "border-cyan-500/30 bg-cyan-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                <Sparkles className="h-4 w-4 text-cyan-300 shrink-0" />
                <div className="flex-1">Read from <span className="font-mono">{aiMeta.filename}</span>.{!aiMeta.matched && <> Statement driver <b>"{aiMeta.driver_name || "?"}"</b> isn't in your driver list — pick the right driver below.</>} Check the numbers before saving.</div>
                {aiMeta.confidence != null && <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800">{Math.round(aiMeta.confidence * 100)}%</span>}
              </div>
            )}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block md:col-span-2">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Driver</span>
                <select data-testid="settlement-driver-select" value={sForm.driver_id} onChange={(e) => {
                  const d = drivers.find(x => x.id === e.target.value);
                  setSForm({ ...sForm, driver_id: e.target.value, truck_number: d?.truck_number || sForm.truck_number });
                }}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500">
                  <option value="">Select driver…</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.truck_number}</option>)}
                </select>
              </label>
              {[
                ["period_start", "Period Start", "date"], ["period_end", "Period End", "date"],
                ["truck_number", "Truck #"], ["loaded_miles", "Loaded Miles", "number"],
                ["empty_miles", "Empty Miles", "number"], ["gross_pay", "Gross Pay ($)", "number"],
                ["fuel_deduction", "Fuel ($)", "number"], ["escrow", "Escrow ($)", "number"],
                ["insurance", "Insurance ($)", "number"], ["other_deductions", "Other Ded. ($)", "number"],
              ].map(([k, l, t]) => (
                <label key={k} className="block">
                  <span className="text-xs uppercase font-mono tracking-widest text-slate-400">{l}</span>
                  <input data-testid={`settlement-${k}-input`} type={t || "text"} value={sForm[k] ?? ""}
                    onChange={(e) => setSForm({ ...sForm, [k]: t === "number" ? Number(e.target.value) : e.target.value })}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
                </label>
              ))}
              <div className="md:col-span-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs uppercase font-mono tracking-widest text-cyan-300">Reimbursements to driver ($)</span>
                  <input data-testid="settlement-reimbursements-input" type="number" step="0.01" value={sForm.reimbursements ?? 0}
                    onChange={(e) => setSForm({ ...sForm, reimbursements: Number(e.target.value) })}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-cyan-500" />
                </label>
                <label className="block">
                  <span className="text-xs uppercase font-mono tracking-widest text-cyan-300">What for</span>
                  <input data-testid="settlement-reimbursement-notes-input" value={sForm.reimbursement_notes || ""} placeholder="Lumper, scale, tolls, detention…"
                    onChange={(e) => setSForm({ ...sForm, reimbursement_notes: e.target.value })}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-cyan-500" />
                </label>
              </div>
              <div className="md:col-span-2 flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 px-4 py-3">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Net pay = gross − deductions{Number(sForm.dispatcher_fee) > 0 ? ` − dispatcher ${money(sForm.dispatcher_fee)}` : " − dispatcher fee (auto on save)"} + reimbursements</span>
                <span data-testid="settlement-net-preview" className="font-mono font-black text-xl text-emerald-400">{money(calcNet(sForm))}</span>
              </div>
              {Array.isArray(sForm.loads) && sForm.loads.length > 0 && (
                <div className="md:col-span-2 rounded-lg border border-slate-800 overflow-hidden" data-testid="settlement-loads-list">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono tracking-widest"><tr><th className="text-left px-3 py-2">Load</th><th className="text-left px-3 py-2">Route</th><th className="text-left px-3 py-2">Delivered</th><th className="text-right px-3 py-2">Miles</th><th className="text-right px-3 py-2">Pay</th></tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {sForm.loads.map((l) => <tr key={l.id}><td className="px-3 py-2 font-mono">{l.load_number}</td><td className="px-3 py-2 text-slate-300">{l.origin} → {l.destination}</td><td className="px-3 py-2 text-slate-400">{l.delivery_date}</td><td className="px-3 py-2 text-right font-mono">{num(l.miles)}</td><td className="px-3 py-2 text-right font-mono text-emerald-400">{money(l.pay)}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              )}
              <label className="block md:col-span-2">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Notes</span>
                <textarea rows={2} value={sForm.notes || ""} onChange={(e) => setSForm({ ...sForm, notes: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
              </label>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2 sticky bottom-0 bg-[#0B0F17]">
              <button onClick={() => setSOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700">Cancel</button>
              <button data-testid="settlement-save-button" onClick={saveSettlement} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
