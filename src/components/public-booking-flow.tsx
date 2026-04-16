"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Loader2, ShieldCheck, UserRound } from "lucide-react";
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
  const [customerEmail, setCustomerEmail] = useState("");
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

      setMessage(`Reserva criada para ${data.serviceName} em ${new Date(data.startsAt ?? "").toLocaleString("pt-PT")}.`);
      setCustomerName("");
      setCustomerEmail("");
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
    <section className="rounded-[2rem] p-5 text-white sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-amber-300/80">Reserva rápida</p>
          <h3 className="mt-1 font-serif text-xl text-white">Marca já o teu horário</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Ao vivo
        </span>
      </div>

      <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 text-amber-400" />
          <div className="grid gap-1">
            <p className="font-semibold text-white">Política de marcação</p>
            <p>Antecedência mínima: {business.bookingLeadTimeHours}h.</p>
            <p>Janela de reservas: até {business.bookingWindowDays} dias.</p>
            <p>Cancelamento automático pelo cliente: até {business.cancellationWindowHours}h antes.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {business.services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => setServiceId(service.id)}
            className={cn(
              "rounded-[1.5rem] border p-4 text-left transition",
              service.id === serviceId
                ? "border-amber-400/50 bg-amber-400/10"
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-white">{service.name}</h3>
                <p className="mt-1 text-sm leading-6 text-neutral-400">{service.description}</p>
              </div>
              <ArrowRight className={cn("mt-1 size-4", service.id === serviceId ? "text-amber-400" : "text-neutral-500")} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-neutral-300">
                <Clock3 className="size-4" />
                {service.durationMinutes} min
              </span>
              {business.showPrices ? <span className="font-semibold text-amber-300">{formatEuro(service.priceCents)}</span> : null}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <UserRound className="size-4 text-amber-400" />
          Profissional
        </div>
        <div className="grid gap-2">
          {compatibleStaffMembers.length > 0 ? (
            compatibleStaffMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setStaffMemberId(member.id)}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition",
                  member.id === staffMemberId
                    ? "border-amber-400/50 bg-amber-400/10"
                    : "border-white/10 bg-transparent hover:border-white/20 hover:bg-white/5"
                )}
              >
                <div>
                  <p className="font-semibold text-white">{member.fullName}</p>
                  <p className="text-neutral-400">{member.roleTitle}</p>
                </div>
                {member.id === staffMemberId ? <CheckCircle2 className="size-4 text-amber-400" /> : null}
              </button>
            ))
          ) : (
            <p className="text-sm text-neutral-400">
              Ainda não há profissionais configurados para este serviço.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <label className="grid gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <CalendarDays className="size-4 text-amber-400" />
              Data
            </span>
            <input
              type="date"
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-amber-400/50"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <p className="mt-2 text-xs text-neutral-400">
            Slots de {business.slotIntervalMinutes} em {business.slotIntervalMinutes} minutos.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-sm font-semibold text-white">Horários disponíveis</p>
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
                      ? "border-amber-400 bg-amber-400 font-semibold text-[#0b1020]"
                      : "border-white/15 text-white hover:border-amber-300/40 hover:bg-white/5"
                  )}
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
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <p className="mb-3 text-sm font-semibold text-white">Os teus dados</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="Nome"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400/50"
          />
          <input
            type="email"
            placeholder="Email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400/50"
          />
          <input
            type="tel"
            placeholder="Telefone"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400/50 md:col-span-2"
          />
        </div>

        <button
          type="button"
          onClick={handleBooking}
          disabled={!selectedService || !selectedSlot || !customerName || !staffMemberId || submitting}
          className={cn(
            "mt-4 inline-flex h-12 w-full items-center justify-between rounded-2xl bg-amber-400 px-5 text-sm font-semibold uppercase tracking-[0.15em] text-[#0b1020] shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50",
            submitting && "opacity-80"
          )}
        >
          {submitting ? "A criar reserva..." : "Confirmar marcação"}
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        </button>

        {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
        {manageUrl ? (
          <Link
            href={manageUrl}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-300 transition hover:text-amber-200"
          >
            Gerir esta reserva
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </div>
    </section>
  );
}
