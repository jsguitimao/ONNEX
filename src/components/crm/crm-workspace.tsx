"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageEditor } from "@/components/page-editor/page-editor";
import type { EditorDraft } from "@/lib/page-editor/draft";
import type { CrmCustomerKpis, CrmCustomerRowDto } from "@/lib/crm/customers";
import type { CrmStaffRow } from "@/lib/crm/staff";
import type { CrmBookingRowDto, CrmPendingBookingDto } from "@/lib/crm/bookings";
import type { CrmDayAvailability } from "@/lib/crm/availability";
import type { CrmScheduleBlockRowDto } from "@/lib/crm/schedule-blocks";
import type { CrmFinancialSummary } from "@/lib/crm/finance";

export type CrmServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
};
import { AccountPanel, type CrmSubscriptionInfo } from "./crm-account-panel";
import { ActionConfigPanel } from "./crm-action-panel";
import { AppointmentPanel } from "./crm-appointment-panel";
import { CustomersPanel } from "./crm-customers-panel";
import { sections } from "./crm-data";
import { FinancePanel } from "./crm-finance-panel";
import type { CrmActionKind, CrmSectionId } from "./crm-types";

type Props = {
  customers: CrmCustomerRowDto[];
  customerKpis: CrmCustomerKpis;
  staff: CrmStaffRow[];
  businessAutoAccept: boolean;
  pendingBookings: CrmPendingBookingDto[];
  weeklyBookings: CrmBookingRowDto[];
  dailyBookings: CrmBookingRowDto[];
  businessTimezone: string;
  availabilityByStaff: Record<string, CrmDayAvailability[]>;
  scheduleBlocks: CrmScheduleBlockRowDto[];
  initialFinancialSummary: CrmFinancialSummary;
  services: CrmServiceOption[];
  editorDraft: EditorDraft;
  subscription: CrmSubscriptionInfo;
};

export function CrmWorkspace({
  customers,
  customerKpis,
  staff,
  businessAutoAccept,
  pendingBookings,
  weeklyBookings,
  dailyBookings,
  businessTimezone,
  availabilityByStaff,
  scheduleBlocks,
  initialFinancialSummary,
  services,
  editorDraft,
  subscription,
}: Props) {
  const [active, setActive] = useState<CrmSectionId>("painel-visual");
  const [actionPanel, setActionPanel] = useState<CrmActionKind | null>(null);
  const [customerList, setCustomerList] = useState(customers);
  const [staffList, setStaffList] = useState(staff);
  const [pendingBookingsList, setPendingBookingsList] = useState(pendingBookings);
  const [availabilityState, setAvailabilityState] = useState(availabilityByStaff);
  const [scheduleBlocksList, setScheduleBlocksList] = useState(scheduleBlocks);
  const activeSection = sections.find((section) => section.id === active) ?? sections[0];
  const Icon = activeSection.icon;
  const showActionButton = active === "clientes" || active === "agendamentos";

  function handleCustomerCreated(customer: CrmCustomerRowDto) {
    setCustomerList((current) => [customer, ...current.filter((row) => row.id !== customer.id)]);
    setActionPanel(null);
  }

  function handleCustomerDeleted(customerId: string) {
    setCustomerList((current) => current.filter((row) => row.id !== customerId));
  }

  function handleCustomerUpdated(updated: CrmCustomerRowDto) {
    setCustomerList((current) => current.map((row) => (row.id === updated.id ? updated : row)));
  }

  function handleStaffUpdated(updated: CrmStaffRow) {
    setStaffList((current) => current.map((row) => (row.id === updated.id ? updated : row)));
  }

  function handlePendingBookingResolved(bookingId: string) {
    setPendingBookingsList((current) => current.filter((row) => row.id !== bookingId));
  }

  function handlePendingBookingRestored(booking: CrmPendingBookingDto) {
    setPendingBookingsList((current) => {
      if (current.some((row) => row.id === booking.id)) return current;
      return [...current, booking].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    });
  }

  function handleScheduleBlockCreated(block: CrmScheduleBlockRowDto) {
    setScheduleBlocksList((current) =>
      [...current, block].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    );
  }

  function handleScheduleBlockDeleted(blockId: string) {
    setScheduleBlocksList((current) => current.filter((row) => row.id !== blockId));
  }

  function handleStaffDayAvailabilityUpdated(staffId: string, day: CrmDayAvailability) {
    setAvailabilityState((current) => {
      const previous = current[staffId] ?? [];
      const next = previous.map((entry) => (entry.dayOfWeek === day.dayOfWeek ? day : entry));
      if (!previous.some((entry) => entry.dayOfWeek === day.dayOfWeek)) {
        next.push(day);
      }
      next.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      return { ...current, [staffId]: next };
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- "/" é a landing estática (rewrite p/ landing.html, sem app/page.tsx); precisa de navegação real, não client-side */}
            <a
              href="/"
              aria-label="Onnex — voltar à página inicial"
              className="inline-block rounded text-3xl font-bold tracking-tight transition hover:opacity-70 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Onnex
            </a>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Gestão comercial
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showActionButton ? (
              <Button type="button" onClick={() => setActionPanel(active)}>
                <Plus className="size-4" />
                {activeSection.action ?? "Configurar"}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            const selected = section.id === active;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setActive(section.id);
                  setActionPanel(null);
                }}
                className={cn(
                  "flex min-h-20 w-full items-center gap-3 rounded-lg border px-3 text-left transition",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:border-foreground/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md",
                    selected ? "bg-background/15" : "bg-muted",
                  )}
                >
                  <SectionIcon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{section.label}</span>
                  <span
                    className={cn(
                      "mt-0.5 line-clamp-2 block text-xs leading-5",
                      selected ? "text-background/75" : "text-muted-foreground",
                    )}
                  >
                    {section.description}
                  </span>
                </span>
              </button>
            );
          })}
        </aside>

        <section className="min-w-0 space-y-5">
          {actionPanel ? (
            <ActionConfigPanel
              action={actionPanel}
              staff={staffList}
              services={services}
              onClose={() => setActionPanel(null)}
              onCustomerCreated={handleCustomerCreated}
            />
          ) : null}

          {active === "painel-visual" ? null : (
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{activeSection.label}</h2>
                    <p className="text-sm text-muted-foreground">{activeSection.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {active === "painel-visual" ? (
            <div className="rounded-lg border border-border bg-card">
              <PageEditor initialDraft={editorDraft} embedded />
            </div>
          ) : active === "clientes" ? (
            <CustomersPanel
              customers={customerList}
              kpis={customerKpis}
              onCustomerDeleted={handleCustomerDeleted}
              onCustomerUpdated={handleCustomerUpdated}
            />
          ) : active === "agendamentos" ? (
            <AppointmentPanel
              staff={staffList}
              businessAutoAccept={businessAutoAccept}
              pendingBookings={pendingBookingsList}
              weeklyBookings={weeklyBookings}
              dailyBookings={dailyBookings}
              businessTimezone={businessTimezone}
              availabilityByStaff={availabilityState}
              scheduleBlocks={scheduleBlocksList}
              onStaffUpdated={handleStaffUpdated}
              onPendingBookingResolved={handlePendingBookingResolved}
              onPendingBookingRestored={handlePendingBookingRestored}
              onStaffDayAvailabilityUpdated={handleStaffDayAvailabilityUpdated}
              onScheduleBlockCreated={handleScheduleBlockCreated}
              onScheduleBlockDeleted={handleScheduleBlockDeleted}
            />
          ) : active === "conta" ? (
            <AccountPanel subscription={subscription} />
          ) : (
            <FinancePanel staff={staffList} initialSummary={initialFinancialSummary} />
          )}
        </section>
      </div>
    </main>
  );
}
