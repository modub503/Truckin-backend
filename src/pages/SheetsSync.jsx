import { useEffect, useState } from "react";
import { api, fmtErr } from "@/lib/api";
import { toast } from "sonner";
import { RefreshCw, Upload, Link2, KeyRound, CheckCircle2, AlertTriangle, Plug, Trash2 } from "lucide-react";

const TARGETS = [["loads", "Rate Cons / Loads"], ["accounting", "Accounting"], ["settlements", "Driver Settlements"]];
const inputCls = "mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm";

function Result({ r }) {
  if (!r) return null;
  const block = (title, obj) => obj && (
    <div className="mt-2">
      <div className="text-xs uppercase font-mono tracking-widest text-slate-400">{title}</div>
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="text-sm flex gap-2 items-center">
          {v.error ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
          <span className="font-semibold w-28">{k}</span>
          <span className="text-slate-400">{v.error ? v.error : v.pushed !== undefined ? `${v.pushed} rows written` : `${v.rows} rows · ${v.inserted} new · ${v.updated} updated`}</span>
        </div>
      ))}
    </div>
  );
  return <div data-testid="sync-result">{block("Pulled from sheet", r.pulled)}{block("Pushed to sheet", r.pushed)}{typeof r.skipped === "string" && <div className="text-sm text-slate-400 mt-2">{r.skipped}</div>}</div>;
}

export default function SheetsSync() {
  const [s, setS] = useState(null);
  const [saJson, setSaJson] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [tabs, setTabs] = useState({});
  const [csv, setCsv] = useState({});
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);
  const [foundTabs, setFoundTabs] = useState(null);

  const load = async () => {
    const { data } = await api.get("/sheets/settings");
    setS(data); setTabs(data.tabs || {}); setCsv(data.csv_urls || {}); setSheetUrl(data.spreadsheet_id || ""); setResult(data.last_result || null);
  };
  useEffect(() => { load(); }, []);

  const save = async (extra = {}) => {
    setBusy("save");
    try {
      const body = { spreadsheet_id: sheetUrl, tabs, csv_urls: csv, ...extra };
      if (saJson.trim()) body.service_account_json = saJson.trim();
      const { data } = await api.put("/sheets/settings", body);
      setS(data); setSaJson(""); toast.success("Sync settings saved");
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); } finally { setBusy(""); }
  };
  const run = async (kind) => {
    setBusy(kind);
    try {
      const { data } = await api.post(`/sheets/${kind}`);
      if (kind === "test") { setFoundTabs(data.tabs); toast.success(`Connected · ${data.tabs.length} tabs found`); }
      else { setResult(kind === "push" ? { pushed: data } : data); toast.success(kind === "push" ? "Pushed to Google Sheet" : "Sync complete"); load(); }
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); } finally { setBusy(""); }
  };
  const toggle = async (k) => { const { data } = await api.put("/sheets/settings", { [k]: !s[k] }); setS(data); };
  const clearSA = async () => { const { data } = await api.put("/sheets/settings", { clear_service_account: true }); setS(data); toast.success("Service account removed"); };

  if (!s) return <div className="p-8 text-slate-500 animate-pulse">Loading…</div>;
  const connected = s.has_service_account && s.spreadsheet_id;

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Integration</div>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">Live Sheets Sync</h1>
          <p className="text-slate-400 mt-2 text-sm">Keep your Google Sheet and ApexTMS in lockstep — auto every 15 minutes, or on demand.</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="sheets-sync-now-button" disabled={!!busy} onClick={() => run("sync")}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 font-semibold text-white flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${busy === "sync" ? "animate-spin" : ""}`} /> Sync now
          </button>
          <button data-testid="sheets-push-button" disabled={!!busy || !connected} onClick={() => run("push")}
            className="px-4 py-2 rounded-lg border border-slate-700 hover:border-orange-500/50 disabled:opacity-40 font-semibold flex items-center gap-2">
            <Upload className="h-4 w-4" /> Push TMS → Sheet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card-noise rounded-xl border border-slate-800 p-4">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Status</div>
          <div className={`font-display font-black text-2xl mt-1 flex items-center gap-2 ${connected ? "text-emerald-400" : "text-slate-300"}`} data-testid="sheets-status">
            <Plug className="h-5 w-5" /> {connected ? "Connected" : Object.values(csv).some(Boolean) ? "CSV links" : "Not connected"}
          </div>
          {s.service_account_email && <div className="text-xs text-slate-500 mt-1 font-mono break-all">{s.service_account_email}</div>}
        </div>
        <div className="card-noise rounded-xl border border-slate-800 p-4">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Last sync</div>
          <div className="font-display font-black text-2xl mt-1" data-testid="sheets-last-sync">{s.last_sync ? s.last_sync.slice(0, 16).replace("T", " ") : "Never"}</div>
          <div className="text-xs text-slate-500 mt-1">UTC</div>
        </div>
        <div className="card-noise rounded-xl border border-slate-800 p-4 space-y-2">
          {[["auto_sync", "Auto-sync every 15 min"], ["two_way", "Two-way (push TMS edits to sheet)"]].map(([k, l]) => (
            <label key={k} className="flex items-center justify-between text-sm cursor-pointer">
              <span>{l}</span>
              <button data-testid={`sheets-toggle-${k}`} onClick={() => toggle(k)} className={`h-6 w-11 rounded-full transition relative ${s[k] ? "bg-orange-500" : "bg-slate-700"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${s[k] ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-noise rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-1"><KeyRound className="h-4 w-4 text-orange-400" /><h2 className="font-display font-bold text-lg">Option A · Service account (two-way)</h2></div>
          <ol className="text-xs text-slate-400 list-decimal ml-4 space-y-0.5 mb-4">
            <li>Google Cloud Console → APIs &amp; Services → enable <b>Google Sheets API</b> + <b>Drive API</b></li>
            <li>Credentials → Create → <b>Service account</b> → Keys → Add key → JSON</li>
            <li>Share your Google Sheet with the service-account email as <b>Editor</b></li>
            <li>Paste the JSON below + your sheet link</li>
          </ol>
          <label className="block">
            <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Service-account JSON key {s.has_service_account && <span className="text-emerald-400">· on file</span>}</span>
            <textarea data-testid="sheets-sa-json-input" rows={4} value={saJson} onChange={(e) => setSaJson(e.target.value)} placeholder={s.has_service_account ? "Paste a new key to replace" : '{ "type": "service_account", ... }'} className={`${inputCls} font-mono text-xs`} />
          </label>
          <label className="block mt-3">
            <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Google Sheet URL or ID</span>
            <input data-testid="sheets-url-input" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" className={inputCls} />
          </label>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {TARGETS.map(([k, l]) => (
              <label key={k} className="block">
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">{l} tab</span>
                <input data-testid={`sheets-tab-${k}-input`} value={tabs[k] || ""} onChange={(e) => setTabs({ ...tabs, [k]: e.target.value })} className={inputCls} />
              </label>
            ))}
          </div>
          {foundTabs && <div className="mt-2 text-xs text-slate-400">Tabs in sheet: {foundTabs.map((t) => <span key={t.title} className="inline-block mr-1 px-1.5 py-0.5 rounded bg-slate-800 font-mono">{t.title}</span>)}</div>}
          <div className="flex gap-2 mt-4 flex-wrap">
            <button data-testid="sheets-save-button" disabled={!!busy} onClick={() => save()} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm disabled:opacity-40">Save</button>
            <button data-testid="sheets-test-button" disabled={!!busy || !connected} onClick={() => run("test")} className="px-4 py-2 rounded-lg border border-slate-700 hover:border-orange-500/50 font-semibold text-sm disabled:opacity-40">Test connection</button>
            {s.has_service_account && <button onClick={clearSA} className="px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 text-sm flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Remove key</button>}
          </div>
        </div>

        <div className="card-noise rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-1"><Link2 className="h-4 w-4 text-cyan-400" /><h2 className="font-display font-bold text-lg">Option B · Published CSV links (pull only)</h2></div>
          <p className="text-xs text-slate-400 mb-4">In Google Sheets: File → Share → <b>Publish to web</b> → pick the tab → <b>CSV</b> → copy link. Paste one per tab. No Google Cloud setup, read-only.</p>
          {TARGETS.map(([k, l]) => (
            <label key={k} className="block mb-3">
              <span className="text-xs uppercase font-mono tracking-widest text-slate-400">{l}</span>
              <input data-testid={`sheets-csv-${k}-input`} value={csv[k] || ""} onChange={(e) => setCsv({ ...csv, [k]: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?output=csv" className={inputCls} />
            </label>
          ))}
          <button data-testid="sheets-save-csv-button" disabled={!!busy} onClick={() => save()} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm disabled:opacity-40">Save links</button>
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="text-xs uppercase font-mono tracking-widest text-slate-400 mb-1">Last result</div>
            {result ? <Result r={result} /> : <div className="text-sm text-slate-500">No sync has run yet.</div>}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-6">De-duplication: loads match on Load #, accounting on date + amount + description, settlements on period + driver. Sheet rows win on pull; TMS-only rows are appended on push.</p>
    </div>
  );
}
