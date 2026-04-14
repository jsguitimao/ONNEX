import { CheckCircle2, Clock3, Mail, MessageSquareWarning, ShieldCheck, Siren, Smartphone } from "lucide-react";
import type { CommunicationSnapshot } from "@/lib/business";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardCommunicationsProps = {
  initialSnapshot: CommunicationSnapshot;
};

const kindLabels: Record<CommunicationSnapshot["notifications"][number]["kind"], string> = {
  BOOKING_CREATED: "Reserva criada",
  BOOKING_CONFIRMED: "Reserva confirmada",
  BOOKING_CANCELLED: "Reserva cancelada",
  BOOKING_CANCELLED_INTERNAL: "Aviso interno de cancelamento",
  BOOKING_RESCHEDULED: "Reserva remarcada",
  BOOKING_REMINDER: "Lembrete automático",
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
            {configured ? "Configurado e pronto a enviar" : "Ainda precisa de configuração"}
          </p>
        </div>
      </div>
      <Badge variant={configured ? "secondary" : "outline"}>{configured ? "Ativo" : "Pendente"}</Badge>
    </div>
  );
}

export function DashboardCommunications({ initialSnapshot }: DashboardCommunicationsProps) {
  return (
    <Card className="mt-6 border-border/70">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="font-heading text-2xl">Comunicação e lembretes</CardTitle>
            <CardDescription>
              Estado dos canais e histórico recente de confirmações, cancelamentos, remarcações e lembretes.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{initialSnapshot.totals.sentLast24h} enviados em 24h</Badge>
            <Badge variant={initialSnapshot.totals.failedLast24h > 0 ? "destructive" : "outline"}>
              {initialSnapshot.totals.failedLast24h} falhas
            </Badge>
            <Badge variant="outline">{initialSnapshot.totals.skippedLast24h} ignorados</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <ChannelState label="Email transacional" configured={initialSnapshot.channels.emailConfigured} icon={Mail} />
          <ChannelState label="SMS transacional" configured={initialSnapshot.channels.smsConfigured} icon={Smartphone} />
          <ChannelState
            label="Endpoint de lembretes"
            configured={initialSnapshot.channels.cronSecretConfigured}
            icon={ShieldCheck}
          />
        </div>

        <div className="rounded-3xl border border-border/70 bg-muted/20 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="size-4 text-primary" />
            <p className="font-medium">Últimos envios</p>
          </div>

          {initialSnapshot.notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
              Ainda não há registos de comunicação. Assim que entrarem reservas, confirmações ou lembretes,
              os eventos aparecem aqui.
            </div>
          ) : (
            <div className="grid gap-3">
              {initialSnapshot.notifications.map((notification) => (
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
                    <p className="text-sm text-muted-foreground">Destinatário: {notification.recipientMasked}</p>
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
                        : "Ainda sem confirmação de envio"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
