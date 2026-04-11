"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Loader2, UserRound } from "lucide-react";
import type { PublicBusinessPayload, BookingSlot } from "@/lib/business";
import { formatEuro } from "@/lib/demo-data";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  business: PublicBusinessPayload;
};

export function PublicBookingFlow({ business }: Props) {
  const [serviceId, setServiceId] = useState(business.services[0]?.id ?? "");
  const [staffMemberId, setStaffMemberId] = useState(business.staffMembers[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const selectedService = useMemo(
    () => business.services.find((service) => service.id === serviceId),
    [business.services, serviceId]
  );

  useEffect(() => {
    setSelectedSlot("");
    setSlots([]);
    setMessage("");
    setError("");

    if (!date || !serviceId || !staffMemberId) return;

    const controller = new AbortController();

    async function loadSlots() {
      setLoadingSlots(true);
      try {
        const params = new URLSearchParams({
          serviceId,
          staffMemberId,
          date,
        });
        const response = await fetch(`/api/public/${business.slug}/availability?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as { slots?: BookingSlot[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Não foi possível carregar horários.");
        }

        setSlots(data.slots ?? []);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError(fetchError instanceof Error ? fetchError.message : "Erro ao carregar horários.");
        }
      } finally {
        setLoadingSlots(false);
      }
    }

    void loadSlots();

    return () => controller.abort();
  }, [business.slug, date, serviceId, staffMemberId]);

  const handleBooking = async () => {
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/public/${business.slug}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          staffMemberId,
          startsAt: selectedSlot,
          customerName,
          customerEmail,
          customerPhone,
        }),
      });

      const data = (await response.json()) as { error?: string; startsAt?: string; serviceName?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível concluir a reserva.");
      }

      setMessage(`Reserva criada para ${data.serviceName} em ${new Date(data.startsAt!).toLocaleString("pt-PT")}.`);
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setSelectedSlot("");
      setDate("");
      setSlots([]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao criar reserva.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="booking" className="rounded-[2rem] border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Reserva rápida</p>
          <h2 className="font-heading text-2xl font-semibold">Marca já o teu horário</h2>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">Ao vivo</span>
      </div>

      <div className="grid gap-3">
        {business.services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => setServiceId(service.id)}
            className={cn(
              "rounded-[1.5rem] border bg-background p-4 text-left transition",
              service.id === serviceId ? "border-primary/40 bg-primary/5" : "hover:border-primary/20 hover:bg-muted/40"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium">{service.name}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{service.description}</p>
              </div>
              <ArrowRight className={cn("mt-1 size-4", service.id === serviceId ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-muted-foreground">
                <Clock3 className="size-4" />
                {service.durationMinutes} min
              </span>
              <span className="font-semibold text-foreground">{formatEuro(service.priceCents)}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-[1.5rem] border bg-background p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <UserRound className="size-4 text-primary" />
          Profissional
        </div>
        <div className="grid gap-2">
          {business.staffMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setStaffMemberId(member.id)}
              className={cn(
                "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition",
                member.id === staffMemberId ? "border-primary/40 bg-primary/5" : "hover:border-primary/20 hover:bg-muted/40"
              )}
            >
              <div>
                <p className="font-medium">{member.fullName}</p>
                <p className="text-muted-foreground">{member.roleTitle}</p>
              </div>
              {member.id === staffMemberId ? <CheckCircle2 className="size-4 text-primary" /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.5rem] border bg-background p-4">
          <label className="grid gap-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="size-4 text-primary" />
              Data
            </span>
            <input
              type="date"
              className="rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        </div>

        <div className="rounded-[1.5rem] border bg-background p-4">
          <p className="mb-3 text-sm font-medium">Horários disponíveis</p>
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
            <p className="text-sm text-muted-foreground">Escolhe data, serviço e profissional para ver horários.</p>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border bg-background p-4">
        <p className="mb-3 text-sm font-medium">Os teus dados</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="Nome"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none"
          />
          <input
            type="email"
            placeholder="Email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            className="rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none"
          />
          <input
            type="tel"
            placeholder="Telefone"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            className="rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none md:col-span-2"
          />
        </div>

        <button
          type="button"
          onClick={handleBooking}
          disabled={!selectedService || !selectedSlot || !customerName || submitting}
          className={cn(
            buttonVariants({ size: "lg", className: "mt-4 h-12 w-full justify-between rounded-2xl px-5" }),
            submitting && "opacity-80"
          )}
        >
          {submitting ? "A criar reserva..." : "Confirmar marcação"}
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        </button>

        {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>
    </section>
  );
}
