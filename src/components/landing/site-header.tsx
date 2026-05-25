"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Menu, Scissors, X } from "lucide-react";

const NAV_LINKS = [
  { href: "#servicos", label: "Serviços" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#avaliacoes", label: "Avaliações" },
  { href: "#faq", label: "Perguntas" },
];

const BOOKING_URL = "/mock";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b transition-colors",
        scrolled
          ? "border-primary-foreground/10 bg-primary/90 backdrop-blur"
          : "border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 text-primary-foreground sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2.5" aria-label="ONNEX Barbearia">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--chart-3)] text-primary">
            <Scissors className="size-4" />
          </span>
          <span className="text-base font-semibold tracking-wide">
            ONNEX<span className="text-primary-foreground/55">.PT</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-primary-foreground/75 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-primary-foreground">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={BOOKING_URL}
            className="hidden h-10 items-center gap-2 rounded-lg bg-[var(--chart-3)] px-4 text-sm font-semibold text-primary transition hover:opacity-90 sm:inline-flex"
          >
            <CalendarCheck className="size-4" />
            Agendar
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-primary-foreground/20 text-primary-foreground transition hover:bg-primary-foreground/10 md:hidden"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-primary-foreground/10 bg-primary md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base text-primary-foreground/80 transition hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                {link.label}
              </a>
            ))}
            <Link
              href={BOOKING_URL}
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--chart-3)] text-base font-semibold text-primary"
            >
              <CalendarCheck className="size-5" />
              Agendar agora
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
