import type { ReactNode } from "react";

/**
 * Page masthead: eyebrow → title → description → actions.
 * Typography carries the page; description is comfortably readable.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-3 flex items-center gap-2">
            <span className="h-[3px] w-[3px] rounded-full bg-accent" aria-hidden="true" />
            <span className="eyebrow">{eyebrow}</span>
          </div>
        )}
        <h1 className="h1">{title}</h1>
        {description && <p className="lede">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </header>
  );
}
