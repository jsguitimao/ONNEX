import type { ReactNode } from "react";

type BioSectionProps = {
  id?: string;
  title: string;
  headerAction?: ReactNode;
  children: ReactNode;
};

export function BioSection({ id, title, headerAction, children }: BioSectionProps) {
  return (
    <section id={id} className="flex flex-col gap-3 px-4 pt-4">
      <header className="flex items-center justify-between gap-3">
        <h2
          className="font-semibold text-[#fafafa]"
          style={{
            fontSize: "var(--text-bio-section)",
            lineHeight: "var(--text-bio-section-line)",
            letterSpacing: "var(--text-bio-section-tracking)",
          }}
        >
          {title}
        </h2>
        {headerAction ?? null}
      </header>
      {children}
    </section>
  );
}
