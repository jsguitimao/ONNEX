"use client";

import { startTransition, useState } from "react";
import { Check, LoaderCircle, Plus, Save, Trash2, UserRound } from "lucide-react";
import { DEFAULT_AVAILABILITY } from "@/lib/business-modules/types";
import type { AvailabilityInput, ManagementSnapshot } from "@/lib/business";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const weekdays = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sab" },
  { value: 0, label: "Dom" },
];

type ServiceDraft = {
  name: string;
  description: string;
  durationMinutes: string;
  priceEuros: string;
  isActive: boolean;
};

type StaffDraft = {
  fullName: string;
  roleTitle: string;
  bio: string;
  isActive: boolean;
  serviceIds: string[];
  availability: AvailabilityInput[];
};

type DashboardOpsProps = {
  initialSnapshot: ManagementSnapshot;
};

function formatEuroFromCents(value: number) {
  return (value / 100).toFixed(2);
}

function parseEurosToCents(value: string) {
  return Math.round(Number(value.replace(",", ".")) * 100);
}

function defaultAvailability(): AvailabilityInput[] {
  return DEFAULT_AVAILABILITY.map((slot) => ({ ...slot }));
}

function makeServiceDraft(service?: ManagementSnapshot["services"][number]): ServiceDraft {
  return {
    name: service?.name ?? "",
    description: service?.description ?? "",
    durationMinutes: service ? String(service.durationMinutes) : "45",
    priceEuros: service ? formatEuroFromCents(service.priceCents) : "25.00",
    isActive: service?.isActive ?? true,
  };
}

function makeStaffDraft(member?: ManagementSnapshot["staffMembers"][number]): StaffDraft {
  return {
    fullName: member?.fullName ?? "",
    roleTitle: member?.roleTitle ?? "",
    bio: member?.bio ?? "",
    isActive: member?.isActive ?? true,
    serviceIds: member?.serviceIds ?? [],
    availability: member?.availability.length ? member.availability : defaultAvailability(),
  };
}

function AvailabilityEditor({
  value,
  onChange,
}: {
  value: AvailabilityInput[];
  onChange: (next: AvailabilityInput[]) => void;
}) {
  const entries = weekdays.map((day) => {
    const slot = value.find((item) => item.dayOfWeek === day.value);
    return {
      ...day,
      enabled: Boolean(slot),
      startTime: slot?.startTime ?? "09:00",
      endTime: slot?.endTime ?? "18:00",
    };
  });

  return (
    <div className="grid gap-3">
      {entries.map((entry) => (
        <div
          key={entry.value}
          className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 md:grid-cols-[72px_1fr_1fr]"
        >
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={entry.enabled}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange([
                    ...value.filter((item) => item.dayOfWeek !== entry.value),
                    { dayOfWeek: entry.value, startTime: entry.startTime, endTime: entry.endTime },
                  ]);
                  return;
                }

                onChange(value.filter((item) => item.dayOfWeek !== entry.value));
              }}
            />
            {entry.label}
          </label>

          <Input
            type="time"
            value={entry.startTime}
            disabled={!entry.enabled}
            onChange={(event) =>
              onChange(
                value.map((item) =>
                  item.dayOfWeek === entry.value ? { ...item, startTime: event.target.value } : item
                )
              )
            }
          />

          <Input
            type="time"
            value={entry.endTime}
            disabled={!entry.enabled}
            onChange={(event) =>
              onChange(
                value.map((item) =>
                  item.dayOfWeek === entry.value ? { ...item, endTime: event.target.value } : item
                )
              )
            }
          />
        </div>
      ))}
    </div>
  );
}

export function DashboardOps({ initialSnapshot }: DashboardOpsProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, ServiceDraft>>(
    Object.fromEntries(initialSnapshot.services.map((service) => [service.id, makeServiceDraft(service)]))
  );
  const [staffDrafts, setStaffDrafts] = useState<Record<string, StaffDraft>>(
    Object.fromEntries(initialSnapshot.staffMembers.map((member) => [member.id, makeStaffDraft(member)]))
  );
  const [newService, setNewService] = useState<ServiceDraft>(makeServiceDraft());
  const [newStaff, setNewStaff] = useState<StaffDraft>(makeStaffDraft());
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshSnapshot() {
    const response = await fetch("/api/dashboard/setup", { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "Erro ao atualizar o dashboard.");
    }

    setSnapshot(payload);
    setServiceDrafts(
      Object.fromEntries(
        payload.services.map((service: ManagementSnapshot["services"][number]) => [
          service.id,
          makeServiceDraft(service),
        ])
      )
    );
    setStaffDrafts(
      Object.fromEntries(
        payload.staffMembers.map((member: ManagementSnapshot["staffMembers"][number]) => [
          member.id,
          makeStaffDraft(member),
        ])
      )
    );
  }

  async function submit(url: string, method: "POST" | "PATCH" | "DELETE", body: unknown, successMessage: string) {
    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(url, {
        method,
        ...(method !== "DELETE"
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
          : {}),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível guardar as alterações.");
      }

      await refreshSnapshot();
      setFeedback(successMessage);
      startTransition(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">Gestão do negócio</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Serviços, equipa e disponibilidade semanal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{snapshot.services.length} serviços</Badge>
          <Badge variant="secondary">{snapshot.staffMembers.length} profissionais</Badge>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h3 className="mb-4 font-heading text-base font-semibold">Serviços</h3>
          <div className="grid gap-4">
            {snapshot.services.map((service) => {
              const draft = serviceDrafts[service.id] ?? makeServiceDraft(service);

              return (
                <details
                  key={service.id}
                  className="rounded-3xl border border-border/70 bg-muted/20 p-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.durationMinutes} min · {formatEuroFromCents(service.priceCents)} €
                      </p>
                    </div>
                    <Badge variant={service.isActive ? "secondary" : "outline"}>
                      {service.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </summary>

                  <div className="mt-4 grid gap-3">
                    <Input
                      value={draft.name}
                      onChange={(event) =>
                        setServiceDrafts((current) => ({
                          ...current,
                          [service.id]: { ...draft, name: event.target.value },
                        }))
                      }
                      placeholder="Nome do serviço"
                    />
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        type="number"
                        min="10"
                        max="240"
                        step="5"
                        value={draft.durationMinutes}
                        onChange={(event) =>
                          setServiceDrafts((current) => ({
                            ...current,
                            [service.id]: { ...draft, durationMinutes: event.target.value },
                          }))
                        }
                      placeholder="Duração em minutos"
                      />
                      <Input
                        type="number"
                        min="5"
                        step="0.5"
                        value={draft.priceEuros}
                        onChange={(event) =>
                          setServiceDrafts((current) => ({
                            ...current,
                            [service.id]: { ...draft, priceEuros: event.target.value },
                          }))
                        }
                      placeholder="Preço em euros"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(event) =>
                          setServiceDrafts((current) => ({
                            ...current,
                            [service.id]: { ...draft, isActive: event.target.checked },
                          }))
                        }
                      />
                      Mostrar este serviço na página pública
                    </label>
                    <div className="flex justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loading}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          if (confirm("Tens a certeza que queres eliminar este serviço?")) {
                            void submit(`/api/dashboard/services/${service.id}`, "DELETE", null, "Serviço eliminado.");
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                        Eliminar
                      </Button>
                      <Button
                        disabled={loading || draft.name.trim().length < 2}
                        onClick={() =>
                          void submit(`/api/dashboard/services/${service.id}`, "PATCH", {
                            name: draft.name,
                            description: draft.description || undefined,
                            durationMinutes: Number(draft.durationMinutes),
                            priceCents: parseEurosToCents(draft.priceEuros),
                            isActive: draft.isActive,
                          }, "Serviço atualizado.")
                        }
                      >
                        {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Guardar serviço
                      </Button>
                    </div>
                  </div>
                </details>
              );
            })}

            <div className="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="size-4 text-primary" />
                <p className="font-medium">Novo serviço</p>
              </div>
              <div className="grid gap-3">
                <Input
                  value={newService.name}
                  onChange={(event) => setNewService((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ex: Corte + barba"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    type="number"
                    min="10"
                    max="240"
                    step="5"
                    value={newService.durationMinutes}
                    onChange={(event) =>
                      setNewService((current) => ({ ...current, durationMinutes: event.target.value }))
                    }
                    placeholder="Duração"
                  />
                  <Input
                    type="number"
                    min="5"
                    step="0.5"
                    value={newService.priceEuros}
                    onChange={(event) =>
                      setNewService((current) => ({ ...current, priceEuros: event.target.value }))
                    }
                    placeholder="Preço"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    disabled={loading || newService.name.trim().length < 2}
                    onClick={async () => {
                      await submit("/api/dashboard/services", "POST", {
                        name: newService.name,
                        description: newService.description || undefined,
                        durationMinutes: Number(newService.durationMinutes),
                        priceCents: parseEurosToCents(newService.priceEuros),
                      }, "Serviço criado.");
                      setNewService(makeServiceDraft());
                    }}
                  >
                    {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Criar serviço
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-heading text-base font-semibold">Equipa e disponibilidade</h3>
          <div className="grid gap-4">
            {snapshot.staffMembers.map((member) => {
              const draft = staffDrafts[member.id] ?? makeStaffDraft(member);

              return (
                <details
                  key={member.id}
                  className="rounded-3xl border border-border/70 bg-muted/20 p-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <UserRound className="size-5" />
                      </div>
                      <div>
                        <p className="font-medium">{member.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.roleTitle ?? "Profissional"} · {member.serviceIds.length} serviços
                        </p>
                      </div>
                    </div>
                    <Badge variant={member.isActive ? "secondary" : "outline"}>
                      {member.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </summary>

                  <div className="mt-4 grid gap-4">
                    <Input
                      value={draft.fullName}
                      onChange={(event) =>
                        setStaffDrafts((current) => ({
                          ...current,
                          [member.id]: { ...draft, fullName: event.target.value },
                        }))
                      }
                      placeholder="Nome completo"
                    />
                    <Input
                      value={draft.roleTitle}
                      onChange={(event) =>
                        setStaffDrafts((current) => ({
                          ...current,
                          [member.id]: { ...draft, roleTitle: event.target.value },
                        }))
                      }
                      placeholder="Função"
                    />
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">Serviços que este profissional executa</p>
                      <div className="grid gap-2">
                        {snapshot.services.map((service) => (
                          <label
                            key={service.id}
                            className={cn(
                              "flex items-center justify-between rounded-2xl border px-3 py-2 text-sm",
                              draft.serviceIds.includes(service.id)
                                ? "border-primary/40 bg-primary/5"
                                : "border-border/70"
                            )}
                          >
                            <span>{service.name}</span>
                            <input
                              type="checkbox"
                              checked={draft.serviceIds.includes(service.id)}
                              onChange={(event) =>
                                setStaffDrafts((current) => ({
                                  ...current,
                                  [member.id]: {
                                    ...draft,
                                    serviceIds: event.target.checked
                                      ? [...draft.serviceIds, service.id]
                                      : draft.serviceIds.filter((serviceId) => serviceId !== service.id),
                                  },
                                }))
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <p className="text-sm font-medium">Disponibilidade semanal</p>
                      <AvailabilityEditor
                        value={draft.availability}
                        onChange={(next) =>
                          setStaffDrafts((current) => ({
                            ...current,
                            [member.id]: { ...draft, availability: next },
                          }))
                        }
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(event) =>
                          setStaffDrafts((current) => ({
                            ...current,
                            [member.id]: { ...draft, isActive: event.target.checked },
                          }))
                        }
                      />
                      Profissional disponível para novas reservas
                    </label>

                    <div className="flex justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loading}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          if (confirm("Tens a certeza que queres eliminar este profissional?")) {
                            void submit(`/api/dashboard/team/${member.id}`, "DELETE", null, "Profissional eliminado.");
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                        Eliminar
                      </Button>
                      <Button
                        disabled={loading || draft.fullName.trim().length < 2 || draft.serviceIds.length === 0 || draft.availability.length === 0}
                        onClick={() =>
                          void submit(`/api/dashboard/team/${member.id}`, "PATCH", {
                            fullName: draft.fullName,
                            roleTitle: draft.roleTitle || undefined,
                            bio: draft.bio || undefined,
                            isActive: draft.isActive,
                            serviceIds: draft.serviceIds,
                            availability: draft.availability,
                          }, "Profissional atualizado.")
                        }
                      >
                        {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                        Guardar profissional
                      </Button>
                    </div>
                  </div>
                </details>
              );
            })}

            <div className="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="size-4 text-primary" />
                <p className="font-medium">Novo profissional</p>
              </div>

              <div className="grid gap-3">
                <Input
                  value={newStaff.fullName}
                  onChange={(event) => setNewStaff((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Nome completo"
                />
                <Input
                  value={newStaff.roleTitle}
                  onChange={(event) => setNewStaff((current) => ({ ...current, roleTitle: event.target.value }))}
                  placeholder="Função"
                />
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Serviços atendidos</p>
                  <div className="grid gap-2">
                    {snapshot.services.map((service) => (
                      <label
                        key={service.id}
                        className={cn(
                          "flex items-center justify-between rounded-2xl border px-3 py-2 text-sm",
                          newStaff.serviceIds.includes(service.id)
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/70"
                        )}
                      >
                        <span>{service.name}</span>
                        <input
                          type="checkbox"
                          checked={newStaff.serviceIds.includes(service.id)}
                          onChange={(event) =>
                            setNewStaff((current) => ({
                              ...current,
                              serviceIds: event.target.checked
                                ? [...current.serviceIds, service.id]
                                : current.serviceIds.filter((serviceId) => serviceId !== service.id),
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <p className="text-sm font-medium">Disponibilidade semanal</p>
                  <AvailabilityEditor
                    value={newStaff.availability}
                    onChange={(next) => setNewStaff((current) => ({ ...current, availability: next }))}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    disabled={loading || newStaff.fullName.trim().length < 2 || newStaff.serviceIds.length === 0 || newStaff.availability.length === 0}
                    onClick={async () => {
                      await submit("/api/dashboard/team", "POST", {
                        fullName: newStaff.fullName,
                        roleTitle: newStaff.roleTitle || undefined,
                        bio: newStaff.bio || undefined,
                        serviceIds: newStaff.serviceIds,
                        availability: newStaff.availability,
                      }, "Profissional criado.");
                      setNewStaff(makeStaffDraft());
                    }}
                  >
                    {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Criar profissional
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


