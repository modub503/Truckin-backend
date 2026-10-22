import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { Truck, Camera, Fuel, MapPin, ChevronDown, ChevronUp, CheckCircle2, Phone, Package, Navigation, Wallet, FileDown } from "lucide-react";

// Same-origin so cookies + custom-domain routing behave consistently in prod.
const BACKEND_ORIGIN =
  typeof window !== "undefined" && window.location && window.location.origin
    ? window.location.origin.replace(/\/$/, "")
    : (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
const API = `${BACKEND_ORIGIN}/api`;
const money = (n) => Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const NEXT = { Booked: "Dispatched", Dispatched: "In-Transit", "In-Transit": "Delivered" };

function LoadCard({ token, l, onChanged }) {
  const [open, setOpen] = useState(false);
  const [pods, setPods] = useState(null);
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState("");

  const loadPods = useCallback(async () => { const { data } = await axios.get(`${API}/portal/${token}/loads/${l.id}/pod`); setPods(data); }, [token, l.id]);
  useEffect(() => { if (open && pods === null) loadPods(); }, [open, pods, loadPods]);

  const upload = async (e) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) { const fd = new FormData(); fd.append("file", f); fd.append("caption", caption); await axios.post(`${API}/portal/${token}/loads/${l.id}/pod`, fd); }
      toast.success("POD sent to dispatch"); setCaption(""); loadPods(); onChanged();
    } catch (err) { toast.error(err.response?.data?.detail || "Upload failed"); } finally { setBusy(false); e.target.value = ""; }
  };
  const setStatus = async (s) => {
    const fd = new FormData(); fd.append("status", s);
    try { await axios.post(`${API}/portal/${token}/loads/${l.id}/status`, fd); toast.success(`Marked ${s}`); onChanged(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };
  const nav = (addr) => window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, "_blank");

  return (
    <div data-testid={`portal-load-${l.id}`} className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-4 text-left flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2"><span className="font-mono font-bold">{l.load_number}</span><span className={`status-pill status-${l.status || "Booked"}`}>{l.status}</span></div>
          <div className="text-sm text-slate-300 mt-1 truncate">{l.origin || "—"} → {l.destination || "—"}</div>
          <div className="text-xs text-slate-500 mt-0.5">PU {l.pickup_date || "TBD"} · DEL {l.delivery_date || "TBD"}</div>
        </div>
        {l.estimated_pay != null && (
          <div className="text-right shrink-0" data-testid={`portal-pay-${l.id}`}>
            <div className="text-[9px] uppercase font-mono tracking-widest text-slate-500">Est. pay</div>
            <div className="font-mono font-black text-emerald-400">{money(l.estimated_pay)}</div>
          </div>
        )}
        {open ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-800 pt-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[["Broker", l.broker], ["Commodity", l.commodity], ["Weight", l.weight ? `${Number(l.weight).toLocaleString()} lbs` : null], ["Miles", l.miles], ["Equipment", l.equipment], ["Truck", l.truck_number]].map(([k, v]) => (
              <div key={k}><div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">{k}</div><div className="text-slate-200">{v || "—"}</div></div>
            ))}
          </div>
          {l.broker_contact && <a href={`tel:${(l.broker_contact.match(/[\d()+\-\s]{7,}/) || [""])[0].trim()}`} className="flex items-center gap-2 text-sm text-cyan-300"><Phone className="h-4 w-4" /> {l.broker_contact}</a>}
          {l.notes && <div className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-950 rounded-lg p-3 border border-slate-800">{l.notes}</div>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => nav(l.origin)} className="py-2.5 rounded-xl border border-slate-700 text-sm flex items-center justify-center gap-2"><Navigation className="h-4 w-4" /> To pickup</button>
            <button onClick={() => nav(l.destination)} className="py-2.5 rounded-xl border border-slate-700 text-sm flex items-center justify-center gap-2"><MapPin className="h-4 w-4" /> To delivery</button>
          </div>
          {NEXT[l.status] && (
            <button data-testid={`portal-status-${l.id}`} onClick={() => setStatus(NEXT[l.status])} className="w-full py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Mark {NEXT[l.status]}
            </button>
          )}
          <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-2">Proof of delivery</div>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm mb-2 outline-none" />
            <label className={`w-full py-4 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2 ${busy ? "opacity-60" : ""}`}>
              <Camera className="h-5 w-5" /> {busy ? "Sending…" : "Snap POD photo"}
              <input data-testid={`portal-pod-input-${l.id}`} type="file" accept="image/*" capture="environment" multiple onChange={upload} className="hidden" disabled={busy} />
            </label>
            {pods && pods.length > 0 && <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {pods.length} photo{pods.length > 1 ? "s" : ""} on file</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function FuelForm({ token, truck, onDone }) {
  const [f, setF] = useState({ gallons: "", total_cost: "", state: "", station: "", date: new Date().toISOString().slice(0, 10) });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const pick = async (e) => {
    const chosen = e.target.files?.[0]; e.target.value = ""; if (!chosen) return;
    setFile(chosen); setReading(true);
    const fd = new FormData(); fd.append("file", chosen);
    try {
      const { data } = await axios.post(`${API}/portal/${token}/fuel/extract`, fd);
      const fl = data.fields || {};
      setF({ gallons: fl.gallons ?? "", total_cost: fl.total_cost ?? "", state: fl.state || "", station: fl.station || "", date: fl.date || f.date });
      toast.success("Receipt read — check and send");
    } catch { toast.info("Couldn't read it — type the numbers in"); } finally { setReading(false); }
  };
  const submit = async () => {
    if (!file) return;
    setBusy(true);
    const fd = new FormData(); fd.append("file", file); Object.entries(f).forEach(([k, v]) => fd.append(k, v)); fd.append("truck_number", truck || "");
    try { await axios.post(`${API}/portal/${token}/fuel`, fd); toast.success("Fuel receipt sent"); setF({ ...f, gallons: "", total_cost: "", station: "" }); setFile(null); onDone(); }
    catch (err) { toast.error(err.response?.data?.detail || "Upload failed"); } finally { setBusy(false); }
  };
  const inp = "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none";
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
      <label className={`w-full py-4 rounded-xl ${file ? "border border-cyan-500/40 text-cyan-300" : "bg-cyan-500 text-black"} font-bold flex items-center justify-center gap-2 ${reading ? "opacity-60" : ""}`}>
        <Fuel className="h-5 w-5" /> {reading ? "Reading receipt…" : file ? `Retake (${file.name.slice(0, 18)})` : "Snap fuel receipt"}
        <input data-testid="portal-fuel-input" type="file" accept="image/*,application/pdf" capture="environment" onChange={pick} className="hidden" disabled={reading} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input data-testid="portal-fuel-gallons" type="number" inputMode="decimal" placeholder="Gallons" value={f.gallons} onChange={(e) => setF({ ...f, gallons: e.target.value })} className={inp} />
        <input data-testid="portal-fuel-total" type="number" inputMode="decimal" placeholder="Total $" value={f.total_cost} onChange={(e) => setF({ ...f, total_cost: e.target.value })} className={inp} />
        <input placeholder="State (TX)" maxLength={2} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value.toUpperCase() })} className={inp} />
        <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={inp} />
        <input placeholder="Station (Pilot, Love's…)" value={f.station} onChange={(e) => setF({ ...f, station: e.target.value })} className={`${inp} col-span-2`} />
      </div>
      <button data-testid="portal-fuel-send" disabled={!file || busy || reading} onClick={submit} className="w-full py-4 rounded-xl bg-orange-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2">
        <CheckCircle2 className="h-5 w-5" /> {busy ? "Sending…" : "Send receipt to dispatch"}
      </button>
    </div>
  );
}

export default function DriverPortal() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("loads");
  const [fuel, setFuel] = useState([]);
  const [pay, setPay] = useState([]);

  const refresh = useCallback(async () => {
    try { const { data } = await axios.get(`${API}/portal/${token}`); setData(data); }
    catch (e) { setErr(e.response?.data?.detail || "Could not load"); }
  }, [token]);
  const loadFuel = useCallback(async () => { const { data } = await axios.get(`${API}/portal/${token}/fuel`); setFuel(data); }, [token]);
  const loadPay = useCallback(async () => { const { data } = await axios.get(`${API}/portal/${token}/settlements`); setPay(data); }, [token]);
  useEffect(() => { refresh(); loadFuel(); loadPay(); }, [refresh, loadFuel, loadPay]);

  if (err) return <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-6 text-center text-slate-400" data-testid="portal-error">{err}<br /><span className="text-xs">Ask dispatch for a new link.</span></div>;
  if (!data) return <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center text-slate-500 animate-pulse">Loading…</div>;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white max-w-lg mx-auto flex flex-col" data-testid="driver-portal">
      <Toaster theme="dark" richColors position="top-center" />
      <header className="p-4 flex items-center gap-3 border-b border-slate-800 sticky top-0 bg-[#0B0F17] z-10">
        <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center"><Truck className="h-5 w-5" /></div>
        <div className="flex-1">
          <div className="font-display font-black leading-none">{data.driver.name}</div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mt-1">{data.company} · Truck {data.driver.truck_number || "—"}</div>
        </div>
      </header>
      <div className="grid grid-cols-3 gap-2 p-4 pb-0">
        {[["loads", "My Loads", Package], ["fuel", "Fuel", Fuel], ["pay", "My Pay", Wallet]].map(([k, l, I]) => (
          <button key={k} data-testid={`portal-tab-${k}`} onClick={() => setTab(k)} className={`py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${tab === k ? "bg-orange-500 text-white" : "border border-slate-800 text-slate-400"}`}><I className="h-4 w-4" /> {l}</button>
        ))}
      </div>
      <main className="p-4 space-y-3 flex-1">
        {tab === "loads" && (<>
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Active ({data.active.length})</div>
            {data.active.length > 0 && <div className="text-xs text-slate-400" data-testid="portal-active-pay-total">Est. pay on active loads: <span className="font-mono font-bold text-emerald-400">{money(data.active_pay_total)}</span></div>}
          </div>
          {data.active.length === 0 && <div className="text-sm text-slate-500 text-center py-8 border border-dashed border-slate-800 rounded-2xl">No active loads assigned to you.</div>}
          {data.active.map((l) => <LoadCard key={l.id} token={token} l={l} onChanged={refresh} />)}
          {data.recent.length > 0 && <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 pt-4">Recent</div>}
          {data.recent.map((l) => <LoadCard key={l.id} token={token} l={l} onChanged={refresh} />)}
        </>)}
        {tab === "fuel" && (<>
          <FuelForm token={token} truck={data.driver.truck_number} onDone={loadFuel} />
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 pt-2">Your recent receipts</div>
          {fuel.map((f) => (
            <div key={f.id} className="rounded-xl border border-slate-800 p-3 text-sm flex justify-between"><span>{f.meta?.date} · {f.meta?.station || "Fuel"} {f.meta?.state}</span><span className="font-mono">{f.meta?.gallons && `${f.meta.gallons} gal · `}{money(f.meta?.total_cost)}</span></div>
          ))}
        </>)}
        {tab === "pay" && (<>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
            Your rate: <span className="text-white font-mono font-bold">{data.driver.pay_type === "percentage" ? `${data.driver.rate}% of load` : data.driver.pay_type === "flat" ? `${money(data.driver.rate)} flat` : `${money(data.driver.rate)} / mile`}</span>. Estimates on loads are before deductions.
          </div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 pt-2">Settlements</div>
          {pay.length === 0 && <div className="text-sm text-slate-500 text-center py-8 border border-dashed border-slate-800 rounded-2xl">No settlements yet.</div>}
          {pay.map((s) => (
            <div key={s.id} data-testid={`portal-settlement-${s.id}`} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-300">{s.period_start || "—"} → {s.period_end || "—"}</div>
                <div className="text-xs text-slate-500 mt-0.5">Gross {money(s.gross_pay)}{Number(s.reimbursements) ? ` · +${money(s.reimbursements)} reimb.` : ""}</div>
              </div>
              <div className="font-mono font-black text-emerald-400">{money(s.net_pay)}</div>
              <a data-testid={`portal-settlement-pdf-${s.id}`} href={`${API}/portal/${token}/settlements/${s.id}.pdf`} target="_blank" rel="noreferrer" className="p-2 rounded-xl border border-slate-700 text-slate-300"><FileDown className="h-4 w-4" /></a>
            </div>
          ))}
        </>)}
      </main>
    </div>
  );
}
