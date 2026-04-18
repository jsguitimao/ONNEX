"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, endOfWeek, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import {
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  LoaderCircle,
  Phone,
  RefreshCw,
  UserRound,
  Plus,
  ShieldBan,
  Trash2,
} from "lucide-react";
import type { BookingAgendaSnapshot, BookingAgendaViewSnapshot, BookingAgendaWeekSnapshot } from "@/lib/business";
import { formatEuro } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DashboardAgendaProps = {
  initialSnapshot: BookingAgendaSnapshot;
  initialWeekSnapshot: BookingAgendaWeekSnapshot;
};

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  NO_SHOW: "No-show",
};

const statusTone: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  CONFIRMED: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  NO_SHOW: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20",
};

function toDateTimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function DashboardAgenda({ initialSnapshot, initialWeekSnapshot }: DashboardAgendaProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [date, setDate] = useState(initialSnapshot.date);
  const [staffMemberId, setStaffMemberId] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekBookings, setWeekBookings] = useState<Record<string, BookingAgendaSnapshot["bookings"]>>(
    initialWeekSnapshot.bookingsByDate
  );
  const [showManualForm, setShowManualForm] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [bookingDrafts, setBookingDrafts] = useState<
    Record<string, { startsAt: string; internalNotes: string }>
  >(
    Object.fromEntries(
      initialSnapshot.bookings.map((booking) => [
        booking.id,
        {
          startsAt: toDateTimeLocalValue(new Date(booking.startsAt)),
          internalNotes: booking.internalNotes ?? "",
        },
      ])
    )
  );
  const [manualDraft, setManualDraft] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    serviceId: initialSnapshot.services[0]?.id ?? "",
    staffMemberId: initialSnapshot.staffMembers[0]?.id ?? "",
    startsAt: `${initialSnapshot.date}T10:00`,
    status: "CONFIRMED" as "PENDING" | "CONFIRMED",
  });
  const [blockDraft, setBlockDraft] = useState({
    startsAt: `${initialSnapshot.date}T12:00`,
    endsAt: `${initialSnapshot.date}T13:00`,
    reason: "",
    staffMemberId: "",
  });

  const selectedDate = parseISO(`${date}T00:00:00`);
  const didInitialLoad = useRef(false);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  function syncBookingDrafts(bookings: BookingAgendaSnapshot["bookings"]) {
    setBookingDrafts((current) => ({
      ...current,
      ...Object.fromEntries(
        bookings.map((booking) => [
          booking.id,
          {
            startsAt: current[booking.id]?.startsAt ?? toDateTimeLocalValue(new Date(booking.startsAt)),
            internalNotes: current[booking.id]?.internalNotes ?? booking.internalNotes ?? "",
          },
        ])
      ),
    }));
  }

  const summary = useMemo(() => {
    return {
      total: snapshot.bookings.length,
      confirmed: snapshot.bookings.filter((booking) => booking.status === "CONFIRMED").length,
      pending: snapshot.bookings.filter((booking) => booking.status === "PENDING").length,
      completed: snapshot.bookings.filter((booking) => booking.status === "COMPLETED").length,
    };
  }, [snapshot.bookings]);

  const weekSummary = useMemo(() => {
    const bookings = Object.values(weekBookings).flat();

    return {
      total: bookings.length,
      confirmed: bookings.filter((booking) => booking.status === "CONFIRMED").length,
      pending: bookings.filter((booking) => booking.status === "PENDING").length,
      revenue: bookings
        .filter((booking) => !["CANCELLED", "NO_SHOW"].includes(booking.status))
        .reduce((sum, booking) => sum + booking.priceCents, 0),
    };
  }, [weekBookings]);

  async function refreshAgendaView(nextDate = date, nextStaffMemberId = staffMemberId) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ date: nextDate });
      if (nextStaffMemberId) {
        params.set("staffMemberId", nextStaffMemberId);
      }
      params.set("includeWeek", "1");

      const response = await fetch(`/api/dashboard/bookings?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as BookingAgendaViewSnapshot & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível carregar a agenda.");
      }

      setSnapshot(payload.agenda);
      setWeekBookings(payload.week.bookingsByDate);
      syncBookingDrafts(payload.agenda.bookings);
    } catch (agendaError) {
      setError(agendaError instanceof Error ? agendaError.message : "Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
      return;
    }
    void refreshAgendaView(date, staffMemberId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, staffMemberId]);

  async function updateStatus(bookingId: string, status: string) {
    setUpdatingId(bookingId);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível atualizar o estado.");
      }

      await refreshAgendaView();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Erro ao atualizar reserva.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveBooking(bookingId: string, currentStatus: string) {
    const draft = bookingDrafts[bookingId];
    if (!draft) return;

    setUpdatingId(bookingId);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: currentStatus,
          startsAt: new Date(draft.startsAt).toISOString(),
          internalNotes: draft.internalNotes,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível atualizar a reserva.");
      }

      await refreshAgendaView();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao guardar reserva.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function createManualBooking() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...manualDraft,
          startsAt: new Date(manualDraft.startsAt).toISOString(),
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível criar a reserva manual.");
      }

      setShowManualForm(false);
      setManualDraft((current) => ({
        ...current,
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        startsAt: `${date}T10:00`,
      }));
      await refreshAgendaView();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Erro ao criar reserva.");
    } finally {
      setLoading(false);
    }
  }

  async function createBlock() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: new Date(blockDraft.startsAt).toISOString(),
          endsAt: new Date(blockDraft.endsAt).toISOString(),
          reason: blockDraft.reason,
          staffMemberId: blockDraft.staffMemberId,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível criar o bloqueio.");
      }

      setShowBlockForm(false);
      setBlockDraft({
        startsAt: `${date}T12:00`,
        endsAt: `${date}T13:00`,
        reason: "",
        staffMemberId: "",
      });
      await refreshAgendaView();
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : "Erro ao criar bloqueio.");
    } finally {
      setLoading(false);
    }
  }

  async function removeBlock(blockId: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/blocks/${blockId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível remover o bloqueio.");
      }

      await refreshAgendaView();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Erro ao remover bloqueio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">Agenda operacional</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vista diária e semanal com ações rápidas de gestão.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowManualForm((current) => !current)}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Reserva manual</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowBlockForm((current) => !current)}>
            <ShieldBan className="size-4" />
            <span className="hidden sm:inline">Bloqueio</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => void refreshAgendaView()} disabled={loading}>
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
        </div>
      </div>

        {showManualForm ? (
          <div className="rounded-[1.75rem] border border-primary/20 bg-primary/5 p-4">
            <div className="mb-4">
              <p className="font-medium">Nova reserva manual</p>
              <p className="text-sm text-muted-foreground">
                Usa este bloco para registar marcações por telefone, WhatsApp ou atendimento no local.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={manualDraft.customerName}
                onChange={(event) => setManualDraft((current) => ({ ...current, customerName: event.target.value }))}
                placeholder="Nome do cliente"
              />
              <Input
                type="tel"
                value={manualDraft.customerPhone}
                onChange={(event) => setManualDraft((current) => ({ ...current, customerPhone: event.target.value }))}
                placeholder="Telefone"
              />
              <Input
                type="email"
                value={manualDraft.customerEmail}
                onChange={(event) => setManualDraft((current) => ({ ...current, customerEmail: event.target.value }))}
                placeholder="Email"
              />
              <select
                className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                value={manualDraft.status}
                onChange={(event) =>
                  setManualDraft((current) => ({
                    ...current,
                    status: event.target.value as "PENDING" | "CONFIRMED",
                  }))
                }
              >
                <option value="CONFIRMED">Confirmada</option>
                <option value="PENDING">Pendente</option>
              </select>
              <select
                className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                value={manualDraft.serviceId}
                onChange={(event) => setManualDraft((current) => ({ ...current, serviceId: event.target.value }))}
              >
                {snapshot.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <select
                className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                value={manualDraft.staffMemberId}
                onChange={(event) => setManualDraft((current) => ({ ...current, staffMemberId: event.target.value }))}
              >
                {snapshot.staffMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </select>
              <Input
                type="datetime-local"
                value={manualDraft.startsAt}
                onChange={(event) => setManualDraft((current) => ({ ...current, startsAt: event.target.value }))}
                className="md:col-span-2"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowManualForm(false)}>
                Fechar
              </Button>
              <Button
                disabled={!manualDraft.customerName || !manualDraft.serviceId || !manualDraft.staffMemberId || loading}
                onClick={() => void createManualBooking()}
              >
                {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Criar reserva
              </Button>
            </div>
          </div>
        ) : null}

        {showBlockForm ? (
          <div className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="mb-4">
              <p className="font-medium">Novo bloqueio de agenda</p>
              <p className="text-sm text-muted-foreground">
                Usa para pausas, almoço, saída antecipada ou indisponibilidade de um profissional.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                value={blockDraft.staffMemberId}
                onChange={(event) => setBlockDraft((current) => ({ ...current, staffMemberId: event.target.value }))}
              >
                <option value="">Toda a equipa</option>
                {snapshot.staffMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </select>
              <Input
                value={blockDraft.reason}
                onChange={(event) => setBlockDraft((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Motivo do bloqueio"
              />
              <Input
                type="datetime-local"
                value={blockDraft.startsAt}
                onChange={(event) => setBlockDraft((current) => ({ ...current, startsAt: event.target.value }))}
              />
              <Input
                type="datetime-local"
                value={blockDraft.endsAt}
                onChange={(event) => setBlockDraft((current) => ({ ...current, endsAt: event.target.value }))}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBlockForm(false)}>
                Fechar
              </Button>
              <Button disabled={loading} onClick={() => void createBlock()}>
                {loading ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldBan className="size-4" />}
                Criar bloqueio
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Data</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          </label>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Profissional</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStaffMemberId("")}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition",
                  !staffMemberId ? "border-primary bg-primary/10 text-primary" : "border-border/70 hover:border-primary/30"
                )}
              >
                Toda a equipa
              </button>
              {snapshot.staffMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setStaffMemberId(member.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition",
                    staffMemberId === member.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 hover:border-primary/30"
                  )}
                >
                  {member.fullName}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-muted/20 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Semana operacional</p>
              <p className="font-medium">
                {format(weekStart, "dd MMM")} - {format(weekEnd, "dd MMM")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDate(format(addDays(weekStart, -7), "yyyy-MM-dd"))}
              >
                <ChevronLeft className="size-4" />
                Semana anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDate(format(addDays(weekStart, 7), "yyyy-MM-dd"))}
              >
                Próxima semana
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-7">
            {weekDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const bookings = weekBookings[dayKey] ?? [];
              const isSelected = isSameDay(day, selectedDate);

              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setDate(dayKey)}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border/70 bg-background hover:border-primary/30"
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {format(day, "EEE")}
                  </p>
                  <p className="mt-2 font-heading text-2xl font-semibold">{format(day, "dd")}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{bookings.length} reservas</p>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/70 px-4 py-3">
            <p className="text-xs text-muted-foreground">Hoje</p>
            <p className="font-heading text-2xl font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3">
            <p className="text-xs text-sky-600">Confirmadas</p>
            <p className="font-heading text-2xl font-semibold text-sky-700">{summary.confirmed}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-xs text-amber-600">Pendentes</p>
            <p className="font-heading text-2xl font-semibold text-amber-700">{summary.pending}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <p className="text-xs text-emerald-600">Concluídas</p>
            <p className="font-heading text-2xl font-semibold text-emerald-700">{summary.completed}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 px-4 py-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Semana</p>
            <p className="font-heading text-lg font-semibold">{weekSummary.total}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Confirmadas</p>
            <p className="font-heading text-lg font-semibold">{weekSummary.confirmed}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="font-heading text-lg font-semibold">{weekSummary.pending}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receita prevista</p>
            <p className="font-heading text-lg font-semibold">{formatEuro(weekSummary.revenue)}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {snapshot.scheduleBlocks.length > 0 ? (
          <div className="rounded-[1.75rem] border border-border/70 bg-muted/20 p-4">
            <div className="mb-4">
              <p className="font-medium">Bloqueios do dia</p>
              <p className="text-sm text-muted-foreground">
                Indisponibilidades aplicadas neste dia para a equipa inteira ou para profissionais específicos.
              </p>
            </div>

            <div className="grid gap-2">
              {snapshot.scheduleBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background p-3"
                >
                  <div>
                    <p className="font-medium">{block.reason || "Bloqueio de agenda"}</p>
                    <p className="text-sm text-muted-foreground">
                      {block.staffName ?? "Toda a equipa"} ·{" "}
                      {new Date(block.startsAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })} -{" "}
                      {new Date(block.endsAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <Button size="sm" variant="outline" disabled={loading} onClick={() => void removeBlock(block.id)}>
                    <Trash2 className="size-4" />
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3">
          {snapshot.bookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
              Não há reservas para este filtro. Assim que entrarem marcações públicas, elas vão
              aparecer aqui com ações rápidas.
            </div>
          ) : (
            snapshot.bookings.map((booking) => (
              <div
                key={booking.id}
                className="grid gap-4 rounded-3xl border border-border/70 bg-background/80 p-4 lg:grid-cols-[1fr_auto]"
              >
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn("border", statusTone[booking.status])}>{statusLabel[booking.status]}</Badge>
                    <Badge variant="outline">{booking.source}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(booking.startsAt).toLocaleTimeString("pt-PT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(booking.endsAt).toLocaleTimeString("pt-PT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                      <p className="font-medium">{booking.customerName}</p>
                      <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                        {booking.customerPhone ? (
                          <span className="inline-flex items-center gap-2">
                            <Phone className="size-4" />
                            {booking.customerPhone}
                          </span>
                        ) : null}
                        {booking.customerEmail ? <span>{booking.customerEmail}</span> : null}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                      <p className="font-medium">{booking.serviceName}</p>
                      <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <UserRound className="size-4" />
                          {booking.staffName}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Clock3 className="size-4" />
                          {formatEuro(booking.priceCents)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm font-medium">Remarcar no painel</span>
                        <Input
                          type="datetime-local"
                          value={
                            bookingDrafts[booking.id]?.startsAt ?? toDateTimeLocalValue(new Date(booking.startsAt))
                          }
                          onChange={(event) =>
                            setBookingDrafts((current) => ({
                              ...current,
                              [booking.id]: {
                                startsAt: event.target.value,
                                internalNotes: current[booking.id]?.internalNotes ?? booking.internalNotes ?? "",
                              },
                            }))
                          }
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="inline-flex items-center gap-2 text-sm font-medium">
                          <FileText className="size-4 text-primary" />
                          Notas internas
                        </span>
                        <textarea
                          className="min-h-24 rounded-2xl border border-input bg-background px-3 py-2 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          value={bookingDrafts[booking.id]?.internalNotes ?? booking.internalNotes ?? ""}
                          onChange={(event) =>
                            setBookingDrafts((current) => ({
                              ...current,
                              [booking.id]: {
                                startsAt: current[booking.id]?.startsAt ?? toDateTimeLocalValue(new Date(booking.startsAt)),
                                internalNotes: event.target.value,
                              },
                            }))
                          }
                          placeholder="Observações internas para a equipa..."
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-2 lg:w-[240px] lg:justify-end">
                  <Button
                    size="sm"
                    variant={booking.status === "CONFIRMED" ? "default" : "outline"}
                    disabled={updatingId === booking.id}
                    onClick={() => void updateStatus(booking.id, "CONFIRMED")}
                  >
                    {updatingId === booking.id ? <LoaderCircle className="size-4 animate-spin" /> : null}
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant={booking.status === "COMPLETED" ? "default" : "outline"}
                    disabled={updatingId === booking.id}
                    onClick={() => void updateStatus(booking.id, "COMPLETED")}
                  >
                    <CheckCheck className="size-4" />
                    Concluir
                  </Button>
                  <Button
                    size="sm"
                    variant={booking.status === "NO_SHOW" ? "secondary" : "outline"}
                    disabled={updatingId === booking.id}
                    onClick={() => void updateStatus(booking.id, "NO_SHOW")}
                  >
                    No-show
                  </Button>
                  <Button
                    size="sm"
                    variant={booking.status === "CANCELLED" ? "destructive" : "outline"}
                    disabled={updatingId === booking.id}
                    onClick={() => void updateStatus(booking.id, "CANCELLED")}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updatingId === booking.id}
                    onClick={() => void saveBooking(booking.id, booking.status)}
                  >
                    {updatingId === booking.id ? <LoaderCircle className="size-4 animate-spin" /> : <FileText className="size-4" />}
                    Guardar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
    </div>
  );
}

