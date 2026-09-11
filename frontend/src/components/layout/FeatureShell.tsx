import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { VeyraWordmark } from "@/components/brand/VeyraBrand";
import { useAuthStore } from "@/lib/auth";

const NAV_LINKS = [
  { to: "/overview", label: "Overview" },
  { to: "/screening", label: "Screening" },
  { to: "/batch", label: "Batch" },
  { to: "/activity", label: "Activity" },
  { to: "/alerts", label: "Alerts" },
  { to: "/model-performance", label: "Model" },
  { to: "/explainability", label: "Explain" },
  { to: "/about", label: "About" },
];

export function FeatureShell({ title, children }: { title: string; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="feature-shell min-h-screen">
      <header className="feature-nav">
        <div className="feature-nav-inner">
          <Link to="/home" aria-label="VEYRA home">
            <VeyraWordmark compact />
          </Link>
          <nav className="feature-links" aria-label="Workspace">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `feature-link${isActive ? " feature-link-active" : ""}`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-xs font-bold text-text sm:flex"
              title={user?.full_name}
            >
              {(user?.full_name || "U").slice(0, 1).toUpperCase()}
            </span>
            <button type="button" onClick={() => void signOut()} className="btn-ghost btn-sm hidden sm:inline-flex">
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm px-2.5 min-[861px]:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-border bg-white px-4 pb-4 pt-2 min-[861px]:hidden" aria-label="Workspace mobile">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? "bg-surface text-text" : "text-textdim"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-textdim"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out{user?.full_name ? ` (${user.full_name})` : ""}
            </button>
          </nav>
        )}
      </header>
      <main className="feature-content">
        <span className="sr-only">{title}</span>
        {children}
      </main>
    </div>
  );
}
