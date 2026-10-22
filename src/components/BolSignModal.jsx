import { useState } from "react";
import { api, fmtErr } from "@/lib/api";
import { useEscape } from "@/lib/hooks";
import { toast } from "sonner";
import { X, CheckCircle2, PenLine, Trash2 } from "lucide-react";
import { SignaturePad } from "./SignaturePad";

const ROLES = [["shipper", "Shipper"], ["driver", "Driver"], ["consignee", "Consignee"]];

export function BolSignModal({ bol, onClose, onSaved }) {
  const [role, setRole] = useState("driver");
  const [name, setName] = useState(bol.driver_name || "");
  const [img, setImg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEscape(true, onClose);

  const sigs = bol.signatures || {};
  const pick = (r) => { setRole(r); setImg(null); setName(r === "driver" ? bol.driver_name || "" : r === "shipper" ? bol.shipper_name || "" : bol.consignee_name || ""); };

  const save = async () => {
    if (!img) return toast.error("Draw a signature first");
    setBusy(true);
    try {
      const { data } = await api.post(`/bols/${bol.id}/sign`, { role, name, image_data: img });
      toast.success(`${role} signature saved`); onSaved(data); setImg(null);
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); } finally { setBusy(false); }
  };
  const remove = async (r) => {
    const { data } = await api.delete(`/bols/${bol.id}/sign/${r}`);
    toast.success("Signature removed"); onSaved(data);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div data-testid="bol-sign-modal" className="bg-[#0B0F17] border border-slate-800 rounded-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Digital signature</div>
            <h3 className="font-display font-bold text-2xl">Sign {bol.bol_number}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(([k, l]) => (
              <button key={k} data-testid={`sign-role-${k}`} onClick={() => pick(k)}
                className={`rounded-lg border p-3 text-left transition ${role === k ? "border-orange-500 bg-orange-500/10" : "border-slate-800 hover:border-slate-600"}`}>
                <div className="text-xs uppercase font-mono tracking-widest text-slate-400">{l}</div>
                {sigs[k] ? (
                  <div className="flex items-center gap-1 mt-1 text-emerald-400 text-sm"><CheckCircle2 className="h-4 w-4" /> Signed</div>
                ) : <div className="flex items-center gap-1 mt-1 text-slate-500 text-sm"><PenLine className="h-4 w-4" /> Pending</div>}
              </button>
            ))}
          </div>

          {sigs[role] && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-4">
              <img src={sigs[role].image_data} alt="signature" className="h-14 bg-white rounded px-2" />
              <div className="flex-1 text-sm">
                <div className="font-semibold">{sigs[role].name || "—"}</div>
                <div className="text-xs text-slate-400">{(sigs[role].signed_at || "").slice(0, 16).replace("T", " ")} UTC</div>
              </div>
              <button data-testid="sign-remove-button" onClick={() => remove(role)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800"><Trash2 className="h-4 w-4" /></button>
            </div>
          )}

          <label className="block">
            <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Signer name</span>
            <input data-testid="sign-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
              className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
          </label>
          <SignaturePad onChange={setImg} />
          <p className="text-xs text-slate-500">Signing stamps the name, date and time onto the PDF. Works with finger, stylus or mouse.</p>
        </div>
        <div className="p-5 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500">Close</button>
          <button data-testid="sign-save-button" disabled={busy || !img} onClick={save}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 font-semibold text-white">
            {busy ? "Saving…" : `Save ${role} signature`}
          </button>
        </div>
      </div>
    </div>
  );
}
