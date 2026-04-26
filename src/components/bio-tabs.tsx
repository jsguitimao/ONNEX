"use client";

import { useBookingSheet } from "@/components/booking-sheet";

type Tab =
  | { id: string; label: string; kind: "anchor" }
  | { id: string; label: string; kind: "booking" };

const TABS: Tab[] = [
  { id: "servicos", label: "Serviços", kind: "anchor" },
  { id: "equipa", label: "Equipa", kind: "anchor" },
  { id: "agendar", label: "Agendar", kind: "booking" },
];

const linkClass = "text-[#a1a1aa] transition hover:text-[#fafafa]";
const linkStyle = {
  fontSize: "var(--text-bio-tab)",
  lineHeight: "var(--text-bio-tab-line)",
  fontWeight: 500,
} as const;

export function BioTabs() {
  const { open } = useBookingSheet();

  return (
    <nav
      aria-label="Navegação rápida"
      className="overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex min-w-max items-center justify-center gap-6 pb-1 pt-1">
        {TABS.map((tab) => (
          <li key={tab.id}>
            {tab.kind === "anchor" ? (
              <a href={`#${tab.id}`} className={linkClass} style={linkStyle}>
                {tab.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => open()}
                className={linkClass}
                style={{ ...linkStyle, cursor: "pointer" }}
              >
                {tab.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
