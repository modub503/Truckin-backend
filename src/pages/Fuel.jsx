import { useCallback, useEffect, useRef, useState } from "react";
import { api, money, num, fmtErr } from "@/lib/api";
import { toast } from "sonner";
import { UploadCloud, Fuel as FuelIcon, Trash2, X, Sparkles } from "lucide-react";

export default function Fuel() {
  const [files, setFiles] = useState([]);
  const [truckFilter, setTruckFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [meta, setMeta] = useState({ truck_number: "", gallons: "", price_per_gallon: "", total_cost: "", state: "", station: "", date: "" });
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    const params = { category: "fuel_receipt" };
    if (truckFilter) params.truck_number = truckFilter;
    const { data } = await api.get("/files", { params });
    setFiles(data);
  }, [truckFilter]);
  useEffect(() => { load(); }, [load]);

  const [extracting, setExtracting] = useState(false);
  const [aiConf, setAiConf] = useState(null);
  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setModal(f); setAiConf(null); setExtracting(true);
    const fd = new FormData(); fd.append("file", f);
    try {
      const { data } = await api.post("/fuel/extract", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const fl = data.fields || {};
      setMeta({
        truck_number: fl.truck_number || "", gallons: fl.gallons ?? "", price_per_gallon: fl.price_per_gallon ?? "",
        total_cost: fl.total_cost ?? "", state: fl.state || "", station: fl.station || "", date: fl.date || "",
      });
      setAiConf(fl.confidence);
      toast.success("Receipt read — check the numbers and save");
    } catch (err) { toast.error(fmtErr(err.response?.data?.detail) || "Couldn't read receipt — fill in manually"); }
    finally { setExtracting(false); }
  };
  const submit = async () => {
    if (!modal) return;
    const fd = new FormData();
    fd.append("file", modal);
    fd.append("category", "fuel_receipt");
    fd.append("meta_json", JSON.stringify(meta));
    try {
      await api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      // also log an expense entry
      if (Number(meta.total_cost) > 0) {
        await api.post("/accounting", {
          date: meta.date || new Date().toISOString().slice(0, 10),
          category: "expense",
          subcategory: "fuel",
          description: `Fuel — Truck ${meta.truck_number || "?"} @ ${meta.station || "?"}`,
          amount: Number(meta.total_cost),
          reference: meta.state || "",
        });
      }
      toast.success("Receipt uploaded");
      setModal(null);
      setMeta({ truck_number: "", gallons: "", price_per_gallon: "", total_cost: "", state: "", station: "", date: "" });
      load();
    } catch { toast.error("Upload failed"); }
  };
  const del = async (r) => { if (!window.confirm("Delete receipt?")) return; await api.delete(`/files/${r.id}`); load(); };
  const viewFile = (r) => setPreview(r);

  const trucks = [...new Set(files.map((f) => f.meta?.truck_number).filter(Boolean))];
  const totals = files.reduce((acc, f) => {
    acc.gallons += Number(f.meta?.gallons || 0);
    acc.cost += Number(f.meta?.total_cost || 0);
    return acc;
  }, { gallons: 0, cost: 0 });

  return (
    <div className="p-6 lg:p-8 max-w-[1600px]">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">IFTA & Fuel</div>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">Fuel Receipts</h1>
        </div>
        <label data-testid="fuel-receipts-upload-dropzone"
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-2 cursor-pointer">
          <UploadCloud className="h-4 w-4" /> Upload receipt
          <input ref={inputRef} type="file" accept="image/*,application/pdf" onChange={onFile} className="hidden" />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div data-testid="fuel-total-summary-card" className="card-noise rounded-xl border border-slate-800 p-5">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Total Fuel Cost</div>
          <div className="mt-2 font-mono text-3xl font-bold">{money(totals.cost)}</div>
        </div>
        <div className="card-noise rounded-xl border border-slate-800 p-5">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Gallons Pumped</div>
          <div className="mt-2 font-mono text-3xl font-bold">{num(totals.gallons)}</div>
        </div>
        <div className="card-noise rounded-xl border border-slate-800 p-5">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Filter by Truck</div>
          <select data-testid="fuel-truck-group-select" value={truckFilter} onChange={(e) => setTruckFilter(e.target.value)}
            className="mt-2 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500">
            <option value="">All trucks</option>
            {trucks.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.length === 0 && <div className="col-span-full text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl">No receipts yet.</div>}
        {files.map((f) => (
          <div key={f.id} data-testid="fuel-receipt-card" className="card-noise rounded-xl border border-slate-800 overflow-hidden group">
            <div className="aspect-video bg-slate-900 relative overflow-hidden cursor-pointer" onClick={() => viewFile(f)}>
              {f.content_type?.startsWith("image/") ? (
                <FilePreview id={f.id} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  <FuelIcon className="h-12 w-12" />
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="font-mono font-bold text-sm">Truck {f.meta?.truck_number || "?"}</div>
                <button onClick={() => del(f)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="text-xs text-slate-400 mt-1 truncate">{f.meta?.station || "—"} · {f.meta?.state || ""}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">{f.meta?.gallons || 0} gal</span>
                <span className="font-mono font-semibold">{money(f.meta?.total_cost)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-lg">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-2xl">Fuel Receipt Details</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div className="col-span-2 text-xs text-slate-500 flex items-center gap-2">File: {modal.name}
                {extracting && <span data-testid="fuel-ai-reading" className="text-cyan-300 flex items-center gap-1"><Sparkles className="h-3 w-3 animate-pulse" /> AI reading receipt…</span>}
                {!extracting && aiConf != null && <span data-testid="fuel-ai-banner" className="text-cyan-300 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Auto-filled · {Math.round(aiConf * 100)}% confident</span>}
              </div>
              {[
                ["truck_number", "Truck #"], ["date", "Date", "date"],
                ["station", "Station"], ["state", "State"],
                ["gallons", "Gallons", "number"], ["price_per_gallon", "$/gal", "number"],
                ["total_cost", "Total ($)", "number"],
              ].map(([k, l, t]) => (
                <label key={k} className={`block ${k === "total_cost" ? "col-span-2" : ""}`}>
                  <span className="text-xs uppercase font-mono tracking-widest text-slate-400">{l}</span>
                  <input data-testid={`fuel-${k}-input`} type={t || "text"} value={meta[k]}
                    onChange={(e) => setMeta({ ...meta, [k]: e.target.value })}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
                </label>
              ))}
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-slate-700">Cancel</button>
              <button data-testid="fuel-upload-submit" disabled={extracting} onClick={submit} className="px-4 py-2 rounded-lg bg-orange-500 disabled:opacity-50 text-white font-semibold">Upload</button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <FilePreviewLarge file={preview} />
          </div>
        </div>
      )}
    </div>
  );
}

export function FilePreview({ id }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let objectUrl;
    (async () => {
      try {
        const r = await api.get(`/files/${id}/download`, { responseType: "blob" });
        objectUrl = URL.createObjectURL(r.data);
        setUrl(objectUrl);
      } catch (err) { console.debug("Fuel receipt preview unavailable:", err?.message || err); }
    })();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id]);
  if (!url) return <div className="absolute inset-0 bg-slate-900 animate-pulse" />;
  return <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />;
}

function FilePreviewLarge({ file }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let ou;
    (async () => {
      const r = await api.get(`/files/${file.id}/download`, { responseType: "blob" });
      ou = URL.createObjectURL(r.data); setUrl(ou);
    })();
    return () => { if (ou) URL.revokeObjectURL(ou); };
  }, [file.id]);
  if (!url) return <div className="text-white">Loading...</div>;
  if (file.content_type?.startsWith("image/")) return <img src={url} alt="" className="max-w-full max-h-[90vh] rounded-lg" />;
  return <iframe title="pdf" src={url} className="w-[80vw] h-[80vh] rounded-lg bg-white" />;
}
