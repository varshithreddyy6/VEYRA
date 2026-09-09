import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  FileSpreadsheet,
  LifeBuoy,
  LogOut,
  Menu,
  ScanSearch,
  ShieldCheck,
  Siren,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth";
import { VeyraMark } from "@/components/brand/VeyraBrand";

/**
 * VEYRA sidebar information architecture:
 *   ANALYZE  → Overview · Screen transaction (primary) · Batch analysis
 *   REVIEW   → Activity · Alerts
 *   MODEL    → Performance · Explainability
 *   INFO     → About
 *
 * The shell is architecturally quiet: a SLIM SOLID sidebar over the content
 * wash, hairline separations, refined active state (thin accent rule), and
 * solid premium surfaces for every functional area.
 */
interface NavItem {
  to: string;
  label: string;
  icon: typeof BarChart3;
  end?: boolean;
  primary?: boolean;
}

const NAV_GROUPS: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: "Analyze",
    items: [
      { to: "/overview", label: "Overview", icon: BarChart3, end: true },
      { to: "/screening", label: "Screen transaction", icon: ScanSearch, primary: true },
      { to: "/batch", label: "Batch analysis", icon: FileSpreadsheet },
    ],
  },
  {
    heading: "Review",
    items: [
      { to: "/activity", label: "Activity", icon: Activity },
      { to: "/alerts", label: "Alerts", icon: Siren },
    ],
  },
  {
    heading: "Model",
    items: [
      { to: "/model-performance", label: "Performance", icon: ShieldCheck },
      { to: "/explainability", label: "Explainability", icon: LifeBuoy },
    ],
  },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <VeyraMark size={34} />
      <div className="leading-none">
        <div className="text-[15px] font-extrabold tracking-[0.22em] text-[#F5F5F2]">VEYRA</div>
        <div className="mt-[5px] text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">
          AI Fraud Intelligence
        </div>
      </div>
    </div>
  );
}

function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-[9px] text-[13.5px] font-medium transition-colors duration-150 ${
          isActive ? "bg-white/[0.05] text-white" : "text-textdim hover:bg-white/[0.03] hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute left-0 top-1/2 h-[18px] w-[2px] -translate-y-1/2 rounded-full bg-accent"
              aria-hidden="true"
            />
          )}
          <Icon
            className={`h-[17px] w-[17px] ${item.primary ? "text-accent" : ""} ${
              isActive ? "text-accent" : "text-muted group-hover:text-text"
            }`}
            aria-hidden="true"
          />
          <span className="min-w-0 truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="flex-1 space-y-7" aria-label="Primary">
      {NAV_GROUPS.map(({ heading, items }) => (
        <div key={heading}>
          <div className="mb-2 px-3 text-2xs font-semibold uppercase tracking-widest2 text-muted/80">{heading}</div>
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.to}>
                <NavItemLink item={item} onNavigate={() => setMobileOpen(false)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        <div className="mb-2 px-3 text-2xs font-semibold uppercase tracking-widest2 text-muted/80">Info</div>
        <ul className="space-y-0.5">
          <li>
            <NavItemLink
              item={{ to: "/about", label: "About", icon: LifeBuoy }}
              onNavigate={() => setMobileOpen(false)}
            />
          </li>
        </ul>
      </div>
    </nav>
  );

  const userBox = (
    <div className="border-t border-white/[0.06] pt-4">
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-elevated text-xs font-semibold text-[#F5F5F2]">
          {(user?.full_name ?? "U").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-medium text-[#F5F5F2]">{user?.full_name}</div>
          <div className="truncate text-2xs text-muted">{user?.role}</div>
        </div>
        <button
          type="button"
          aria-label="Sign out"
          title="Sign out"
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-white/[0.05] hover:text-[#F5F5F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-atmosphere relative min-h-screen overflow-x-clip">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-[#0B0E14] px-4 py-3 md:hidden">
        <Brand />
        <button
          type="button"
          className="btn-secondary px-2.5"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="mx-auto flex max-w-[1480px]">
        {/* Sidebar (desktop) / drawer (mobile) — SOLID, quiet */}
        <aside
          className={`${
            mobileOpen ? "block" : "hidden"
          } fixed inset-0 z-20 bg-[#0B0E14] md:sticky md:top-0 md:z-0 md:block md:h-screen md:w-[244px] md:shrink-0 lg:w-[252px]`}
        >
          <div className="flex h-full flex-col gap-8 overflow-y-auto border-r border-white/[0.06] bg-[#0B0E14] p-5">
            <Brand />
            <div className="hidden text-[9px] font-semibold uppercase tracking-[0.3em] text-muted/60 md:-mt-4 md:block">
              Analyze · Explain · Review · Monitor
            </div>
            {nav}
            <div className="mt-auto">{userBox}</div>
          </div>
        </aside>

        {/* Main content — solid dark backing under the content column.
            NOTE: no full-page scrim here — the background video stays visible
            around and behind the solid panels; readability is provided by the
            panels themselves and the tuned overlay in VideoBackground. */}
        <main className="relative min-w-0 flex-1">
          <div className="relative z-10 mx-auto w-full max-w-[1180px] px-5 py-8 md:px-10 md:py-10 lg:px-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export { NAV_GROUPS };
