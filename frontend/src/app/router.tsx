import { Navigate, Route, Routes, Outlet, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/lib/auth";
import { FeatureShell } from "@/components/layout/FeatureShell";
import HeroLanding from "@/pages/HeroLanding";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Overview from "@/pages/Overview";
import Screening from "@/pages/Screening";
import BatchAnalysis from "@/pages/BatchAnalysis";
import Activity from "@/pages/Activity";
import Alerts from "@/pages/Alerts";
import ModelPerformance from "@/pages/ModelPerformance";
import Explainability from "@/pages/Explainability";
import About from "@/pages/About";
import { FullScreenLoader } from "@/components/ui/Spinner";

function ProtectedRoute() {
  const status = useAuthStore((s) => s.status); const location = useLocation();
  if (status === "loading") return <FullScreenLoader label="Restoring session…" />;
  if (status !== "authenticated") return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}
function Feature({ title, children }: { title: string; children: ReactNode }) { return <FeatureShell title={title}>{children}</FeatureShell>; }

export function AppRouter() {
  const status = useAuthStore((s) => s.status); const refreshUser = useAuthStore((s) => s.refreshUser);
  useEffect(() => { if (status === "loading") void refreshUser(); }, [status, refreshUser]);
  return <Routes>
    <Route path="/" element={<HeroLanding />} /><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/home" element={<Home />} />
      <Route path="/overview" element={<Feature title="Overview"><Overview /></Feature>} />
      <Route path="/screening" element={<Feature title="Screen Transaction"><Screening /></Feature>} />
      <Route path="/batch" element={<Feature title="Batch Analysis"><BatchAnalysis /></Feature>} />
      <Route path="/activity" element={<Feature title="Activity"><Activity /></Feature>} />
      <Route path="/alerts" element={<Feature title="Alerts"><Alerts /></Feature>} />
      <Route path="/model-performance" element={<Feature title="Model Performance"><ModelPerformance /></Feature>} />
      <Route path="/explainability" element={<Feature title="Explainability"><Explainability /></Feature>} />
      <Route path="/about" element={<Feature title="About VEYRA"><About /></Feature>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
