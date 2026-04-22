"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import type { BookingSlot, PublicBusinessPayload } from "@/lib/business";
import { formatEuro } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type Props = {
  business: PublicBusinessPayload;
};

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const fieldClass =
  "rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";
const labelClass = "text-xs font-medium text-muted-foreground";

export function PublicBookingFlow({ business }: Props) {
  const [serviceId, setServiceId] = useState(business.services[0]?.id ?? "");
  const [staffMemberId, setStaffMemberId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [manageUrl, setManageUrl] = useState("");

  const selectedService = useMemo(
    () => business.services.find((service) => service.id === serviceId),
    [business.services, serviceId]
  );

  const compatibleStaffMembers = useMemo(
    () => business.staffMembers.filter((member) => member.serviceIds.includes(serviceId)),
    [business.staffMembers, serviceId]
  );

  const minDate = useMemo(() => {
    const target = new Date(Date.now() + business.bookingLeadTimeHours * 60 * 60_000);
    return toDateInputValue(target);
  }, [business.bookingLeadTimeHours]);

  const maxDate = useMemo(() => {
    const target = new Date();
    target.setDate(target.getDate() + business.bookingWindowDays);
    return toDateInputValue(target);
  }, [business.bookingWindowDays]);

  useEffect(() => {
    if (!compatibleStaffMembers.some((member) => member.id === staffMemberId)) {
      setStaffMemberId(compatibleStaffMembers[0]?.id ?? "");
    }
  }, [compatibleStaffMembers, staffMemberId]);

  useEffect(() => {
    setSelectedSlot("");
    setSlots([]);
    setMessage("");
    setError("");
    setManageUrl("");

    if (!date || !serviceId || !staffMemberId) return;

    const controller = new AbortController();

    async function loadSlots() {
      setLoadingSlots(true);
      try {
        const params = new URLSearchParams({ serviceId, staffMemberId, date });
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
          customerPhone,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        startsAt?: string;
        serviceName?: string;
        manageUrl?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível concluir a reserva.");
      }

      setMessage(`Reserva criada para ${data.serviceName} em ${new Date(data.startsAt ?? "").toLocaleString("pt-PT")}.`);
      setCustomerName("");
      setCustomerPhone("");
      setSelectedSlot("");
      setDate("");
      setSlots([]);
      setManageUrl(data.manageUrl ?? "");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao criar reserva.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
      <label className="grid gap-2">
        <span className={labelClass}>Serviço</span>
        <select
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
          className={fieldClass}
        >
          {business.services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
              {business.showPrices ? ` — ${formatEuro(service.priceCents)}` : ""}
            </option>
          ))}
        </select>
      </label>

      {compatibleStaffMembers.length > 0 ? (
        <label className="grid gap-2">
          <span className={labelClass}>Profissional</span>
          <select
            value={staffMemberId}
            onChange={(event) => setStaffMemberId(event.target.value)}
            className={fieldClass}
          >
            {compatibleStaffMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName}
                {member.roleTitle ? ` — ${member.roleTitle}` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="grid gap-2">
        <span className={labelClass}>Data</span>
        <input
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          onChange={(event) => setDate(event.target.value)}
          className={fieldClass}
        />
      </label>

      <div className="grid gap-2">
        <span className={labelClass}>Horário</span>
        {loadingSlots ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            A carregar horários...
          </div>
        ) : slots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const isActive = selectedSlot === slot.iso;
              return (
                <button
                  key={slot.iso}
                  type="button"
                  onClick={() => setSelectedSlot(slot.iso)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm transition",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground font-semibold"
                      : "border-border text-foreground hover:border-ring hover:bg-accent"
                  )}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {date
              ? "Não há horários disponíveis para os filtros escolhidos."
              : "Escolhe data, serviço e profissional para ver horários."}
          </p>
        )}
      </div>

      <label className="grid gap-2">
        <span className={labelClass}>Nome completo</span>
        <input
          type="text"
          placeholder="O teu nome"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          className={cn(fieldClass, "placeholder:text-muted-foreground")}
        />
      </label>

      <label className="grid gap-2">
        <span className={labelClass}>Telefone</span>
        <input
          type="tel"
          placeholder="O teu telefone"
          value={customerPhone}
          onChange={(event) => setCustomerPhone(event.target.value)}
          className={cn(fieldClass, "placeholder:text-muted-foreground")}
        />
      </label>

      <button
        type="button"
        onClick={handleBooking}
        disabled={!selectedService || !selectedSlot || !customerName || !staffMemberId || submitting}
        className={cn(
          "mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition",
          "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            A agendar...
          </>
        ) : (
          "Agendar horário"
        )}
      </button>

      {message ? <p className="text-sm text-foreground">{message}</p> : null}
      {manageUrl ? (
        <Link href={manageUrl} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          Gerir esta reserva
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
