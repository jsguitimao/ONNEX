"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Palette,
  Settings2,
  ShieldCheck,
  Store,
} from "lucide-react";
import type { OnboardingDraft } from "@/lib/business";
import { normalizeOnboardingDraft } from "@/lib/onboarding-input";
import { cn } from "@/lib/utils";

export function OnboardingStudio({ initialData }: { initialData: OnboardingDraft }) {
  const [form, setForm] = useState<OnboardingDraft>(initialData);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [previewVersion, setPreviewVersion] = useState(0);

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
      setPreviewVersion((v) => v + 1);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado ao guardar.");
    }
  };

  const previewSlug = form.slug || "barbearia-sample";
  const previewUrl = `/${previewSlug}`;

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
              Imagens por secção do site
            </div>
            <p className="-mt-2 text-xs text-neutral-400">
              Cola o URL de uma foto para cada secção. Se ficar vazio, a imagem de capa é usada como fallback.
            </p>
            <div className="grid gap-4">
              <Field label="Logo por URL">
                <DarkInput value={form.logoUrl} onChange={(e) => updateField("logoUrl", e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Imagem de capa (fallback geral)">
                <DarkInput
                  value={form.coverImageUrl}
                  onChange={(e) => updateField("coverImageUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Foto da secção Principal (hero)">
                <DarkInput
                  value={form.heroImageUrl}
                  onChange={(e) => updateField("heroImageUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Foto da secção Sobre">
                <DarkInput
                  value={form.aboutImageUrl}
                  onChange={(e) => updateField("aboutImageUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Foto da secção Serviços">
                <DarkInput
                  value={form.servicesImageUrl}
                  onChange={(e) => updateField("servicesImageUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Foto da secção Equipa">
                <DarkInput
                  value={form.teamImageUrl}
                  onChange={(e) => updateField("teamImageUrl", e.target.value)}
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
              Ao guardar, a página pública e o preview à direita actualizam-se.
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

      <div className="flex flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#141a2d] text-white shadow-xl shadow-black/20">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-300">
              Preview ao vivo
            </span>
            <span className="text-xs text-neutral-400">{previewUrl}</span>
          </div>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-semibold text-[#0b1020] transition hover:bg-amber-300"
          >
            Abrir em nova aba
            <ArrowRight className="size-3.5" />
          </a>
        </div>
        <div className="relative flex-1 bg-[#0b1020]">
          <iframe
            key={previewVersion}
            src={previewUrl}
            title="Preview da página pública"
            className="h-[900px] w-full border-0"
            loading="lazy"
          />
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
