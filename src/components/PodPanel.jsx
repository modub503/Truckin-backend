import { useEffect, useState } from "react";
import { api, fmtErr } from "@/lib/api";
import { useEscape } from "@/lib/hooks";
import { toast } from "sonner";
import { X, Camera, Trash2, ImageIcon, FileText } from "lucide-react";

function PodThumb({ f, onDelete }) {
  const [src, setSrc] = useState(null);
  const isImg = (f.content_type || "").startsWith("image/");
  useEffect(() => {
    if (!isImg) return;
    let url;
    api.get(`/files/${f.id}/download`, { responseType: "blob" }).then((r) => { url = URL.createObjectURL(r.data); setSrc(url); }).catch(() => {});
    return () => url && URL.revokeObjectURL(url);
  }, [f.id, isImg]);
  const open = async () => {
    const r = await api.get(`/files/${f.id}/download`, { responseType: "blob" });
    window.open(URL.createObjectURL(r.data), "_blank");
  };
  return (
    <div className="group relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 aspect-square">
      {isImg ? (src ? <img src={src} alt={f.meta?.caption || f.original_filename} className="h-full w-full object-cover cursor-pointer" onClick={open} />
        : <div className="h-full flex items-center justify-center text-slate-600"><ImageIcon className="h-6 w-6 animate-pulse" /></div>)
        : <button onClick={open} className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-1 text-xs"><FileText className="h-6 w-6" />{f.original_filename.slice(0, 18)}</button>}
      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-[11px] truncate">{f.meta?.caption || (f.created_at || "").slice(0, 10)}</div>
      <button onClick={() => onDelete(f)} className="absolute top-1 right-1 p-1 rounded bg-black/60 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

export function PodPanel({ load, onClose, onChanged }) {
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  useEscape(true, onClose);

  const refresh = async () => { const { data } = await api.get(`/loads/${load.id}/pod`); setFiles(data); };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [load.id]);

  const upload = async (e) => {
    const list = Array.from(e.target.files || []); if (!list.length) return;
    setBusy(true);
    try {
      for (const f of list) {
        const fd = new FormData(); fd.append("file", f); fd.append("caption", caption);
        await api.post(`/loads/${load.id}/pod`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success(`${list.length} POD photo${list.length > 1 ? "s" : ""} attached`); setCaption(""); refresh(); onChanged?.();
    } catch (err) { toast.error(fmtErr(err.response?.data?.detail)); } finally { setBusy(false); e.target.value = ""; }
  };
  const del = async (f) => { if (!window.confirm("Remove this photo?")) return; await api.delete(`/files/${f.id}`); refresh(); onChanged?.(); };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose}>
      <div data-testid="pod-panel" className="w-full max-w-xl h-full bg-[#0B0F17] border-l border-slate-800 flex flex-col animate-in slide-in-from-right" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Proof of delivery</div>
            <h3 className="font-display font-bold text-2xl">{load.load_number}</h3>
            <div className="text-sm text-slate-400">{load.origin} → {load.destination}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 border-b border-slate-800 space-y-3">
          <input data-testid="pod-caption-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (e.g. Signed BOL at receiver dock)"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" />
          <div className="grid grid-cols-2 gap-2">
            <label className="px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer">
              <Camera className="h-4 w-4" /> {busy ? "Uploading…" : "Take photo"}
              <input data-testid="pod-camera-input" type="file" accept="image/*" capture="environment" onChange={upload} className="hidden" disabled={busy} />
            </label>
            <label className="px-4 py-3 rounded-lg border border-slate-700 hover:border-orange-500/50 font-semibold flex items-center justify-center gap-2 cursor-pointer">
              <ImageIcon className="h-4 w-4" /> Choose files
              <input data-testid="pod-upload-input" type="file" accept="image/*,application/pdf" multiple onChange={upload} className="hidden" disabled={busy} />
            </label>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {files.length === 0 && <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl">No POD photos yet. Snap the signed BOL, the freight at the dock, or the receiver's stamp.</div>}
          <div data-testid="pod-grid" className="grid grid-cols-3 gap-3">
            {files.map((f) => <PodThumb key={f.id} f={f} onDelete={del} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
