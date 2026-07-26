"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Lock, LockOpen, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  changeClientListLockAction,
  removeClientListLockAction,
  setClientListLockAction,
  unlockClientListAction,
} from "@/app/crm/actions";
import type { CrmBookingRowDto, CrmPendingBookingDto } from "@/lib/crm/bookings";
import type { CrmCustomerRowDto } from "@/lib/crm/customers";

export type ClientListUnlockPayload = {
  pendingBookings: CrmPendingBookingDto[];
  weeklyBookings: CrmBookingRowDto[];
  dailyBookings: CrmBookingRowDto[];
  customers: CrmCustomerRowDto[];
};

type Props = {
  staffName: string;
  enabled: boolean;
  unlocked: boolean;
  onUnlocked: (payload: ClientListUnlockPayload) => void;
  onEnabledChange: (next: { enabled: boolean; unlocked: boolean }) => void;
};

type Mode = "idle" | "set" | "change" | "remove";

const PIN_HINT = "4 a 8 dígitos";

export function ClientListLockCard({
  staffName,
  enabled,
  unlocked,
  onUnlocked,
  onEnabledChange,
}: Props) {
  if (enabled && !unlocked) {
    return <UnlockGate staffName={staffName} onUnlocked={onUnlocked} />;
  }
  return (
    <ManagePanel enabled={enabled} onEnabledChange={onEnabledChange} />
  );
}

function UnlockGate({
  staffName,
  onUnlocked,
}: {
  staffName: string;
  onUnlocked: (payload: ClientListUnlockPayload) => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await unlockClientListAction(pin);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onUnlocked({
        pendingBookings: result.pendingBookings,
        weeklyBookings: result.weeklyBookings,
        dailyBookings: result.dailyBookings,
        customers: result.customers,
      });
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Lock className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Lista de clientes protegida</h3>
          <p className="text-xs text-muted-foreground">
            A lista de clientes de {staffName} está bloqueada. Introduz o código de segurança para a ver.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2" noValidate>
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, "").slice(0, 8));
            if (error) setError(null);
          }}
          placeholder="Código"
          className="h-9 w-40"
          aria-label="Código de segurança"
        />
        <Button type="submit" size="sm" disabled={isPending || pin.length < 4}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <LockOpen className="size-4" />}
          Desbloquear
        </Button>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ManagePanel({
  enabled,
  onEnabledChange,
}: {
  enabled: boolean;
  onEnabledChange: (next: { enabled: boolean; unlocked: boolean }) => void;
}) {
  const [mode, setMode] = useState<Mode>("idle");

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            {enabled ? <ShieldCheck className="size-5" /> : <KeyRound className="size-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">
              {enabled ? "A tua lista de clientes está protegida" : "Proteger a tua lista de clientes"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? "Só quem tiver o código consegue ver os teus clientes na agenda."
                : "Define um código para que os outros membros da equipa não vejam os teus clientes."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMode(mode === "change" ? "idle" : "change")}
              >
                Alterar código
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMode(mode === "remove" ? "idle" : "remove")}
              >
                Remover proteção
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setMode(mode === "set" ? "idle" : "set")}
            >
              <Lock className="size-4" />
              Proteger com código
            </Button>
          )}
        </div>
      </div>

      {mode === "set" ? (
        <SetForm
          onDone={() => {
            setMode("idle");
            onEnabledChange({ enabled: true, unlocked: true });
          }}
          onCancel={() => setMode("idle")}
        />
      ) : null}
      {mode === "change" ? (
        <ChangeForm onDone={() => setMode("idle")} onCancel={() => setMode("idle")} />
      ) : null}
      {mode === "remove" ? (
        <RemoveForm
          onDone={() => {
            setMode("idle");
            onEnabledChange({ enabled: false, unlocked: false });
          }}
          onCancel={() => setMode("idle")}
        />
      ) : null}
    </div>
  );
}

function SetForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    if (pin !== confirm) {
      setError("Os códigos não coincidem.");
      return;
    }
    startTransition(async () => {
      const result = await setClientListLockAction(pin);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <LockForm
      title="Definir código"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isPending={isPending}
      error={error}
      submitLabel="Proteger lista"
    >
      <PinField label={`Novo código (${PIN_HINT})`} value={pin} onChange={setPin} onClear={() => setError(null)} />
      <PinField label="Confirmar código" value={confirm} onChange={setConfirm} onClear={() => setError(null)} />
    </LockForm>
  );
}

function ChangeForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [current, setCurrent] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    if (pin !== confirm) {
      setError("Os códigos novos não coincidem.");
      return;
    }
    startTransition(async () => {
      const result = await changeClientListLockAction(current, pin);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <LockForm
      title="Alterar código"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isPending={isPending}
      error={error}
      submitLabel="Guardar novo código"
    >
      <PinField label="Código atual" value={current} onChange={setCurrent} onClear={() => setError(null)} />
      <PinField label={`Novo código (${PIN_HINT})`} value={pin} onChange={setPin} onClear={() => setError(null)} />
      <PinField label="Confirmar novo código" value={confirm} onChange={setConfirm} onClear={() => setError(null)} />
    </LockForm>
  );
}

function RemoveForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [current, setCurrent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await removeClientListLockAction(current);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <LockForm
      title="Remover proteção"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isPending={isPending}
      error={error}
      submitLabel="Remover proteção"
      destructive
    >
      <PinField label="Código atual" value={current} onChange={setCurrent} onClear={() => setError(null)} />
    </LockForm>
  );
}

function LockForm({
  title,
  onSubmit,
  onCancel,
  isPending,
  error,
  submitLabel,
  destructive,
  children,
}: {
  title: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isPending: boolean;
  error: string | null;
  submitLabel: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-lg border border-border bg-background p-3" noValidate>
      <p className="text-xs font-semibold">{title}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant={destructive ? "destructive" : "default"} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={isPending}>
          <X className="size-4" />
          Cancelar
        </Button>
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}

function PinField({
  label,
  value,
  onChange,
  onClear,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium">
      {label}
      <Input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value.replace(/\D/g, "").slice(0, 8));
          onClear();
        }}
        placeholder="••••"
        className="h-9"
      />
    </label>
  );
}
