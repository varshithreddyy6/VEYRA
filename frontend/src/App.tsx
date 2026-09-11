import { useEffect } from "react";
import { AppProviders } from "@/app/providers";
import { AppRouter } from "@/app/router";
import { bindSessionExpiry } from "@/lib/auth";

export default function App() {
  useEffect(() => bindSessionExpiry(), []);
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
