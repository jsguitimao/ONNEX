"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock3, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  acceptBookingAction,
  rejectBookingAction,
  updateStaffAutoAcceptAction,
} from "@/app/crm/actions";
import type { CrmBookingRowDto, CrmPendingBookingDto } from "@/lib/crm/bookings";
import type { CrmDayAvailability } from "@/lib/crm/availability";
import type { CrmScheduleBlockRowDto } from "@/lib/crm/schedule-blocks";
import type { CrmStaffRow } from "@/lib/crm/staff";
import { BookingsTable } from "./crm-bookings-table";
import type { AcceptanceMode } from "./crm-types";
import { TimeOffPanel } from "./crm-time-off-panel";
import { WeeklySchedulePanel } from "./crm-weekly-schedule-panel";

type Props = {
  staff: CrmStaffRow[];
  businessAutoAccept: boolean;
  pendingBookings: CrmPendingBookingDto[];
  weeklyBookings: CrmBookingRowDto[];
  dailyBookings: CrmBookingRowDto[];
  businessTimezone: string;
  availabilityByStaff: Record<string, CrmDayAvailability[]>;
  scheduleBlocks: CrmScheduleBlockRowDto[];
  onStaffUpdated: (updated: CrmStaffRow) => void;
  onPendingBookingResolved: (bookingId: string) => void;
  onPendingBookingRestored: (booking: CrmPendingBookingDto) => void;
  onStaffDayAvailabilityUpdated: (staffId: string, day: CrmDayAvailability) => void;
  onScheduleBlockCreated: (block: CrmScheduleBlockRowDto) => void;
  onScheduleBlockDeleted: (blockId: string) => void;
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-PT", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function AppointmentPanel(props: Props) {
  if (props.staff.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Adiciona profissionais ao teu negócio no editor da página para começar a configurar a agenda.
      </div>
    );
  }
  return <AppointmentPanelContent {...props} />;
}

function AppointmentPanelContent({
  staff,
  businessAutoAccept,
  pendingBookings,
  weeklyBookings,
  dailyBookings,
  businessTimezone,
  availabilityByStaff,
  scheduleBlocks,
  onStaffUpdated,
  onPendingBookingResolved,
  onPendingBookingRestored,
  onStaffDayAvailabilityUpdated,
  onScheduleBlockCreated,
  onScheduleBlockDeleted,
}: Props) {
  const [selectedViewerId, setSelectedViewerId] = useState<string | null>(null);
  const [acceptanceError, setAcceptanceError] = useState<string | null>(null);
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null);
  const [isStaffPending, startStaffTransition] = useTransition();

  const viewer = staff.find((member) => member.id === selectedViewerId) ?? staff[0];
  const currentMode: AcceptanceMode = viewer.autoAcceptBookings ? "automatico" : "manual";
  const isSavingThis = savingStaffId === viewer.id && isStaffPending;

  const viewerPendingBookings = pendingBookings.filter(
    (booking) => booking.staffMemberId === viewer.id,
  );
  const viewerWeeklyBookings = weeklyBookings.filter(
    (booking) => booking.staffMemberId === viewer.id,
  );

  function handleToggleAcceptance() {
    if (savingStaffId) return;
    const nextValue = !viewer.autoAcceptBookings;
    const previous = viewer;
    setAcceptanceError(null);
    setSavingStaffId(viewer.id);
    onStaffUpdated({ ...viewer, autoAcceptBookings: nextValue });
    startStaffTransition(async () => {
      const result = await updateStaffAutoAcceptAction(viewer.id, nextValue);
      setSavingStaffId(null);
      if (!result.ok) {
        onStaffUpdated(previous);
        setAcceptanceError(result.error);
        return;
      }
      onStaffUpdated(result.staff);
    });
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        <strong>Pré-visualização parcial.</strong> Pedidos pendentes, horário semanal, folgas, agenda e
        vista do dia já usam dados reais. O painel de automações de lembrete continua a usar dados
        de exemplo até ser ligado à base de dados.
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Agenda semanal por profissional</h3>
            <p className="text-xs text-muted-foreground">
              Cada profissional acompanha apenas a sua lista operacional da semana.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Profissional</span>
            {staff.map((member) => (
              <Button
                key={member.id}
                type="button"
                size="sm"
                variant={viewer.id === member.id ? "default" : "outline"}
                onClick={() => setSelectedViewerId(member.id)}
              >
                {member.fullName}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Aceitação de agendamentos</p>
                <p className="mt-1 text-lg font-semibold">
                  {currentMode === "automatico" ? "Aceitação automática" : "Aceitação manual"}
                </p>
              </div>
              <Button
                type="button"
                variant={currentMode === "automatico" ? "default" : "outline"}
                disabled={isSavingThis}
                onClick={handleToggleAcceptance}
              >
                {isSavingThis ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : currentMode === "automatico" ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Clock3 className="size-4" />
                )}
                {currentMode === "automatico" ? "Automático" : "Manual"}
              </Button>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              No modo automático, novas reservas entram confirmadas quando há horário livre. No modo manual,
              o profissional valida cada pedido. Esta preferência aplica-se apenas a marcações futuras —
              as já existentes mantêm o estado atual.
            </p>
            {businessAutoAccept ? (
              <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">
                O negócio tem aceitação automática global ativa, por isso todas as novas reservas entram
                confirmadas independentemente desta preferência por profissional.
              </p>
            ) : null}
            {acceptanceError ? (
              <p
                role="alert"
                className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive"
              >
                {acceptanceError}
              </p>
            ) : null}
            <PendingBookingsPanel
              bookings={viewerPendingBookings}
              viewerName={viewer.fullName}
              onResolved={onPendingBookingResolved}
              onRestored={onPendingBookingRestored}
            />
          </div>

          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Resumo de {viewer.fullName}</p>
            <p className="mt-1 text-2xl font-semibold">{viewerPendingBookings.length}</p>
            <p className="text-xs text-muted-foreground">
              {viewerPendingBookings.length === 1 ? "pedido pendente" : "pedidos pendentes"}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">{viewerWeeklyBookings.length} marcações esta semana</p>
          </div>
        </div>
      </div>

      <WeeklySchedulePanel
        viewerId={viewer.id}
        viewerName={viewer.fullName}
        availability={availabilityByStaff[viewer.id] ?? []}
        onDayUpdated={onStaffDayAvailabilityUpdated}
      />

      <TimeOffPanel
        blocks={scheduleBlocks}
        staff={staff}
        viewer={viewer}
        businessTimezone={businessTimezone}
        onCreated={onScheduleBlockCreated}
        onDeleted={onScheduleBlockDeleted}
      />

      <BookingsTable
        title={`Lista semanal de ${viewer.fullName}`}
        bookings={viewerWeeklyBookings}
        timezone={businessTimezone}
        showStaffColumn={false}
        emptyMessage={`Sem marcações esta semana para ${viewer.fullName}.`}
      />
      <BookingsTable
        title="Vista geral do dia"
        bookings={dailyBookings}
        timezone={businessTimezone}
        emptyMessage="Sem marcações para hoje."
      />
    </div>
  );
}

function PendingBookingsPanel({
  bookings,
  viewerName,
  onResolved,
  onRestored,
}: {
  bookings: CrmPendingBookingDto[];
  viewerName: string;
  onResolved: (bookingId: string) => void;
  onRestored: (booking: CrmPendingBookingDto) => void;
}) {
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDecision(booking: CrmPendingBookingDto, decision: "accept" | "reject") {
    if (decidingId) return;
    setDecisionError(null);
    setDecidingId(booking.id);
    onResolved(booking.id);
    startTransition(async () => {
      const action = decision === "accept" ? acceptBookingAction : rejectBookingAction;
      const result = await action(booking.id);
      setDecidingId(null);
      if (result.ok) return;
      if (result.code === "BOOKING_NOT_PENDING") {
        setDecisionError(result.error);
        return;
      }
      onRestored(booking);
      setDecisionError(result.error);
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Pedidos pendentes</p>
          <p className="text-xs text-muted-foreground">
            {viewerName} decide se confirma ou recusa cada reserva pendente.
          </p>
        </div>
        <Badge variant="outline">{bookings.length}</Badge>
      </div>

      {decisionError ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive"
        >
          {decisionError}
        </p>
      ) : null}

      <div className="mt-3 grid gap-2">
        {bookings.length > 0 ? (
          bookings.map((booking) => {
            const decidingThis = decidingId === booking.id && isPending;
            return (
              <div
                key={booking.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{booking.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateTimeFormatter.format(new Date(booking.startsAt))} · {booking.serviceName}
                  </p>
                  {booking.customerPhone || booking.customerEmail ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {booking.customerPhone ?? booking.customerEmail}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={Boolean(decidingId)}
                    onClick={() => handleDecision(booking, "accept")}
                  >
                    {decidingThis ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Aceitar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={Boolean(decidingId)}
                    onClick={() => handleDecision(booking, "reject")}
                  >
                    <X className="size-4" />
                    Recusar
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            Não existem pedidos pendentes para {viewerName}.
          </p>
        )}
      </div>
    </div>
  );
}
