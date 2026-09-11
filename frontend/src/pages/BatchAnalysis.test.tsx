import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BatchAnalysis from "@/pages/BatchAnalysis";
import { renderWithProviders } from "@/test/utils";
import { useAuthStore } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import type { BatchCreateResponse, BatchJob } from "@/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      uploadBatch: vi.fn(),
      batchJobs: vi.fn(() => Promise.resolve({ items: [], total: 0, page: 1, page_size: 10, pages: 1 })),
      batchJob: vi.fn(() => Promise.resolve(undefined)),
    },
  };
});

const queuedJob: BatchJob = {
  id: "j1",
  filename: "sample.csv",
  status: "queued",
  total_rows: 10,
  processed_rows: 0,
  flagged_rows: 0,
  error: null,
  result_path: null,
  preview: null,
  created_at: new Date().toISOString(),
  finished_at: null,
};

describe("Batch analysis page", () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: "authenticated",
      user: { id: "u1", email: "a@b.com", full_name: "Ana", role: "analyst", is_active: true, created_at: "" },
    });
    vi.mocked(apiClient.uploadBatch).mockReset();
  });

  it("renders the upload dropzone", () => {
    renderWithProviders(<BatchAnalysis />);
    expect(screen.getByTestId("batch-upload")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload batch CSV" })).toBeInTheDocument();
  });

  it("rejects non-CSV files with a clear message", async () => {
    renderWithProviders(<BatchAnalysis />);
    const input = screen.getByTestId("batch-file-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["a,b\n1,2"], "notes.txt", { type: "text/plain" })] } });
    expect(await screen.findByText(/Only .csv files are accepted/)).toBeInTheDocument();
    expect(apiClient.uploadBatch).not.toHaveBeenCalled();
  });

  it("uploads a valid CSV and shows the queued job", async () => {
    const response: BatchCreateResponse = { job: queuedJob, ok: true, message: "accepted" };
    vi.mocked(apiClient.uploadBatch).mockResolvedValue(response);
    vi.mocked(apiClient.batchJob).mockResolvedValue(queuedJob);
    const user = userEvent.setup();
    renderWithProviders(<BatchAnalysis />);

    const file = new File(["Time,V1,Amount\n0,0,10"], "batch.csv", { type: "text/csv" });
    fireEvent.change(screen.getByTestId("batch-file-input") as HTMLInputElement, { target: { files: [file] } });
    await user.click(screen.getByRole("button", { name: /Start batch screening/i }));

    await waitFor(() => expect(apiClient.uploadBatch).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId("batch-job-status")).toBeInTheDocument();
    expect(screen.getByText("batch.csv")).toBeInTheDocument();
    expect(screen.getByText("Queued")).toBeInTheDocument();
  });
});
