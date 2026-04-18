"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  MessageSquareWarning,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { CommunicationSnapshot } from "@/lib/business";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardCommunicationsProps = {
  initialSnapshot: CommunicationSnapshot;
};

type ReminderRunResult = {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
};

type RetryResult = {
  status?: "sent" | "failed" | "skipped" | "duplicate" | "missing";
  channel?: "EMAIL" | "SMS";
  reason?: string;
  error?: string;
};

type NotificationFilter = "ALL" | "ATTENTION" | "FAILED" | "REMINDERS";
type ChannelFilter = "ALL" | "EMAIL" | "SMS";

const kindLabels: Record<CommunicationSnapshot["notifications"][number]["kind"], string> = {
  BOOKING_CREATED: "Reserva criada",
  BOOKING_CONFIRMED: "Confirmada",
  BOOKING_CANCELLED: "Cancelada",
  BOOKING_CANCELLED_INTERNAL: "Aviso interno",
  BOOKING_RESCHEDULED: "Remarcada",
  BOOKING_REMINDER: "Lembrete",
  BOOKING_CONFIRMATION_REQUEST: "Pedido confirmação",
  BOOKING_ADVANCEMENT: "Adiantamento",
};

const statusLabels: Record<CommunicationSnapshot["notifications"][number]["status"], string> = {
  PENDING: "Pendente",
  SENT: "Enviado",
  FAILED: "Falhou",
  SKIPPED: "Ignorado",
};

const statusColors: Record<CommunicationSnapshot["notifications"][number]["status"], string> = {
  PENDING: "bg-amber-500/15 text-amber-700",
  SENT: "bg-emerald-500/15 text-emerald-700",
  FAILED: "bg-red-500/15 text-red-700",
  SKIPPED: "bg-zinc-500/15 text-zinc-600",
};

const runStatusLabels: Record<
  NonNullable<CommunicationSnapshot["reminderEngine"]["latestRun"]>["status"],
  string
> = {
  SUCCESS: "Saudável",
  FAILED: "Falhou",
  UNAUTHORIZED: "Não autorizado",
  MISCONFIGURED: "Por configurar",
};

const runStatusColors: Record<
  NonNullable<CommunicationSnapshot["reminderEngine"]["latestRun"]>["status"],
  string
> = {
  SUCCESS: "bg-emerald-500/15 text-emerald-700",
  FAILED: "bg-red-500/15 text-red-700",
  UNAUTHORIZED: "bg-red-500/15 text-red-700",
  MISCONFIGURED: "bg-amber-500/15 text-amber-700",
};

function buildReminderSummary(result: ReminderRunResult) {
  return `Varredura concluída: ${result.scanned} reservas analisadas, ${result.sent} envios, ${result.skipped} ignorados e ${result.failed} falhas.`;
}

function buildRetrySummary(result: RetryResult) {
  if (result.status === "sent") return "Entrega repetida com sucesso.";
  if (result.status === "duplicate") return "Esta comunicação já tinha um envio confirmado.";
  if (result.status === "skipped") return "Repetição ignorada — faltam dados ou configuração.";
  if (result.status === "failed") return result.reason ?? "A entrega voltou a falhar.";
  return result.error ?? "Não foi possível repetir a entrega.";
}

function ActivityChart({ notifications }: { notifications: CommunicationSnapshot["notifications"] }) {
  const days = useMemo(() => {
    const now = new Date();
    const result: { label: string; sent: number; failed: number; other: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayKey = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "");

      let sent = 0;
      let failed = 0;
      let other = 0;

      for (const n of notifications) {
        const nDay = new Date(n.createdAt).toISOString().slice(0, 10);
        if (nDay === dayKey) {
          if (n.status === "SENT") sent++;
          else if (n.status === "FAILED") failed++;
          else other++;
        }
      }

      result.push({ label: dayLabel, sent, failed, other });
    }

    return result;
  }, [notifications]);

  const maxVal = Math.max(1, ...days.map((d) => d.sent + d.failed + d.other));

  return (
    <div className="flex items-end gap-2 sm:gap-3">
      {days.map((day) => {
        const total = day.sent + day.failed + day.other;
        const heightPct = Math.max(total > 0 ? 12 : 4, (total / maxVal) * 100);

        return (
          <div key={day.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="relative flex w-full flex-col items-center">
              {total > 0 && (
                <span className="mb-1 text-[10px] font-medium text-muted-foreground">
                  {total}
                </span>
              )}
              <div
                className="w-full max-w-[32px] rounded-md transition-all"
                style={{ height: `${heightPct}px` }}
              >
                {day.failed > 0 && (
                  <div
                    className="w-full rounded-t-md bg-red-400/70"
                    style={{ height: `${(day.failed / total) * 100}%` }}
                  />
                )}
                <div
                  className={cn(
                    "w-full",
                    day.failed > 0 ? "" : "rounded-t-md",
                    "rounded-b-md",
                    total > 0 ? "bg-emerald-500/60" : "bg-muted/40"
                  )}
                  style={{
                    height: total > 0 ? `${((day.sent + day.other) / total) * 100}%` : "100%",
                  }}
                />
              </div>
            </div>
            <span className="text-[10px] capitalize text-muted-foreground">{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardCommunications({ initialSnapshot }: DashboardCommunicationsProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshing] = useTransition();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>("ALL");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("ALL");

  const filteredNotifications = useMemo(() => {
    return initialSnapshot.notifications.filter((notification) => {
      const matchesNotificationFilter =
        notificationFilter === "ALL"
          ? true
          : notificationFilter === "ATTENTION"
            ? notification.status === "FAILED" || notification.status === "SKIPPED"
            : notificationFilter === "FAILED"
              ? notification.status === "FAILED"
              : notification.kind === "BOOKING_REMINDER";

      const matchesChannelFilter = channelFilter === "ALL" ? true : notification.channel === channelFilter;

      return matchesNotificationFilter && matchesChannelFilter;
    });
  }, [channelFilter, initialSnapshot.notifications, notificationFilter]);

  async function refreshDashboard() {
    startRefreshing(() => {
      router.refresh();
    });
  }

  async function runReminderSweep() {
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/communications/reminders", {
        method: "POST",
      });
      const payload = (await response.json()) as Partial<ReminderRunResult> & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível executar a varredura de lembretes.");
      }

      setFeedback(
        buildReminderSummary({
          scanned: payload.scanned ?? 0,
          sent: payload.sent ?? 0,
          skipped: payload.skipped ?? 0,
          failed: payload.failed ?? 0,
        })
      );

      await refreshDashboard();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Erro inesperado ao executar lembretes.");
    }
  }

  async function retryNotification(notificationId: string) {
    setRetryingId(notificationId);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/communications/logs/${notificationId}/retry`, {
        method: "POST",
      });
      const payload = (await response.json()) as RetryResult;

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível repetir a entrega.");
      }

      const summary = buildRetrySummary(payload);
      if (payload.status === "failed") {
        setError(summary);
      } else {
        setFeedback(summary);
      }

      await refreshDashboard();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Erro inesperado ao repetir entrega.");
    } finally {
      setRetryingId(null);
    }
  }

  const engineRun = initialSnapshot.reminderEngine.latestRun;
  const totalNotifications = initialSnapshot.notifications.length;
  const sentCount = initialSnapshot.notifications.filter((n) => n.status === "SENT").length;
  const failedCount = initialSnapshot.notifications.filter((n) => n.status === "FAILED").length;

  return (
    <div className="grid gap-6">
      {feedback && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-emerald-500/10 px-4 py-3">
          <p className="text-xs font-medium text-emerald-700/70">Enviados (24h)</p>
          <p className="mt-1 font-heading text-2xl font-bold text-emerald-700">
            {initialSnapshot.totals.sentLast24h}
          </p>
        </div>
        <div className="rounded-xl bg-red-500/10 px-4 py-3">
          <p className="text-xs font-medium text-red-700/70">Falhas (24h)</p>
          <p className="mt-1 font-heading text-2xl font-bold text-red-700">
            {initialSnapshot.totals.failedLast24h}
          </p>
        </div>
        <div className="rounded-xl bg-sky-500/10 px-4 py-3">
          <p className="text-xs font-medium text-sky-700/70">Total enviados</p>
          <p className="mt-1 font-heading text-2xl font-bold text-sky-700">{sentCount}</p>
        </div>
        <div className="rounded-xl bg-amber-500/10 px-4 py-3">
          <p className="text-xs font-medium text-amber-700/70">Total registos</p>
          <p className="mt-1 font-heading text-2xl font-bold text-amber-700">{totalNotifications}</p>
        </div>
      </div>

      {/* Activity chart + engine status */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-border/60 bg-background p-5">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
            Atividade dos últimos 7 dias
          </h3>
          <ActivityChart notifications={initialSnapshot.notifications} />
          <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-sm bg-emerald-500/60" /> Enviados
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-sm bg-red-400/70" /> Falhas
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background p-5">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Motor de lembretes</h3>
          {engineRun ? (
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", runStatusColors[engineRun.status])}>
                  {runStatusLabels[engineRun.status]}
                </span>
                <span className="text-xs text-muted-foreground">{engineRun.source}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Última execução:{" "}
                {new Date(engineRun.createdAt).toLocaleString("pt-PT", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/40 px-2 py-2">
                  <p className="font-heading text-lg font-bold">{engineRun.sent}</p>
                  <p className="text-[10px] text-muted-foreground">Enviados</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-2 py-2">
                  <p className="font-heading text-lg font-bold">{engineRun.skipped}</p>
                  <p className="text-[10px] text-muted-foreground">Ignorados</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-2 py-2">
                  <p className="font-heading text-lg font-bold">{engineRun.failed}</p>
                  <p className="text-[10px] text-muted-foreground">Falhas</p>
                </div>
              </div>
              {engineRun.errorMessage && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {engineRun.errorMessage}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma execução registada.</p>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-4 w-full"
            onClick={() => void runReminderSweep()}
            disabled={isRefreshing}
          >
            {isRefreshing ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Executar lembretes
          </Button>
        </div>
      </div>

      {/* Channel status - compact row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Email", configured: initialSnapshot.channels.emailConfigured, Icon: Mail },
          { label: "SMS", configured: initialSnapshot.channels.smsConfigured, Icon: Smartphone },
          { label: "Endpoint", configured: initialSnapshot.channels.cronSecretConfigured, Icon: ShieldCheck },
        ].map((ch) => (
          <div
            key={ch.label}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3",
              ch.configured
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-border/60 bg-muted/20"
            )}
          >
            <ch.Icon className={cn("size-4", ch.configured ? "text-emerald-600" : "text-muted-foreground")} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{ch.label}</p>
            </div>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                ch.configured ? "bg-emerald-500/15 text-emerald-700" : "bg-muted/40 text-muted-foreground"
              )}
            >
              {ch.configured ? "Ativo" : "Pendente"}
            </span>
          </div>
        ))}
      </div>

      {/* Notification log */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Histórico de envios</h3>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["ALL", "Todos"],
                ["ATTENTION", "Ação"],
                ["FAILED", "Falhas"],
                ["REMINDERS", "Lembretes"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setNotificationFilter(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  notificationFilter === key
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {(
            [
              ["ALL", "Todos"],
              ["EMAIL", "Email"],
              ["SMS", "SMS"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setChannelFilter(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                channelFilter === key
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">
            {filteredNotifications.length} registos
          </span>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            Sem registos para este filtro.
          </div>
        ) : (
          <div className="grid gap-2">
            {filteredNotifications.map((notification) => {
              const canRetry = notification.status !== "SENT";

              return (
                <div
                  key={notification.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-background px-4 py-3"
                >
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", statusColors[notification.status])}>
                    {statusLabels[notification.status]}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{notification.booking.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {kindLabels[notification.kind]} · {notification.booking.serviceName} ·{" "}
                      {new Date(notification.booking.startsAt).toLocaleDateString("pt-PT")} ·{" "}
                      {new Date(notification.booking.startsAt).toLocaleTimeString("pt-PT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {notification.errorMessage && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <MessageSquareWarning className="size-3" />
                        {notification.errorMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {notification.channel}
                    </Badge>
                    <span>
                      {new Date(notification.createdAt).toLocaleString("pt-PT", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {notification.sentAt && (
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                    )}
                  </div>

                  {canRetry && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={retryingId === notification.id || isRefreshing}
                      onClick={() => void retryNotification(notification.id)}
                    >
                      {retryingId === notification.id ? (
                        <LoaderCircle className="size-3 animate-spin" />
                      ) : (
                        <RotateCcw className="size-3" />
                      )}
                      Repetir
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
