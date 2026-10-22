import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UploadCloud, CheckCircle2, Sheet } from "lucide-react";

const TARGETS = [
  { key: "loads", label: "Loads / Rate Confirmations",
    fields: "load_number, broker, origin, destination, pickup_date, delivery_date, commodity, equipment, weight, miles, rate, driver_name, truck_number, status, notes" },
  { key: "accounting", label: "Accounting (Revenue / Expenses / Transfers / Taxes)",
    fields: "date, category, subcategory, description, amount, reference  (category = revenue | expense | transfer_out | tax)" },
  { key: "settlements", label: "Driver Settlements",
    fields: "driver_id, period_start, period_end, truck_number, loaded_miles, empty_miles, gross_pay, fuel_deduction, escrow, insurance, other_deductions, net_pay" },
];

export default function Import() {
  const [target, setTarget] = useState("loads");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!file) return toast.error("Choose a CSV or Excel file first");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("target", target);
    try {
      const { data } = await api.post("/import/sheet", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data); toast.success(`Imported ${data.inserted} rows`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Import failed");
    } finally { setUploading(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <div className="text-xs uppercase font-mono tracking-widest text-slate-400">From Google Sheets</div>
        <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">Sheet Import</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Export any Google Sheet as <span className="text-orange-400 font-mono">CSV</span> or <span className="text-orange-400 font-mono">.xlsx</span> and drop it here. Rows are inserted newest→oldest.
        </p>
      </div>

      <div className="card-noise rounded-xl border border-slate-800 p-6 space-y-6">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400 mb-2">1. What are you importing?</div>
          <div className="grid grid-cols-1 gap-2">
            {TARGETS.map((t) => (
              <button data-testid={`import-target-${t.key}`} key={t.key} onClick={() => setTarget(t.key)}
                className={`text-left p-4 rounded-lg border transition ${target === t.key ? "border-orange-500 bg-orange-500/5" : "border-slate-800 hover:border-slate-600"}`}>
                <div className="flex items-center gap-2">
                  <Sheet className={`h-4 w-4 ${target === t.key ? "text-orange-500" : "text-slate-500"}`} />
                  <span className="font-semibold">{t.label}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">Columns: {t.fields}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400 mb-2">2. Upload file</div>
          <label data-testid="sheets-import-dropzone"
            className="block border-2 border-dashed border-slate-800 hover:border-orange-500/50 rounded-xl p-10 text-center cursor-pointer transition">
            <UploadCloud className="h-10 w-10 mx-auto text-slate-500" />
            <div className="mt-3 text-slate-300">{file ? file.name : "Click or drag a CSV / Excel file"}</div>
            <div className="text-xs text-slate-500 mt-1">Column names are auto-lowercased & underscored.</div>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0])} className="hidden" />
          </label>
        </div>

        <button data-testid="sheets-mapping-confirm-button" onClick={submit} disabled={!file || uploading}
          className="w-full px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold">
          {uploading ? "Importing..." : `Import into ${target}`}
        </button>

        {result && (
          <div data-testid="sheets-sync-status-badge" className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="text-sm">Imported <b>{result.inserted}</b> rows into <b>{result.target}</b>.</span>
          </div>
        )}
      </div>
    </div>
  );
}
