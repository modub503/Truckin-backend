import { useCallback, useEffect, useState } from "react";
import { api, money } from "@/lib/api";
import { MapPin, Navigation, ReceiptText, UploadCloud, Wallet } from "lucide-react";
import { toast } from "sonner";

const EMPTY_EXPENSE = {
  category: "food",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
};

export function DriverExpensesPortal({ data, tracking, startTracking, stopTracking, onRefresh }) {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadExpenses = useCallback(async () => {
    try {
      const { data: items } = await api.get("/my-work/expenses");
      setExpenses(items);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not load personal expenses");
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const submitExpense = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter the amount you paid");
      return;
    }
    setSaving(true);
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    if (receipt) {
      payload.append("receipt", receipt);
    }
    try {
      await api.post("/my-work/expenses", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm(EMPTY_EXPENSE);
      setReceipt(null);
      await Promise.all([loadExpenses(), onRefresh()]);
      toast.success("Personal expense saved");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Expense could not be saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 lg:p-8 max-w-4xl">
      <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Private driver workspace</div>
      <h1 className="font-display text-4xl font-black mt-2">{data.driver.name}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <Metric icon={Wallet} value={money(data.settlement_net_total)} label="Settlement net total" />
        <Metric icon={ReceiptText} value={money(data.personal_expenses_total)} label="My personal expenses" />
        <Metric icon={Navigation} value={money(data.settlement_net_total - data.personal_expenses_total)} label="Net after my expenses" />
      </div>

      <section className="mt-8">
        <div className="text-xs uppercase font-mono tracking-widest text-slate-400">My loads</div>
        <div className="mt-3 space-y-3">
          {data.loads.map((loadItem) => (
            <article key={loadItem.id} data-testid={`driver-load-${loadItem.id}`} className="border border-slate-800 rounded-xl p-4">
              <div className="font-mono font-bold">{loadItem.load_number} <span className="text-slate-400">· {loadItem.status}</span></div>
              <div className="text-sm text-slate-300 mt-1">{loadItem.origin} → {loadItem.destination}</div>
              <div className="text-xs text-slate-500 mt-2">Actual distance: {Math.round((loadItem.actual_meters || 0) / 1609.344 * 10) / 10} mi</div>
              <button data-testid={`driver-track-${loadItem.id}`} onClick={() => tracking === loadItem.id ? stopTracking() : startTracking(loadItem.id)} className="mt-3 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold inline-flex gap-2"><MapPin className="h-4 w-4" />{tracking === loadItem.id ? "Stop sharing location" : "Start live location"}</button>
            </article>
          ))}
        </div>
      </section>

      <section data-testid="driver-expenses-section" className="mt-8 border border-slate-800 rounded-xl p-4">
        <div className="text-xs uppercase font-mono tracking-widest text-slate-400">My expenses</div>
        <p className="text-sm text-slate-500 mt-1">Personal purchases only. These never enter company or fuel accounting.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <select data-testid="driver-expense-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"><option value="food">Food</option><option value="appliances">Appliances</option><option value="services">Services</option></select>
          <input data-testid="driver-expense-amount" type="number" min="0.01" step="0.01" placeholder="Amount paid" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2" />
          <input data-testid="driver-expense-date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2" />
          <label className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-pointer"><UploadCloud className="inline h-4 w-4 mr-2" />{receipt?.name || "Attach receipt"}<input data-testid="driver-expense-receipt" type="file" accept="image/*,application/pdf" onChange={(event) => setReceipt(event.target.files?.[0] || null)} className="hidden" /></label>
          <input data-testid="driver-expense-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What was it for? (optional)" className="sm:col-span-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2" />
        </div>
        <button data-testid="driver-expense-save" onClick={submitExpense} disabled={saving} className="mt-3 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold disabled:opacity-50">{saving ? "Saving…" : "Save personal expense"}</button>
        <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Newest to oldest</div>
          {expenses.length === 0 && <div className="text-sm text-slate-500">No personal expenses yet.</div>}
          {expenses.map((expense) => <div key={expense.id} data-testid={`driver-expense-${expense.id}`} className="flex items-center justify-between gap-3 text-sm"><div><b className="capitalize">{expense.category}</b><span className="text-slate-500"> · {expense.date}{expense.receipt_file_id ? " · receipt attached" : ""}</span><div className="text-slate-400">{expense.description}</div></div><b className="font-mono">{money(expense.amount)}</b></div>)}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, value, label }) {
  return <div className="border border-slate-800 rounded-lg p-4"><Icon className="h-4 w-4 text-emerald-400" /><div className="font-mono text-xl mt-3">{value}</div><div className="text-xs text-slate-400">{label}</div></div>;
}