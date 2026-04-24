"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Palette,
  Settings2,
  ShieldCheck,
  Store,
  Upload,
  X,
} from "lucide-react";
import type { OnboardingDraft } from "@/lib/business";
import { uploadMedia } from "@/lib/client-upload";
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
      <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
        <div className="mb-6 space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Setup realista
          </span>
          <h2 className="text-2xl font-semibold tracking-tight">
            Configurações essenciais da barbearia
          </h2>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Store className="size-4 text-muted-foreground" />
              Dados do negócio
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome do negócio">
                <FormInput value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} />
              </Field>
              <Field label="Slug público">
                <FormInput value={form.slug} onChange={(e) => updateField("slug", e.target.value.toLowerCase())} />
              </Field>
              <Field label="Cidade">
                <FormInput value={form.city} onChange={(e) => updateField("city", e.target.value)} />
              </Field>
              <Field label="Telefone">
                <FormInput value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </Field>
              <Field label="Email de contacto">
                <FormInput type="email" value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} />
              </Field>
              <Field label="Website">
                <FormInput value={form.websiteUrl} onChange={(e) => updateField("websiteUrl", e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Instagram">
                <FormInput value={form.instagramUrl} onChange={(e) => updateField("instagramUrl", e.target.value)} placeholder="https://instagram.com/o-teu-perfil" />
              </Field>
            </div>
            <Field label="Descrição curta do negócio">
              <FormTextarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </Field>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="size-4 text-muted-foreground" />
              Hero (imagem ou vídeo)
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Foto ou vídeo grande no topo da página pública. Vídeos tocam em loop, sem som. Imagens até 10MB, vídeos até 25MB.
            </p>
            <HeroMediaField
              value={form.heroImageUrl}
              onChange={(value) => updateField("heroImageUrl", value)}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="size-4 text-muted-foreground" />
              Aparência do site
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Escolhe o fundo da página pública. Um padrão único e clean — sem cores por secção.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["dark", "light"] as const).map((value) => {
                const isActive = form.theme === value;
                const label = value === "dark" ? "Escuro" : "Claro";
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField("theme", value)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-4 text-left transition",
                      isActive
                        ? "border-primary ring-2 ring-primary"
                        : "border-border bg-background hover:border-ring"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg border",
                        value === "dark"
                          ? "border-border bg-neutral-900"
                          : "border-border bg-white"
                      )}
                      aria-hidden
                    >
                      <span
                        className={cn(
                          "block size-4 rounded-full",
                          value === "dark" ? "bg-white" : "bg-neutral-900"
                        )}
                      />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {value === "dark" ? "Fundo preto com letras brancas" : "Fundo branco com letras pretas"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="size-4 text-muted-foreground" />
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
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4 text-muted-foreground" />
              Regras de marcação
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Antecedência mínima (horas)">
                <FormInput
                  type="number"
                  min={0}
                  max={168}
                  value={form.bookingLeadTimeHours}
                  onChange={(e) => updateField("bookingLeadTimeHours", Number(e.target.value))}
                />
              </Field>
              <Field label="Janela de reservas (dias)">
                <FormInput
                  type="number"
                  min={1}
                  max={365}
                  value={form.bookingWindowDays}
                  onChange={(e) => updateField("bookingWindowDays", Number(e.target.value))}
                />
              </Field>
              <Field label="Intervalo entre slots (min)">
                <FormInput
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  value={form.slotIntervalMinutes}
                  onChange={(e) => updateField("slotIntervalMinutes", Number(e.target.value))}
                />
              </Field>
              <Field label="Cancelamento automático até (horas)">
                <FormInput
                  type="number"
                  min={0}
                  max={168}
                  value={form.cancellationWindowHours}
                  onChange={(e) => updateField("cancellationWindowHours", Number(e.target.value))}
                />
              </Field>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-4">
            <div className="text-sm text-muted-foreground">
              Ao guardar, a página pública e o preview à direita actualizam-se.
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-border bg-muted text-foreground"
              )}
            >
              {message}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Preview ao vivo
            </span>
            <span className="text-xs text-muted-foreground">{previewUrl}</span>
          </div>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Abrir em nova aba
            <ArrowRight className="size-3.5" />
          </a>
        </div>
        <div className="relative flex-1 bg-muted">
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
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        className
      )}
    />
  );
}

function FormTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={cn(
        "min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        className
      )}
    />
  );
}

function isVideoUrl(url: string) {
  const lowered = url.toLowerCase().split("?")[0];
  return /\.(mp4|webm|mov)$/.test(lowered);
}

function HeroMediaField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const url = await uploadMedia(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao carregar.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const isVideo = value ? isVideoUrl(value) : false;

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <FormInput
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://... ou carrega um ficheiro"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-foreground transition hover:border-ring hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {uploading ? "A carregar..." : "Carregar"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {value ? (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted p-2">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-background">
            {isVideo ? (
              <video
                src={value}
                className="h-full w-full object-cover"
                muted
                loop
                playsInline
                autoPlay
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Preview hero"
                className="h-full w-full object-cover"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {isVideo ? "Vídeo" : "Imagem"}
            </span>
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-destructive"
            >
              <X className="size-3.5" />
              Remover
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
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
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm transition hover:border-ring">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
    </label>
  );
}
