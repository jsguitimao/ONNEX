"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import type { BookingSlot, PublicBusinessPayload } from "@/lib/business";
import { formatEuro } from "@/lib/formatters";
import { generateMockSlots } from "@/lib/mock-business";
import { cn } from "@/lib/utils";

type Props = {
  business: PublicBusinessPayload;
  mockMode?: boolean;
};

function toDateInputValueInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

const fieldClass =
  "rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";
const labelClass = "text-xs font-medium text-muted-foreground";

export function PublicBookingFlow({ business, mockMode = false }: Props) {
  const searchParams = useSearchParams();
  const requestedServiceId = searchParams?.get("service") ?? null;
  const initialServiceId = useMemo(() => {
    if (requestedServiceId && business.services.some((s) => s.id === requestedServiceId)) {
      return requestedServiceId;
    }
    return business.services[0]?.id ?? "";
  }, [business.services, requestedServiceId]);

  const [serviceId, setServiceId] = useState(initialServiceId);
  const [staffMemberId, setStaffMemberId] = useState("");

  useEffect(() => {
    if (
      requestedServiceId &&
      requestedServiceId !== serviceId &&
      business.services.some((s) => s.id === requestedServiceId)
    ) {
      setServiceId(requestedServiceId);
    }
  }, [requestedServiceId, serviceId, business.services]);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [manageUrl, setManageUrl] = useState("");
  const [success, setSuccess] = useState<{
    serviceName: string;
    startsAt: string;
  } | null>(null);

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
    return toDateInputValueInTimeZone(target, business.timezone);
  }, [business.bookingLeadTimeHours, business.timezone]);

  const maxDate = useMemo(() => {
    const target = new Date();
    target.setDate(target.getDate() + business.bookingWindowDays);
    return toDateInputValueInTimeZone(target, business.timezone);
  }, [business.bookingWindowDays, business.timezone]);

  useEffect(() => {
    if (!compatibleStaffMembers.some((member) => member.id === staffMemberId)) {
      setStaffMemberId(compatibleStaffMembers[0]?.id ?? "");
    }
  }, [compatibleStaffMembers, staffMemberId]);

  useEffect(() => {
    setSelectedSlot("");
    setSlots([]);
    setError("");

    if (!date || !serviceId || !staffMemberId) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (new Date(`${date}T00:00:00`) < todayStart) {
      setError("Escolhe uma data a partir de hoje.");
      return;
    }

    if (mockMode) {
      setLoadingSlots(true);
      const timeout = setTimeout(() => {
        setSlots(generateMockSlots(date));
        setLoadingSlots(false);
      }, 250);
      return () => clearTimeout(timeout);
    }

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

        const now = Date.now();
        const filtered = (data.slots ?? []).filter((slot) => new Date(slot.iso).getTime() > now);
        setSlots(filtered);
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
  }, [business.slug, date, serviceId, staffMemberId, mockMode]);

  const resetForm = () => {
    setSuccess(null);
    setManageUrl("");
    setError("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setSelectedSlot("");
    setDate("");
    setSlots([]);
  };

  const handleBooking = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setSubmitting(true);
    setError("");

    if (!selectedSlot || new Date(selectedSlot).getTime() <= Date.now()) {
      setError("Escolhe um horário válido a partir de agora.");
      setSubmitting(false);
      return;
    }

    if (mockMode) {
      setTimeout(() => {
        setSuccess({
          serviceName: selectedService?.name ?? "",
          startsAt: selectedSlot,
        });
        setManageUrl("");
        setSubmitting(false);
      }, 400);
      return;
    }

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

      const data = (await response.json()) as {
        error?: string;
        startsAt?: string;
        serviceName?: string;
        manageUrl?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível concluir a reserva.");
      }

      setSuccess({
        serviceName: data.serviceName ?? "",
        startsAt: data.startsAt ?? "",
      });
      setManageUrl(data.manageUrl ?? "");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao criar reserva.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    const when = success.startsAt
      ? new Date(success.startsAt).toLocaleString("pt-PT", {
          dateStyle: "long",
          timeStyle: "short",
        })
      : "";
    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 text-center text-card-foreground sm:p-10">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckCircle2 className="size-8" />
        </span>
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Agendamento realizado com sucesso!
          </h3>
          {success.serviceName && when ? (
            <p className="text-sm text-muted-foreground sm:text-base">
              {success.serviceName} · {when}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          {manageUrl ? (
            <Link
              href={manageUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Gerir esta reserva
              <ArrowRight className="size-4" />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:border-ring hover:bg-accent"
          >
            Fazer nova reserva
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleBooking}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6"
    >
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
          <div role="radiogroup" aria-label="Horários disponíveis" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const isActive = selectedSlot === slot.iso;
              return (
                <button
                  key={slot.iso}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
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
          autoComplete="name"
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
          autoComplete="tel"
          inputMode="tel"
          placeholder="O teu telefone"
          value={customerPhone}
          onChange={(event) => setCustomerPhone(event.target.value)}
          className={cn(fieldClass, "placeholder:text-muted-foreground")}
        />
      </label>

      <label className="grid gap-2">
        <span className={labelClass}>Email</span>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="O teu email"
          value={customerEmail}
          onChange={(event) => setCustomerEmail(event.target.value)}
          className={cn(fieldClass, "placeholder:text-muted-foreground")}
        />
      </label>

      <button
        type="submit"
        disabled={!selectedService || !selectedSlot || !customerName || (!customerPhone && !customerEmail) || !staffMemberId || submitting}
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

      {error ? (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
