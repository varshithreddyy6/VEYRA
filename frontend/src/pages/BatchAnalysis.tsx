import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState, LoadingRows } from "@/components/ui/States";
import { useToast } from "@/lib/toast";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { formatDateTime, formatProbability } from "@/lib/formatters";
import { usePageTitle } from "@/lib/usePageTitle";
import type { BatchJob } from "@/types";

const POLL_MS = 2500;

/** Status rail step, from the real job status. */
const STATUS_STEPS = [
  { key: "queued", label: "In queue" },
  { key: "processing", label: "Scoring rows" },
  { key: "done", label: "Complete" },
] as const;

export default function BatchAnalysis() {
  usePageTitle("Batch Analysis");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const jobs = useQuery({
    queryKey: ["batch-jobs"],
    queryFn: () => apiClient.batchJobs({ page: 1, page_size: 10 }),
  });

  const activeJob = useQuery({
    queryKey: ["batch-job", activeJobId],
    queryFn: () => apiClient.batchJob(activeJobId as string),
    enabled: Boolean(activeJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "failed" ? false : POLL_MS;
    },
  });

  useEffect(() => {
    if (activeJob.data?.status === "done" || activeJob.data?.status === "failed") {
      void queryClient.invalidateQueries({ queryKey: ["batch-jobs"] });
    }
  }, [activeJob.data?.status, queryClient]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSet(dropped);
  }, []);

  const validateAndSet = (f: File) => {
    setUploadError(null);
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Only .csv files are accepted.");
      setFile(null);
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setUploadError("File exceeds the 20 MB limit.");
      setFile(null);
      return;
    }
    setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await apiClient.uploadBatch(file);
      setActiveJobId(res.job.id);
      void queryClient.invalidateQueries({ queryKey: ["batch-jobs"] });
      toast.push(`Batch uploaded successfully — ${res.job.total_rows} row(s) queued`);
    } catch (err) {
      setUploadError(apiErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const job: BatchJob | undefined = activeJob.data;
  const progress = job && job.total_rows > 0 ? Math.round((job.processed_rows / job.total_rows) * 100) : 0;
  const stepIndex =
    job?.status === "failed" ? -1 : STATUS_STEPS.findIndex((s) => s.key === job?.status);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Bulk workflow"
        title="Batch analysis"
        description="Upload a CSV of anonymized transactions. Rows are validated, scored with the same pipeline as single screening, and delivered as a downloadable results file."
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Upload workspace ──────────────────────────────────────────── */}
        <section data-testid="batch-upload">
          <div className="section-head">
            <h2 className="section-title">Upload CSV</h2>
            <span className="section-sub">max 20 MB · 100,000 rows</span>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Upload batch CSV"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-card border border-dashed px-6 text-center transition-colors duration-200 ${
              dragOver ? "border-accent/60 bg-accent/[0.06]" : "border-border bg-surface hover:border-muted hover:bg-surface"
            }`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-accent">
              <UploadCloud className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="text-[15px] font-medium text-text">Drop your CSV here, or click to browse</div>
            <div className="text-[13px] text-textdim">Anonymized features only · the same pipeline as single screening</div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              tabIndex={-1}
              data-testid="batch-file-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) validateAndSet(f);
              }}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="label-sm">Required columns</span>
            <span className="chip">Time, V1…V28, Amount</span>
            <span className="label-sm ml-2">Optional</span>
            <span className="chip">Class</span>
            <span className="chip">external_ref</span>
            <span className="chip">occurred_at</span>
          </div>

          {file && (
            <div className="mt-5 flex items-center justify-between rounded-[10px] border border-safe/20 bg-safe/[0.05] px-4 py-3">
              <span className="flex items-center gap-2.5 text-sm text-text">
                <FileSpreadsheet className="h-4 w-4 text-safe" aria-hidden="true" /> {file.name}
                <span className="text-xs text-textdim">({(file.size / 1024).toFixed(1)} KB)</span>
              </span>
              <button type="button" onClick={() => setFile(null)} className="rounded p-1 text-textdim transition-colors hover:text-text" aria-label="Remove file">
                <XCircle className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {uploadError && (
            <p className="mt-5 flex items-center gap-2.5 rounded-[10px] border border-alert/20 bg-alert/[0.06] px-4 py-3 text-sm text-alert" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {uploadError}
            </p>
          )}

          <button type="button" onClick={() => void upload()} disabled={!file || uploading} className="btn-primary mt-6 w-full">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Uploading & validating…
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" aria-hidden="true" /> Start batch screening
              </>
            )}
          </button>
        </section>

        {/* ── Active job module ─────────────────────────────────────────── */}
        <section>
          <div className="section-head">
            <h2 className="section-title">Active job</h2>
          </div>

          {!job && (
            <div className="panel-flat flex h-64 items-center justify-center px-8 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-textdim">
                Upload a CSV to start a batch job. Progress, status and results appear here.
              </p>
            </div>
          )}

          {job && (
            <div className="panel-em space-y-6 p-7" data-testid="batch-job-status">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5 text-sm text-text">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="truncate font-medium">{job.filename}</span>
                </div>
                <span
                  className={`badge ${
                    job.status === "done" ? "risk-low" : job.status === "failed" ? "risk-high" : "risk-medium"
                  }`}
                >
                  {job.status === "queued" && "Queued"}
                  {job.status === "processing" && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Processing
                    </>
                  )}
                  {job.status === "done" && (
                    <>
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Done
                    </>
                  )}
                  {job.status === "failed" && "Failed"}
                </span>
              </div>

              {/* Status rail */}
              {job.status !== "failed" && (
                <ol className="flex items-center gap-2" aria-label="Job progress steps">
                  {STATUS_STEPS.map((s, i) => {
                    const reached = i <= stepIndex;
                    const isCurrent = i === stepIndex;
                    return (
                      <li key={s.key} className="flex flex-1 items-center gap-2">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                            reached ? "border-accent/50 bg-accent/15 text-accent" : "border-border bg-surface text-textdim"
                          }`}
                          aria-hidden="true"
                        >
                          {reached && i < stepIndex ? "✓" : i + 1}
                        </span>
                        <span className={`text-2xs ${isCurrent ? "font-semibold text-text" : "text-textdim"}`}>{s.label}</span>
                        {i < STATUS_STEPS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
                      </li>
                    );
                  })}
                </ol>
              )}

              {(job.status === "queued" || job.status === "processing") && (
                <div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-border"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${Math.max(4, progress)}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex justify-between text-xs text-textdim">
                    <span>
                      {job.processed_rows} / {job.total_rows} rows
                    </span>
                    <span className="font-mono tabular-nums">{progress}%</span>
                  </div>
                </div>
              )}

              {job.status === "done" && (
                <>
                  <div className="grid grid-cols-2 gap-6 border-y border-border py-5">
                    <div>
                      <div className="metric-value text-3xl">{job.processed_rows}</div>
                      <div className="label-sm mt-1.5">Rows screened</div>
                    </div>
                    <div>
                      <div className="metric-value text-3xl text-alert">{job.flagged_rows}</div>
                      <div className="label-sm mt-1.5">HIGH risk flagged</div>
                    </div>
                  </div>
                  <a
                    href={apiClient.batchDownloadUrl(job.id)}
                    className="btn-primary w-full"
                    download
                    onClick={() => toast.push("Results downloaded")}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" /> Download results (CSV)
                  </a>
                  <p className="text-xs leading-relaxed text-textdim">
                    Results include per-row fraud probability, prediction, risk category and triggered rules.
                  </p>
                </>
              )}

              {job.status === "failed" && (
                <p className="rounded-[10px] border border-alert/20 bg-alert/[0.06] px-4 py-3 text-sm text-alert" role="alert">
                  {job.error ?? "The job failed."}
                </p>
              )}
            </div>
          )}

          {job?.preview && job.status === "done" && (
            <details className="mt-5">
              <summary className="cursor-pointer text-[13px] font-semibold text-accent transition-colors hover:text-text">
                Preview result rows
              </summary>
              <div className="mt-3 max-h-72 overflow-auto rounded-card border border-border">
                <table className="data-table min-w-[460px]">
                  <thead className="sticky top-0 bg-surface">
                    <tr>
                      <th className="px-4">Ref</th>
                      <th className="px-4 text-right">Amount</th>
                      <th className="px-4 text-right">Probability</th>
                      <th className="px-4">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.preview.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 font-mono text-2xs text-textdim">{String(row.external_ref ?? "")}</td>
                        <td className="num px-4 text-right text-text">${String(row.amount ?? "")}</td>
                        <td className="num px-4 text-right text-text">{formatProbability(Number(row.fraud_probability ?? 0))}</td>
                        <td className="px-4">
                          <RiskBadge risk={(row.risk_category as "LOW" | "MEDIUM" | "HIGH") ?? "LOW"} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </section>
      </div>

      {/* ── Job history ────────────────────────────────────────────────── */}
      <section>
        <div className="section-head">
          <h2 className="section-title">Job history</h2>
        </div>
        {jobs.isLoading && <LoadingRows rows={3} />}
        {jobs.isError && <ErrorState message={apiErrorMessage(jobs.error)} onRetry={() => void jobs.refetch()} />}
        {jobs.data && jobs.data.items.length === 0 && (
          <EmptyState
            title="No batch analysis yet"
            hint="Upload a CSV containing the required anonymized transaction features (Time, V1–V28, Amount)."
            action={
              <button type="button" onClick={() => inputRef.current?.click()} className="btn-primary btn-sm">
                <UploadCloud className="h-4 w-4" aria-hidden="true" /> Upload CSV
              </button>
            }
          />
        )}
        {jobs.data && jobs.data.items.length > 0 && (
          <ul className="divide-y divide-border">
            {jobs.data.items.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-text">{j.filename}</div>
                  <div className="mt-0.5 text-xs text-textdim">
                    {formatDateTime(j.created_at)} · {j.processed_rows}/{j.total_rows} rows · {j.flagged_rows} flagged
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`badge ${j.status === "done" ? "risk-low" : j.status === "failed" ? "risk-high" : "risk-medium"}`}
                  >
                    {j.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveJobId(j.id)}
                    className="text-[13px] font-semibold text-accent transition-colors hover:text-text"
                  >
                    Inspect
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
