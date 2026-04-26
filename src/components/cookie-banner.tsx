"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "bukly.cookieConsent.v1";

type Decision = "accepted" | "rejected";

function readDecision(): Decision | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "accepted" || value === "rejected") return value;
    return null;
  } catch {
    return null;
  }
}

function writeDecision(decision: Decision) {
  try {
    window.localStorage.setItem(STORAGE_KEY, decision);
  } catch {
    // localStorage indisponível (incógnito etc.) — ignorar.
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readDecision() === null) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function decide(decision: Decision) {
    writeDecision(decision);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <Cookie className="size-4" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">Cookies essenciais</p>
          <p className="text-xs text-muted-foreground">
            Usamos apenas cookies necessários para autenticação e funcionamento da plataforma. Não fazemos
            tracking publicitário. Vê os detalhes em{" "}
            <Link href="/privacidade" className="underline underline-offset-2">
              Privacidade
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-2 sm:flex-col">
          <Button variant="outline" onClick={() => decide("rejected")} className="w-full sm:w-auto">
            Apenas essenciais
          </Button>
          <Button onClick={() => decide("accepted")} className="w-full sm:w-auto">
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}
