"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Phone,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";
import type { OnboardingDraft } from "@/lib/business";
import { demoBusiness, formatEuro } from "@/lib/demo-data";
import { normalizeOnboardingDraft } from "@/lib/onboarding-input";
import { cn } from "@/lib/utils";

export function OnboardingStudio({ initialData }: { initialData: OnboardingDraft }) {
  const [form, setForm] = useState<OnboardingDraft>(initialData);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const updateField = <K extends keyof OnboardingDraft>(field: K, value: OnboardingDraft[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setStatus("saving");
    setMessage("");
    const payload = normalizeOnboardingDraft(form);

    try {
      const response = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível guardar.");
      }

      setForm(payload);
      setStatus("saved");
      setMessage("Configuração guardada com sucesso.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado ao guardar.");
    }
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_1.05fr]">
      <div className="rounded-[1.75rem] border border-white/10 bg-[#141a2d] p-6 text-white shadow-xl shadow-black/20 sm:p-8">
        <div className="mb-6 space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-300">
            Setup realista
          </span>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-white">
            Configurações essenciais da barbearia
          </h2>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Store className="size-4 text-amber-300" />
              Dados do negócio
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome do negócio">
                <DarkInput value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} />
              </Field>
              <Field label="Slug público">
                <DarkInput value={form.slug} onChange={(e) => updateField("slug", e.target.value.toLowerCase())} />
              </Field>
              <Field label="Cidade">
                <DarkInput value={form.city} onChange={(e) => updateField("city", e.target.value)} />
              </Field>
              <Field label="Telefone">
                <DarkInput value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </Field>
              <Field label="Email de contacto">
                <DarkInput type="email" value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} />
              </Field>
              <Field label="Website">
                <DarkInput value={form.websiteUrl} onChange={(e) => updateField("websiteUrl", e.target.value)} placeholder="https://..." />
              </Field>
            </div>
            <Field label="Descrição curta do negócio">
              <DarkTextarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </Field>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <ImageIcon className="size-4 text-amber-300" />
              Visuais
            </div>
            <div className="grid gap-4">
              <Field label="Logo por URL">
                <DarkInput value={form.logoUrl} onChange={(e) => updateField("logoUrl", e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Imagem de capa por URL">
                <DarkInput
                  value={form.coverImageUrl}
                  onChange={(e) => updateField("coverImageUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Palette className="size-4 text-amber-300" />
              Marca e comunicação
            </div>
            <div className="grid gap-4">
              <Field label="Headline">
                <DarkInput value={form.headline} onChange={(e) => updateField("headline", e.target.value)} />
              </Field>
              <Field label="Subheadline">
                <DarkTextarea
                  value={form.subheadline}
                  onChange={(e) => updateField("subheadline", e.target.value)}
                />
              </Field>
              <Field label="Mensagem de boas-vindas">
                <DarkTextarea
                  value={form.welcomeMessage}
                  onChange={(e) => updateField("welcomeMessage", e.target.value)}
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Cor principal">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="h-11 w-14 cursor-pointer rounded-lg border border-white/15 bg-white/5"
                      value={form.primaryColor}
                      onChange={(e) => updateField("primaryColor", e.target.value)}
                    />
                    <DarkInput value={form.primaryColor} onChange={(e) => updateField("primaryColor", e.target.value)} />
                  </div>
                </Field>
                <Field label="Cor de destaque">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="h-11 w-14 cursor-pointer rounded-lg border border-white/15 bg-white/5"
                      value={form.accentColor}
                      onChange={(e) => updateField("accentColor", e.target.value)}
                    />
                    <DarkInput value={form.accentColor} onChange={(e) => updateField("accentColor", e.target.value)} />
                  </div>
                </Field>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Settings2 className="size-4 text-amber-300" />
              Preferências operacionais
            </div>
            <div className="grid gap-3">
              <ToggleRow
                label="Permitir reservas online"
                checked={form.onlineBooking}
                onChange={(checked) => updateField("onlineBooking", checked)}
              />
              <ToggleRow
                label="Mostrar equipa na página pública"
                checked={form.showTeam}
                onChange={(checked) => updateField("showTeam", checked)}
              />
              <ToggleRow
                label="Mostrar preços"
                checked={form.showPrices}
                onChange={(checked) => updateField("showPrices", checked)}
              />
              <ToggleRow
                label="Mostrar durações"
                checked={form.showDurations}
                onChange={(checked) => updateField("showDurations", checked)}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <ShieldCheck className="size-4 text-amber-300" />
              Regras de marcação
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Antecedência mínima (horas)">
                <DarkInput
                  type="number"
                  min={0}
                  max={168}
                  value={form.bookingLeadTimeHours}
                  onChange={(e) => updateField("bookingLeadTimeHours", Number(e.target.value))}
                />
              </Field>
              <Field label="Janela de reservas (dias)">
                <DarkInput
                  type="number"
                  min={1}
                  max={365}
                  value={form.bookingWindowDays}
                  onChange={(e) => updateField("bookingWindowDays", Number(e.target.value))}
                />
              </Field>
              <Field label="Intervalo entre slots (min)">
                <DarkInput
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  value={form.slotIntervalMinutes}
                  onChange={(e) => updateField("slotIntervalMinutes", Number(e.target.value))}
                />
              </Field>
              <Field label="Cancelamento automático até (horas)">
                <DarkInput
                  type="number"
                  min={0}
                  max={168}
                  value={form.cancellationWindowHours}
                  onChange={(e) => updateField("cancellationWindowHours", Number(e.target.value))}
                />
              </Field>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-neutral-300">
              Estas alterações já são persistidas e alimentam imediatamente a página pública.
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-[#0b1020] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleSave}
              disabled={status === "saving"}
            >
              {status === "saving" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Guardar configurações
            </button>
          </div>

          {message ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                status === "error"
                  ? "border-red-400/30 bg-red-500/10 text-red-200"
                  : "border-amber-300/30 bg-amber-300/10 text-amber-100"
              )}
            >
              {message}
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#141a2d] text-white shadow-xl shadow-black/20">
        <div
          className="px-6 pb-8 pt-8 text-center text-white"
          style={{
            background: `linear-gradient(180deg, ${form.primaryColor} 0%, ${form.accentColor} 100%)`,
          }}
        >
          {form.coverImageUrl ? (
            <div
              className="mb-5 h-36 rounded-[1.75rem] bg-cover bg-center"
              style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.2), rgba(0,0,0,.35)), url(${form.coverImageUrl})` }}
            />
          ) : null}

          <div className="mx-auto flex size-24 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/20 bg-white/12 text-3xl font-semibold shadow-lg shadow-black/10">
            {form.logoUrl ? (
              <div
                className="h-full w-full bg-cover bg-center"
                aria-label={form.businessName}
                style={{ backgroundImage: `url(${form.logoUrl})` }}
              />
            ) : (
              form.businessName.charAt(0)
            )}
          </div>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white">
            Preview ao vivo
          </span>
          <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight">{form.businessName}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/82">{form.headline}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm text-white/82">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5">
              <MapPin className="size-4" />
              {form.city}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5">
              <Phone className="size-4" />
              {form.phone}
            </span>
            {form.contactEmail ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5">
                <Mail className="size-4" />
                {form.contactEmail}
              </span>
            ) : null}
            {form.websiteUrl ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5">
                <Globe className="size-4" />
                Website
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 p-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <Sparkles className="size-4 text-amber-300" />
              Posicionamento da barbearia
            </div>
            <p className="text-sm leading-7 text-neutral-300">{form.description}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <ShieldCheck className="size-4 text-amber-300" />
              Políticas de marcação
            </div>
            <div className="grid gap-2 text-sm text-neutral-300">
              <p>Antecedência mínima: {form.bookingLeadTimeHours}h.</p>
              <p>Janela de reservas: até {form.bookingWindowDays} dias.</p>
              <p>Intervalo entre horários: {form.slotIntervalMinutes} min.</p>
              <p>Cancelamento pelo cliente: até {form.cancellationWindowHours}h antes.</p>
            </div>
          </div>

          <div className="grid gap-3">
            {form.onlineBooking ? (
              <a
                href={`/${form.slug || "barbearia-sample"}`}
                className="inline-flex h-12 w-full items-center justify-between rounded-2xl bg-amber-400 px-5 text-sm font-semibold text-[#0b1020] transition hover:bg-amber-300"
              >
                Reservar agora
                <ArrowRight className="size-4" />
              </a>
            ) : (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                As reservas online estão desativadas. A página pública vai mostrar contacto e branding, mas sem CTA de marcação.
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <Sparkles className="size-4 text-amber-300" />
                Mensagem em destaque
              </div>
              <p className="text-sm leading-7 text-neutral-300">{form.subheadline}</p>
              <p className="mt-3 rounded-2xl bg-[#0b1020] px-4 py-3 text-sm text-white ring-1 ring-white/10">
                {form.welcomeMessage}
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {demoBusiness.services.map((service) => (
              <div key={service.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-white">{service.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-neutral-300">{service.description}</p>
                  </div>
                  {form.showDurations ? (
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ backgroundColor: `${form.accentColor}20`, color: form.accentColor }}
                    >
                      {service.durationMinutes} min
                    </span>
                  ) : null}
                </div>
                {form.showPrices ? (
                  <p className="mt-4 font-semibold text-amber-300">
                    {formatEuro(service.priceCents)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {form.showTeam ? (
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
                <UserRound className="size-4 text-amber-300" />
                Equipa visível na página pública
              </div>
              <div className="grid gap-3">
                {demoBusiness.team.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-start justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex gap-3">
                      <div
                        className="flex size-12 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                        style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.accentColor})` }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{member.name}</p>
                        <p className="text-sm text-neutral-300">{member.role}</p>
                        <p className="mt-2 text-sm text-neutral-400">{member.specialties.join(" / ")}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-300">
                      Disponível
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm font-medium text-white">Rota pública prevista</p>
              <p className="text-sm text-neutral-300">/{form.slug || "nome-da-barbearia"}</p>
            </div>
            <a
              href={`/${form.slug || "barbearia-sample"}`}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-[#0b1020] transition hover:bg-amber-300"
            >
              Ver página pública
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium text-neutral-300">{label}</span>
      {children}
    </label>
  );
}

function DarkInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-amber-400/50 [color-scheme:dark]",
        className
      )}
    />
  );
}

function DarkTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={cn(
        "min-h-24 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-amber-400/50",
        className
      )}
    />
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:border-white/20">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-amber-400"
      />
    </label>
  );
}
