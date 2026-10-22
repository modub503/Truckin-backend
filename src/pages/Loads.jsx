import { Fragment, useEffect, useState, useMemo } from "react";
import { api, money, num, fmtErr, BACKEND_ORIGIN } from "@/lib/api";
import { useEscape } from "@/lib/hooks";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileDown, Search, X, Camera, Receipt, Sparkles, FileUp, Paperclip, ChevronRight, ChevronDown, ArrowUp, ArrowDown, Route, CornerDownRight } from "lucide-react";
import { PodPanel } from "@/components/PodPanel";
import { InvoiceModal } from "@/components/InvoiceModal";
import { LoadDocsPanel } from "@/components/LoadDocsPanel";

const EMPTY = {
  load_number: "", broker: "", broker_contact: "", carrier_name: "", carrier_mc: "",
  origin: "", destination: "", pickup_date: "", delivery_date: "",
  commodity: "", equipment: "", weight: 0, miles: 0, rate: 0,
  driver_name: "", truck_number: "", status: "Booked", notes: "",
};

const STATUSES = ["Booked", "Dispatched", "In-Transit", "Delivered", "Invoiced", "Paid", "Cancelled"];
const EQUIP = [
  "Dry Van",
  "Reefer",
  "Flatbed",
  "Step Deck",
  "Power Only",
  "Box Truck",
  "Removable Gooseneck",
  "HD Wrecker",
  "MD Wrecker",
  "Lowboy",
];

export default function Loads() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [pod, setPod] = useState(null);
  const [inv, setInv] = useState(null);
  const [docs, setDocs] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [aiMeta, setAiMeta] = useState(null);
  const [legs, setLegs] = useState({});
  const [totalDeadhead, setTotalDeadhead] = useState(null);
  useEscape(open, () => setOpen(false));

  const driverOptions = useMemo(() => {
    const seen = new Map();
    items.forEach((it) => {
      const name = (it.driver_name || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, name);
    });
    return Array.from(seen.values()).sort();
  }, [items]);

  const visibleItems = useMemo(() => {
    if (!driverFilter) return items;
    const key = driverFilter.toLowerCase();
    return items.filter((it) => (it.driver_name || "").trim().toLowerCase() === key);
  }, [items, driverFilter]);

  const load = async () => {
    const params = {};
    if (q) params.q = q;
    if (statusFilter) params.status = statusFilter;
    const { data } = await api.get("/loads", { params });
    setItems(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, statusFilter]);

  // Fetch deadhead legs between consecutive same-driver loads so dispatchers
  // can see real route cost as they reorder. Deadhead only makes sense within
  // a single driver's route, so we only fetch when the driver filter is set.
  useEffect(() => {
    let cancelled = false;
    if (!driverFilter || visibleItems.length < 2) { setLegs({}); setTotalDeadhead(null); return; }
    (async () => {
      try {
        const { data } = await api.get("/loads/route-summary", { params: { driver_name: driverFilter } });
        if (cancelled) return;
        const map = {};
        (data.legs || []).forEach((lg) => { map[lg.from_load_id] = lg; });
        setLegs(map);
        setTotalDeadhead(data.total_deadhead ?? null);
      } catch { if (!cancelled) { setLegs({}); setTotalDeadhead(null); } }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [visibleItems.map((x) => x.id).join("|"), driverFilter]);

  const openNew = () => { setEdit(null); setForm(EMPTY); setAiMeta(null); setOpen(true); };
  const openEdit = (row) => { setEdit(row); setForm({ ...EMPTY, ...row }); setAiMeta(null); setOpen(true); };

  const extractRatecon = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setExtracting(true);
    const fd = new FormData(); fd.append("file", f);
    try {
      const { data } = await api.post("/loads/extract-ratecon", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const fl = data.fields || {};
      const next = { ...EMPTY };
      Object.keys(EMPTY).forEach((k) => { if (fl[k] !== null && fl[k] !== undefined) next[k] = fl[k]; });
      if (!EQUIP.includes(next.equipment) && next.equipment) next.notes = `Equipment: ${next.equipment}\n${next.notes || ""}`;
      if (!EQUIP.includes(next.equipment)) next.equipment = "";
      setEdit(null); setForm(next); setAiMeta({ file_id: data.file_id, confidence: fl.confidence, model: fl._model, filename: f.name }); setOpen(true);
      toast.success("Rate con read — review the fields and save");
    } catch (err) { toast.error(fmtErr(err.response?.data?.detail)); } finally { setExtracting(false); }
  };

  const save = async () => {
    try {
      let saved;
      if (edit) saved = (await api.put(`/loads/${edit.id}`, form)).data;
      else saved = (await api.post("/loads", form)).data;
      if (aiMeta?.file_id && saved?.id) {
        const fd = new FormData(); fd.append("load_id", saved.id);
        await api.post(`/files/${aiMeta.file_id}/attach`, fd).catch(() => {});
      }
      toast.success(edit ? "Load updated" : "Load created");
      setOpen(false); setAiMeta(null); load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };

  const del = async (row) => {
    if (!window.confirm(`Delete load ${row.load_number}?`)) return;
    await api.delete(`/loads/${row.id}`); toast.success("Deleted"); load();
  };

  const downloadRatecon = (row) => {
    const url = `${BACKEND_ORIGIN}/api/loads/${row.id}/ratecon.pdf`;
    window.open(url, "_blank");
  };

  const downloadRoutePdf = () => {
    const qs = driverFilter ? `?driver_name=${encodeURIComponent(driverFilter)}` : "";
    window.open(`${BACKEND_ORIGIN}/api/loads/route.pdf${qs}`, "_blank");
  };

  // Move a load up or down in the route order. Optimistically updates the
  // visible list, then persists the new order so dispatchers can line up loads
  // along the actual drive sequence (deadhead → pickup → delivery) even when
  // rate cons were uploaded out of order.
  const move = async (id, dir) => {
    const idx = items.findIndex((x) => x.id === id);
    const swapWith = idx + dir;
    if (idx < 0 || swapWith < 0 || swapWith >= items.length) return;
    const next = items.slice();
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    const prev = items;
    setItems(next);
    try {
      await api.post("/loads/reorder", { ids: next.map((x) => x.id) });
    } catch (e) {
      setItems(prev);
      toast.error(fmtErr(e.response?.data?.detail) || "Could not save route order");
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px]">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Freight</div>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">Loads & Rate Cons</h1>
          <p className="text-slate-400 mt-2 text-sm">Newest first by default — reorder with the up/down arrows to match your driver's route.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button data-testid="loads-route-pdf-button" onClick={downloadRoutePdf}
            disabled={visibleItems.length === 0}
            className="px-4 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 font-semibold flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <Route className="h-4 w-4" /> Route PDF
          </button>
          <label data-testid="loads-upload-ratecon-button"
            className={`px-4 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 font-semibold flex items-center gap-2 cursor-pointer transition ${extracting ? "opacity-60 pointer-events-none" : ""}`}>
            {extracting ? <Sparkles className="h-4 w-4 animate-pulse" /> : <FileUp className="h-4 w-4" />}
            {extracting ? "Reading rate con…" : "Upload Rate Con"}
            <input data-testid="loads-ratecon-file-input" type="file" accept="application/pdf,image/*" onChange={extractRatecon} className="hidden" />
          </label>
          <button data-testid="loads-add-button" onClick={openNew}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold text-white flex items-center gap-2 transition">
            <Plus className="h-4 w-4" /> New Load
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 input-focus">
          <Search className="h-4 w-4 text-slate-500" />
          <input data-testid="loads-search-input" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search load #, broker, driver, city..." className="bg-transparent py-2 w-full outline-none text-sm" />
        </div>
        <select data-testid="loads-filter-driver" value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">All drivers</option>
          {driverOptions.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select data-testid="loads-filter-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {totalDeadhead != null && visibleItems.length >= 2 && (
        <div data-testid="loads-total-deadhead" className="mb-3 text-xs font-mono tracking-widest text-slate-400">
          TOTAL DEADHEAD: <span className="text-emerald-300 font-bold">{num(totalDeadhead)} mi</span>
          {driverFilter && <span className="text-slate-500"> · {driverFilter}</span>}
        </div>
      )}

      <div data-testid="loads-table" className="card-noise rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase font-mono tracking-widest text-slate-400">
              <tr>
                <th className="text-left px-4 py-3">Load #</th>
                <th className="text-left px-4 py-3">Broker</th>
                <th className="text-left px-4 py-3">Route</th>
                <th className="text-left px-4 py-3">Driver / Truck</th>
                <th className="text-right px-4 py-3">Rate</th>
                <th className="text-right px-4 py-3">Miles</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.length === 0 && (
                <tr><td colSpan="8" className="text-center py-12 text-slate-500">No loads yet.</td></tr>
              )}
              {visibleItems.length === 0 && items.length > 0 && (
                <tr><td colSpan="8" className="text-center py-12 text-slate-500">No loads for this driver filter.</td></tr>
              )}
              {visibleItems.map((r) => (
                <Fragment key={r.id}>
                <tr data-testid={`load-row-${r.id}`} onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  className={`cursor-pointer transition ${expanded === r.id ? "bg-slate-900/60" : "hover:bg-slate-900/40"}`}>
                  <td className="px-4 py-3 font-mono font-semibold flex items-center gap-2">
                    {expanded === r.id ? <ChevronDown className="h-3.5 w-3.5 text-orange-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-600" />}{r.load_number}
                  </td>
                  <td className="px-4 py-3">{r.broker || "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{r.origin || "—"} → {r.destination || "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{r.driver_name || "—"} <span className="text-slate-500">/ {r.truck_number || "—"}</span></td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{money(r.rate)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">{num(r.miles)}</td>
                  <td className="px-4 py-3"><span className={`status-pill status-${r.status || "Booked"}`}>{r.status || "Booked"}</span></td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      <div className="flex flex-col mr-1 border border-slate-800 rounded overflow-hidden">
                        <button data-testid={`load-move-up-${r.id}`} onClick={() => move(r.id, -1)}
                          disabled={visibleItems.indexOf(r) === 0}
                          title="Move up in route"
                          className="px-1 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed">
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button data-testid={`load-move-down-${r.id}`} onClick={() => move(r.id, 1)}
                          disabled={visibleItems.indexOf(r) === visibleItems.length - 1}
                          title="Move down in route"
                          className="px-1 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed border-t border-slate-800">
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                      <button data-testid={`load-docs-${r.id}`} onClick={() => setDocs(r)} title="Rate con & documents"
                        className={`p-1.5 rounded hover:bg-slate-800 relative ${r.doc_count > 0 ? "text-orange-400" : "text-slate-400 hover:text-orange-400"}`}>
                        <Paperclip className="h-4 w-4" />
                        {r.doc_count > 0 && <span className="absolute -top-1 -right-1 text-[9px] font-mono bg-orange-500 text-black rounded-full px-1 leading-3">{r.doc_count}</span>}
                      </button>
                      <button data-testid={`load-pod-${r.id}`} onClick={() => setPod(r)} title="POD photos"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 relative">
                        <Camera className="h-4 w-4" />
                        {r.pod_count > 0 && <span className="absolute -top-1 -right-1 text-[9px] font-mono bg-cyan-500 text-black rounded-full px-1 leading-3">{r.pod_count}</span>}
                      </button>
                      <button data-testid={`load-invoice-${r.id}`} onClick={() => setInv(r)} title="Invoice broker"
                        className={`p-1.5 rounded hover:bg-slate-800 ${r.invoice_id ? "text-emerald-400" : "text-slate-400 hover:text-emerald-400"}`}><Receipt className="h-4 w-4" /></button>
                      <button data-testid={`load-pdf-${r.id}`} onClick={() => downloadRatecon(r)} title="Rate Con PDF"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-orange-400"><FileDown className="h-4 w-4" /></button>
                      <button onClick={() => openEdit(r)} title="Edit"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => del(r)} title="Delete"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr data-testid={`load-detail-${r.id}`} className="bg-slate-950/60">
                    <td colSpan="8" className="px-6 py-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                        {[["Load #", r.load_number], ["Status", r.status], ["Broker", r.broker], ["Broker contact", r.broker_contact],
                          ["Carrier", r.carrier_name], ["MC / DOT", r.carrier_mc],
                          ["Origin", r.origin], ["Pickup", r.pickup_date], ["Destination", r.destination], ["Delivery", r.delivery_date],
                          ["Commodity", r.commodity], ["Equipment", r.equipment],
                          ["Weight", r.weight ? `${num(r.weight)} lbs` : null], ["Miles", r.miles ? num(r.miles) : null],
                          ["Rate", money(r.rate)], ["Rate / mile", r.miles > 0 ? money(r.rate / r.miles) : null],
                          ["Driver", r.driver_name], ["Truck #", r.truck_number],
                          ["POD photos", r.pod_count || 0], ["Documents", r.doc_count || 0],
                          ["Created", (r.created_at || "").slice(0, 10)], ["Updated", (r.updated_at || "").slice(0, 16).replace("T", " ")],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">{k}</div>
                            <div className="text-slate-200 mt-0.5 break-words">{v === null || v === undefined || v === "" ? "—" : v}</div>
                          </div>
                        ))}
                      </div>
                      {r.notes && (
                        <div className="mt-4">
                          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Notes</div>
                          <div className="mt-1 text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/60 border border-slate-800 rounded-lg p-3">{r.notes}</div>
                        </div>
                      )}
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <button data-testid={`load-detail-docs-${r.id}`} onClick={() => setDocs(r)} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-orange-500/50 text-xs font-semibold flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> Documents</button>
                        <button onClick={() => setPod(r)} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-cyan-500/50 text-xs font-semibold flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> POD photos</button>
                        <button onClick={() => setInv(r)} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-emerald-500/50 text-xs font-semibold flex items-center gap-1"><Receipt className="h-3.5 w-3.5" /> Invoice</button>
                        <button onClick={() => openEdit(r)} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-xs font-semibold flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                      </div>
                    </td>
                  </tr>
                )}
                {legs[r.id] && (
                  <tr data-testid={`load-deadhead-${r.id}`} className="bg-orange-500/5">
                    <td colSpan="8" className="px-4 py-2">
                      <div className="flex items-center gap-2 text-xs">
                        <CornerDownRight className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                        <span className="font-mono uppercase tracking-widest text-slate-400">Deadhead to next pickup</span>
                        {legs[r.id].deadhead_miles != null ? (
                          <span className="font-mono text-orange-300 font-bold">{num(legs[r.id].deadhead_miles)} mi</span>
                        ) : (
                          <span className="italic text-slate-500">unable to geocode</span>
                        )}
                        <span className="text-slate-500 truncate">· {legs[r.id].from_place || "—"} → {legs[r.id].to_place || "—"}</span>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pod && <PodPanel load={pod} onClose={() => setPod(null)} onChanged={load} />}
      {docs && <LoadDocsPanel load={docs} onClose={() => setDocs(null)} onChanged={load} />}
      {inv && <InvoiceModal load={inv} onClose={() => setInv(null)} onChanged={load} />}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div data-testid="load-modal" className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#0B0F17]">
              <h3 className="font-display font-bold text-2xl">{edit ? "Edit Load" : aiMeta ? "Review Extracted Load" : "New Load"}</h3>
              <button data-testid="load-modal-close" onClick={() => setOpen(false)} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            {aiMeta && (
              <div data-testid="ai-extract-banner" className="mx-5 mt-4 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 flex items-center gap-3 text-sm">
                <Sparkles className="h-4 w-4 text-cyan-300 shrink-0" />
                <div className="flex-1">Auto-filled from <span className="font-mono">{aiMeta.filename}</span>. Double-check rate, dates and load # before saving — the PDF is attached to this load.</div>
                {aiMeta.confidence != null && <span className={`font-mono text-xs px-2 py-0.5 rounded ${aiMeta.confidence >= 0.8 ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{Math.round(aiMeta.confidence * 100)}% confident</span>}
              </div>
            )}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ["load_number", "Load #"], ["broker", "Broker"], ["broker_contact", "Broker Contact"],
                ["carrier_name", "Carrier"], ["carrier_mc", "MC / DOT #"],
                ["origin", "Origin"], ["destination", "Destination"],
                ["pickup_date", "Pickup Date", "date"], ["delivery_date", "Delivery Date", "date"],
                ["commodity", "Commodity"],
                ["weight", "Weight (lbs)", "number"], ["miles", "Miles", "number"],
                ["rate", "Rate ($)", "number"],
                ["driver_name", "Driver"], ["truck_number", "Truck #"],
              ].map(([k, l, t]) => (
                <label key={k} className="block">
                  <span className="text-xs uppercase font-mono tracking-widest text-slate-400">{l}</span>
                  <input data-testid={`load-${k}-input`} type={t || "text"} value={form[k] ?? ""}
                    onChange={(e) => setForm({ ...form, [k]: t === "number" ? Number(e.target.value) : e.target.value })}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
                </label>
              ))}
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Equipment</span>
                <select data-testid="load-equipment-select" value={form.equipment || ""} onChange={(e) => setForm({ ...form, equipment: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500">
                  <option value="">—</option>
                  {EQUIP.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Status</span>
                <select value={form.status || "Booked"} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Notes</span>
                <textarea rows={3} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
              </label>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2 sticky bottom-0 bg-[#0B0F17]">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500">Cancel</button>
              <button data-testid="load-save-button" onClick={save} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
