"use client";

import { useState } from "react";
import { Download, LoaderCircle, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const REQUIRED_CONFIRMATION = "APAGAR";

export function AccountDataPanel() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  async function handleExport() {
    setExporting(true);
    setExportError(null);

    try {
      const response = await fetch("/api/account/export");

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Erro ao exportar dados.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bukly-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Erro ao exportar dados.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Erro ao apagar conta.");
      }

      setDeleted(true);
      // Forçar logout/redirect — a sessão Clerk já não tem registo associado.
      window.location.href = "/";
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Erro ao apagar conta.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <header className="mb-4">
        <h3 className="text-lg font-semibold">Os meus dados</h3>
        <p className="text-sm text-muted-foreground">
          Conforme o RGPD podes exportar todos os dados do teu negócio ou apagar a conta a qualquer momento.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <div className="mb-3 flex items-center gap-2">
            <Download className="size-4 text-foreground/70" />
            <h4 className="text-sm font-semibold">Exportar dados</h4>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Recebe um JSON com utilizador, negócios, serviços, equipa, clientes e marcações.
          </p>
          <Button onClick={handleExport} disabled={exporting} variant="secondary">
            {exporting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
            Exportar JSON
          </Button>
          {exportError ? (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {exportError}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" />
            <h4 className="text-sm font-semibold text-destructive">Apagar conta</h4>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Esta ação é permanente: apaga negócio, marcações, clientes e profissionais. Para confirmar
            escreve <span className="font-mono font-semibold">{REQUIRED_CONFIRMATION}</span>.
          </p>
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={REQUIRED_CONFIRMATION}
            disabled={deleting || deleted}
            aria-label="Confirmação para apagar conta"
            className="mb-3"
          />
          <Button
            onClick={handleDelete}
            disabled={confirmation !== REQUIRED_CONFIRMATION || deleting || deleted}
            variant="destructive"
          >
            {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Apagar conta permanentemente
          </Button>
          {deleteError ? (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {deleteError}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
