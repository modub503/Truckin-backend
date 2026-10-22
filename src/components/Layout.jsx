import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  LayoutDashboard, PackageOpen, FileText, Users, Fuel, Images,
  BarChart3, UploadCloud, FileArchive, Truck, LogOut, BookUser, RefreshCw, Map, Settings2, Receipt,
} from "lucide-react";
import { Toaster } from "sonner";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", testid: "nav-dashboard" },
  { to: "/loads", icon: PackageOpen, label: "Loads / Rate Cons", testid: "nav-loads" },
  { to: "/estimates", icon: Receipt, label: "Service Estimates", testid: "nav-estimates" },
  { to: "/bols", icon: FileText, label: "BOL Creator", testid: "nav-bols" },
  { to: "/brokers", icon: BookUser, label: "Brokers", testid: "nav-brokers", admin: true },
  { to: "/drivers", icon: Users, label: "Drivers & Pay", testid: "nav-drivers", admin: true },
  { to: "/fuel", icon: Fuel, label: "Fuel Receipts", testid: "nav-fuel" },
  { to: "/ifta", icon: Map, label: "IFTA Quarterly", testid: "nav-ifta", admin: true },
  { to: "/gallery", icon: Images, label: "Truck Photos", testid: "nav-gallery" },
  { to: "/accounting", icon: BarChart3, label: "Accounting", testid: "nav-accounting", admin: true },
  { to: "/documents", icon: FileArchive, label: "Documents", testid: "nav-documents" },
  { to: "/import", icon: UploadCloud, label: "Sheets Import", testid: "nav-import", admin: true },
  { to: "/sheets-sync", icon: RefreshCw, label: "Live Sheets Sync", testid: "nav-sheets-sync", admin: true },
  { to: "/company", icon: Settings2, label: "Company Settings", testid: "nav-company", admin: true },
];

function hexToRgb(value) {
  const hex = String(value || "#F97316").replace("#", "");
  const parts = hex.length === 3 ? hex.split("").map((part) => part + part) : hex.match(/.{2}/g);
  return parts ? parts.map((part) => parseInt(part, 16)).join(", ") : "249, 115, 22";
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const activeBusiness = businesses.find((business) => business.is_active);
  const portalOnly = ["driver", "dispatcher"].includes(user?.role);
  const visibleNav = portalOnly
    ? [{ to: "/my-work", icon: Truck, label: "My Work", testid: "nav-my-work" }]
    : nav.filter((item) => !item.admin || user?.role === "admin");

  useEffect(() => {
    api.get("/businesses").then(({ data }) => setBusinesses(data)).catch(() => setBusinesses([]));
  }, []);
  useEffect(() => {
    const color = activeBusiness?.brand_color || "#F97316";
    document.documentElement.style.setProperty("--brand", color);
    document.documentElement.style.setProperty("--brand-rgb", hexToRgb(color));
  }, [activeBusiness]);

  return (
    <div className="min-h-screen flex bg-[#0B0F17]">
      <Toaster theme="dark" richColors position="top-right" />
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-800 bg-[#0B0F17] flex-col sticky top-0 h-screen">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <div data-testid="sidebar-business-name" className="font-display font-black text-xl leading-none truncate max-w-[170px]">{activeBusiness?.name || "ApexTMS"}</div>
              <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mt-1">Command Center</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          {visibleNav.map(({ to, icon: Icon, label, testid }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              data-testid={testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition
                 ${isActive
                   ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                   : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"}`
              }
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-cyan-500 flex items-center justify-center text-xs font-bold">
              {(user?.name || user?.email || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name || user?.email}</div>
              <div className="text-[10px] uppercase font-mono text-slate-500 tracking-widest">{user?.role || "user"}</div>
            </div>
            <button
              data-testid="logout-button"
              onClick={async () => { await logout(); navigate("/login"); }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-0 z-40 border-b border-slate-800 bg-[#0B0F17]/95 backdrop-blur">
          <div className="h-14 px-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-orange-500 flex items-center justify-center">
                <Truck className="h-4 w-4 text-white" />
              </div>
              <div data-testid="mobile-sidebar-business-name" className="font-display font-black text-lg truncate">{activeBusiness?.name || "ApexTMS"}</div>
            </div>
            <button
              data-testid="mobile-logout-button"
              onClick={async () => { await logout(); navigate("/login"); }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-thin">
            {visibleNav.map(({ to, icon: Icon, label, testid }) => (
              <NavLink
                key={`mobile-${to}`}
                to={to}
                end={to === "/"}
                data-testid={`mobile-${testid}`}
                className={({ isActive }) =>
                  `shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                    : "text-slate-400 border border-transparent"}`
                }
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
