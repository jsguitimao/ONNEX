"use client";

import { useMemo, useRef, useState } from "react";
import {
  Eye,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Save,
  Upload,
} from "lucide-react";
import type { OnboardingDraft } from "@/lib/business";
import { uploadMedia } from "@/lib/client-upload";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  initialDraft: OnboardingDraft;
  slug: string;
};

type PaneMode = "edit" | "preview";

export function DashboardPageEditor({ initialDraft, slug }: Props) {
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const [initial, setInitial] = useState<OnboardingDraft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [mode, setMode] = useState<PaneMode>("edit");

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initial),
    [draft, initial],
  );

  const update = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => {
    setSuccess(false);
    setError("");
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const data = (await response.json()) as { error?: string; slug?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível guardar.");
      }

      setInitial(draft);
      setSuccess(true);
      setRefreshToken((value) => value + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  const previewSlug = draft.slug || slug;

  return (
    <div className="flex flex-col gap-4">
      <header className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col">
          <h2 className="text-base font-semibold">Editor da página</h2>
          <p className="text-xs text-muted-foreground">
            Personaliza o que os clientes veem em <code className="text-foreground">/{previewSlug}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5 lg:hidden">
            <button
              type="button"
              onClick={() => setMode("edit")}
              aria-pressed={mode === "edit"}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition",
                mode === "edit" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <Pencil className="size-3.5" /> Editar
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              aria-pressed={mode === "preview"}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition",
                mode === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <Eye className="size-3.5" /> Pré-visualizar
            </button>
          </div>
          <Button onClick={handleSave} disabled={!isDirty || saving} size="sm">
            {saving ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                A guardar
              </>
            ) : (
              <>
                <Save className="mr-1.5 size-4" />
                Guardar
              </>
            )}
          </Button>
        </div>
        {error ? (
          <p role="alert" aria-live="polite" className="basis-full text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" aria-live="polite" className="basis-full text-sm text-emerald-600">
            Alterações guardadas. A pré-visualização foi atualizada.
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className={cn("order-1 lg:order-none", mode === "edit" && "hidden lg:block")}>
          <IphonePreview slug={previewSlug} refreshToken={refreshToken} />
        </div>

        <div className={cn("order-2 flex flex-col gap-6 lg:order-none", mode === "preview" && "hidden lg:flex")}>
          <Block title="1. Hero" description="Vídeo ou imagem de topo + logo.">
            <MediaField
              label="Hero (vídeo .mp4/.webm ou imagem)"
              value={draft.heroImageUrl}
              onChange={(value) => update("heroImageUrl", value)}
              accept="image/*,video/mp4,video/webm"
            />
            <MediaField
              label="Capa (poster do vídeo / fallback)"
              value={draft.coverImageUrl}
              onChange={(value) => update("coverImageUrl", value)}
              accept="image/*"
            />
            <MediaField
              label="Logo"
              value={draft.logoUrl}
              onChange={(value) => update("logoUrl", value)}
              accept="image/*"
            />
          </Block>

          <Block title="2. Identidade" description="Nome, slug, descrição.">
            <Field label="Nome do negócio">
              <Input
                value={draft.businessName}
                onChange={(event) => update("businessName", event.target.value)}
                maxLength={100}
              />
            </Field>
            <Field label="Slug (URL pública)" hint={`Será /${draft.slug || "..."}`}>
              <Input
                value={draft.slug}
                onChange={(event) => update("slug", event.target.value)}
                maxLength={60}
              />
            </Field>
            <Field label="Headline (frase curta no topo)">
              <Input
                value={draft.headline}
                onChange={(event) => update("headline", event.target.value)}
                maxLength={140}
              />
            </Field>
            <Field label="Descrição (parágrafo introdutório)">
              <textarea
                value={draft.description}
                onChange={(event) => update("description", event.target.value)}
                maxLength={500}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </Field>
          </Block>

          <Block title="3. Contactos" description="Aparecem como ícones na página.">
            <Field label="Telefone">
              <Input
                type="tel"
                value={draft.phone}
                onChange={(event) => update("phone", event.target.value)}
                maxLength={30}
              />
            </Field>
            <Field label="Email de contacto">
              <Input
                type="email"
                value={draft.contactEmail}
                onChange={(event) => update("contactEmail", event.target.value)}
              />
            </Field>
            <Field label="Instagram (URL)">
              <Input
                value={draft.instagramUrl}
                onChange={(event) => update("instagramUrl", event.target.value)}
                placeholder="instagram.com/..."
              />
            </Field>
            <Field label="Website">
              <Input
                value={draft.websiteUrl}
                onChange={(event) => update("websiteUrl", event.target.value)}
                placeholder="https://"
              />
            </Field>
          </Block>

          <Block title="4. Visibilidade" description="O que mostrar na página pública.">
            <Toggle
              label="Mostrar equipa"
              checked={draft.showTeam}
              onChange={(value) => update("showTeam", value)}
            />
            <Toggle
              label="Mostrar preços dos serviços"
              checked={draft.showPrices}
              onChange={(value) => update("showPrices", value)}
            />
            <Toggle
              label="Mostrar duração dos serviços"
              checked={draft.showDurations}
              onChange={(value) => update("showDurations", value)}
            />
            <Toggle
              label="Reservas online ativas"
              checked={draft.onlineBooking}
              onChange={(value) => update("onlineBooking", value)}
            />
          </Block>

          <Block title="5. Aparência" description="Tema e cores.">
            <Field label="Tema">
              <div className="flex gap-2">
                {(["dark", "light"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("theme", value)}
                    aria-pressed={draft.theme === value}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-sm capitalize transition",
                      draft.theme === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {value === "dark" ? "Escuro" : "Claro"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Cor primária">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={draft.primaryColor}
                  onChange={(event) => update("primaryColor", event.target.value.toUpperCase())}
                  className="size-10 cursor-pointer rounded-md border border-input bg-background"
                  aria-label="Cor primária"
                />
                <Input
                  value={draft.primaryColor}
                  onChange={(event) => update("primaryColor", event.target.value)}
                  maxLength={7}
                  className="font-mono"
                />
              </div>
            </Field>
            <Field label="Cor de acento">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={draft.accentColor}
                  onChange={(event) => update("accentColor", event.target.value.toUpperCase())}
                  className="size-10 cursor-pointer rounded-md border border-input bg-background"
                  aria-label="Cor de acento"
                />
                <Input
                  value={draft.accentColor}
                  onChange={(event) => update("accentColor", event.target.value)}
                  maxLength={7}
                  className="font-mono"
                />
              </div>
            </Field>
          </Block>

          <Block title="6. Localização" description="Cidade aparece no mapa do Google.">
            <Field label="Cidade">
              <Input
                value={draft.city}
                onChange={(event) => update("city", event.target.value)}
                maxLength={80}
              />
            </Field>
          </Block>

          <Block
            title="7. SEO"
            description="O que aparece no Google e quando a página é partilhada."
          >
            <Field
              label="Título SEO"
              hint={`${draft.seoTitle.length}/70`}
            >
              <Input
                value={draft.seoTitle}
                onChange={(event) => update("seoTitle", event.target.value)}
                maxLength={70}
                placeholder={`${draft.businessName} — Marcação online`}
              />
            </Field>
            <Field
              label="Descrição SEO"
              hint={`${draft.seoDescription.length}/160`}
            >
              <textarea
                value={draft.seoDescription}
                onChange={(event) => update("seoDescription", event.target.value)}
                maxLength={160}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </Field>
          </Block>

          <Block
            title="8. Política de reservas"
            description="Janelas e intervalos que controlam os horários disponíveis."
          >
            <NumberField
              label="Antecedência mínima (horas)"
              value={draft.bookingLeadTimeHours}
              onChange={(value) => update("bookingLeadTimeHours", value)}
              min={0}
              max={168}
            />
            <NumberField
              label="Janela de reserva (dias)"
              value={draft.bookingWindowDays}
              onChange={(value) => update("bookingWindowDays", value)}
              min={1}
              max={365}
            />
            <NumberField
              label="Intervalo entre slots (minutos)"
              value={draft.slotIntervalMinutes}
              onChange={(value) => update("slotIntervalMinutes", value)}
              min={5}
              max={120}
            />
            <NumberField
              label="Janela de cancelamento (horas)"
              value={draft.cancellationWindowHours}
              onChange={(value) => update("cancellationWindowHours", value)}
              min={0}
              max={168}
            />
          </Block>
        </div>
      </div>
    </div>
  );
}

function Block({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <header>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {hint ? <span className="text-[10px] text-muted-foreground/70">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm transition hover:border-ring"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-background shadow transition",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const raw = Number(event.target.value);
          if (Number.isFinite(raw)) onChange(raw);
        }}
      />
    </Field>
  );
}

function MediaField({
  label,
  value,
  onChange,
  accept,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accept: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setUploadError("");
    try {
      const url = await uploadMedia(file, ({ percent }) => setProgress(percent));
      onChange(url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Erro no upload.");
    } finally {
      setUploading(false);
    }
  };

  const isVideoUrl = /\.(mp4|webm|mov)(\?|$)/i.test(value);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative size-16 overflow-hidden rounded-md border border-border bg-muted">
          {value ? (
            isVideoUrl ? (
              <video src={value} className="h-full w-full object-cover" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="size-5" />
            </span>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://..."
          />
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              hidden
              onChange={(event) => {
                void handleFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  {progress}%
                </>
              ) : (
                <>
                  <Upload className="mr-1.5 size-3.5" />
                  Carregar
                </>
              )}
            </Button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Remover
              </button>
            ) : null}
          </div>
          {uploadError ? (
            <p role="alert" className="text-xs text-destructive">
              {uploadError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function IphonePreview({
  slug,
  refreshToken,
}: {
  slug: string;
  refreshToken: number;
}) {
  const url = slug ? `/${slug}?t=${refreshToken}` : null;

  return (
    <div className="lg:sticky lg:top-24">
      <div className="mx-auto w-full max-w-[380px]">
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[44px] border-[10px] border-foreground/90 bg-black shadow-2xl">
          <span
            aria-hidden
            className="absolute left-1/2 top-2 z-10 h-5 w-28 -translate-x-1/2 rounded-2xl bg-foreground/90"
          />
          {url ? (
            <iframe
              key={refreshToken}
              src={url}
              className="h-full w-full bg-background"
              title="Pré-visualização da página pública"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
              Define um slug para pré-visualizar a página.
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          A pré-visualização atualiza ao guardar.
        </p>
      </div>
    </div>
  );
}
