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
              Carrega ou cola URLs de fotos. Se ficar vazio, a imagem de capa é usada como fallback.
            </p>
            <div className="grid gap-6">
              <ImageField
                label="Logo"
                value={form.logoUrl}
                onChange={(value) => updateField("logoUrl", value)}
              />
              <ImageField
                label="Imagem de capa (fallback geral)"
                value={form.coverImageUrl}
                onChange={(value) => updateField("coverImageUrl", value)}
              />
              <ImageField
                label="Foto da secção Principal (hero)"
                value={form.heroImageUrl}
                onChange={(value) => updateField("heroImageUrl", value)}
              />
              <MultiImageField
                label="Fotos da secção Sobre"
                images={form.aboutImages}
                onChange={(images) => updateField("aboutImages", images)}
              />
              <MultiImageField
                label="Fotos da secção Serviços"
                images={form.servicesImages}
                onChange={(images) => updateField("servicesImages", images)}
              />
              <MultiImageField
                label="Fotos da secção Equipa"
                images={form.teamImages}
                onChange={(images) => updateField("teamImages", images)}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Palette className="size-4 text-amber-300" />
              Cores e identidade
            </div>
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Cor principal (fundo escuro)">
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
                <Field label="Cor de destaque (botões e textos)">
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
              <div className="space-y-3">
                <p className="text-xs font-medium text-neutral-400">Cor de fundo por secção</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {([
                    ["sobreColor", "Sobre"],
                    ["servicosColor", "Serviços"],
                    ["equipaColor", "Equipa"],
                    ["localizacaoColor", "Localização"],
                    ["reservaColor", "Reserva"],
                  ] as const).map(([field, label]) => (
                    <div key={field} className="flex items-center gap-2">
                      <input
                        type="color"
                        className="h-8 w-10 cursor-pointer rounded border border-white/15 bg-white/5"
                        value={form[field] || form.primaryColor}
                        onChange={(e) => updateField(field, e.target.value)}
                      />
                      <span className="text-xs text-neutral-300">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Store className="size-4 text-amber-300" />
              Comunicação
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

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
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
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Erro ao carregar ficheiro.");
      }

      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao carregar.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="grid gap-2">
      <span className="text-xs font-medium text-neutral-300">{label}</span>
      <div className="flex gap-2">
        <DarkInput
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://... ou carrega um ficheiro"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-300/40 bg-amber-300/10 px-3 py-2.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {uploading ? "A carregar..." : "Carregar"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            className="h-16 w-16 rounded-lg object-cover"
            onError={(event) => {
              (event.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1 text-xs text-neutral-400 transition hover:text-red-300"
          >
            <X className="size-3.5" />
            Remover
          </button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

function MultiImageField({
  label,
  images,
  onChange,
  max = 6,
}: {
  label: string;
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, max - images.length)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const data = (await response.json()) as { url?: string; error?: string };

        if (!response.ok || !data.url) {
          throw new Error(data.error ?? "Erro ao carregar ficheiro.");
        }
        uploaded.push(data.url);
      }

      onChange([...images, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-300">{label}</span>
        <span className="text-[10px] text-neutral-500">{images.length}/{max}</span>
      </div>

      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((url, idx) => (
            <div key={url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${label} ${idx + 1}`}
                className="h-20 w-20 rounded-xl border border-white/10 object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {images.length < max ? (
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-2.5 text-xs font-medium text-neutral-300 transition hover:border-amber-300/40 hover:bg-amber-300/5 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            {uploading ? "A carregar..." : "Adicionar foto"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
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
