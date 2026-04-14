"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-PT">
      <body className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <main className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">Erro inesperado</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Ocorreu um problema a carregar a aplicação.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            O erro foi registado. Tenta novamente agora ou volta a recarregar a página dentro de instantes.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
