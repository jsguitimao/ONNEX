"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Drawer } from "@base-ui/react/drawer";
import { ArrowRight, Check, ChevronRight, Loader2, X } from "lucide-react";
import { BioSelectionTick } from "@/components/bio-selection-tick";
import type { BookingSlot, PublicBusinessPayload } from "@/lib/business";
import { generateMockSlots } from "@/lib/mock-business";
import { formatEuro } from "@/lib/formatters";
import { canOptimizeImageUrl } from "@/lib/image-optimization";
import { cn } from "@/lib/utils";
// ---------- Sheet ----------

type StepId = "service" | "barber" | "date" | "time" | "contact";

const STEP_LABELS: Record<StepId, string> = {
  service: "Serviço",
  barber: "Barbeiro",
  date: "Data",
  time: "Hora",
  contact: "Os teus dados",
};

const STEP_ORDER: StepId[] = ["service", "barber", "date", "time", "contact"];

type BookingSheetDialogProps = {
  business: PublicBusinessPayload;
  mockMode?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialServiceId?: string;
};

export function BookingSheetDialog({
  business,
  mockMode = false,
  isOpen,
  onOpenChange,
  initialServiceId,
}: BookingSheetDialogProps) {
  // ---------- form state ----------
  const [serviceId, setServiceId] = useState<string>("");
  const [staffMemberId, setStaffMemberId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [slot, setSlot] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [activeStep, setActiveStep] = useState<StepId>("service");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ serviceName: string; startsAt: string } | null>(null);
  const [manageUrl, setManageUrl] = useState("");

  // ---------- derived ----------
  const selectedService = useMemo(
    () => business.services.find((s) => s.id === serviceId) ?? null,
    [business.services, serviceId],
  );

  const compatibleStaff = useMemo(
    () => business.staffMembers.filter((m) => m.serviceIds.includes(serviceId)),
    [business.staffMembers, serviceId],
  );

  const selectedStaff = useMemo(
    () => compatibleStaff.find((m) => m.id === staffMemberId) ?? null,
    [compatibleStaff, staffMemberId],
  );

  // date constraints
  const minDate = useMemo(() => {
    const target = new Date(Date.now() + business.bookingLeadTimeHours * 60 * 60_000);
    return toDateInputValue(target, business.timezone);
  }, [business.bookingLeadTimeHours, business.timezone]);

  const maxDate = useMemo(() => {
    const target = new Date();
    target.setDate(target.getDate() + business.bookingWindowDays);
    return toDateInputValue(target, business.timezone);
  }, [business.bookingWindowDays, business.timezone]);

  // ---------- lifecycle ----------

  // bootstrap state when sheet opens
  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setSuccess(null);
    setManageUrl("");
    if (initialServiceId && business.services.some((s) => s.id === initialServiceId)) {
      setServiceId(initialServiceId);
      setActiveStep("barber");
    } else {
      setServiceId("");
      setActiveStep("service");
    }
    setStaffMemberId("");
    setDate("");
    setSlot("");
    setSlots([]);
  }, [isOpen, initialServiceId, business.services]);

  // Load slots when date/service/staff are set.
  // Important: this effect only reads filter state and produces slots. It does NOT clear
  // user-selected slot — that responsibility is on the picker functions (pickService/pickStaff/
  // pickDate), which clear downstream state only when their value actually changes.
  useEffect(() => {
    if (!isOpen) return;
    setError("");

    // Filters incomplete → no slots to show (replace any stale slots with empty array,
    // but don't touch the user's currently selected slot — picker fns handle that).
    if (!date || !serviceId || !staffMemberId) {
      setSlots([]);
      setLoadingSlots(false);
      return;
    }

    if (mockMode) {
      setLoadingSlots(true);
      const t = setTimeout(() => {
        setSlots(generateMockSlots(date));
        setLoadingSlots(false);
      }, 250);
      return () => clearTimeout(t);
    }

    const controller = new AbortController();
    setLoadingSlots(true);
    (async () => {
      try {
        const params = new URLSearchParams({ serviceId, staffMemberId, date });
        const res = await fetch(
          `/api/public/${business.slug}/availability?${params.toString()}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as { slots?: BookingSlot[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Não foi possível carregar horários.");
        const now = Date.now();
        setSlots((data.slots ?? []).filter((s) => new Date(s.iso).getTime() > now));
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError(e instanceof Error ? e.message : "Erro ao carregar horários.");
        }
      } finally {
        setLoadingSlots(false);
      }
    })();
    return () => controller.abort();
  }, [isOpen, date, serviceId, staffMemberId, mockMode, business.slug]);

  // auto-scroll to active step
  const stepRefs = useRef<Record<StepId, HTMLDivElement | null>>({
    service: null,
    barber: null,
    date: null,
    time: null,
    contact: null,
  });
  useEffect(() => {
    const node = stepRefs.current[activeStep];
    if (node) {
      requestAnimationFrame(() => {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [activeStep]);

  // ---------- step transitions ----------
  const indexOf = (step: StepId) => STEP_ORDER.indexOf(step);
  const isDone = (step: StepId) => indexOf(step) < indexOf(activeStep);
  const isActive = (step: StepId) => step === activeStep;

  const advance = (from: StepId) => {
    const next = STEP_ORDER[indexOf(from) + 1];
    if (next) setActiveStep(next);
  };

  const goBackTo = (step: StepId) => {
    setActiveStep(step);
  };

  // ---------- step pickers ----------
  const pickService = (id: string) => {
    if (id !== serviceId) {
      setStaffMemberId("");
      setDate("");
      setSlot("");
    }
    setServiceId(id);
    advance("service");
  };

  const pickStaff = (id: string) => {
    if (id !== staffMemberId) {
      setDate("");
      setSlot("");
    }
    setStaffMemberId(id);
    advance("barber");
  };

  const pickDate = (value: string) => {
    if (value !== date) {
      setSlot("");
    }
    setDate(value);
    if (value) advance("date");
  };

  const pickSlot = (value: string) => {
    setSlot(value);
    advance("time");
  };

  const canSubmit =
    !!serviceId &&
    !!staffMemberId &&
    !!date &&
    !!slot &&
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    !submitting;

  // Idempotency: gerada na 1a tentativa, reutilizada se a chamada falhar e
  // o cliente tentar de novo (rede / refresh do botao). Limpa apos sucesso
  // ou quando o utilizador volta atras a editar dados — assim cada submit
  // novo tem chave nova.
  const idempotencyKeyRef = useRef<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    if (mockMode) {
      setTimeout(() => {
        setSuccess({ serviceName: selectedService?.name ?? "", startsAt: slot });
        setSubmitting(false);
      }, 400);
      return;
    }

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }

    try {
      const res = await fetch(`/api/public/${business.slug}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          serviceId,
          staffMemberId,
          startsAt: slot,
          customerName,
          customerPhone,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        startsAt?: string;
        serviceName?: string;
        manageUrl?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Não foi possível concluir a reserva.");
      setSuccess({
        serviceName: data.serviceName ?? "",
        startsAt: data.startsAt ?? "",
      });
      setManageUrl(data.manageUrl ?? "");
      idempotencyKeyRef.current = null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar reserva.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- render ----------
  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Drawer.Popup className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] w-full max-w-[var(--bio-card-width)] flex-col overflow-hidden rounded-t-2xl bg-[#09090b] text-[#fafafa] shadow-[0_-12px_40px_rgba(0,0,0,0.6)] transition-transform duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full">
          <DrawerHandle />

          <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-1">
            <Drawer.Title
              className="font-semibold text-[#fafafa]"
              style={{
                fontSize: "var(--text-bio-section)",
                lineHeight: "var(--text-bio-section-line)",
                letterSpacing: "var(--text-bio-section-tracking)",
              }}
            >
              {success ? "Reserva confirmada" : `Reservar em ${business.name}`}
            </Drawer.Title>
            <Drawer.Close
              aria-label="Fechar"
              className="flex size-9 items-center justify-center rounded-full bg-white/[0.08] text-[#fafafa] transition active:bg-white/[0.14]"
            >
              <X className="size-4" strokeWidth={2.5} />
            </Drawer.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),24px)]">
            {success ? (
              <SuccessView
                success={success}
                manageUrl={manageUrl}
                onClose={() => onOpenChange(false)}
              />
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <StepRow
                  stepRef={(el) => {
                    stepRefs.current.service = el;
                  }}
                  step="service"
                  state={isDone("service") ? "done" : "active"}
                  doneSummary={
                    selectedService
                      ? `${selectedService.name} · ${selectedService.durationMinutes} min · ${formatEuro(
                          selectedService.priceCents,
                        )}`
                      : ""
                  }
                  onEdit={() => goBackTo("service")}
                >
                  <ServiceStep
                    services={business.services}
                    selectedId={serviceId}
                    onPick={pickService}
                  />
                </StepRow>

                <StepRow
                  stepRef={(el) => {
                    stepRefs.current.barber = el;
                  }}
                  step="barber"
                  state={
                    isDone("barber") ? "done" : isActive("barber") ? "active" : "locked"
                  }
                  doneSummary={selectedStaff?.fullName ?? ""}
                  onEdit={() => goBackTo("barber")}
                >
                  <BarberStep
                    staff={compatibleStaff}
                    selectedId={staffMemberId}
                    onPick={pickStaff}
                  />
                </StepRow>

                <StepRow
                  stepRef={(el) => {
                    stepRefs.current.date = el;
                  }}
                  step="date"
                  state={isDone("date") ? "done" : isActive("date") ? "active" : "locked"}
                  doneSummary={date ? formatDateLong(date) : ""}
                  onEdit={() => goBackTo("date")}
                >
                  <DateStep
                    value={date}
                    min={minDate}
                    max={maxDate}
                    onChange={pickDate}
                    onConfirm={() => advance("date")}
                  />
                </StepRow>

                <StepRow
                  stepRef={(el) => {
                    stepRefs.current.time = el;
                  }}
                  step="time"
                  state={isDone("time") ? "done" : isActive("time") ? "active" : "locked"}
                  doneSummary={slot ? formatTime(slot) : ""}
                  onEdit={() => goBackTo("time")}
                >
                  <TimeStep
                    slots={slots}
                    selected={slot}
                    onPick={pickSlot}
                    loading={loadingSlots}
                    hasFilters={!!date && !!serviceId && !!staffMemberId}
                    errorMessage={!loadingSlots && error && slots.length === 0 ? error : ""}
                  />
                </StepRow>

                <StepRow
                  stepRef={(el) => {
                    stepRefs.current.contact = el;
                  }}
                  step="contact"
                  state={isActive("contact") ? "active" : "locked"}
                >
                  <ContactStep
                    name={customerName}
                    phone={customerPhone}
                    onName={setCustomerName}
                    onPhone={setCustomerPhone}
                  />

                  {error ? (
                    <p
                      role="alert"
                      aria-live="polite"
                      className="mt-2 text-sm text-red-400"
                    >
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={cn(
                      "mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#fafafa] text-sm font-semibold text-[#0a0a0a] transition",
                      "hover:bg-white disabled:cursor-not-allowed disabled:bg-white/[0.18] disabled:text-white/40",
                    )}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />A reservar…
                      </>
                    ) : (
                      <>Confirmar reserva</>
                    )}
                  </button>
                </StepRow>
              </form>
            )}
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ---------- StepRow (locked / active / done) ----------

type StepRowProps = {
  stepRef: (el: HTMLDivElement | null) => void;
  step: StepId;
  state: "locked" | "active" | "done";
  doneSummary?: string;
  onEdit?: () => void;
  children: ReactNode;
};

function StepRow({ stepRef, step, state, doneSummary, onEdit, children }: StepRowProps) {
  const label = STEP_LABELS[step];
  return (
    <div
      ref={stepRef}
      className={cn(
        "rounded-lg border transition",
        state === "active" && "border-white/[0.12] bg-white/[0.02] p-4",
        state === "done" && "border-white/[0.06] bg-transparent",
        state === "locked" && "border-transparent bg-transparent",
      )}
    >
      {state === "done" ? (
        <button
          type="button"
          onClick={onEdit}
          className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-white/[0.02] rounded-lg"
        >
          <StepIcon state="done" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#71717a]">
              {label}
            </p>
            <p className="truncate text-sm font-semibold text-[#fafafa]">{doneSummary}</p>
          </div>
          <ChevronRight className="size-4 text-[#52525b]" />
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <StepIcon state={state} />
            <h3
              className={cn(
                "font-semibold",
                state === "active" ? "text-[#fafafa]" : "text-[#52525b]",
              )}
              style={{
                fontSize: "var(--text-bio-tab)",
                lineHeight: "var(--text-bio-tab-line)",
              }}
            >
              {label}
            </h3>
          </div>
          {state === "active" ? <div>{children}</div> : null}
        </div>
      )}
    </div>
  );
}

function StepIcon({ state }: { state: "locked" | "active" | "done" }) {
  if (state === "done") {
    return (
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#fafafa] text-[#0a0a0a]"
        aria-hidden
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-[#fafafa] bg-transparent"
        aria-hidden
      >
        <span className="size-2 rounded-full bg-[#fafafa]" />
      </span>
    );
  }
  return (
    <span
      className="flex size-6 shrink-0 rounded-full border-2 border-[#3f3f46] bg-transparent"
      aria-hidden
    />
  );
}

// ---------- Steps ----------

function ServiceStep({
  services,
  selectedId,
  onPick,
}: {
  services: PublicBusinessPayload["services"];
  selectedId: string;
  onPick: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {services.map((service) => {
        const active = service.id === selectedId;
        return (
          <li key={service.id}>
            <button
              type="button"
              onClick={() => onPick(service.id)}
              aria-pressed={active}
              className={cn(
                "flex h-14 w-full items-center gap-3 rounded-lg bg-[#fafafa] px-4 text-left text-[#0a0a0a] transition hover:bg-white",
                active &&
                  "shadow-[0_0_0_2px_var(--bio-accent-ring),0_0_0_3px_var(--bio-accent)]",
              )}
            >
              <BioSelectionTick active={active} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">{service.name}</p>
                <p className="text-xs text-[#71717a]">{service.durationMinutes} min</p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {formatEuro(service.priceCents)}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function BarberStep({
  staff,
  selectedId,
  onPick,
}: {
  staff: PublicBusinessPayload["staffMembers"];
  selectedId: string;
  onPick: (id: string) => void;
}) {
  if (staff.length === 0) {
    return (
      <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-[#a1a1aa]">
        Nenhum profissional disponível para este serviço. Escolhe outro acima.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-2">
      {staff.map((member) => {
        const active = member.id === selectedId;
        return (
          <li key={member.id}>
            <button
              type="button"
              onClick={() => onPick(member.id)}
              aria-pressed={active}
              className={cn(
                "flex w-full flex-col overflow-hidden rounded-lg border-2 bg-[#1a1a1d] text-left transition",
                active
                  ? "border-[var(--bio-accent)]"
                  : "border-transparent hover:bg-[#27272a]",
              )}
            >
              <div className="relative aspect-square w-full bg-[#27272a]">
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt={member.fullName}
                    fill
                    sizes="(max-width: 480px) 50vw, 220px"
                    className="object-cover"
                    unoptimized={!canOptimizeImageUrl(member.avatarUrl)}
                  />
                ) : null}
                <span className="absolute right-2 top-2">
                  <BioSelectionTick active={active} variant="photo" />
                </span>
              </div>
              <div className="px-3 py-3">
                <p className="truncate text-sm font-semibold text-[#fafafa]">
                  {member.fullName}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function DateStep({
  value,
  min,
  max,
  onChange,
  onConfirm,
}: {
  value: string;
  min: string;
  max: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 text-sm text-[#fafafa] outline-none transition focus-visible:border-white/40 focus-visible:bg-white/[0.06]"
        style={{ colorScheme: "dark" }}
      />
      {value ? (
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#fafafa] text-sm font-semibold text-[#0a0a0a] transition hover:bg-white"
        >
          Continuar
        </button>
      ) : null}
    </div>
  );
}

function TimeStep({
  slots,
  selected,
  onPick,
  loading,
  hasFilters,
  errorMessage,
}: {
  slots: BookingSlot[];
  selected: string;
  onPick: (iso: string) => void;
  loading: boolean;
  hasFilters: boolean;
  errorMessage?: string;
}) {
  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-[#a1a1aa]">
        <Loader2 className="size-4 animate-spin" /> A carregar horários…
      </p>
    );
  }
  if (errorMessage) {
    return (
      <p role="alert" className="text-sm text-rose-300">
        {errorMessage}
      </p>
    );
  }
  if (!hasFilters) {
    return (
      <p className="text-sm text-[#a1a1aa]">
        Escolhe data, serviço e barbeiro para ver os horários disponíveis.
      </p>
    );
  }
  if (slots.length === 0) {
    return (
      <p className="text-sm text-[#a1a1aa]">
        Sem horários disponíveis nesta data. Experimenta outro dia.
      </p>
    );
  }
  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((s) => {
        const active = selected === s.iso;
        return (
          <button
            key={s.iso}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPick(s.iso)}
            className={cn(
              "h-10 rounded-lg border text-sm font-medium tabular-nums transition",
              active
                ? "border-[var(--bio-accent)] bg-[var(--bio-accent)] text-[var(--bio-accent-foreground)]"
                : "border-white/[0.12] bg-transparent text-[#fafafa] hover:border-white/30 hover:bg-white/[0.04]",
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function ContactStep({
  name,
  phone,
  onName,
  onPhone,
}: {
  name: string;
  phone: string;
  onName: (v: string) => void;
  onPhone: (v: string) => void;
}) {
  const inputClass =
    "h-12 w-full rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 text-sm text-[#fafafa] outline-none transition placeholder:text-[#52525b] focus-visible:border-white/40 focus-visible:bg-white/[0.06]";
  return (
    <div className="flex flex-col gap-2">
      <label className="grid gap-1">
        <span className="text-xs text-[#a1a1aa]">Nome completo</span>
        <input
          type="text"
          autoComplete="name"
          placeholder="O teu nome"
          value={name}
          onChange={(e) => onName(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-[#a1a1aa]">Telefone</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+351 …"
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          className={inputClass}
        />
      </label>
      <p className="text-xs text-[#71717a]">
        Vamos enviar a confirmação por WhatsApp para este número.
      </p>
    </div>
  );
}

function SuccessView({
  success,
  manageUrl,
  onClose,
}: {
  success: { serviceName: string; startsAt: string };
  manageUrl: string;
  onClose: () => void;
}) {
  const when = success.startsAt
    ? new Date(success.startsAt).toLocaleString("pt-PT", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "";
  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-[#fafafa] text-[#0a0a0a]">
        <Check className="size-8" strokeWidth={3} />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
          Reserva confirmada
        </h3>
        {success.serviceName && when ? (
          <p className="text-sm text-[#a1a1aa]">
            {success.serviceName} · {when}
          </p>
        ) : null}
      </div>
      <div className="flex w-full flex-col gap-2 pt-2">
        {manageUrl ? (
          <a
            href={manageUrl}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#fafafa] text-sm font-semibold text-[#0a0a0a] transition hover:bg-white"
          >
            Gerir reserva
            <ArrowRight className="size-4" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-transparent text-sm font-semibold text-[#fafafa] transition hover:bg-white/[0.04]"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function DrawerHandle() {
  return (
    <div className="flex justify-center pb-2 pt-3">
      <span aria-hidden className="h-1 w-9 rounded-full bg-white/20" />
    </div>
  );
}

// ---------- helpers ----------

function toDateInputValue(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}

function formatDateLong(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
