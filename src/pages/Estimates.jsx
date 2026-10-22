import { useEffect, useMemo, useState } from "react";
import { api, money, fmtErr, BACKEND_ORIGIN } from "@/lib/api";
import { useEscape } from "@/lib/hooks";
import { useHandoff } from "@/context/HandoffContext";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, FileDown, Mail, Search, X,
  CheckCircle2, XCircle, Send, Receipt,
} from "lucide-react";

const SERVICE_TYPES = [
  "Towing",
  "Emergency Roadside",
  "Auction Transport",
  "Winch-Out / Recovery",
  "Heavy-Duty Towing",
  "Impound / Storage",
  "Other",
];

const STATUSES = ["draft", "sent", "accepted", "declined", "expired", "converted"];
const STATUS_COLORS = {
  draft: "bg-slate-700/40 text-slate-300",
  sent: "bg-blue-500/15 text-blue-300",
  accepted: "bg-emerald-500/15 text-emerald-300",
  declined: "bg-rose-500/15 text-rose-300",
  expired: "bg-amber-500/15 text-amber-200",
  converted: "bg-indigo-500/15 text-indigo-300",
};

const EMPTY_LINE = { description: "", quantity: 1, rate: 0 };
const EMPTY = {
  service_type: "Towing",
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  customer_address: "",
  service_date: "",
  service_location: "",
  equipment: "",
  tax_rate: 0,
  notes: "",
  terms: "Estimate valid for 14 days. Payment due on completion.",
  valid_until: "",
  line_items: [{ ...EMPTY_LINE }],
};

function computeTotals(form) {
  const subtotal = (form.line_items || []).reduce(
    (sum, li) => sum + Number(li.quantity || 0) * Number(li.rate || 0),
    0,
  );
  const tax = subtotal * (Number(form.tax_rate || 0) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export default function Estimates() {
  const { estimatePatch } = useHandoff();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(null);
  useEscape(open, () => setOpen(false));

  const load = async () => {
    const params = {};
    if (q) params.q = q;
    if (statusFilter) params.status = statusFilter;
    const { data } = await api.get("/estimates", { params });
    setItems(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, statusFilter]);

  const totals = useMemo(() => computeTotals(form), [form]);

  const openNew = () => {
    setEdit(null);
    // A visitor who came from the marketing site has already told us who
    // they are and what they need, so the form opens with that filled in.
    setForm({ ...EMPTY, ...(estimatePatch || {}) });
    setOpen(true);
  };
  const openEdit = (row) => {
    setEdit(row);
    setForm({
      ...EMPTY, ...row,
      line_items: (row.line_items || []).length > 0 ? row.line_items : [{ ...EMPTY_LINE }],
    });
    setOpen(true);
  };

  const addLine = () => setForm((f) => ({ ...f, line_items: [...f.line_items, { ...EMPTY_LINE }] }));
  const removeLine = (idx) => setForm((f) => ({
    ...f, line_items: f.line_items.length > 1 ? f.line_items.filter((_, i) => i !== idx) : f.line_items,
  }));
  const setLine = (idx, patch) => setForm((f) => ({
    ...f, line_items: f.line_items.map((li, i) => i === idx ? { ...li, ...patch } : li),
  }));

  const save = async () => {
    if (!form.customer_name.trim()) { toast.error("Customer name is required"); return; }
    const payload = {
      ...form,
      tax_rate: Number(form.tax_rate || 0),
      line_items: (form.line_items || [])
        .filter((li) => (li.description || "").trim())
        .map((li) => ({
          description: li.description,
          quantity: Number(li.quantity || 0),
          rate: Number(li.rate || 0),
        })),
    };
    try {
      if (edit) await api.put(`/estimates/${edit.id}`, payload);
      else await api.post("/estimates", payload);
      toast.success(edit ? "Estimate updated" : "Estimate created");
      setOpen(false);
      load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail) || "Save failed"); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete estimate ${row.estimate_number}?`)) return;
    try { await api.delete(`/estimates/${row.id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(fmtErr(e.response?.data?.detail) || "Delete failed"); }
  };

  const setStatus = async (row, status) => {
    try {
      await api.post(`/estimates/${row.id}/status`, { status });
      toast.success(`Marked ${status}`);
      load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail) || "Status update failed"); }
  };

  const sendEmail = async (row) => {
    if (!row.customer_email) { toast.error("Add a customer email first (edit the estimate)"); return; }
    setSending(row.id);
    try {
      const { data } = await api.post(`/estimates/${row.id}/send`);
      toast.success(`Emailed to ${data.sent_to}`);
      load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail) || "Send failed"); }
    finally { setSending(null); }
  };

  const openPdf = (row) => window.open(`${BACKEND_ORIGIN}/api/estimates/${row.id}/pdf`, "_blank");

  return (
    <div data-testid="estimates-page" className="p-5 lg:p-8">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Operations</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl mt-2 gradient-text">Service Estimates</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Send quotes for towing, emergency roadside, and auction jobs — straight from the dashboard, no load required.
          </p>
        </div>
        <button data-testid="estimates-new-button" onClick={openNew}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold text-white flex items-center gap-2 transition">
          <Plus className="h-4 w-4" /> New Estimate
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 input-focus">
          <Search className="h-4 w-4 text-slate-500" />
          <input data-testid="estimates-search-input" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search estimate #, customer, service, location..."
            className="bg-transparent py-2 w-full outline-none text-sm" />
        </div>
        <select data-testid="estimates-filter-status" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card-noise rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table data-testid="estimates-table" className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-[11px] uppercase font-mono tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3">Estimate #</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">When / Where</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan="7" className="text-center py-12 text-slate-500">
                  No estimates yet. Click "New Estimate" to send your first quote.
                </td></tr>
              )}
              {items.map((r) => (
                <tr key={r.id} data-testid={`estimate-row-${r.id}`}
                  className="border-t border-slate-800 hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-mono font-bold text-white">{r.estimate_number}</td>
                  <td className="px-4 py-3">{r.service_type}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200">{r.customer_name}</div>
                    <div className="text-slate-500 text-xs">{r.customer_email || r.customer_phone || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200">{r.service_date || "—"}</div>
                    <div className="text-slate-500 text-xs truncate max-w-[220px]">{r.service_location || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{money(r.total || 0)}</td>
                  <td className="px-4 py-3">
                    <span data-testid={`estimate-status-${r.id}`}
                      className={`status-pill ${STATUS_COLORS[r.status] || "bg-slate-700/40 text-slate-300"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button data-testid={`estimate-pdf-${r.id}`} onClick={() => openPdf(r)} title="View PDF"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400">
                        <FileDown className="h-4 w-4" />
                      </button>
                      <button data-testid={`estimate-send-${r.id}`} onClick={() => sendEmail(r)}
                        disabled={sending === r.id} title="Email to customer"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-40">
                        {sending === r.id ? <Send className="h-4 w-4 animate-pulse" /> : <Mail className="h-4 w-4" />}
                      </button>
                      <button data-testid={`estimate-accept-${r.id}`} onClick={() => setStatus(r, "accepted")}
                        title="Mark accepted"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button data-testid={`estimate-decline-${r.id}`} onClick={() => setStatus(r, "declined")}
                        title="Mark declined"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400">
                        <XCircle className="h-4 w-4" />
                      </button>
                      <button data-testid={`estimate-edit-${r.id}`} onClick={() => openEdit(r)} title="Edit"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-orange-400">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button data-testid={`estimate-delete-${r.id}`} onClick={() => remove(r)} title="Delete"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div data-testid="estimate-modal" className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 max-w-3xl w-full my-8 flag-ribbon">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="text-xs uppercase font-mono tracking-widest text-slate-400">
                  {edit ? "Edit estimate" : "New estimate"}
                </div>
                <h2 className="font-display font-black text-2xl mt-1">
                  {edit ? edit.estimate_number : "Service Estimate"}
                </h2>
              </div>
              <button data-testid="estimate-modal-close" onClick={() => setOpen(false)}
                className="p-2 rounded hover:bg-slate-800 text-slate-400"><X className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs uppercase font-mono tracking-widest text-slate-400 sm:col-span-2">Service type
                <select data-testid="estimate-service-type" value={form.service_type}
                  onChange={(e) => setForm({ ...form, service_type: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 normal-case">
                  {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-xs uppercase font-mono tracking-widest text-slate-400">Customer name *
                <input data-testid="estimate-customer-name" value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="Shipper, business, or auction name"
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 normal-case" />
              </label>
              <label className="text-xs uppercase font-mono tracking-widest text-slate-400">Customer email
                <input data-testid="estimate-customer-email" value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  placeholder="billing@customer.com"
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 normal-case" />
              </label>
              <label className="text-xs uppercase font-mono tracking-widest text-slate-400">Customer phone
                <input data-testid="estimate-customer-phone" value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  placeholder="(555) 555-1234"
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 normal-case" />
              </label>
              <label className="text-xs uppercase font-mono tracking-widest text-slate-400 sm:col-span-2">Customer address
                <input data-testid="estimate-customer-address" value={form.customer_address}
                  onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                  placeholder="Billing address (optional)"
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 normal-case" />
              </label>
              <label className="text-xs uppercase font-mono tracking-widest text-slate-400">Service date
                <input data-testid="estimate-service-date" type="date" value={form.service_date || ""}
                  onChange={(e) => setForm({ ...form, service_date: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 normal-case" />
              </label>
              <label className="text-xs uppercase font-mono tracking-widest text-slate-400">Valid until
                <input data-testid="estimate-valid-until" type="date" value={form.valid_until || ""}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 normal-case" />
              </label>
              <label className="text-xs uppercase font-mono tracking-widest text-slate-400">Service location
                <input data-testid="estimate-service-location" value={form.service_location}
                  onChange={(e) => setForm({ ...form, service_location: e.target.value })}
                  placeholder="Pickup address / mile marker / auction yard"
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 normal-case" />
              </label>
              <label className="text-xs uppercase font-mono tracking-widest text-slate-400">Equipment
                <input data-testid="estimate-equipment" value={form.equipment}
                  onChange={(e) => setForm({ ...form, equipment: e.target.value })}
                  placeholder="Flatbed, Wrecker, Lowboy, Rotator..."
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 normal-case" />
              </label>
            </div>

            <div className="mt-5 border border-slate-800 rounded-lg overflow-hidden">
              <div className="bg-slate-900/70 px-3 py-2 text-[11px] uppercase font-mono tracking-widest text-slate-400 flex justify-between">
                <span>Line items</span>
                <button data-testid="estimate-add-line" onClick={addLine}
                  className="normal-case font-sans text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add line
                </button>
              </div>
              <div className="divide-y divide-slate-800">
                {form.line_items.map((li, idx) => (
                  <div key={idx} data-testid={`estimate-line-${idx}`} className="grid grid-cols-12 gap-2 p-2 items-center">
                    <input data-testid={`estimate-line-desc-${idx}`} value={li.description}
                      onChange={(e) => setLine(idx, { description: e.target.value })}
                      placeholder="e.g. Flatbed tow 25 mi · Overnight storage · Winch-out"
                      className="col-span-6 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-slate-100" />
                    <input data-testid={`estimate-line-qty-${idx}`} type="number" step="0.5" value={li.quantity}
                      onChange={(e) => setLine(idx, { quantity: e.target.value })} placeholder="Qty"
                      className="col-span-1 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-right" />
                    <input data-testid={`estimate-line-rate-${idx}`} type="number" step="0.01" value={li.rate}
                      onChange={(e) => setLine(idx, { rate: e.target.value })} placeholder="Rate"
                      className="col-span-2 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-right" />
                    <div className="col-span-2 text-right font-mono text-sm">
                      {money(Number(li.quantity || 0) * Number(li.rate || 0))}
                    </div>
                    <button data-testid={`estimate-line-remove-${idx}`} onClick={() => removeLine(idx)}
                      disabled={form.line_items.length === 1}
                      className="col-span-1 p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 disabled:opacity-30">
                      <Trash2 className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-xs uppercase font-mono tracking-widest text-slate-400">Tax rate (%)
                <input data-testid="estimate-tax-rate" type="number" step="0.1" value={form.tax_rate}
                  onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 normal-case" />
              </label>
              <div className="sm:col-span-2 flex flex-col justify-end items-end text-sm font-mono">
                <div className="text-slate-400">Subtotal: <span className="text-slate-200 font-bold">{money(totals.subtotal)}</span></div>
                <div className="text-slate-400">Tax: <span className="text-slate-200 font-bold">{money(totals.tax)}</span></div>
                <div data-testid="estimate-total" className="text-lg mt-1 text-white">
                  Total: <span className="text-orange-400 font-black">{money(totals.total)}</span>
                </div>
              </div>
            </div>

            <label className="block mt-4 text-xs uppercase font-mono tracking-widest text-slate-400">Notes
              <textarea data-testid="estimate-notes" value={form.notes || ""} rows="2"
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Scope of work, special conditions, access instructions..."
                className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 normal-case" />
            </label>
            <label className="block mt-3 text-xs uppercase font-mono tracking-widest text-slate-400">Terms
              <input data-testid="estimate-terms" value={form.terms || ""}
                onChange={(e) => setForm({ ...form, terms: e.target.value })}
                className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 normal-case" />
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button data-testid="estimate-cancel-button" onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-sm">Cancel</button>
              <button data-testid="estimate-save-button" onClick={save}
                className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold text-white flex items-center gap-2">
                <Receipt className="h-4 w-4" /> {edit ? "Save changes" : "Create estimate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
