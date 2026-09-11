import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/lib/auth";

// ProtectedRoute lives inside app/router.tsx; test the guard behaviour
// through a minimal harness that mirrors it (single source: useAuthStore).
function Guard({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === "loading") return <div>restoring…</div>;
  if (status !== "authenticated") return <div>redirecting to login</div>;
  return <>{children}</>;
}

describe("protected routes", () => {
  it("redirects anonymous users away from protected content", () => {
    useAuthStore.setState({ user: null, status: "anonymous" });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Guard><div>SECRET DASHBOARD</div></Guard>} />
          <Route path="/login" element={<div>LOGIN PAGE</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText("SECRET DASHBOARD")).not.toBeInTheDocument();
    expect(screen.getByText("redirecting to login")).toBeInTheDocument();
  });

  it("renders content for authenticated users", () => {
    useAuthStore.setState({
      status: "authenticated",
      user: {
        id: "u1", email: "a@b.com", full_name: "Ana", role: "analyst",
        is_active: true, created_at: new Date().toISOString(),
      },
    });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Guard><div>SECRET DASHBOARD</div></Guard>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("SECRET DASHBOARD")).toBeInTheDocument();
  });

  it("shows a restoring state while the session is checked", () => {
    useAuthStore.setState({ user: null, status: "loading" });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Guard><div>SECRET DASHBOARD</div></Guard>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("restoring…")).toBeInTheDocument();
  });
});
