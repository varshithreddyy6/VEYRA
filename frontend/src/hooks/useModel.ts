import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { apiClient } from "@/lib/api";

export function useModelInfo() {
  const authenticated = useAuthStore((s) => s.status === "authenticated");
  return useQuery({
    queryKey: ["model-info"],
    queryFn: () => apiClient.modelInfo(),
    enabled: authenticated,
    staleTime: 60_000,
  });
}

export function useModelMetrics() {
  const authenticated = useAuthStore((s) => s.status === "authenticated");
  return useQuery({
    queryKey: ["model-metrics"],
    queryFn: () => apiClient.modelMetrics(),
    enabled: authenticated,
    staleTime: 60_000,
  });
}

export function useGlobalExplanation() {
  const authenticated = useAuthStore((s) => s.status === "authenticated");
  return useQuery({
    queryKey: ["global-explanation"],
    queryFn: () => apiClient.globalExplanation(),
    enabled: authenticated,
    retry: false,
    staleTime: 120_000,
  });
}
