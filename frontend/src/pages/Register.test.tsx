import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Register from "@/pages/Register";
import { renderWithProviders } from "@/test/utils";
import { useAuthStore } from "@/lib/auth";
import { apiClient } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiClient: { ...actual.apiClient, register: vi.fn() } };
});

const validUser = {
  id: "u2",
  email: "new@example.com",
  full_name: "New Analyst",
  role: "analyst" as const,
  is_active: true,
  created_at: new Date().toISOString(),
};

describe("Register page", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: "anonymous" });
    vi.mocked(apiClient.register).mockReset();
  });

  it("sends exactly the backend contract and authenticates", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.register).mockResolvedValue({
      user: validUser,
      tokens: { access_token: "a", refresh_token: "r", token_type: "bearer", expires_in: 1800 },
    });
    renderWithProviders(
      <Register />
    );
    await user.type(screen.getByLabelText(/full name/i), "New Analyst");
    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText("Password", { exact: true }), "FraudPass123");
    await user.type(screen.getByLabelText(/confirm password/i), "FraudPass123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(apiClient.register).toHaveBeenCalledWith({
        email: "new@example.com",
        full_name: "New Analyst",
        password: "FraudPass123",
        role: "analyst",
      })
    );
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("blocks submit and shows field errors for invalid input", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Register />
    );
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText("Password", { exact: true }), "short");
    await user.type(screen.getByLabelText(/confirm password/i), "different");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(apiClient.register).not.toHaveBeenCalled();
  });

  it("surfaces the duplicate-email server error", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.register).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { detail: "Email already registered" } } });
    renderWithProviders(
      <Register />
    );
    await user.type(screen.getByLabelText(/full name/i), "New Analyst");
    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText("Password", { exact: true }), "FraudPass123");
    await user.type(screen.getByLabelText(/confirm password/i), "FraudPass123");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText(/Email already registered/)).toBeInTheDocument();
    expect(useAuthStore.getState().status).not.toBe("authenticated");
  });
});
