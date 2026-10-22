import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UploadCloud, FileDown, Trash2, FileArchive, Search } from "lucide-react";

const TAGS = ["Rate Confirmation", "BOL", "POD", "Insurance", "IFTA", "Permit", "Contract", "Other"];

export default function Documents() {
  const [files, setFiles] = useState([]);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");

  const load = async () => {
    const { data } = await api.get("/files", { params: { category: "document,pod" } });
    setFiles(data);
  };
  useEffect(() => { load(); }, []);

  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    fd.append("category", "document");
    fd.append("meta_json", JSON.stringify({ tag: tag || "Other" }));
    try {
      await api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Uploaded"); load();
    } catch { toast.error("Upload failed"); }
    e.target.value = "";
  };
  const del = async (r) => { if (!window.confirm("Delete document?")) return; await api.delete(`/files/${r.id}`); load(); };
  const dl = async (r) => {
    const resp = await api.get(`/files/${r.id}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(resp.data);
    const a = document.createElement("a");
    a.href = url; a.download = r.original_filename; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = files.filter(f => {
    if (q && !f.original_filename.toLowerCase().includes(q.toLowerCase())) return false;
    if (tag && f.meta?.tag !== tag) return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1600px]">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Vault</div>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">Documents</h1>
        </div>
        <label className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-2 cursor-pointer">
          <UploadCloud className="h-4 w-4" /> Upload document
          <input data-testid="doc-vault-upload-input" type="file" onChange={onFile} className="hidden" />
        </label>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 input-focus">
          <Search className="h-4 w-4 text-slate-500" />
          <input data-testid="doc-vault-search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents..." className="bg-transparent py-2 w-full outline-none text-sm" />
        </div>
        <select value={tag} onChange={(e) => setTag(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">All tags</option>
          {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div data-testid="doc-vault-list" className="card-noise rounded-xl border border-slate-800 divide-y divide-slate-800">
        {filtered.length === 0 && <div className="p-12 text-center text-slate-500">No documents yet.</div>}
        {filtered.map((f) => (
          <div key={f.id} className="p-4 flex items-center gap-4 hover:bg-slate-900/40">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <FileArchive className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{f.original_filename}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {(f.created_at || "").slice(0, 10)} · {(f.size / 1024).toFixed(0)} KB · {f.meta?.tag || "Other"}
                {f.meta?.load_number && <span className="ml-1 font-mono text-cyan-400">· Load {f.meta.load_number}</span>}
                {f.meta?.ai_extracted && <span className="ml-1 text-cyan-300">· AI-read</span>}
              </div>
            </div>
            <button data-testid={`doc-vault-download-${f.id}`} onClick={() => dl(f)} className="p-2 rounded-lg border border-slate-800 hover:border-orange-500/40 hover:text-orange-400">
              <FileDown className="h-4 w-4" />
            </button>
            <button onClick={() => del(f)} className="p-2 rounded-lg border border-slate-800 hover:border-red-500/40 hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
