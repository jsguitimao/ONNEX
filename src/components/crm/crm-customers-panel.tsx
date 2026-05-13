"use client";

import { useMemo, useState, useTransition } from "react";
import { Clock3, Loader2, Pencil, Trash2, TrendingUp, UsersRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteCustomerAction, updateCustomerAction } from "@/app/crm/actions";
import type { CrmCustomerKpis, CrmCustomerRowDto } from "@/lib/crm/customers";

type Props = {
  customers: CrmCustomerRowDto[];
  kpis: CrmCustomerKpis;
  onCustomerDeleted: (customerId: string) => void;
  onCustomerUpdated: (customer: CrmCustomerRowDto) => void;
};

type CustomerFormState = {
  fullName: string;
  email: string;
  phone: string;
  notes: string;
};

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function CustomersPanel({ customers, kpis, onCustomerDeleted, onCustomerUpdated }: Props) {
  const [search, setSearch] = useState("");
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) => {
      return (
        customer.fullName.toLowerCase().includes(term) ||
        (customer.email ?? "").toLowerCase().includes(term) ||
        (customer.phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [customers, search]);

  const editingCustomer = editingId ? customers.find((row) => row.id === editingId) ?? null : null;

  function handleAskConfirm(customerId: string) {
    setError(null);
    setPendingConfirmId(customerId);
  }

  function handleCancelConfirm() {
    setPendingConfirmId(null);
  }

  function handleConfirmDelete(customerId: string) {
    if (deletingId) return;
    setError(null);
    setDeletingId(customerId);
    startTransition(async () => {
      const result = await deleteCustomerAction(customerId);
      setDeletingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingConfirmId(null);
      onCustomerDeleted(result.customerId);
    });
  }

  function handleStartEdit(customerId: string) {
    setError(null);
    setPendingConfirmId(null);
    setEditingId(customerId);
  }

  function handleEditDone(updated: CrmCustomerRowDto) {
    onCustomerUpdated(updated);
    setEditingId(null);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard label="Clientes" value={String(kpis.total)} icon={UsersRound} />
        <KpiCard
          label="Recorrência"
          value={`${kpis.recurringPercent}%`}
          icon={TrendingUp}
          hint="Com 2+ marcações"
        />
        <KpiCard
          label="Sem visita"
          value={String(kpis.withoutVisit)}
          icon={Clock3}
          hint="Há mais de 60 dias"
        />
      </div>

      {editingCustomer ? (
        <EditCustomerForm
          key={editingCustomer.id}
          customer={editingCustomer}
          onDone={handleEditDone}
          onCancel={() => setEditingId(null)}
        />
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Clientes</h3>
            <p className="text-xs text-muted-foreground">
              {customers.length === 0
                ? "Ainda não tens clientes registados."
                : `Lista das ${customers.length} fichas mais recentes.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="search"
              placeholder="Procurar por nome, email ou telefone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 w-full sm:w-72"
            />
            <Badge variant="outline">{filtered.length}</Badge>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="border-t border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}

        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {customers.length === 0
              ? "Cria o primeiro cliente em \"Novo cliente\"."
              : "Nenhum resultado para a tua procura."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Última visita</th>
                  <th className="px-4 py-3 font-medium">Marcações</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => {
                  const status = computeStatus(customer);
                  const isConfirming = pendingConfirmId === customer.id;
                  const isDeletingThis = deletingId === customer.id && isPending;
                  const isThisEditing = editingId === customer.id;
                  return (
                    <tr key={customer.id} className="border-t border-border align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{customer.fullName}</p>
                        {customer.notes ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {customer.notes}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {customer.phone ? <p>{customer.phone}</p> : null}
                        {customer.email ? (
                          <p className="text-xs text-muted-foreground">{customer.email}</p>
                        ) : null}
                        {!customer.phone && !customer.email ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {customer.lastBookedAt
                          ? dateFormatter.format(new Date(customer.lastBookedAt))
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">{customer.bookingCount}</td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isConfirming ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            <span className="self-center text-[11px] text-muted-foreground">
                              Confirmar exclusão?
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={isDeletingThis}
                              onClick={() => handleConfirmDelete(customer.id)}
                            >
                              {isDeletingThis ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                              Sim, excluir
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isDeletingThis}
                              onClick={handleCancelConfirm}
                            >
                              <X className="size-3.5" />
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={Boolean(deletingId) || isThisEditing}
                              onClick={() => handleStartEdit(customer.id)}
                            >
                              <Pencil className="size-3.5" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={Boolean(deletingId) || isThisEditing}
                              onClick={() => handleAskConfirm(customer.id)}
                            >
                              <Trash2 className="size-3.5" />
                              Excluir
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EditCustomerForm({
  customer,
  onDone,
  onCancel,
}: {
  customer: CrmCustomerRowDto;
  onDone: (updated: CrmCustomerRowDto) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CustomerFormState>({
    fullName: customer.fullName,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    notes: customer.notes ?? "",
  });
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
      const result = await updateCustomerAction(customer.id, form);
      if (result.ok) {
        onDone(result.customer);
        return;
      }
      setError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
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
          <h3 className="text-sm font-semibold">Editar cliente</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            A alterar a ficha de <strong>{customer.fullName}</strong>. Pelo menos email ou telefone obrigatório.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
            Guardar alterações
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={pending}>
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

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: typeof UsersRound;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function computeStatus(customer: CrmCustomerRowDto): { label: string; variant: "default" | "outline" } {
  if (customer.bookingCount >= 5) return { label: "VIP", variant: "default" };
  if (customer.bookingCount >= 2) return { label: "Recorrente", variant: "default" };
  if (customer.bookingCount === 1) return { label: "Cliente", variant: "outline" };
  return { label: "Novo", variant: "outline" };
}
