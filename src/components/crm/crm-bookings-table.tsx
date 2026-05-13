"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, UserX, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cancelConfirmedBookingAction,
  completeBookingAction,
  markBookingNoShowAction,
} from "@/app/crm/actions";
import type { CrmBookingRowDto, CrmBookingStatus } from "@/lib/crm/bookings";

type Props = {
  title: string;
  bookings: CrmBookingRowDto[];
  timezone: string;
  showStaffColumn?: boolean;
  emptyMessage?: string;
};

const STATUS_LABELS: Record<CrmBookingStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

const STATUS_VARIANTS: Record<CrmBookingStatus, "default" | "outline"> = {
  PENDING: "outline",
  CONFIRMED: "default",
  COMPLETED: "default",
  CANCELLED: "outline",
  NO_SHOW: "outline",
};

type ActionKind = "complete" | "cancel" | "no_show";

type RunningAction = {
  bookingId: string;
  kind: ActionKind;
};

export function BookingsTable({
  title,
  bookings,
  timezone,
  showStaffColumn = true,
  emptyMessage = "Sem registos no período.",
}: Props) {
  const router = useRouter();
  const [running, setRunning] = useState<RunningAction | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dateTimeFormatter = new Intl.DateTimeFormat("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  const hasConfirmedRow = bookings.some((booking) => booking.status === "CONFIRMED");
  const showActionsColumn = hasConfirmedRow;

  function runTransition(bookingId: string, kind: ActionKind) {
    if (running) return;
    setError(null);
    setRunning({ bookingId, kind });
    startTransition(async () => {
      const action =
        kind === "complete"
          ? completeBookingAction
          : kind === "cancel"
          ? cancelConfirmedBookingAction
          : markBookingNoShowAction;
      const result = await action(bookingId);
      setRunning(null);
      if (!result.ok) {
        setError(result.error);
        if (result.code === "BOOKING_NOT_CONFIRMED") {
          router.refresh();
        }
        return;
      }
      setCancelConfirmId(null);
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline">{bookings.length}</Badge>
      </div>

      {error ? (
        <p
          role="alert"
          className="border-t border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}

      {bookings.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Serviço</th>
                {showStaffColumn ? (
                  <th className="px-4 py-3 font-medium">Profissional</th>
                ) : null}
                <th className="px-4 py-3 font-medium">Estado</th>
                {showActionsColumn ? (
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 text-sm">
                    {dateTimeFormatter.format(new Date(booking.startsAt))}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{booking.customerName}</p>
                    {booking.customerPhone ? (
                      <p className="text-[11px] text-muted-foreground">{booking.customerPhone}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm">{booking.serviceName}</td>
                  {showStaffColumn ? (
                    <td className="px-4 py-3 text-sm">
                      {booking.staffMemberName ?? <span className="text-muted-foreground">—</span>}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANTS[booking.status]}>
                      {STATUS_LABELS[booking.status]}
                    </Badge>
                  </td>
                  {showActionsColumn ? (
                    <td className="px-4 py-3 text-right">
                      <BookingActions
                        booking={booking}
                        running={running}
                        isPending={isPending}
                        cancelConfirmId={cancelConfirmId}
                        onComplete={() => runTransition(booking.id, "complete")}
                        onNoShow={() => runTransition(booking.id, "no_show")}
                        onAskCancel={() => {
                          setError(null);
                          setCancelConfirmId(booking.id);
                        }}
                        onConfirmCancel={() => runTransition(booking.id, "cancel")}
                        onAbortCancel={() => setCancelConfirmId(null)}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BookingActions({
  booking,
  running,
  isPending,
  cancelConfirmId,
  onComplete,
  onNoShow,
  onAskCancel,
  onConfirmCancel,
  onAbortCancel,
}: {
  booking: CrmBookingRowDto;
  running: RunningAction | null;
  isPending: boolean;
  cancelConfirmId: string | null;
  onComplete: () => void;
  onNoShow: () => void;
  onAskCancel: () => void;
  onConfirmCancel: () => void;
  onAbortCancel: () => void;
}) {
  if (booking.status !== "CONFIRMED") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const isThisRunning = running?.bookingId === booking.id && isPending;
  const runningKind = isThisRunning ? running?.kind : null;
  const askingThisCancel = cancelConfirmId === booking.id;
  const disableAll = Boolean(running) || (cancelConfirmId !== null && !askingThisCancel);

  if (askingThisCancel) {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <span className="self-center text-[11px] text-muted-foreground">
          Cancelar e avisar cliente?
        </span>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={isThisRunning}
          onClick={onConfirmCancel}
        >
          {runningKind === "cancel" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
          Sim, cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isThisRunning}
          onClick={onAbortCancel}
        >
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        size="sm"
        disabled={disableAll}
        onClick={onComplete}
      >
        {runningKind === "complete" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="size-3.5" />
        )}
        Concluir
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disableAll}
        onClick={onNoShow}
      >
        {runningKind === "no_show" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <UserX className="size-3.5" />
        )}
        Não compareceu
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disableAll}
        onClick={onAskCancel}
      >
        <X className="size-3.5" />
        Cancelar
      </Button>
    </div>
  );
}
