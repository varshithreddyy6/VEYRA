import { ArrowUpRight, BarChart3, BellRing, BrainCircuit, ClipboardList, FileSpreadsheet, Info, ScanSearch } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/auth";
import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { VeyraWordmark } from "@/components/brand/VeyraBrand";
import { usePageTitle } from "@/lib/usePageTitle";

const tiles = [
  { to: "/overview", title: "Overview", description: "System metrics and recent activity", icon: BarChart3, className: "bento-overview" },
  { to: "/screening", title: "Screen Transaction", description: "Analyze an individual transaction for fraud risk", icon: ScanSearch, className: "bento-screening" },
  { to: "/batch", title: "Batch Analysis", description: "Upload and analyze multiple transactions", icon: FileSpreadsheet, className: "" },
  { to: "/activity", title: "Activity", description: "Review transaction screening history", icon: ClipboardList, className: "" },
  { to: "/alerts", title: "Alerts", description: "Investigate high-risk transactions", icon: BellRing, className: "" },
  { to: "/model-performance", title: "Model Performance", description: "Review model metrics and governance", icon: BrainCircuit, className: "" },
  { to: "/explainability", title: "Explainability", description: "Understand why the model produced a prediction", icon: BrainCircuit, className: "" },
  { to: "/about", title: "About VEYRA", description: "Product, methodology and responsible AI", icon: Info, className: "bento-about" },
];

export default function Home() {
  usePageTitle("Home");
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || "there";
  return <div className="home-shell min-h-screen">
    <header className="home-nav">
      <Link to="/home" aria-label="VEYRA home"><VeyraWordmark /></Link>
      <div className="flex items-center gap-2 sm:gap-3"><ThemeToggle /><span className="hidden text-sm text-textdim sm:inline">{user?.full_name}</span><button type="button" className="home-signout" onClick={async () => { await logout(); navigate("/login"); }}>Sign out</button></div>
    </header>
    <main className="home-content">
      <div className="home-intro"><div className="eyebrow">Your workspace</div><h1>Good to see you, {firstName} <span aria-hidden="true">👋</span></h1><p>Choose a workspace to begin.</p></div>
      <section className="bento-grid" aria-label="Feature workspaces">
        {tiles.map(({ to, title, description, icon: Icon, className }) => <Link key={to} to={to} className={`bento-tile ${className}`}><div className="bento-icon"><Icon className="h-5 w-5" aria-hidden="true" /></div><div className="mt-auto"><div className="flex items-end justify-between gap-3"><h2>{title}</h2><ArrowUpRight className="bento-arrow h-5 w-5" aria-hidden="true" /></div><p>{description}</p></div></Link>)}
      </section>
    </main>
  </div>;
}
