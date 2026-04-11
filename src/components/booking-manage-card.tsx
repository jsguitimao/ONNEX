"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { PublicBookingDetails } from "@/lib/business";
import { Button } from "@/components/ui/button";

type BookingManageCardProps = {
  initialBooking: PublicBookingDetails;
};

const statusLabel: Record<PublicBookingDetails["status"], string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Concluida",
  CANCELLED: "Cancelada",
  NO_SHOW: "No-show",
};

export function BookingManageCard({ initialBooking }: BookingManageCardProps) {
  const [booking, setBooking] = useState(initialBooking);
  const [loadingAction, setLoadingAction] = useState<"confirm" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "confirm" | "cancel") {
    setLoadingAction(action);
    setError(null);

    try {
      const response = await fetch(`/api/public/booking/${booking.publicToken}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as PublicBookingDetails & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel atualizar a reserva.");
      }

      setBooking(payload);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Erro inesperado.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="rounded-[2rem] border bg-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Gestao da tua reserva</p>
          <h1 className="font-heading text-3xl font-semibold">{booking.businessName}</h1>
        </div>
        <span className="rounded-full border bg-muted px-3 py-1 text-sm font-medium">
          {statusLabel[booking.status]}
        </span>
      </div>

      <div className="grid gap-3 rounded-[1.5rem] border bg-background p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Servico</span>
          <span className="font-medium">{booking.serviceName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Profissional</span>
          <span className="font-medium">{booking.staffName ?? "Sem preferencia"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Quando</span>
          <span className="font-medium">
            {new Date(booking.startsAt).toLocaleDateString("pt-PT")} ·{" "}
            {new Date(booking.startsAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Cliente</span>
          <span className="font-medium">{booking.customerName}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {booking.canConfirm ? (
          <Button disabled={loadingAction !== null} onClick={() => void handleAction("confirm")}>
            {loadingAction === "confirm" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Confirmar reserva
          </Button>
        ) : null}

        {booking.canCancel ? (
          <Button
            variant="outline"
            disabled={loadingAction !== null}
            onClick={() => void handleAction("cancel")}
          >
            {loadingAction === "cancel" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
            Cancelar reserva
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <p className="mt-5 text-sm text-muted-foreground">
        Podes guardar este link para voltar a consultar ou atualizar o estado da reserva.
      </p>
    </div>
  );
}
