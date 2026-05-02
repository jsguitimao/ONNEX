import type { ReactNode } from "react";

type Props = {
  step: number;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
};

export function SectionShell({ step, title, description, icon, children }: Props) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <header className="mb-4 flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background"
        >
          {icon ?? step}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
