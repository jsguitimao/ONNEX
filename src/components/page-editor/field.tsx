import type { ReactNode } from "react";

type Props = {
  label: string;
  hint?: string;
  counter?: string;
  children: ReactNode;
};

export function Field({ label, hint, counter, children }: Props) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-xs font-medium text-foreground">
        <span>{label}</span>
        {counter ? <span className="text-muted-foreground tabular-nums">{counter}</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
