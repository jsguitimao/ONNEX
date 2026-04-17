"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import type { BookingSlot, PublicBusinessPayload } from "@/lib/business";
import { formatEuro } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type Props = {
  business: PublicBusinessPayload;
  accentColor?: string;
  cardBg?: string;
};

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function PublicBookingFlow({ business, accentColor = "#F59E0B", cardBg = "#0b1020" }: Props) {
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
    const date = new Date(Date.now() + business.bookingLeadTimeHours * 60 * 60_000);
    return toDateInputValue(date);
  }, [business.bookingLeadTimeHours]);

  const maxDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + business.bookingWindowDays);
    return toDateInputValue(date);
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
    <section className="rounded-[1.75rem] bg-transparent p-6 text-white sm:p-8">
      <label className="grid gap-2">
        <span className="text-xs font-medium text-neutral-300">Selecione um serviço</span>
        <select
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark] focus:border-white/30"
        >
          {business.services.map((service) => (
            <option key={service.id} value={service.id} style={{ backgroundColor: cardBg }}>
              {service.name}
              {business.showPrices ? ` — ${formatEuro(service.priceCents)}` : ""}
            </option>
          ))}
        </select>
      </label>

      {compatibleStaffMembers.length > 0 ? (
        <label className="mt-4 grid gap-2">
          <span className="text-xs font-medium text-neutral-300">Selecione um profissional</span>
          <select
            value={staffMemberId}
            onChange={(event) => setStaffMemberId(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark] focus:border-white/30"
          >
            {compatibleStaffMembers.map((member) => (
              <option key={member.id} value={member.id} style={{ backgroundColor: cardBg }}>
                {member.fullName}
                {member.roleTitle ? ` — ${member.roleTitle}` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="mt-4 grid gap-2">
        <span className="text-xs font-medium text-neutral-300">Selecione a data</span>
        <input
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark] focus:border-white/30"
        />
      </label>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-neutral-300">Selecione um horário</p>
        {loadingSlots ? (
          <div className="flex items-center gap-2 text-sm text-neutral-400">
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
                  selectedSlot === slot.iso
                    ? "font-semibold"
                    : "border-white/15 text-white hover:border-white/30 hover:bg-white/5"
                )}
                style={selectedSlot === slot.iso ? { backgroundColor: accentColor, borderColor: accentColor, color: "#111827" } : undefined}
              >
                {slot.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">
            {date
              ? "Não há horários disponíveis para os filtros escolhidos."
              : "Escolhe data, serviço e profissional para ver horários."}
          </p>
        )}
      </div>

      <label className="mt-4 grid gap-2">
        <span className="text-xs font-medium text-neutral-300">Nome completo</span>
        <input
          type="text"
          placeholder="Digite o teu nome"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-white/30"
        />
      </label>

      <label className="mt-4 grid gap-2">
        <span className="text-xs font-medium text-neutral-300">Telefone</span>
        <input
          type="tel"
          placeholder="Digite o teu telefone"
          value={customerPhone}
          onChange={(event) => setCustomerPhone(event.target.value)}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-white/30"
        />
      </label>

      <button
        type="button"
        onClick={handleBooking}
        disabled={!selectedService || !selectedSlot || !customerName || !staffMemberId || submitting}
        className={cn(
          "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
          submitting && "opacity-80"
        )}
        style={{ backgroundColor: accentColor, color: "#111827" }}
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

      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {manageUrl ? (
        <Link
          href={manageUrl}
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold transition"
          style={{ color: accentColor }}
        >
          Gerir esta reserva
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </section>
  );
}
