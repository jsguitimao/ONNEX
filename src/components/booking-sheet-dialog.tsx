"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { Drawer } from "@base-ui/react/drawer";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
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
const SELECTED_CARD_SHADOW =
  "shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--bio-accent)]";

function stepNumber(step: StepId) {
  return STEP_ORDER.indexOf(step) + 1;
}

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
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [activeStep, setActiveStep] = useState<StepId>("service");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ serviceName: string; startsAt: string } | null>(null);
  const [manageUrl, setManageUrl] = useState("");

  // Idempotency: gerada na 1a tentativa, reutilizada se a chamada falhar e o
  // cliente tentar de novo (rede / refresh do botao). Limpa apos sucesso ou
  // quando o cliente volta atras a editar — assim cada submit novo tem chave nova.
  const idempotencyKeyRef = useRef<string | null>(null);

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
    if (!node) return;
    const container = node.closest<HTMLElement>("[data-scroll-root]");
    if (!container) return;

    requestAnimationFrame(() => {
      const target = node.offsetTop - container.offsetTop - 16;
      container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    });
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
    // Editar dados apos uma tentativa exige uma chave de idempotencia nova,
    // senao o servidor poderia devolver o resultado da tentativa anterior.
    idempotencyKeyRef.current = null;
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
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) &&
    customerPhone.trim().length > 0 &&
    !submitting;

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
          customerEmail,
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
        <Drawer.Popup
          data-theme={business.theme}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-[var(--bio-card-width)] flex-col overflow-hidden rounded-t-[20px] bg-card text-foreground shadow-[0_-16px_48px_rgba(0,0,0,0.16)] transition-transform duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full"
          style={bookingThemeVars(business.theme)}
        >
          <DrawerHandle />

          <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-1">
            <Drawer.Title
              className="font-bold text-foreground"
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
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-foreground transition hover:bg-foreground/[0.12] active:bg-foreground/[0.16]"
            >
              <X className="size-4" strokeWidth={2.5} />
            </Drawer.Close>
          </header>

          <div
            data-scroll-root
            className="flex-1 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),24px)]"
          >
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
                    email={customerEmail}
                    phone={customerPhone}
                    onName={setCustomerName}
                    onEmail={setCustomerEmail}
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
                      "mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold leading-5 tracking-[-0.2px] text-primary-foreground transition",
                      "hover:bg-primary/90 active:bg-primary/80 disabled:cursor-not-allowed disabled:bg-foreground/[0.12] disabled:text-muted-foreground",
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
        "rounded-xl border px-4 transition-colors duration-200",
        state === "active" && "border-border bg-foreground/[0.04] py-4",
        state === "done" && "border-transparent bg-transparent",
        state === "locked" && "border-transparent bg-transparent py-3",
      )}
    >
      {state === "done" ? (
        <button
          type="button"
          onClick={onEdit}
          className="-mx-2 flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-foreground/[0.04] active:bg-foreground/[0.08]"
        >
          <StepIcon step={stepNumber(step)} state="done" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-0.5 truncate text-[15px] font-semibold leading-5 tracking-[-0.2px] text-foreground">
              {doneSummary}
            </p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <StepIcon step={stepNumber(step)} state={state} />
            <h3
              className={cn(
                "font-semibold",
                state === "active" ? "text-foreground" : "text-muted-foreground",
              )}
              style={{
                fontSize: "var(--text-bio-tab)",
                lineHeight: "var(--text-bio-tab-line)",
                letterSpacing: "-0.2px",
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

function StepIcon({
  step,
  state,
}: {
  step: number;
  state: "locked" | "active" | "done";
}) {
  if (state === "done") {
    return (
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-hidden
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold tabular-nums text-primary-foreground"
        aria-hidden
      >
        {step}
      </span>
    );
  }
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-transparent text-xs font-semibold tabular-nums text-muted-foreground"
      aria-hidden
    >
      {step}
    </span>
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
                "flex h-16 w-full items-center gap-3 rounded-xl border px-4 text-left text-foreground transition active:scale-[0.99]",
                active
                  ? `border-[var(--bio-accent)] bg-foreground/[0.08] ${SELECTED_CARD_SHADOW}`
                  : "border-border bg-foreground/[0.04] hover:border-foreground/25 hover:bg-foreground/[0.08]",
              )}
            >
              <BioSelectionTick active={active} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-5 tracking-[-0.2px]">
                  {service.name}
                </p>
                <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">
                  {service.durationMinutes} min
                </p>
              </div>
              <p className="shrink-0 text-[15px] font-semibold leading-5 tracking-[-0.2px] tabular-nums">
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
      <p className="rounded-xl border border-border bg-foreground/[0.04] p-3 text-[15px] leading-5 text-muted-foreground">
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
                "flex w-full flex-col overflow-hidden rounded-xl border-2 bg-muted text-left transition active:scale-[0.99]",
                active
                  ? `border-[var(--bio-accent)] ${SELECTED_CARD_SHADOW}`
                  : "border-transparent hover:bg-foreground/[0.10]",
              )}
            >
              <div className="relative aspect-square w-full bg-foreground/[0.08]">
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
              <div className="px-3.5 py-3.5">
                <p className="truncate text-[15px] font-semibold leading-5 tracking-[-0.2px] text-foreground">
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
  const days = useMemo(() => generateCalendarDays(min, max), [min, max]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialMonth = useMemo(() => getMonthAnchor(value || min), [min, value]);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const visibleMonthRef = useRef(initialMonth);

  useEffect(() => {
    if (!value) return;
    const index = days.findIndex((day) => day.iso === value);
    if (index < 0) return;

    const container = scrollRef.current;
    const pill = container?.children[index] as HTMLElement | undefined;
    if (!container || !pill) return;

    const containerRect = container.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    const visible = pillRect.left >= containerRect.left && pillRect.right <= containerRect.right;
    if (!visible) {
      pill.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [days, value]);

  const monthLabel = useMemo(
    () =>
      monthFormatter
        .format(new Date(visibleMonth.year, visibleMonth.month - 1, 1))
        .toUpperCase(),
    [visibleMonth],
  );
  const minMonth = getMonthAnchor(min);
  const maxMonth = getMonthAnchor(max);
  const canPrevMonth = compareMonth(visibleMonth, minMonth) > 0;
  const canNextMonth = compareMonth(visibleMonth, maxMonth) < 0;

  const updateVisibleMonth = (anchor: MonthAnchor) => {
    if (
      visibleMonthRef.current.year === anchor.year &&
      visibleMonthRef.current.month === anchor.month
    ) {
      return;
    }
    visibleMonthRef.current = anchor;
    setVisibleMonth(anchor);
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    const containerLeft = container.getBoundingClientRect().left;
    const children = Array.from(container.children) as HTMLElement[];
    const lead = children.find((child) => child.getBoundingClientRect().left >= containerLeft - 1);
    if (!lead) return;

    const day = days[children.indexOf(lead)];
    if (day) updateVisibleMonth({ year: day.date.getFullYear(), month: day.date.getMonth() + 1 });
  };

  const jumpMonth = (delta: -1 | 1) => {
    let targetYear = visibleMonthRef.current.year;
    let targetMonth = visibleMonthRef.current.month + delta;
    if (targetMonth < 1) {
      targetMonth = 12;
      targetYear -= 1;
    } else if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }

    const index = days.findIndex(
      (day) => day.date.getFullYear() === targetYear && day.date.getMonth() === targetMonth - 1,
    );
    const pill = scrollRef.current?.children[index] as HTMLElement | undefined;
    pill?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  return (
    <div className="relative flex flex-col gap-3">
      <div className="absolute -top-9 right-0 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => jumpMonth(-1)}
          disabled={!canPrevMonth}
          aria-label="Mês anterior"
          className="flex size-7 items-center justify-center rounded-full bg-foreground/[0.08] text-foreground transition hover:bg-foreground/[0.12] active:bg-foreground/[0.16] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-foreground/[0.08]"
        >
          <ChevronLeft className="size-3.5" strokeWidth={2.25} />
        </button>
        <span className="min-w-[80px] text-center text-[12px] font-medium uppercase leading-[14px] tracking-[0.06em] text-muted-foreground">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => jumpMonth(1)}
          disabled={!canNextMonth}
          aria-label="Mês seguinte"
          className="flex size-7 items-center justify-center rounded-full bg-foreground/[0.08] text-foreground transition hover:bg-foreground/[0.12] active:bg-foreground/[0.16] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-foreground/[0.08]"
        >
          <ChevronRight className="size-3.5" strokeWidth={2.25} />
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="radiogroup"
        aria-label="Escolher data"
        className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((day) => {
          const selected = day.iso === value;
          const disabled = day.iso < min || day.iso > max;
          return (
            <button
              key={day.iso}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={formatDateLong(day.iso)}
              disabled={disabled}
              onClick={() => onChange(day.iso)}
              className={cn(
                "flex w-14 shrink-0 snap-start flex-col items-center gap-0.5 rounded-xl border py-2.5 transition-colors duration-200 active:scale-[0.98]",
                selected
                  ? "border-[var(--bio-accent)] bg-[var(--bio-accent)] text-[var(--bio-accent-foreground)]"
                  : disabled
                    ? "cursor-not-allowed border-border bg-transparent text-muted-foreground opacity-45"
                    : "border-border bg-foreground/[0.04] text-foreground hover:border-foreground/25 hover:bg-foreground/[0.08] active:bg-foreground/[0.12]",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase leading-[13px] tracking-[0.04em]",
                  selected ? "text-[var(--bio-accent-foreground)]/80" : "text-muted-foreground",
                )}
              >
                {WEEKDAY_PT[day.date.getDay()]}
              </span>
              <span className="text-[18px] font-bold leading-6 tabular-nums">
                {day.date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div className="hidden items-center justify-center gap-2 sm:flex">
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollBy({ left: -224, behavior: "smooth" })}
          aria-label="Semana anterior"
          className="flex size-9 items-center justify-center rounded-full bg-foreground/[0.08] text-foreground transition hover:bg-foreground/[0.12] active:bg-foreground/[0.16]"
        >
          <ChevronLeft className="size-4" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollBy({ left: 224, behavior: "smooth" })}
          aria-label="Semana seguinte"
          className="flex size-9 items-center justify-center rounded-full bg-foreground/[0.08] text-foreground transition hover:bg-foreground/[0.12] active:bg-foreground/[0.16]"
        >
          <ChevronRight className="size-4" strokeWidth={2.25} />
        </button>
      </div>

      {value ? (
        <>
          <p className="text-[13px] leading-[18px] text-muted-foreground first-letter:uppercase">
            {formatDateLong(value)}
          </p>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-semibold leading-5 tracking-[-0.2px] text-primary-foreground transition hover:bg-primary/90 active:bg-primary/80"
          >
            Continuar
          </button>
        </>
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
      <p className="flex items-center gap-2 text-[15px] leading-5 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> A carregar horários…
      </p>
    );
  }
  if (errorMessage) {
    return (
      <p role="alert" className="text-[15px] leading-5 text-muted-foreground">
        {errorMessage}
      </p>
    );
  }
  if (!hasFilters) {
    return (
      <p className="text-[15px] leading-5 text-muted-foreground">
        Escolhe data, serviço e barbeiro para ver os horários disponíveis.
      </p>
    );
  }
  const anyAvailable = slots.some((s) => isSlotAvailable(s));
  if (slots.length === 0 || !anyAvailable) {
    return (
      <p className="text-[15px] leading-5 text-muted-foreground">
        Sem horários disponíveis nesta data. Experimenta outro dia.
      </p>
    );
  }
  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((s) => {
        const active = selected === s.iso;
        const available = isSlotAvailable(s);
        return (
          <button
            key={s.iso}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={available ? s.label : `${s.label} indisponivel`}
            disabled={!available}
            onClick={() => onPick(s.iso)}
            className={cn(
              "h-11 rounded-xl border text-[15px] font-semibold leading-5 tracking-[-0.2px] tabular-nums transition-colors duration-200",
              !available
                ? "cursor-not-allowed border-border bg-transparent text-muted-foreground line-through opacity-50"
                : active
                  ? "border-[var(--bio-accent)] bg-[var(--bio-accent)] text-[var(--bio-accent-foreground)]"
                  : "border-border bg-transparent text-foreground hover:border-foreground/30 hover:bg-foreground/[0.04] active:bg-foreground/[0.08]",
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
  email,
  phone,
  onName,
  onEmail,
  onPhone,
}: {
  name: string;
  email: string;
  phone: string;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onPhone: (v: string) => void;
}) {
  const inputClass =
    "h-12 w-full rounded-xl border border-border bg-foreground/[0.04] px-3.5 text-[15px] leading-5 text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-foreground/35 focus-visible:bg-foreground/[0.08]";
  return (
    <div className="flex flex-col gap-2">
      <label className="grid gap-1">
        <span className="text-[13px] leading-[18px] text-muted-foreground">Nome completo</span>
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
        <span className="text-[13px] leading-[18px] text-muted-foreground">Email</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="o-teu@email.com"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-[13px] leading-[18px] text-muted-foreground">Telefone</span>
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
      <p className="text-[13px] leading-[18px] text-muted-foreground">
        Enviamos a confirmação da reserva para o teu email e WhatsApp.
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
      <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-8" strokeWidth={3} />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-[20px] font-bold leading-6 tracking-[-0.3px] text-foreground">
          Reserva confirmada
        </h3>
        {success.serviceName && when ? (
          <p className="text-[15px] leading-5 text-muted-foreground">
            {success.serviceName} · {when}
          </p>
        ) : null}
      </div>
      <div className="flex w-full flex-col gap-2 pt-2">
        {manageUrl ? (
          <a
            href={manageUrl}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold leading-5 tracking-[-0.2px] text-primary-foreground transition hover:bg-primary/90 active:bg-primary/80"
          >
            Gerir reserva
            <ArrowRight className="size-4" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-transparent text-[15px] font-semibold leading-5 tracking-[-0.2px] text-foreground transition hover:bg-foreground/[0.04] active:bg-foreground/[0.08]"
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
      <span aria-hidden className="h-[5px] w-9 rounded-full bg-foreground/20" />
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

const WEEKDAY_PT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"] as const;

const monthFormatter = new Intl.DateTimeFormat("pt-PT", { month: "long" });

type MonthAnchor = {
  year: number;
  month: number;
};

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateCalendarDays(min: string, max: string) {
  const minDate = parseDateKey(min);
  const maxDate = parseDateKey(max);
  if (!minDate || !maxDate) return [];

  const cursor = new Date(minDate);
  const daysFromMonday = (cursor.getDay() + 6) % 7;
  cursor.setDate(cursor.getDate() - daysFromMonday);

  const days: Array<{ date: Date; iso: string }> = [];
  while (cursor.getTime() <= maxDate.getTime()) {
    const date = new Date(cursor);
    days.push({ date, iso: toDateKey(date) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function getMonthAnchor(value: string): MonthAnchor {
  const date = parseDateKey(value) ?? new Date();
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function compareMonth(a: MonthAnchor, b: MonthAnchor) {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  return 0;
}

function isSlotAvailable(slot: BookingSlot) {
  return !("available" in slot) || slot.available !== false;
}

function bookingThemeVars(theme: PublicBusinessPayload["theme"]): CSSProperties {
  if (theme === "light") {
    return {
      "--card": "#f0f0f0",
      "--foreground": "#141414",
      "--muted-foreground": "#666666",
      "--border": "#e8e8e8",
      "--primary": "#007aff",
      "--primary-foreground": "#ffffff",
    } as CSSProperties;
  }

  return {
    "--card": "#141414",
    "--foreground": "#fcfcfc",
    "--muted-foreground": "#a6a6a6",
    "--border": "#383838",
    "--primary": "#007aff",
    "--primary-foreground": "#ffffff",
  } as CSSProperties;
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
