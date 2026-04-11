"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, Mail, MessageSquareText, Phone, Save, Search, UserRound } from "lucide-react";
import type { CustomerSnapshot } from "@/lib/business";
import { formatEuro } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DashboardCustomersProps = {
  initialSnapshot: CustomerSnapshot;
};

type CustomerDraft = {
  fullName: string;
  email: string;
  phone: string;
  notes: string;
  marketingOptIn: boolean;
};

function makeDraft(customer: CustomerSnapshot["customers"][number]): CustomerDraft {
  return {
    fullName: customer.fullName,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    notes: customer.notes ?? "",
    marketingOptIn: customer.marketingOptIn,
  };
}

export function DashboardCustomers({ initialSnapshot }: DashboardCustomersProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [drafts, setDrafts] = useState<Record<string, CustomerDraft>>(
    Object.fromEntries(initialSnapshot.customers.map((customer) => [customer.id, makeDraft(customer)]))
  );
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return snapshot.customers;

    return snapshot.customers.filter((customer) =>
      [customer.fullName, customer.email, customer.phone, customer.lastServiceName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  }, [query, snapshot.customers]);

  async function refreshSnapshot() {
    const response = await fetch("/api/dashboard/customers", { cache: "no-store" });
    const payload = (await response.json()) as CustomerSnapshot & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Erro ao atualizar clientes.");
    }

    setSnapshot(payload);
    setDrafts(
      Object.fromEntries(payload.customers.map((customer) => [customer.id, makeDraft(customer)]))
    );
  }

  async function saveCustomer(customerId: string) {
    const draft = drafts[customerId];
    if (!draft) return;

    setSavingId(customerId);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel guardar o cliente.");
      }

      await refreshSnapshot();
      setFeedback("Cliente atualizado.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao guardar cliente.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card className="mt-6 border-border/70">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="font-heading text-2xl">Clientes e CRM</CardTitle>
            <CardDescription>
              Mantem notas internas, opt-in de comunicacao e historico resumido para cada cliente.
            </CardDescription>
          </div>
          <Badge variant="secondary">{snapshot.customers.length} clientes</Badge>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar por nome, email, telefone ou ultimo servico"
          />
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        {feedback ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {filteredCustomers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/80 bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
            Ainda nao ha clientes para este filtro. Assim que novas reservas forem criadas, o CRM
            vai sendo alimentado automaticamente.
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const draft = drafts[customer.id] ?? makeDraft(customer);

            return (
              <details key={customer.id} className="rounded-3xl border border-border/70 bg-background/80 p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <UserRound className="size-5" />
                    </div>
                    <div>
                      <p className="font-medium">{customer.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.totalBookings} reservas · {formatEuro(customer.totalSpentCents)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-muted-foreground">
                    {customer.lastServiceName ? <Badge variant="outline">{customer.lastServiceName}</Badge> : null}
                    {customer.marketingOptIn ? <Badge variant="secondary">Opt-in</Badge> : null}
                  </div>
                </summary>

                <div className="mt-4 grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={draft.fullName}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [customer.id]: { ...draft, fullName: event.target.value },
                        }))
                      }
                      placeholder="Nome do cliente"
                    />
                    <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                      Ultima reserva:{" "}
                      {customer.lastBookedAt
                        ? new Date(customer.lastBookedAt).toLocaleDateString("pt-PT")
                        : "sem historico"}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-medium">
                        <Mail className="size-4 text-primary" />
                        Email
                      </span>
                      <Input
                        type="email"
                        value={draft.email}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [customer.id]: { ...draft, email: event.target.value },
                          }))
                        }
                        placeholder="email@cliente.com"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-medium">
                        <Phone className="size-4 text-primary" />
                        Telefone
                      </span>
                      <Input
                        type="tel"
                        value={draft.phone}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [customer.id]: { ...draft, phone: event.target.value },
                          }))
                        }
                        placeholder="+351 ..."
                      />
                    </label>
                  </div>

                  <label className="grid gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <MessageSquareText className="size-4 text-primary" />
                      Notas internas
                    </span>
                    <textarea
                      className="min-h-28 rounded-2xl border border-input bg-background px-3 py-2 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={draft.notes}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [customer.id]: { ...draft, notes: event.target.value },
                        }))
                      }
                      placeholder="Preferencias, observacoes de atendimento, recorrencia..."
                    />
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={draft.marketingOptIn}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [customer.id]: { ...draft, marketingOptIn: event.target.checked },
                          }))
                        }
                      />
                      Cliente aceitou comunicacoes futuras
                    </label>

                    <Button disabled={savingId === customer.id} onClick={() => void saveCustomer(customer.id)}>
                      {savingId === customer.id ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Guardar cliente
                    </Button>
                  </div>
                </div>
              </details>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
