import { useEffect, useMemo, useState } from "react";
import { api, fmtErr, BACKEND_ORIGIN } from "@/lib/api";
import { toast } from "sonner";
import { Building2, Copy, ImageUp, Link2, Plus, Save, SwitchCamera, Trash2, UserPlus, Users } from "lucide-react";

const DEFAULT_COLOR = "#F97316";
const EMPTY = { name: "", brand_color: DEFAULT_COLOR };

export default function CompanySettings() {
  const [businesses, setBusinesses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [dispatchers, setDispatchers] = useState([]);
  const [employeeForm, setEmployeeForm] = useState({ name: "", email: "", role: "operations" });
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  const active = useMemo(
    () => businesses.find((business) => business.is_active) || null,
    [businesses],
  );
  const logoUrl = active?.logo_file_id
    ? `${BACKEND_ORIGIN}/api/files/${active.logo_file_id}/download`
    : null;

  const load = async () => {
    try {
      const { data } = await api.get("/businesses");
      setBusinesses(data);
      const current = data.find((business) => business.is_active) || data[0];
      if (current) {
        setForm({ name: current.name, brand_color: current.brand_color || DEFAULT_COLOR });
      }
      const employeeResponse = await api.get("/businesses/active/employees");
      setEmployees(employeeResponse.data);
      const [driverResponse, dispatcherResponse] = await Promise.all([
        api.get("/drivers"),
        api.get("/dispatchers"),
      ]);
      setDrivers(driverResponse.data);
      setDispatchers(dispatcherResponse.data);
    } catch (error) {
      toast.error(fmtErr(error.response?.data?.detail));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveBranding = async () => {
    if (!active || !form.name.trim()) {
      toast.error("Enter a company name");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/businesses/${active.id}`, form);
      toast.success("Company branding saved");
      window.location.reload();
    } catch (error) {
      toast.error(fmtErr(error.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const createBusiness = async () => {
    if (!newName.trim()) {
      toast.error("Enter a business name");
      return;
    }
    try {
      await api.post("/businesses", { name: newName, brand_color: DEFAULT_COLOR });
      toast.success("New business created and selected");
      window.location.reload();
    } catch (error) {
      toast.error(fmtErr(error.response?.data?.detail));
    }
  };

  const switchBusiness = async (business) => {
    if (business.is_active) {
      return;
    }
    try {
      await api.post(`/businesses/${business.id}/activate`);
      toast.success(`${business.name} is now active`);
      window.location.assign("/");
    } catch (error) {
      toast.error(fmtErr(error.response?.data?.detail));
    }
  };

  const uploadLogo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !active) {
      return;
    }
    setUploading(true);
    const data = new FormData();
    data.append("file", file);
    try {
      await api.post(`/businesses/${active.id}/logo`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Logo updated");
      window.location.reload();
    } catch (error) {
      toast.error(fmtErr(error.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const addEmployee = async () => {
    if (!employeeForm.name.trim() || !employeeForm.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setAddingEmployee(true);
    try {
      const { data } = await api.post("/businesses/active/invitations", employeeForm);
      setInviteUrl(data.invite_url);
      setEmployeeForm({ name: "", email: "", role: "operations" });
      try {
        await navigator.clipboard.writeText(data.invite_url);
      } catch (err) { console.debug("Clipboard write blocked:", err?.message || err); }
      toast.success(data.email_sent ? "Invite email sent and link copied" : "Invite link is ready to copy");
    } catch (error) {
      toast.error(fmtErr(error.response?.data?.detail));
    } finally {
      setAddingEmployee(false);
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied");
    } catch {
      window.prompt("Copy this employee invite link:", inviteUrl);
    }
  };

  const removeEmployee = async (employee) => {
    if (!window.confirm(`Remove ${employee.name} from this business?`)) {
      return;
    }
    try {
      await api.delete(`/businesses/active/employees/${employee.id}`);
      toast.success("Employee access removed");
      await load();
    } catch (error) {
      toast.error(fmtErr(error.response?.data?.detail));
    }
  };

  const linkEmployee = async (employee, recordId) => {
    const body = employee.role === "driver"
      ? { role: "driver", driver_id: recordId }
      : { role: "dispatcher", dispatcher_id: recordId };
    try {
      await api.put(`/businesses/active/employees/${employee.id}/link`, body);
      toast.success("Private portal record linked");
      await load();
    } catch (error) {
      toast.error(fmtErr(error.response?.data?.detail));
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1280px]">
      <div className="mb-8">
        <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Workspace</div>
        <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">Company settings</h1>
        <p className="text-slate-400 mt-2 text-sm max-w-2xl">Each company has private loads, payroll, documents, accounting, and Google Sheets connections.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.25fr] gap-6">
        <section className="card-noise rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-orange-400" />
            <h2 className="font-display text-2xl font-bold">Your businesses</h2>
          </div>
          <div className="space-y-2">
            {businesses.map((business) => (
              <button
                key={business.id}
                data-testid={`business-switch-${business.id}`}
                onClick={() => switchBusiness(business)}
                className={`w-full text-left border rounded-lg p-4 transition-colors ${business.is_active ? "border-orange-500/60 bg-orange-500/10" : "border-slate-800 hover:border-slate-600 hover:bg-slate-900/50"}`}
              >
                <div className="flex items-center gap-3">
                  {business.logo_file_id ? (
                    <img data-testid={`business-logo-${business.id}`} src={`${BACKEND_ORIGIN}/api/files/${business.logo_file_id}/download`} alt="" className="h-8 w-8 rounded object-contain bg-slate-950" />
                  ) : (
                    <div className="h-8 w-8 rounded flex items-center justify-center" style={{ backgroundColor: business.brand_color || DEFAULT_COLOR }}><Building2 className="h-4 w-4 text-white" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{business.name}</div>
                    <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">{business.is_active ? "Active workspace" : "Switch workspace"}</div>
                  </div>
                  {!business.is_active && <SwitchCamera className="h-4 w-4 text-slate-500" />}
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-800 mt-5 pt-5">
            <label className="text-xs uppercase font-mono tracking-widest text-slate-400">New business</label>
            <div className="mt-2 flex gap-2">
              <input data-testid="new-business-name-input" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Company name" className="min-w-0 flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
              <button data-testid="new-business-create-button" onClick={createBusiness} className="px-3 py-2 rounded-lg bg-orange-500 text-white font-semibold inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Add</button>
            </div>
          </div>
        </section>

        <section className="card-noise rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Active business</div>
              <h2 data-testid="active-business-name" className="font-display text-2xl font-bold mt-1">{active?.name || "Loading…"}</h2>
            </div>
            {logoUrl ? <img data-testid="active-business-logo" src={logoUrl} alt="Company logo" className="h-14 w-14 rounded-lg object-contain bg-slate-950 border border-slate-800" /> : <div className="h-14 w-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: form.brand_color }}><Building2 className="h-6 w-6 text-white" /></div>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
            <label className="block">
              <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Company name</span>
              <input data-testid="company-name-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
            </label>
            <label className="block">
              <span className="text-xs uppercase font-mono tracking-widest text-slate-400">App color</span>
              <input data-testid="company-color-input" type="color" value={form.brand_color} onChange={(event) => setForm({ ...form, brand_color: event.target.value })} className="mt-1 h-10 w-16 cursor-pointer rounded border border-slate-800 bg-slate-900 p-1" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <label data-testid="company-logo-upload" className={`px-4 py-2 rounded-lg border border-slate-700 hover:border-orange-500/60 cursor-pointer inline-flex items-center gap-2 font-semibold ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <ImageUp className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload logo"}
              <input data-testid="company-logo-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} className="hidden" />
            </label>
            <button data-testid="company-branding-save" disabled={saving} onClick={saveBranding} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save branding"}</button>
          </div>
          <p className="mt-5 pt-5 border-t border-slate-800 text-xs text-slate-500">Your company name and logo appear in the sidebar and on new Rate Confirmations, BOLs, invoices, and settlement PDFs.</p>
        </section>
      </div>

      <section data-testid="employee-access-section" className="card-noise rounded-xl border border-slate-800 p-5 mt-6">
        <div className="flex items-center gap-2 mb-5">
          <Users className="h-4 w-4 text-orange-400" />
          <div>
            <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Employee-only access</div>
            <h2 className="font-display text-2xl font-bold mt-1">Staff accounts</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input data-testid="employee-name-input" value={employeeForm.name} onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })} placeholder="Employee name" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
          <input data-testid="employee-email-input" type="email" value={employeeForm.email} onChange={(event) => setEmployeeForm({ ...employeeForm, email: event.target.value })} placeholder="name@company.com" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500" />
          <select data-testid="employee-role-select" value={employeeForm.role} onChange={(event) => setEmployeeForm({ ...employeeForm, role: event.target.value })} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-orange-500"><option value="operations">Operations</option><option value="driver">Driver portal</option><option value="dispatcher">Dispatcher portal</option></select>
        </div>
        <div className="mt-3 flex justify-end">
          <button data-testid="employee-invite-button" disabled={addingEmployee} onClick={addEmployee} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold inline-flex items-center gap-2 disabled:opacity-50"><UserPlus className="h-4 w-4" /> {addingEmployee ? "Creating…" : "Create invite link"}</button>
        </div>
        {inviteUrl && <div data-testid="employee-invite-link-panel" className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2 text-sm text-emerald-300"><Link2 className="h-4 w-4" /> One-time setup link — expires in 7 days</div>
          <div className="mt-2 flex gap-2">
            <input data-testid="employee-invite-link-input" readOnly value={inviteUrl} className="min-w-0 flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 outline-none" />
            <button data-testid="employee-invite-copy-button" onClick={copyInvite} className="p-2 rounded-lg border border-slate-700 hover:border-emerald-400 text-slate-300" title="Copy invite link"><Copy className="h-4 w-4" /></button>
          </div>
        </div>}
        <div className="mt-5 border-t border-slate-800 pt-4 overflow-x-auto scrollbar-thin">
          <table data-testid="employee-roster" className="w-full text-sm">
            <thead className="text-xs uppercase font-mono tracking-widest text-slate-400">
              <tr><th className="text-left px-3 py-2">Employee</th><th className="text-left px-3 py-2">Email</th><th className="text-left px-3 py-2">Role</th><th className="text-right px-3 py-2">Access</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {employees.map((employee) => (
                <tr key={employee.id} data-testid={`employee-row-${employee.id}`}>
                  <td className="px-3 py-3 font-semibold">{employee.name}</td>
                  <td className="px-3 py-3 text-slate-400">{employee.email}</td>
                  <td className="px-3 py-3"><span className={`status-pill ${employee.role === "admin" ? "status-Paid" : "status-Booked"}`}>{employee.role}</span></td>
                  <td className="px-3 py-3 text-right">
                    {employee.role === "driver" && <select data-testid={`employee-driver-link-${employee.id}`} value={employee.linked_driver_id || ""} onChange={(event) => linkEmployee(employee, event.target.value)} className="max-w-[180px] bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs"><option value="">Link driver…</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select>}
                    {employee.role === "dispatcher" && <select data-testid={`employee-dispatcher-link-${employee.id}`} value={employee.linked_dispatcher_id || ""} onChange={(event) => linkEmployee(employee, event.target.value)} className="max-w-[180px] bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs"><option value="">Link dispatcher…</option>{dispatchers.map((dispatcher) => <option key={dispatcher.id} value={dispatcher.id}>{dispatcher.name}</option>)}</select>}
                    {employee.role !== "admin" && <button data-testid={`employee-remove-${employee.id}`} onClick={() => removeEmployee(employee)} className="ml-2 p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400" title="Remove employee access"><Trash2 className="h-4 w-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}