"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Download,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";
import {
  confirmClientListLockResetAction,
  requestClientListLockResetAction,
} from "@/app/crm/actions";

export type CrmSubscriptionInfo = {
  statusLabel: string;
  statusTone: "ok" | "warn" | "bad";
  planLabel: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
};

const DELETE_CONFIRMATION = "APAGAR CONTA";

type Props = {
  subscription: CrmSubscriptionInfo;
  clientListLockEnabled: boolean;
  onClientListLockReset: () => void;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "long" }).format(new Date(iso));
}

export function AccountPanel({ subscription, clientListLockEnabled, onClientListLockReset }: Props) {
  const { signOut } = useClerk();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportCodeOpen, setExportCodeOpen] = useState(false);
  const [exportCode, setExportCode] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleExport(code?: string) {
    setExporting(true);
    setExportError("");
    try {
      const response = await fetch("/api/account/export", {
        headers: code ? { "x-onnex-code": code } : undefined,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setExportError(body?.error ?? "Não foi possível exportar os dados.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `onnex-dados-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportCodeOpen(false);
      setExportCode("");
    } catch {
      setExportError("Não foi possível exportar os dados. Tenta novamente.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setDeleteError(body?.error ?? "Não foi possível apagar a conta.");
        setDeleting(false);
        return;
      }
      // A conta já não existe no servidor; terminar a sessão local e voltar à landing.
      try {
        await signOut({ redirectUrl: "/" });
      } catch {
        window.location.href = "/";
      }
    } catch {
      setDeleteError("Não foi possível apagar a conta. Tenta novamente.");
      setDeleting(false);
    }
  }

  const confirmationMatches = confirmation === DELETE_CONFIRMATION;

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Plano e subscrição</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Estado atual da tua subscrição ONNEX Pro.
            </p>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <dt className="w-36 shrink-0 text-muted-foreground">Estado</dt>
                <dd>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      subscription.statusTone === "ok" && "bg-emerald-500/15 text-emerald-600",
                      subscription.statusTone === "warn" && "bg-amber-500/15 text-amber-600",
                      subscription.statusTone === "bad" && "bg-destructive/15 text-destructive",
                    )}
                  >
                    {subscription.statusLabel}
                  </span>
                </dd>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <dt className="w-36 shrink-0 text-muted-foreground">Plano</dt>
                <dd className="font-medium">{subscription.planLabel}</dd>
              </div>
              {subscription.periodEnd ? (
                <div className="flex flex-wrap items-center gap-2">
                  <dt className="w-36 shrink-0 text-muted-foreground">
                    {subscription.cancelAtPeriodEnd ? "Termina a" : "Próxima renovação"}
                  </dt>
                  <dd className="font-medium">{formatDate(subscription.periodEnd)}</dd>
                </div>
              ) : null}
            </dl>
            {subscription.cancelAtPeriodEnd ? (
              <p className="mt-3 text-xs text-amber-600">
                A renovação automática está cancelada. Mantens o acesso até ao fim do período já
                pago.
              </p>
            ) : null}
          </div>
          <div className="shrink-0">
            {subscription.hasStripeCustomer ? (
              <ManageSubscriptionButton label="Gerir subscrição" />
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  window.location.href = "/billing";
                }}
              >
                Ver planos
              </Button>
            )}
          </div>
        </div>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          Em «Gerir subscrição» podes mudar de plano, atualizar o cartão, ver faturas ou cancelar a
          renovação — tudo na página segura da Stripe.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Os teus dados</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Descarrega uma cópia de todos os dados da tua conta em formato JSON (RGPD).
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            {clientListLockEnabled && exportCodeOpen ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!exporting && exportCode.length >= 4) handleExport(exportCode);
                }}
                className="flex flex-wrap items-center gap-2"
              >
                <Input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={exportCode}
                  onChange={(event) => {
                    setExportCode(event.target.value.replace(/\D/g, "").slice(0, 8));
                    if (exportError) setExportError("");
                  }}
                  placeholder="Código"
                  className="h-9 w-32"
                  aria-label="Código de segurança"
                />
                <Button type="submit" variant="outline" disabled={exporting || exportCode.length < 4}>
                  {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  {exporting ? "A exportar…" : "Confirmar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={exporting}
                  onClick={() => {
                    setExportCodeOpen(false);
                    setExportCode("");
                    setExportError("");
                  }}
                >
                  Cancelar
                </Button>
              </form>
            ) : clientListLockEnabled ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setExportError("");
                  setExportCodeOpen(true);
                }}
              >
                <Lock className="size-4" />
                Exportar dados
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => handleExport()} disabled={exporting}>
                {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                {exporting ? "A exportar…" : "Exportar dados"}
              </Button>
            )}
            {exportError ? (
              <p role="alert" className="text-sm text-destructive">
                {exportError}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <ClientListLockResetSection
        enabled={clientListLockEnabled}
        onReset={onClientListLockReset}
      />

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Sessão</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Termina a sessão neste dispositivo. Os teus dados ficam intactos.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void signOut({ redirectUrl: "/" })}>
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Ajuda e suporte</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Encontraste um problema ou precisas de ajuda? Escreve-nos para{" "}
              <a
                href="mailto:onnex.pt@gmail.com"
                className="font-medium text-foreground underline underline-offset-2"
              >
                onnex.pt@gmail.com
              </a>
              .
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.location.href = "mailto:onnex.pt@gmail.com?subject=Ajuda%20ONNEX";
            }}
          >
            <Mail className="size-4" />
            Contactar suporte
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-destructive/40 bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <TriangleAlert className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-destructive">Apagar conta permanentemente</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Apaga a barbearia, a página pública, as marcações, os clientes e todos os dados da
              conta. A subscrição é cancelada de imediato. Esta ação não pode ser revertida.
            </p>

            {deleteOpen ? (
              <div className="mt-4 grid gap-3">
                <label htmlFor="delete-confirmation" className="text-xs text-muted-foreground">
                  Para confirmar, escreve <strong>{DELETE_CONFIRMATION}</strong> na caixa abaixo:
                </label>
                <input
                  id="delete-confirmation"
                  type="text"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={DELETE_CONFIRMATION}
                  autoComplete="off"
                  className="h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!confirmationMatches || deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    {deleting ? "A apagar…" : "Apagar tudo definitivamente"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleting}
                    onClick={() => {
                      setDeleteOpen(false);
                      setConfirmation("");
                      setDeleteError("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
                {deleteError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {deleteError}
                  </p>
                ) : null}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Quero apagar a minha conta
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ClientListLockResetSection({
  enabled,
  onReset,
}: {
  enabled: boolean;
  onReset: () => void;
}) {
  const [step, setStep] = useState<"idle" | "sent" | "done">("idle");
  const [info, setInfo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [requesting, startRequest] = useTransition();
  const [confirming, startConfirm] = useTransition();

  // Só faz sentido com proteção ativa (ou logo a seguir a repor, p/ ver o sucesso).
  if (!enabled && step !== "done") return null;

  function handleRequest() {
    setError(null);
    startRequest(async () => {
      const result = await requestClientListLockResetAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInfo(
        result.delivery === "email"
          ? `Enviámos um código de 6 dígitos para ${result.to}. Vê o email (e a pasta de spam).`
          : `Ambiente de teste (sem email configurado). O teu código é: ${result.code}`,
      );
      setStep("sent");
    });
  }

  function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirming || code.length !== 6) return;
    setError(null);
    startConfirm(async () => {
      const result = await confirmClientListLockResetAction(code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCode("");
      setStep("done");
      onReset();
      // A lista do 1.º profissional foi escondida no carregamento (server-gated) e
      // nunca chegou ao browser. Recarrega para o servidor reenviar tudo agora que
      // a proteção foi removida.
      window.setTimeout(() => window.location.reload(), 1800);
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <KeyRound className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Código de segurança das listas</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Esqueceste o código que protege as listas de Clientes, Financeiro e Agendamento?
            Enviamos um código para o email da tua conta para o poderes redefinir.
          </p>

          {step === "done" ? (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">
              <Check className="size-4 shrink-0" />
              <span>
                Proteção removida. Vai a <strong>Agendamento</strong> (ou Clientes/Financeiro) e
                define um novo código quando quiseres.
              </span>
            </div>
          ) : step === "idle" ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              disabled={requesting}
              onClick={handleRequest}
            >
              {requesting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Enviar código por email
            </Button>
          ) : (
            <div className="mt-4 grid gap-3">
              {info ? <p className="text-xs text-muted-foreground">{info}</p> : null}
              <form onSubmit={handleConfirm} className="flex flex-wrap items-center gap-2">
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    if (error) setError(null);
                  }}
                  placeholder="Código de 6 dígitos"
                  className="h-9 w-44"
                  aria-label="Código recebido por email"
                />
                <Button type="submit" size="sm" disabled={confirming || code.length !== 6}>
                  {confirming ? <Loader2 className="size-4 animate-spin" /> : null}
                  Confirmar
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={requesting} onClick={handleRequest}>
                  Reenviar
                </Button>
              </form>
            </div>
          )}

          {error ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
