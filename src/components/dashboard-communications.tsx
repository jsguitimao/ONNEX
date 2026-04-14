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
  Siren,
  Smartphone,
} from "lucide-react";
import type { CommunicationSnapshot } from "@/lib/business";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  BOOKING_CONFIRMED: "Reserva confirmada",
  BOOKING_CANCELLED: "Reserva cancelada",
  BOOKING_CANCELLED_INTERNAL: "Aviso interno de cancelamento",
  BOOKING_RESCHEDULED: "Reserva remarcada",
  BOOKING_REMINDER: "Lembrete automatico",
};

const statusLabels: Record<CommunicationSnapshot["notifications"][number]["status"], string> = {
  PENDING: "Pendente",
  SENT: "Enviado",
  FAILED: "Falhou",
  SKIPPED: "Ignorado",
};

const statusVariants: Record<
  CommunicationSnapshot["notifications"][number]["status"],
  "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  SENT: "secondary",
  FAILED: "destructive",
  SKIPPED: "outline",
};

const runStatusLabels: Record<
  NonNullable<CommunicationSnapshot["reminderEngine"]["latestRun"]>["status"],
  string
> = {
  SUCCESS: "Saudavel",
  FAILED: "Falhou",
  UNAUTHORIZED: "Nao autorizado",
  MISCONFIGURED: "Por configurar",
};

const runStatusVariants: Record<
  NonNullable<CommunicationSnapshot["reminderEngine"]["latestRun"]>["status"],
  "secondary" | "destructive" | "outline"
> = {
  SUCCESS: "secondary",
  FAILED: "destructive",
  UNAUTHORIZED: "destructive",
  MISCONFIGURED: "outline",
};

function ChannelState({
  label,
  configured,
  icon: Icon,
}: {
  label: string;
  configured: boolean;
  icon: typeof Mail;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            {configured ? "Configurado e pronto a enviar" : "Ainda precisa de configuracao"}
          </p>
        </div>
      </div>
      <Badge variant={configured ? "secondary" : "outline"}>{configured ? "Ativo" : "Pendente"}</Badge>
    </div>
  );
}

function buildReminderSummary(result: ReminderRunResult) {
  return `Varredura concluida: ${result.scanned} reservas analisadas, ${result.sent} envios, ${result.skipped} ignorados e ${result.failed} falhas.`;
}

function buildRetrySummary(result: RetryResult) {
  if (result.status === "sent") {
    return "Entrega repetida com sucesso.";
  }

  if (result.status === "duplicate") {
    return "Esta comunicacao ja tinha um envio confirmado para o mesmo destinatario.";
  }

  if (result.status === "skipped") {
    return "A repeticao foi ignorada porque ainda faltam dados ou configuracao do canal.";
  }

  if (result.status === "failed") {
    return result.reason ?? "A entrega voltou a falhar.";
  }

  return result.error ?? "Nao foi possivel repetir a entrega.";
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
        throw new Error(payload.error ?? "Nao foi possivel executar a varredura de lembretes.");
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
        throw new Error(payload.error ?? "Nao foi possivel repetir a entrega.");
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

  return (
    <Card className="mt-6 border-border/70">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="font-heading text-2xl">Comunicacao e lembretes</CardTitle>
            <CardDescription>
              Estado dos canais e historico recente de confirmacoes, cancelamentos, remarcacoes e lembretes.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{initialSnapshot.totals.sentLast24h} enviados em 24h</Badge>
            <Badge variant={initialSnapshot.totals.failedLast24h > 0 ? "destructive" : "outline"}>
              {initialSnapshot.totals.failedLast24h} falhas
            </Badge>
            <Badge variant="outline">{initialSnapshot.totals.skippedLast24h} ignorados</Badge>
            <Button variant="outline" onClick={() => void runReminderSweep()} disabled={isRefreshing}>
              {isRefreshing ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Executar lembretes agora
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6">
        {feedback ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <ChannelState label="Email transacional" configured={initialSnapshot.channels.emailConfigured} icon={Mail} />
          <ChannelState label="SMS transacional" configured={initialSnapshot.channels.smsConfigured} icon={Smartphone} />
          <ChannelState
            label="Endpoint de lembretes"
            configured={initialSnapshot.channels.cronSecretConfigured}
            icon={ShieldCheck}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <p className="font-medium">Saude do agendador</p>
            </div>

            {initialSnapshot.reminderEngine.latestRun ? (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={runStatusVariants[initialSnapshot.reminderEngine.latestRun.status]}>
                    {runStatusLabels[initialSnapshot.reminderEngine.latestRun.status]}
                  </Badge>
                  <Badge variant="outline">{initialSnapshot.reminderEngine.latestRun.source}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ultima execucao:{" "}
                  {new Date(initialSnapshot.reminderEngine.latestRun.createdAt).toLocaleString("pt-PT", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  Analisadas {initialSnapshot.reminderEngine.latestRun.scanned} reservas, com{" "}
                  {initialSnapshot.reminderEngine.latestRun.sent} envios,{" "}
                  {initialSnapshot.reminderEngine.latestRun.skipped} ignorados e{" "}
                  {initialSnapshot.reminderEngine.latestRun.failed} falhas.
                </p>
                {initialSnapshot.reminderEngine.latestRun.errorMessage ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {initialSnapshot.reminderEngine.latestRun.errorMessage}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                Ainda nao ha execucoes registadas do motor de lembretes.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
            <div className="mb-3 flex items-center gap-2">
              <RefreshCw className="size-4 text-primary" />
              <p className="font-medium">Ultimas execucoes do motor</p>
            </div>

            {initialSnapshot.reminderEngine.runs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                Ainda nao ha historico do agendador.
              </div>
            ) : (
              <div className="grid gap-3">
                {initialSnapshot.reminderEngine.runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={runStatusVariants[run.status]}>{runStatusLabels[run.status]}</Badge>
                        <Badge variant="outline">{run.source}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {new Date(run.createdAt).toLocaleString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="text-sm text-muted-foreground md:text-right">
                      <p>{run.scanned} analisadas</p>
                      <p>{run.sent} enviadas · {run.failed} falhas</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-muted/20 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-primary" />
              <p className="font-medium">Ultimos envios</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={notificationFilter === "ALL" ? "default" : "outline"}
                onClick={() => setNotificationFilter("ALL")}
              >
                Todos
              </Button>
              <Button
                variant={notificationFilter === "ATTENTION" ? "default" : "outline"}
                onClick={() => setNotificationFilter("ATTENTION")}
              >
                Pedem acao
              </Button>
              <Button
                variant={notificationFilter === "FAILED" ? "default" : "outline"}
                onClick={() => setNotificationFilter("FAILED")}
              >
                Falharam
              </Button>
              <Button
                variant={notificationFilter === "REMINDERS" ? "default" : "outline"}
                onClick={() => setNotificationFilter("REMINDERS")}
              >
                Lembretes
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button
              variant={channelFilter === "ALL" ? "default" : "outline"}
              onClick={() => setChannelFilter("ALL")}
            >
              Todos os canais
            </Button>
            <Button
              variant={channelFilter === "EMAIL" ? "default" : "outline"}
              onClick={() => setChannelFilter("EMAIL")}
            >
              Email
            </Button>
            <Button
              variant={channelFilter === "SMS" ? "default" : "outline"}
              onClick={() => setChannelFilter("SMS")}
            >
              SMS
            </Button>
            <span className="text-sm text-muted-foreground">{filteredNotifications.length} registos no filtro atual</span>
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
              Nao ha registos para este filtro. Ajusta os filtros acima ou cria novas reservas para gerar historico.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredNotifications.map((notification) => {
                const canRetry = notification.status !== "SENT";

                return (
                  <div
                    key={notification.id}
                    className="grid gap-3 rounded-2xl border border-border/70 bg-background/80 p-4 md:grid-cols-[1.2fr_0.8fr]"
                  >
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariants[notification.status]}>{statusLabels[notification.status]}</Badge>
                        <Badge variant="outline">{kindLabels[notification.kind]}</Badge>
                        <Badge variant="outline">{notification.channel}</Badge>
                      </div>
                      <div>
                        <p className="font-medium">{notification.booking.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {notification.booking.serviceName} ·{" "}
                          {new Date(notification.booking.startsAt).toLocaleDateString("pt-PT")} ·{" "}
                          {new Date(notification.booking.startsAt).toLocaleTimeString("pt-PT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">Destinatario: {notification.recipientMasked}</p>
                      {notification.errorMessage ? (
                        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          <span className="inline-flex items-center gap-2">
                            <MessageSquareWarning className="size-4" />
                            {notification.errorMessage}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground md:items-end md:text-right">
                      <span className="inline-flex items-center gap-2">
                        <Siren className="size-4" />
                        Criado em{" "}
                        {new Date(notification.createdAt).toLocaleString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="size-4" />
                        {notification.sentAt
                          ? `Enviado em ${new Date(notification.sentAt).toLocaleString("pt-PT", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : "Ainda sem confirmacao de envio"}
                      </span>
                      {canRetry ? (
                        <Button
                          variant="outline"
                          disabled={retryingId === notification.id || isRefreshing}
                          onClick={() => void retryNotification(notification.id)}
                        >
                          {retryingId === notification.id ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <RotateCcw className="size-4" />
                          )}
                          Repetir entrega
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
