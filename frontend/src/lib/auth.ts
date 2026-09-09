/** Auth state (Zustand) + session persistence. */
import { create } from "zustand";
import { apiClient, clearTokens, hasSession, setTokens } from "@/lib/api";
import type { LoginInput, RegisterInput, User } from "@/types";

interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "authenticated" | "anonymous";
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

function persist(res: { user: User; tokens: { access_token: string; refresh_token: string } }): User {
  setTokens(res.tokens.access_token, res.tokens.refresh_token);
  return res.user;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: hasSession() ? "loading" : "anonymous",

  login: async (input) => {
    const res = await apiClient.login(input);
    const user = persist(res);
    set({ user, status: "authenticated" });
    return user;
  },

  register: async (input) => {
    const res = await apiClient.register(input);
    const user = persist(res);
    set({ user, status: "authenticated" });
    return user;
  },

  logout: async () => {
    const refresh = localStorage.getItem("ccdfs_refresh_token");
    try {
      if (refresh) await apiClient.logout(refresh);
    } catch {
      /* revocation is best-effort; local session is cleared regardless */
    }
    clearTokens();
    set({ user: null, status: "anonymous" });
  },

  refreshUser: async () => {
    try {
      const user = await apiClient.me();
      set({ user, status: "authenticated" });
    } catch {
      clearTokens();
      set({ user: null, status: "anonymous" });
    }
  },
}));

/** Subscribe to the session-expired event fired by the API client. */
export function bindSessionExpiry(): () => void {
  const handler = () => {
    useAuthStore.setState({ user: null, status: "anonymous" });
  };
  window.addEventListener("ccdfs:session-expired", handler);
  return () => window.removeEventListener("ccdfs:session-expired", handler);
}
