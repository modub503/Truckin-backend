import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UploadCloud, X, Trash2 } from "lucide-react";
import { FilePreview } from "./Fuel";

const TAGS = ["Flatbed", "Reefer", "Dry Van", "Step Deck", "Loaded", "Empty", "Damage"];

export default function Gallery() {
  const [files, setFiles] = useState([]);
  const [truck, setTruck] = useState("");
  const [modal, setModal] = useState(null);
  const [meta, setMeta] = useState({ truck_number: "", tag: "Loaded", notes: "" });
  const [preview, setPreview] = useState(null);

  const load = async () => {
    const params = { category: "truck_photo" };
    if (truck) params.truck_number = truck;
    const { data } = await api.get("/files", { params });
    setFiles(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [truck]);

  const submit = async () => {
    if (!modal) return;
    const fd = new FormData();
    fd.append("file", modal);
    fd.append("category", "truck_photo");
    fd.append("meta_json", JSON.stringify(meta));
    try {
      await api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Photo uploaded"); setModal(null); load();
    } catch { toast.error("Upload failed"); }
  };
  const del = async (r) => { if (!window.confirm("Delete photo?")) return; await api.delete(`/files/${r.id}`); load(); };
  const trucks = [...new Set(files.map(f => f.meta?.truck_number).filter(Boolean))];

  return (
    <div className="p-6 lg:p-8 max-w-[1600px]">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Inspection</div>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">Truck & Equipment Photos</h1>
        </div>
        <label data-testid="gallery-upload-button"
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-2 cursor-pointer">
          <UploadCloud className="h-4 w-4" /> Add photo
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setModal(e.target.files[0])} className="hidden" />
        </label>
      </div>

      <div className="mb-4 flex gap-2">
        <select data-testid="gallery-truck-filter" value={truck} onChange={(e) => setTruck(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">All trucks</option>
          {trucks.map((t) => <option key={t} value={t}>Truck {t}</option>)}
        </select>
      </div>

      <div data-testid="gallery-photo-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {files.length === 0 && <div className="col-span-full text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl">No photos yet.</div>}
        {files.map((f) => (
          <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 group cursor-pointer" onClick={() => setPreview(f)}>
            <FilePreview id={f.id} />
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-semibold text-white">{f.meta?.truck_number || "—"}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-300">{f.meta?.tag || ""}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); del(f); }} className="p-1 rounded bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-2xl">Photo Details</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Truck #</span>
                <input value={meta.truck_number} onChange={(e) => setMeta({ ...meta, truck_number: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
              </label>
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Tag</span>
                <select value={meta.tag} onChange={(e) => setMeta({ ...meta, tag: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500">
                  {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Notes</span>
                <textarea rows={2} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
              </label>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-slate-700">Cancel</button>
              <button data-testid="gallery-upload-submit" onClick={submit} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold">Upload</button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div data-testid="gallery-photo-modal" className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <img alt="" className="max-w-full max-h-[90vh] rounded-lg" src="" ref={async (el) => {
            if (!el || el.src) return;
            const r = await api.get(`/files/${preview.id}/download`, { responseType: "blob" });
            el.src = URL.createObjectURL(r.data);
          }} />
        </div>
      )}
    </div>
  );
}
