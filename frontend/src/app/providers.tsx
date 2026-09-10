import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { ToastProvider } from "@/lib/toast";
import { ThemeProvider } from "@/app/theme";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } } });
export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}><ToastProvider><ThemeProvider><BrowserRouter>{children}</BrowserRouter></ThemeProvider></ToastProvider></QueryClientProvider>;
}
