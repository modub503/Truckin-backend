import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { HandoffProvider } from "@/context/HandoffContext";
import Layout from "@/components/Layout";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import Loads from "@/pages/Loads";
import BOLs from "@/pages/BOLs";
import Drivers from "@/pages/Drivers";
import Fuel from "@/pages/Fuel";
import Gallery from "@/pages/Gallery";
import Accounting from "@/pages/Accounting";
import Documents from "@/pages/Documents";
import Import from "@/pages/Import";
import Brokers from "@/pages/Brokers";
import SheetsSync from "@/pages/SheetsSync";
import IFTA from "@/pages/IFTA";
import CompanySettings from "@/pages/CompanySettings";
import Estimates from "@/pages/Estimates";
import AcceptInvite from "@/pages/AcceptInvite";
import StaffPortal from "@/pages/StaffPortal";
import "@/App.css";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F17] text-slate-500">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Public({ children }) {
  const { user } = useAuth();
  if (user === null) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

// When the app is served from a sub-path (e.g. https://example.com/app/) the
// router needs that prefix or every client-side route 404s. It is build-time
// config so the root-served Emergent deployment keeps working unchanged: leave
// REACT_APP_ROUTER_BASENAME unset there and the basename is undefined.
const ROUTER_BASENAME = (process.env.REACT_APP_ROUTER_BASENAME || "").replace(/\/+$/, "");

export default function App() {
  return (
    <AuthProvider>
      <HandoffProvider>
        <BrowserRouter basename={ROUTER_BASENAME || undefined}>
        <Routes>
          <Route path="/login" element={<Public><AuthPage /></Public>} />
          <Route path="/invite/:token" element={<AcceptInvite />} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route index element={<Dashboard />} />
            <Route path="/my-work" element={<StaffPortal />} />
            <Route path="/loads" element={<Loads />} />
            <Route path="/bols" element={<BOLs />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/fuel" element={<Fuel />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/import" element={<Import />} />
            <Route path="/brokers" element={<Brokers />} />
            <Route path="/sheets-sync" element={<SheetsSync />} />
            <Route path="/ifta" element={<IFTA />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/company" element={<CompanySettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </BrowserRouter>
      </HandoffProvider>
    </AuthProvider>
  );
}
