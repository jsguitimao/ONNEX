"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarDays, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCustomerAction, createManualBookingAction } from "@/app/crm/actions";
import type { CrmCustomerRowDto } from "@/lib/crm/customers";
import type { CrmStaffRow } from "@/lib/crm/staff";
import type { CrmServiceOption } from "./crm-workspace";
import type { CrmActionKind } from "./crm-types";

type Props = {
  action: CrmActionKind;
  staff: CrmStaffRow[];
  services: CrmServiceOption[];
  onClose: () => void;
  onCustomerCreated: (customer: CrmCustomerRowDto) => void;
};

type CustomerFormState = {
  fullName: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyCustomerForm: CustomerFormState = {
  fullName: "",
  email: "",
  phone: "",
  notes: "",
};

export function ActionConfigPanel({
  action,
  staff,
  services,
  onClose,
  onCustomerCreated,
}: Props) {
  if (action === "clientes") {
    return <NewCustomerPanel onClose={onClose} onCustomerCreated={onCustomerCreated} />;
  }
  return <ManualBookingForm staff={staff} services={services} onClose={onClose} />;
}

function NewCustomerPanel({
  onClose,
  onCustomerCreated,
}: {
  onClose: () => void;
  onCustomerCreated: (customer: CrmCustomerRowDto) => void;
}) {
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CustomerFormState, string>>>({});
  const [pending, startTransition] = useTransition();

  function update<K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (error) setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await createCustomerAction(form);
      if (result.ok) {
        onCustomerCreated(result.customer);
        setForm(emptyCustomerForm);
        return;
      }
      setError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-4"
      noValidate
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Novo cliente</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Cria a ficha do cliente no CRM. Pelo menos email ou telefone é obrigatório.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Guardar cliente
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={pending}>
            <X className="size-4" />
            Fechar
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <FormField label="Nome" error={fieldErrors.fullName}>
          <Input
            value={form.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            placeholder="Nome do cliente"
            autoComplete="name"
            required
            maxLength={80}
          />
        </FormField>
        <FormField label="Telefone" error={fieldErrors.phone}>
          <Input
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="+351 ..."
            autoComplete="tel"
            inputMode="tel"
            maxLength={30}
          />
        </FormField>
        <FormField label="Email" error={fieldErrors.email}>
          <Input
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="cliente@exemplo.pt"
            autoComplete="email"
            inputMode="email"
            maxLength={120}
          />
        </FormField>
        <FormField label="Notas" error={fieldErrors.notes} className="md:col-span-2">
          <textarea
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder="Preferências, observações ou histórico"
            maxLength={280}
            className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
          />
        </FormField>
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

type ManualBookingFormState = {
  serviceId: string;
  staffMemberId: string;
  dateKey: string;
  time: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
  notifyClient: boolean;
};

type ManualBookingFieldKey = keyof Omit<ManualBookingFormState, "notifyClient">;

function todayDateKey() {
  const now = new Date();
  return [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function ManualBookingForm({
  staff,
  services,
  onClose,
}: {
  staff: CrmStaffRow[];
  services: CrmServiceOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ManualBookingFormState>(() => ({
    serviceId: services[0]?.id ?? "",
    staffMemberId: staff[0]?.id ?? "",
    dateKey: todayDateKey(),
    time: "10:00",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    notes: "",
    notifyClient: false,
  }));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ManualBookingFieldKey, string>>>({});
  const [pending, startTransition] = useTransition();

  if (services.length === 0 || staff.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Marcação manual</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {services.length === 0
                ? "Adiciona serviços ao teu negócio antes de poderes criar marcações manuais."
                : "Adiciona profissionais ao teu negócio antes de poderes criar marcações manuais."}
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            <X className="size-4" />
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  function update<K extends keyof ManualBookingFormState>(
    key: K,
    value: ManualBookingFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key as ManualBookingFieldKey];
      return next;
    });
    if (error) setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await createManualBookingAction(form);
      if (result.ok) {
        router.refresh();
        onClose();
        return;
      }
      setError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-4" noValidate>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Marcação manual</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Cria uma marcação para um cliente diretamente — sem passar pela página pública.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
            Guardar marcação
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={pending}>
            <X className="size-4" />
            Fechar
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <FormField label="Serviço" error={fieldErrors.serviceId}>
          <select
            value={form.serviceId}
            onChange={(event) => update("serviceId", event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.durationMinutes} min
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Profissional" error={fieldErrors.staffMemberId}>
          <select
            value={form.staffMemberId}
            onChange={(event) => update("staffMemberId", event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Data" error={fieldErrors.dateKey}>
          <Input
            type="date"
            min={todayDateKey()}
            value={form.dateKey}
            onChange={(event) => update("dateKey", event.target.value)}
          />
        </FormField>
        <FormField label="Hora" error={fieldErrors.time}>
          <Input
            type="time"
            value={form.time}
            onChange={(event) => update("time", event.target.value)}
          />
        </FormField>
        <FormField label="Nome do cliente" error={fieldErrors.customerName}>
          <Input
            value={form.customerName}
            onChange={(event) => update("customerName", event.target.value)}
            placeholder="Nome completo"
            autoComplete="name"
            required
            maxLength={80}
          />
        </FormField>
        <FormField label="Telefone" error={fieldErrors.customerPhone}>
          <Input
            value={form.customerPhone}
            onChange={(event) => update("customerPhone", event.target.value)}
            placeholder="+351 ..."
            autoComplete="tel"
            inputMode="tel"
            maxLength={30}
          />
        </FormField>
        <FormField label="Email" error={fieldErrors.customerEmail} className="md:col-span-2">
          <Input
            value={form.customerEmail}
            onChange={(event) => update("customerEmail", event.target.value)}
            placeholder="cliente@exemplo.pt"
            autoComplete="email"
            inputMode="email"
            maxLength={120}
          />
        </FormField>
        <FormField label="Notas internas" error={fieldErrors.notes} className="md:col-span-2">
          <textarea
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder="Observações para a equipa (não vai para o cliente)"
            maxLength={280}
            className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
          />
        </FormField>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={form.notifyClient}
          onChange={(event) => update("notifyClient", event.target.checked)}
        />
        Avisar o cliente por WhatsApp de que a marcação foi criada
      </label>

      <p className="mt-3 rounded-md border border-dashed border-border p-3 text-[11px] leading-5 text-muted-foreground">
        A marcação fica diretamente <strong>Confirmada</strong>. O profissional recebe sempre aviso.
        O horário pode ser fora do horário semanal — só rejeita se já houver outra marcação ou folga
        nesse momento.
      </p>

      {error ? (
        <p role="alert" className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function FormField({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid gap-1 text-xs font-medium${className ? ` ${className}` : ""}`}>
      {label}
      {children}
      {error ? <span className="text-[11px] text-destructive">{error}</span> : null}
    </label>
  );
}
