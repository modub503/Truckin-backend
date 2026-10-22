import { useEffect, useState } from "react";
import { api, fmtErr } from "@/lib/api";
import { useEscape } from "@/lib/hooks";
import { toast } from "sonner";
import { X, FileUp, FileDown, Trash2, Eye, FileText, Sparkles } from "lucide-react";

const TAGS = ["Rate Confirmation", "BOL", "Lumper Receipt", "Scale Ticket", "Other"];

export function LoadDocsPanel({ load, onClose, onChanged }) {
  const [files, setFiles] = useState([]);
  const [tag, setTag] = useState("Rate Confirmation");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  useEscape(true, () => (preview ? setPreview(null) : onClose()));

  const refresh = async () => { const { data } = await api.get(`/loads/${load.id}/documents`); setFiles(data); };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [load.id]);

  useEffect(() => {
    if (!preview) return;
    let url;
    api.get(`/files/${preview.id}/download`, { responseType: "blob" }).then((r) => {
      url = URL.createObjectURL(new Blob([r.data], { type: preview.content_type })); setPreview((p) => (p ? { ...p, url } : p));
    }).catch(() => toast.error("Preview failed"));
    return () => url && URL.revokeObjectURL(url);
    // eslint-disable-next-line
  }, [preview?.id]);

  const upload = async (e) => {
    const list = Array.from(e.target.files || []); if (!list.length) return;
    setBusy(true);
    try {
      for (const f of list) {
        const fd = new FormData(); fd.append("file", f); fd.append("tag", tag);
        await api.post(`/loads/${load.id}/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success("Attached to load"); refresh(); onChanged?.();
    } catch (err) { toast.error(fmtErr(err.response?.data?.detail)); } finally { setBusy(false); e.target.value = ""; }
  };
  const dl = async (f) => {
    const r = await api.get(`/files/${f.id}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(r.data); const a = document.createElement("a");
    a.href = url; a.download = f.original_filename; a.click(); URL.revokeObjectURL(url);
  };
  const del = async (f) => { if (!window.confirm("Remove this document from the load?")) return; await api.delete(`/files/${f.id}`); refresh(); onChanged?.(); };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose}>
      <div data-testid="load-docs-panel" className={`h-full bg-[#0B0F17] border-l border-slate-800 flex flex-col transition-all ${preview ? "w-full max-w-5xl" : "w-full max-w-xl"}`} onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Load documents</div>
            <h3 className="font-display font-bold text-2xl">{load.load_number}</h3>
            <div className="text-sm text-slate-400">{load.broker || "—"} · {load.origin} → {load.destination}</div>
          </div>
          <button data-testid="load-docs-close" onClick={onClose} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className={`flex flex-col ${preview ? "w-96 border-r border-slate-800" : "flex-1"}`}>
            <div className="p-4 border-b border-slate-800 flex gap-2">
              <select data-testid="load-docs-tag-select" value={tag} onChange={(e) => setTag(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none">
                {TAGS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <label className={`flex-1 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer text-sm ${busy ? "opacity-60 pointer-events-none" : ""}`}>
                <FileUp className="h-4 w-4" /> {busy ? "Uploading…" : "Attach file"}
                <input data-testid="load-docs-upload-input" type="file" accept="application/pdf,image/*" multiple onChange={upload} className="hidden" />
              </label>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-slate-800">
              {files.length === 0 && <div className="p-10 text-center text-slate-500 text-sm">No documents attached. Upload the broker's rate confirmation so it travels with this load.</div>}
              {files.map((f) => (
                <div key={f.id} data-testid={`load-doc-${f.id}`} className={`p-4 flex items-center gap-3 hover:bg-slate-900/40 ${preview?.id === f.id ? "bg-slate-900/60" : ""}`}>
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0"><FileText className="h-5 w-5 text-orange-500" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{f.original_filename}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">{f.meta?.tag || "Document"} · {(f.created_at || "").slice(0, 10)} · {(f.size / 1024).toFixed(0)} KB {f.meta?.ai_extracted && <Sparkles className="h-3 w-3 text-cyan-300" />}</div>
                  </div>
                  <button data-testid={`load-doc-preview-${f.id}`} onClick={() => setPreview({ id: f.id, content_type: f.content_type, name: f.original_filename })} title="Preview" className="p-2 rounded-lg border border-slate-800 hover:border-cyan-500/40 hover:text-cyan-300"><Eye className="h-4 w-4" /></button>
                  <button data-testid={`load-doc-download-${f.id}`} onClick={() => dl(f)} title="Download" className="p-2 rounded-lg border border-slate-800 hover:border-orange-500/40 hover:text-orange-400"><FileDown className="h-4 w-4" /></button>
                  <button onClick={() => del(f)} title="Remove" className="p-2 rounded-lg border border-slate-800 hover:border-red-500/40 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          {preview && (
            <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
              <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between text-sm">
                <span className="truncate font-mono text-slate-300">{preview.name}</span>
                <div className="flex items-center gap-1">
                  {preview.url && <a data-testid="load-doc-preview-open" href={preview.url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded text-xs border border-slate-700 hover:border-orange-500/50">Open in new tab</a>}
                  <button data-testid="load-doc-preview-close" onClick={() => setPreview(null)} className="p-1.5 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="flex-1 min-h-0" data-testid="load-doc-preview-frame">
                {!preview.url ? <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">Loading preview…</div>
                  : (preview.content_type || "").startsWith("image/")
                    ? <img src={preview.url} alt={preview.name} className="max-h-full max-w-full object-contain mx-auto" />
                    : <iframe title="preview" src={preview.url} className="w-full h-full bg-white" />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
