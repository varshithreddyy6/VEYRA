/**
 * Strongly-typed API client (axios) with:
 *  - base URL from VITE_API_BASE_URL
 *  - production fallback to the deployed Render backend
 *  - automatic bearer-token injection
 *  - 401 → one refresh attempt → retry (single-flight)
 *  - typed helpers per endpoint
 */

import axios, { AxiosError, AxiosInstance } from "axios";

import type {
  AlertsResponse,
  AuthResponse,
  BatchCreateResponse,
  BatchJob,
  GlobalExplanation,
  HealthStatus,
  LoginInput,
  MetricsInfo,
  ModelInfo,
  Paginated,
  RegisterInput,
  ScreenInput,
  ScreenResponse,
  Transaction,
  TransactionDetail,
  TransactionsSummary,
} from "@/types";

/* -------------------------------------------------------------------------- */
/* API CONFIGURATION                                                          */
/* -------------------------------------------------------------------------- */

const DEFAULT_API_BASE_URL = "https://veyra-backend-v5ps.onrender.com";

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  DEFAULT_API_BASE_URL;

export const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 45000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* -------------------------------------------------------------------------- */
/* TOKEN MANAGEMENT                                                           */
/* -------------------------------------------------------------------------- */

let accessToken: string | null = localStorage.getItem("ccdfs_access_token");
let refreshToken: string | null = localStorage.getItem("ccdfs_refresh_token");

export function setTokens(
  access: string | null,
  refresh?: string | null
): void {
  accessToken = access;

  if (refresh !== undefined) {
    refreshToken = refresh;
  }

  if (access) {
    localStorage.setItem("ccdfs_access_token", access);
  } else {
    localStorage.removeItem("ccdfs_access_token");
  }

  if (refresh) {
    localStorage.setItem("ccdfs_refresh_token", refresh);
  } else if (refresh === null) {
    localStorage.removeItem("ccdfs_refresh_token");
  }
}

export function clearTokens(): void {
  setTokens(null, null);
}

export function hasSession(): boolean {
  return Boolean(accessToken);
}

/* -------------------------------------------------------------------------- */
/* REQUEST INTERCEPTOR                                                        */
/* -------------------------------------------------------------------------- */

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

/* -------------------------------------------------------------------------- */
/* TOKEN REFRESH                                                              */
/* -------------------------------------------------------------------------- */

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) {
    return null;
  }

  try {
    const { data } = await axios.post(
      `${BASE_URL}/api/v1/auth/refresh`,
      {
        refresh_token: refreshToken,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    setTokens(data.access_token);

    return data.access_token as string;
  } catch {
    clearTokens();
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* RESPONSE INTERCEPTOR                                                       */
/* -------------------------------------------------------------------------- */

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      | (typeof error.config & { _retried?: boolean })
      | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.url?.includes("/auth/")
    ) {
      original._retried = true;

      refreshing = refreshing ?? refreshAccessToken();

      const token = await refreshing;

      refreshing = null;

      if (token) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;

        return api(original);
      }

      window.dispatchEvent(
        new CustomEvent("ccdfs:session-expired")
      );
    }

    return Promise.reject(error);
  }
);

/* -------------------------------------------------------------------------- */
/* API CLIENT                                                                 */
/* -------------------------------------------------------------------------- */

export const apiClient = {
  /* ------------------------------------------------------------------------ */
  /* AUTH                                                                     */
  /* ------------------------------------------------------------------------ */

  register: (input: RegisterInput) =>
    api
      .post<AuthResponse>("/auth/register", input)
      .then((r) => r.data),

  login: (input: LoginInput) =>
    api
      .post<AuthResponse>("/auth/login", input)
      .then((r) => r.data),

  logout: (refresh: string) =>
    api
      .post("/auth/logout", {
        refresh_token: refresh,
      })
      .then((r) => r.data),

  me: () =>
    api
      .get<import("@/types").User>("/auth/me")
      .then((r) => r.data),

  /* ------------------------------------------------------------------------ */
  /* SCREENING                                                                */
  /* ------------------------------------------------------------------------ */

  screen: (input: ScreenInput) =>
    api
      .post<ScreenResponse>("/screen", input)
      .then((r) => r.data),

  /* ------------------------------------------------------------------------ */
  /* TRANSACTIONS                                                             */
  /* ------------------------------------------------------------------------ */

  transactions: (params: Record<string, unknown>) =>
    api
      .get<Paginated<Transaction>>("/transactions", {
        params,
      })
      .then((r) => r.data),

  transaction: (id: string) =>
    api
      .get<TransactionDetail>(`/transactions/${id}`)
      .then((r) => r.data),

  transactionsSummary: () =>
    api
      .get<TransactionsSummary>("/transactions/summary")
      .then((r) => r.data),

  transactionExplanation: (id: string) =>
    api
      .get<import("@/types").Explanation>(
        `/transactions/${id}/explanation`
      )
      .then((r) => r.data),

  /* ------------------------------------------------------------------------ */
  /* BATCH                                                                    */
  /* ------------------------------------------------------------------------ */

  uploadBatch: (file: File) => {
    const form = new FormData();

    form.append("file", file);

    return api
      .post<BatchCreateResponse>("/batch", form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((r) => r.data);
  },

  batchJobs: (params: Record<string, unknown> = {}) =>
    api
      .get<Paginated<BatchJob>>("/batch", {
        params,
      })
      .then((r) => r.data),

  batchJob: (id: string) =>
    api
      .get<BatchJob>(`/batch/${id}`)
      .then((r) => r.data),

  batchDownloadUrl: (id: string) =>
    `${BASE_URL}/api/v1/batch/${id}/download`,

  /* ------------------------------------------------------------------------ */
  /* MODEL                                                                    */
  /* ------------------------------------------------------------------------ */

  modelInfo: () =>
    api
      .get<ModelInfo>("/model/info")
      .then((r) => r.data),

  modelMetrics: () =>
    api
      .get<MetricsInfo>("/model/metrics")
      .then((r) => r.data),

  globalExplanation: () =>
    api
      .get<GlobalExplanation>("/model/global-explanation")
      .then((r) => r.data),

  retrain: () =>
    api
      .post("/model/retrain")
      .then((r) => r.data),

  /* ------------------------------------------------------------------------ */
  /* ALERTS                                                                   */
  /* ------------------------------------------------------------------------ */

  alerts: (params: Record<string, unknown>) =>
    api
      .get<AlertsResponse>("/alerts", {
        params,
      })
      .then((r) => r.data),

  /* ------------------------------------------------------------------------ */
  /* HEALTH                                                                   */
  /* ------------------------------------------------------------------------ */

  health: () =>
    api
      .get<HealthStatus>("/health")
      .then((r) => r.data),
};

/* -------------------------------------------------------------------------- */
/* ERROR HANDLING                                                             */
/* -------------------------------------------------------------------------- */

const UNABLE_TO_CONNECT =
  "Unable to connect to the VEYRA backend. Please try again in a moment.";

export function apiErrorMessage(
  err: unknown,
  fallback = "Something went wrong"
): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | {
          detail?: unknown;
        }
      | undefined;

    const detail = data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((d) =>
          d &&
          typeof d === "object" &&
          "msg" in d
            ? String((d as { msg: unknown }).msg)
            : String(d)
        )
        .join("; ");
    }

    if (err.code === "ERR_NETWORK") {
      return UNABLE_TO_CONNECT;
    }

    const status = err.response?.status;

    if (
      typeof err.response?.data === "string" &&
      (status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504)
    ) {
      return UNABLE_TO_CONNECT;
    }

    if (status === 503) {
      return "Model unavailable — it has not been trained yet.";
    }
  }

  return fallback;
}
