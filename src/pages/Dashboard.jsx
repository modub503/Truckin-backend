import { useEffect, useState } from "react";
import { api, money, num } from "@/lib/api";
import { Truck, TrendingUp, TrendingDown, Users, DollarSign, PackageOpen, Activity } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function StatCard({ icon: Icon, label, value, sub, accent, testid }) {
  return (
    <div data-testid={testid} className={`card-noise rounded-xl p-5 border border-slate-800 ${accent ? "kpi-glow" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase font-mono tracking-widest text-slate-400">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-orange-500" : "text-slate-500"}`} />
      </div>
      <div className="mt-4 font-mono text-3xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isPrivatePortalRole = ["driver", "dispatcher"].includes(user?.role);
  useEffect(() => {
    if (isPrivatePortalRole) {
      return;
    }
    if (isAdmin) {
      api.get("/stats/dashboard").then((r) => setStats(r.data)).catch(() => setStats({}));
      return;
    }
    api.get("/loads").then(({ data }) => {
      const active = data.filter((load) => ["Booked", "Dispatched", "In-Transit"].includes(load.status));
      const delivered = data.filter((load) => ["Delivered", "Invoiced", "Paid"].includes(load.status));
      setStats({
        total_loads: data.length,
        active_loads: active.length,
        delivered_loads: delivered.length,
        recent_loads: data.slice(0, 5),
      });
    }).catch(() => setStats({}));
  }, [isAdmin, isPrivatePortalRole]);

  if (isPrivatePortalRole) return <Navigate to="/my-work" replace />;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px]">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Operations</div>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight mt-1">Command Deck</h1>
        </div>
        <div className="flex gap-2">
          <Link
            data-testid="dashboard-quick-action-new-load"
            to="/loads"
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition"
          >
            + New Load
          </Link>
          <Link
            data-testid="dashboard-quick-action-create-bol"
            to="/bols"
            className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-white font-semibold text-sm transition"
          >
            + Create BOL
          </Link>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4 mb-8`}>
        {isAdmin && <StatCard testid="dashboard-kpi-revenue" icon={DollarSign} accent
          label="Gross Revenue" value={money(stats?.gross_revenue)} sub="Loads + accounting revenue" />}
        {isAdmin && <StatCard testid="dashboard-kpi-expenses" icon={TrendingDown}
          label="Total Expenses" value={money(stats?.total_expenses)} sub="Fuel, insurance, misc." />}
        <StatCard testid="dashboard-kpi-active-loads" icon={PackageOpen}
          label="Active Loads" value={num(stats?.active_loads)} sub={`${num(stats?.delivered_loads)} delivered`} />
        {isAdmin ? <StatCard testid="dashboard-kpi-drivers" icon={Users}
          label="Drivers" value={num(stats?.drivers)} sub="Active roster" /> : <StatCard testid="dashboard-kpi-total-loads" icon={Truck}
          label="Total Loads" value={num(stats?.total_loads)} sub="Assigned business" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-noise rounded-xl border border-slate-800">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Latest activity</div>
              <h3 className="font-display font-bold text-xl mt-1">Recent Loads</h3>
            </div>
            <Link to="/loads" className="text-xs uppercase font-mono tracking-widest text-orange-500 hover:text-orange-400">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {(stats?.recent_loads || []).length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No loads yet. <Link to="/loads" className="text-orange-500">Create one →</Link>
              </div>
            )}
            {(stats?.recent_loads || []).map((l) => (
              <div key={l.id} className="p-4 flex items-center gap-4 hover:bg-slate-900/40 transition">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{l.load_number}</span>
                    <span className={`status-pill status-${l.status || "Booked"}`}>{l.status || "Booked"}</span>
                  </div>
                  <div className="text-sm text-slate-400 truncate">
                    {l.origin || "—"} → {l.destination || "—"} · {l.broker || "—"}
                  </div>
                </div>
                <div className="font-mono text-right">
                  {isAdmin && <div className="font-semibold">{money(l.rate)}</div>}
                  <div className="text-xs text-slate-500">{l.miles ? `${num(l.miles)} mi` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-noise rounded-xl border border-slate-800 p-5">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400">{isAdmin ? "Net margin" : "Load board"}</div>
          {isAdmin && <div className="mt-2 font-mono text-3xl font-bold gradient-text">{money(stats?.net_margin)}</div>}
          <div className="mt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total loads</span>
              <span className="font-mono">{num(stats?.total_loads)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Delivered</span>
              <span className="font-mono">{num(stats?.delivered_loads)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">In flight</span>
              <span className="font-mono">{num(stats?.active_loads)}</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs uppercase font-mono tracking-widest text-slate-400 mb-3">
              <Activity className="h-3 w-3" /> Quick jumps
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link data-testid="dashboard-quick-fuel" to="/fuel" className="text-sm px-3 py-2 rounded-lg border border-slate-800 hover:border-orange-500/40 hover:text-orange-400 transition">Fuel</Link>
              <Link data-testid="dashboard-quick-photos" to="/gallery" className="text-sm px-3 py-2 rounded-lg border border-slate-800 hover:border-orange-500/40 hover:text-orange-400 transition">Photos</Link>
              {isAdmin && <Link data-testid="dashboard-quick-books" to="/accounting" className="text-sm px-3 py-2 rounded-lg border border-slate-800 hover:border-orange-500/40 hover:text-orange-400 transition">Books</Link>}
              {isAdmin ? <Link data-testid="dashboard-quick-import" to="/import" className="text-sm px-3 py-2 rounded-lg border border-slate-800 hover:border-orange-500/40 hover:text-orange-400 transition">Import</Link> : <Link data-testid="dashboard-quick-documents" to="/documents" className="text-sm px-3 py-2 rounded-lg border border-slate-800 hover:border-orange-500/40 hover:text-orange-400 transition">Documents</Link>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
