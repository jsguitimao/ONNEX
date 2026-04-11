"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCheck, Clock3, LoaderCircle, Phone, RefreshCw, UserRound } from "lucide-react";
import type { BookingAgendaSnapshot } from "@/lib/business";
import { formatEuro } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DashboardAgendaProps = {
  initialSnapshot: BookingAgendaSnapshot;
};

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Concluida",
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

export function DashboardAgenda({ initialSnapshot }: DashboardAgendaProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [date, setDate] = useState(initialSnapshot.date);
  const [staffMemberId, setStaffMemberId] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    return {
      total: snapshot.bookings.length,
      confirmed: snapshot.bookings.filter((booking) => booking.status === "CONFIRMED").length,
      pending: snapshot.bookings.filter((booking) => booking.status === "PENDING").length,
      completed: snapshot.bookings.filter((booking) => booking.status === "COMPLETED").length,
    };
  }, [snapshot.bookings]);

  async function refreshAgenda(nextDate = date, nextStaffMemberId = staffMemberId) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ date: nextDate });
      if (nextStaffMemberId) {
        params.set("staffMemberId", nextStaffMemberId);
      }

      const response = await fetch(`/api/dashboard/bookings?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as BookingAgendaSnapshot & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel carregar a agenda.");
      }

      setSnapshot(payload);
    } catch (agendaError) {
      setError(agendaError instanceof Error ? agendaError.message : "Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAgenda(date, staffMemberId);
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
        throw new Error(payload.error ?? "Nao foi possivel atualizar o estado.");
      }

      await refreshAgenda();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Erro ao atualizar reserva.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card className="mt-6 border-border/70">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="font-heading text-2xl">Agenda operacional</CardTitle>
            <CardDescription>
              Vista diaria para confirmar presencas, concluir atendimentos e reagir rapido ao que
              entra pela pagina publica.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => void refreshAgenda()} disabled={loading}>
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Atualizar
          </Button>
        </div>

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
      </CardHeader>

      <CardContent className="grid gap-6">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Reservas do dia</p>
            <p className="mt-2 font-heading text-3xl font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-3xl border border-sky-500/20 bg-sky-500/5 p-4">
            <p className="text-sm text-sky-700">Confirmadas</p>
            <p className="mt-2 font-heading text-3xl font-semibold text-sky-700">{summary.confirmed}</p>
          </div>
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-700">Pendentes</p>
            <p className="mt-2 font-heading text-3xl font-semibold text-amber-700">{summary.pending}</p>
          </div>
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm text-emerald-700">Concluidas</p>
            <p className="mt-2 font-heading text-3xl font-semibold text-emerald-700">{summary.completed}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3">
          {snapshot.bookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
              Nao ha reservas para este filtro. Assim que entrarem marcacoes publicas, elas vao
              aparecer aqui com acoes rapidas.
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
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
