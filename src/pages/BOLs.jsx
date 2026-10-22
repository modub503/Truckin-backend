import { useEffect, useState } from "react";
import { api, BACKEND_ORIGIN } from "@/lib/api";
import { useEscape } from "@/lib/hooks";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileDown, X, PenLine, CheckCircle2 } from "lucide-react";
import { BolSignModal } from "@/components/BolSignModal";

const EMPTY = {
  bol_number: "", date: "", shipper_name: "", shipper_address: "",
  consignee_name: "", consignee_address: "",
  carrier_name: "", carrier_mc: "", driver_name: "", truck_number: "",
  trailer_number: "", seal_number: "", commodity: "", weight: "",
  hazmat: false, special_instructions: "",
};

export default function BOLs() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [signing, setSigning] = useState(null);
  useEscape(open, () => setOpen(false));

  const load = async () => { const { data } = await api.get("/bols"); setItems(data); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEdit(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r) => { setEdit(r); const { signatures, ...rest } = r; setForm({ ...EMPTY, ...rest }); setOpen(true); };
  const onSigned = (updated) => { setSigning(updated); setItems((xs) => xs.map((x) => (x.id === updated.id ? updated : x))); };
  const sigCount = (b) => Object.keys(b.signatures || {}).length;
  const save = async () => {
    try {
      if (edit) await api.put(`/bols/${edit.id}`, form);
      else await api.post("/bols", form);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) { toast.error("Save failed"); }
  };
  const del = async (r) => { if (!window.confirm("Delete BOL?")) return; await api.delete(`/bols/${r.id}`); toast.success("Deleted"); load(); };
  const dl = (r) => window.open(`${BACKEND_ORIGIN}/api/bols/${r.id}/pdf`, "_blank");

  return (
    <div className="p-6 lg:p-8 max-w-[1600px]">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Documents</div>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">BOL Creator</h1>
          <p className="text-slate-400 mt-2 text-sm">Build Bills of Lading and export to PDF.</p>
        </div>
        <button data-testid="bol-add-button" onClick={openNew}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold flex items-center gap-2 text-white">
          <Plus className="h-4 w-4" /> New BOL
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No BOLs yet. Create your first one.
          </div>
        )}
        {items.map((b) => (
          <div key={b.id} className="card-noise rounded-xl border border-slate-800 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase font-mono tracking-widest text-slate-400">BOL</div>
                <div className="font-mono font-bold text-lg mt-1">{b.bol_number}</div>
                <div className="text-xs text-slate-500 mt-1">{b.date}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {b.hazmat && <span className="status-pill status-Cancelled">Hazmat</span>}
                {sigCount(b) > 0 && <span data-testid={`bol-signed-badge-${b.id}`} className="status-pill status-Delivered flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {sigCount(b)}/3 signed</span>}
              </div>
            </div>
            <div className="mt-4 text-sm space-y-1">
              <div><span className="text-slate-500">Shipper:</span> <span className="text-slate-200">{b.shipper_name || "—"}</span></div>
              <div><span className="text-slate-500">Consignee:</span> <span className="text-slate-200">{b.consignee_name || "—"}</span></div>
              <div><span className="text-slate-500">Truck:</span> <span className="text-slate-200 font-mono">{b.truck_number || "—"}</span></div>
              <div><span className="text-slate-500">Driver:</span> <span className="text-slate-200">{b.driver_name || "—"}</span></div>
            </div>
            <div className="mt-4 flex gap-2">
              <button data-testid={`bol-pdf-${b.id}`} onClick={() => dl(b)}
                className="flex-1 px-3 py-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 text-sm font-semibold flex items-center justify-center gap-2">
                <FileDown className="h-4 w-4" /> PDF
              </button>
              <button data-testid={`bol-sign-${b.id}`} onClick={() => setSigning(b)} title="Sign on screen"
                className="px-3 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 text-sm font-semibold flex items-center gap-1"><PenLine className="h-4 w-4" /> Sign</button>
              <button onClick={() => openEdit(b)} className="p-2 rounded-lg border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-white"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => del(b)} className="p-2 rounded-lg border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {signing && <BolSignModal bol={signing} onClose={() => setSigning(null)} onSaved={onSigned} />}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#0B0F17]">
              <h3 className="font-display font-bold text-2xl">{edit ? "Edit BOL" : "New Bill of Lading"}</h3>
              <button onClick={() => setOpen(false)} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ["bol_number", "BOL #"], ["date", "Date", "date"],
                ["shipper_name", "Shipper Name"], ["shipper_address", "Shipper Address"],
                ["consignee_name", "Consignee Name"], ["consignee_address", "Consignee Address"],
                ["carrier_name", "Carrier"], ["carrier_mc", "MC / DOT #"],
                ["driver_name", "Driver"], ["truck_number", "Truck #"],
                ["trailer_number", "Trailer #"], ["seal_number", "Seal #"],
                ["commodity", "Commodity"], ["weight", "Weight"],
              ].map(([k, l, t]) => (
                <label key={k} className="block">
                  <span className="text-xs uppercase font-mono tracking-widest text-slate-400">{l}</span>
                  <input data-testid={`bol-${k}-input`} type={t || "text"} value={form[k] ?? ""}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
                </label>
              ))}
              <label className="md:col-span-2 flex items-center gap-2 mt-2">
                <input type="checkbox" checked={!!form.hazmat} onChange={(e) => setForm({ ...form, hazmat: e.target.checked })} />
                <span className="text-sm">Hazardous materials</span>
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Special Instructions</span>
                <textarea rows={3} value={form.special_instructions || ""} onChange={(e) => setForm({ ...form, special_instructions: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
              </label>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2 sticky bottom-0 bg-[#0B0F17]">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500">Cancel</button>
              <button data-testid="bol-save-button" onClick={save} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
