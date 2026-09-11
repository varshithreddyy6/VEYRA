import { useEffect } from "react";

/** Sets the browser tab title: "VEYRA — <page>". */
export function usePageTitle(page: string): void {
  useEffect(() => {
    document.title = `VEYRA — ${page}`;
  }, [page]);
}
