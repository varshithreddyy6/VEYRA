import type { HealthStatus } from "@/types";

/**
 * Honest system status strip. Every value comes from the real
 * GET /api/v1/health response; nothing is invented or assumed.
 * Unavailable dependencies are labelled as such.
 */
export function SystemStatus({ health }: { health: HealthStatus }) {
  const items: Array<{ label: string; ok: boolean; detail: string }> = [
    {
      label: "API",
      ok: health.status === "ok",
      detail: health.status === "ok" ? "operational" : "degraded",
    },
    {
      label: "Model",
      ok: health.model.available,
      detail: health.model.available ? `v${health.model.version ?? ""}` : "not trained",
    },
    {
      label: "Database",
      ok: health.database.status === "up",
      detail: health.database.status === "up" ? "connected" : health.database.error ?? "unavailable",
    },
    {
      label: "Queue",
      ok: health.redis_backend !== "unavailable",
      detail:
        health.redis_backend === "redis"
          ? "redis"
          : health.redis_backend === "memory"
            ? "in-process fallback"
            : "unavailable",
    },
  ];

  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-textdim" aria-label="System status">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${i.ok ? "bg-safe" : "bg-alert"}`}
            aria-hidden="true"
            title={i.ok ? `${i.label}: ${i.detail}` : `${i.label}: ${i.detail}`}
          />
          <span className="font-medium text-text">{i.label}</span>
          <span>{i.detail}</span>
        </li>
      ))}
    </ul>
  );
}
