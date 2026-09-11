import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@/pages/Login";
import { renderWithProviders } from "@/test/utils";
import { useAuthStore } from "@/lib/auth";
import { apiClient } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiClient: { ...actual.apiClient, login: vi.fn() } };
});

describe("Login page", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: "anonymous" });
    vi.mocked(apiClient.login).mockReset();
  });

  it("renders the login form with brand title", () => {
    renderWithProviders(<Login />);
    expect(screen.getByText("VEYRA")).toBeInTheDocument();
    expect(screen.getByText("AI Fraud Intelligence")).toBeInTheDocument();
    expect(screen.getByTestId("login-form")).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    renderWithProviders(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("submits credentials and authenticates", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.login).mockResolvedValue({
      user: {
        id: "u1",
        email: "ana@example.com",
        full_name: "Ana",
        role: "analyst",
        is_active: true,
        created_at: new Date().toISOString(),
      },
      tokens: { access_token: "a", refresh_token: "r", token_type: "bearer", expires_in: 1800 },
    });
    renderWithProviders(<Login />);
    await user.type(screen.getByLabelText(/email/i), "ana@example.com");
    await user.type(screen.getByLabelText("Password", { exact: true }), "Password123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(apiClient.login).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "Password123!",
    }));
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("surfaces server errors", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.login).mockRejectedValue({ isAxiosError: true, response: { status: 401, data: { detail: "Invalid email or password" } } });
    renderWithProviders(<Login />);
    await user.type(screen.getByLabelText(/email/i), "ana@example.com");
    await user.type(screen.getByLabelText("Password", { exact: true }), "Password123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText(/Invalid email or password/)).toBeInTheDocument();
  });

  it("shows a friendly message when the backend is unreachable", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.login).mockRejectedValue({ isAxiosError: true, code: "ERR_NETWORK" });
    renderWithProviders(<Login />);
    await user.type(screen.getByLabelText(/email/i), "ana@example.com");
    await user.type(screen.getByLabelText("Password", { exact: true }), "Password123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(
      await screen.findByText(/Unable to connect to the VEYRA backend/)
    ).toBeInTheDocument();
  });

  it("toggles password visibility with an accessible button", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);
    const input = screen.getByLabelText("Password", { exact: true });
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("type", "password");
  });
});
