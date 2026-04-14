"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingSlot, PublicBookingDetails } from "@/lib/business";
import { cn } from "@/lib/utils";

type BookingManageCardProps = {
  initialBooking: PublicBookingDetails;
};

const statusLabel: Record<PublicBookingDetails["status"], string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  NO_SHOW: "No-show",
};

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function BookingManageCard({ initialBooking }: BookingManageCardProps) {
  const [booking, setBooking] = useState(initialBooking);
  const [loadingAction, setLoadingAction] = useState<"confirm" | "cancel" | "reschedule" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(toDateInputValue(new Date(initialBooking.startsAt)));
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  const cancellationDeadlineLabel = useMemo(
    () =>
      new Date(booking.cancellationDeadline).toLocaleString("pt-PT", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    [booking.cancellationDeadline]
  );
  const tokenExpiryLabel = useMemo(
    () =>
      new Date(booking.tokenExpiresAt).toLocaleString("pt-PT", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    [booking.tokenExpiresAt]
  );

  const minDate = useMemo(() => {
    const date = new Date(Date.now() + booking.bookingLeadTimeHours * 60 * 60_000);
    return toDateInputValue(date);
  }, [booking.bookingLeadTimeHours]);

  const maxDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + booking.bookingWindowDays);
    return toDateInputValue(date);
  }, [booking.bookingWindowDays]);

  useEffect(() => {
    setSlots([]);
    setSelectedSlot("");

    if (!booking.canReschedule || !booking.staffMemberId || !rescheduleDate) {
      return;
    }

    const controller = new AbortController();

    async function loadSlots() {
      setLoadingSlots(true);
      try {
        const params = new URLSearchParams({ date: rescheduleDate });
        const response = await fetch(`/api/public/booking/${booking.publicToken}/availability?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as { slots?: BookingSlot[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Não foi possível carregar horários.");
        }

        setSlots(payload.slots ?? []);
      } catch (slotError) {
        if ((slotError as Error).name !== "AbortError") {
          setError(slotError instanceof Error ? slotError.message : "Erro ao carregar horários.");
        }
      } finally {
        setLoadingSlots(false);
      }
    }

    void loadSlots();

    return () => controller.abort();
  }, [booking.canReschedule, booking.publicToken, booking.staffMemberId, rescheduleDate]);

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
        throw new Error(payload.error ?? "Não foi possível atualizar a reserva.");
      }

      setBooking(payload);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Erro inesperado.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReschedule() {
    if (!selectedSlot) return;

    setLoadingAction("reschedule");
    setError(null);

    try {
      const response = await fetch(`/api/public/booking/${booking.publicToken}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", startsAt: selectedSlot }),
      });
      const payload = (await response.json()) as PublicBookingDetails & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível remarcar a reserva.");
      }

      setBooking(payload);
      setRescheduleDate(toDateInputValue(new Date(payload.startsAt)));
      setSelectedSlot("");
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
          <p className="text-sm text-muted-foreground">Gestão da tua reserva</p>
          <h1 className="font-heading text-3xl font-semibold">{booking.businessName}</h1>
        </div>
        <span className="rounded-full border bg-muted px-3 py-1 text-sm font-medium">
          {statusLabel[booking.status]}
        </span>
      </div>

      <div className="grid gap-3 rounded-[1.5rem] border bg-background p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Serviço</span>
          <span className="font-medium">{booking.serviceName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Profissional</span>
          <span className="font-medium">{booking.staffName ?? "Sem preferência"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Quando</span>
          <span className="font-medium">
            {new Date(booking.startsAt).toLocaleDateString("pt-PT")} -{" "}
            {new Date(booking.startsAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Cliente</span>
          <span className="font-medium">{booking.customerName}</span>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border bg-muted/50 p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-4 text-primary" />
          <div className="grid gap-1">
            <p className="font-medium text-foreground">Política desta reserva</p>
            <p>Confirmação disponível enquanto a reserva estiver pendente.</p>
            <p>Cancelamento e remarcação disponíveis até {booking.cancellationWindowHours}h antes do horário.</p>
            <p>Prazo atual para gerir a reserva: {cancellationDeadlineLabel}.</p>
            <p>Este link de gestão fica válido até {tokenExpiryLabel}.</p>
          </div>
        </div>
      </div>

      {booking.canReschedule ? (
        <div className="mt-5 rounded-[1.5rem] border bg-background p-4">
          <div className="mb-3">
            <p className="font-medium">Remarcar horário</p>
            <p className="text-sm text-muted-foreground">
              Mantém o mesmo serviço e profissional, escolhendo apenas um novo slot disponível.
            </p>
          </div>

          <label className="grid gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="size-4 text-primary" />
              Nova data
            </span>
            <input
              type="date"
              className="rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none"
              value={rescheduleDate}
              min={minDate}
              max={maxDate}
              onChange={(event) => setRescheduleDate(event.target.value)}
            />
          </label>

          <div className="mt-4">
            <p className="mb-3 text-sm font-medium">Novos horários disponíveis</p>
            {loadingSlots ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                A carregar horários...
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.iso}
                    type="button"
                    onClick={() => setSelectedSlot(slot.iso)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm transition",
                      selectedSlot === slot.iso ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/30"
                    )}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Não há horários disponíveis para esta data.
              </p>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button disabled={!selectedSlot || loadingAction !== null} onClick={() => void handleReschedule()}>
              {loadingAction === "reschedule" ? <Loader2 className="size-4 animate-spin" /> : null}
              Remarcar reserva
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {booking.canConfirm ? (
          <Button disabled={loadingAction !== null} onClick={() => void handleAction("confirm")}>
            {loadingAction === "confirm" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Confirmar reserva
          </Button>
        ) : null}

        {booking.canCancel ? (
          <Button variant="outline" disabled={loadingAction !== null} onClick={() => void handleAction("cancel")}>
            {loadingAction === "cancel" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
            Cancelar reserva
          </Button>
        ) : null}
      </div>

      {!booking.canCancel && ["PENDING", "CONFIRMED"].includes(booking.status) ? (
        <p className="mt-4 text-sm text-muted-foreground">
          O prazo automático para gerir esta reserva já expirou. Para ajuda, entra em contacto direto com a barbearia.
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <p className="mt-5 text-sm text-muted-foreground">
        Podes guardar este link para voltar a consultar, remarcar ou acompanhar o estado da reserva.
      </p>
    </div>
  );
}
