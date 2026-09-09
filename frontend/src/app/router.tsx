import { Navigate, Route, Routes, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { VideoBackground, type VideoBackgroundIntensity } from "@/components/layout/VideoBackground";
import HeroLanding from "@/pages/HeroLanding";
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

/** Guards the application area: loading state, then redirect to login if anonymous. */
function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === "loading") return <FullScreenLoader label="Restoring session…" />;
  if (status !== "authenticated") {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

/**
 * How strongly the background video shows on each page.
 * Landing / auth → strong · data-heavy analytics pages → very subtle.
 */
const PAGE_INTENSITY: Record<string, VideoBackgroundIntensity> = {
  "/": "strong", // public hero landing
  "/login": "strong",
  "/register": "strong",
  "/overview": "subdued", // dashboard
  "/screening": "subdued",
  "/batch": "subdued",
  "/alerts": "subdued",
  "/about": "subdued",
  "/activity": "subtle",
  "/model-performance": "subtle",
  "/explainability": "subtle",
};

export function AppRouter() {
  const status = useAuthStore((s) => s.status);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const location = useLocation();
  const intensity = PAGE_INTENSITY[location.pathname] ?? "subdued";

  useEffect(() => {
    if (status === "loading") {
      void refreshUser();
    }
  }, [status, refreshUser]);

  return (
    <>
      {/* One persistent video background for the whole app — mounted above the
          router so it survives route changes (no element re-creation). */}
      <VideoBackground intensity={intensity} />

      {/* Application UI is always above the background layer. */}
      <div className="relative z-10">
        <Routes>
          {/* Public entry experience: premium hero landing, no sidebar */}
          <Route path="/" element={<HeroLanding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Application area: protected, with the existing sidebar shell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/overview" element={<Overview />} />
              <Route path="/screening" element={<Screening />} />
              <Route path="/batch" element={<BatchAnalysis />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/model-performance" element={<ModelPerformance />} />
              <Route path="/explainability" element={<Explainability />} />
              <Route path="/about" element={<About />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
