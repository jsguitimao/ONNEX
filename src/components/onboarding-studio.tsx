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
import { demoBusiness, formatEuro } from "@/lib/demo-data";
import type { OnboardingDraft } from "@/lib/business";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

    try {
      const response = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível guardar.");
      }

      setStatus("saved");
      setMessage("Configuracao guardada com sucesso.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado ao guardar.");
    }
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_1.05fr]">
      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Badge variant="secondary" className="w-fit">
            Setup realista
          </Badge>
          <CardTitle className="font-heading text-2xl">Configuracoes essenciais da barbearia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Store className="size-4 text-primary" />
              Dados do negócio
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome do negócio">
                <Input value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} />
              </Field>
              <Field label="Slug público">
                <Input value={form.slug} onChange={(e) => updateField("slug", e.target.value.toLowerCase())} />
              </Field>
              <Field label="Cidade">
                <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
              </Field>
              <Field label="Telefone">
                <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </Field>
              <Field label="Email de contacto">
                <Input type="email" value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} />
              </Field>
              <Field label="Website">
                <Input value={form.websiteUrl} onChange={(e) => updateField("websiteUrl", e.target.value)} placeholder="https://..." />
              </Field>
            </div>
            <Field label="Descricao curta do negócio">
              <textarea
                className="min-h-24 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </Field>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="size-4 text-primary" />
              Visuais
            </div>
            <div className="grid gap-4">
              <Field label="Logo por URL">
                <Input value={form.logoUrl} onChange={(e) => updateField("logoUrl", e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Imagem de capa por URL">
                <Input
                  value={form.coverImageUrl}
                  onChange={(e) => updateField("coverImageUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="size-4 text-primary" />
              Marca e comunicação
            </div>
            <div className="grid gap-4">
              <Field label="Headline">
                <Input value={form.headline} onChange={(e) => updateField("headline", e.target.value)} />
              </Field>
              <Field label="Subheadline">
                <textarea
                  className="min-h-24 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
                  value={form.subheadline}
                  onChange={(e) => updateField("subheadline", e.target.value)}
                />
              </Field>
              <Field label="Mensagem de boas-vindas">
                <textarea
                  className="min-h-24 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
                  value={form.welcomeMessage}
                  onChange={(e) => updateField("welcomeMessage", e.target.value)}
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Cor principal">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="h-11 w-14 rounded-lg border border-input bg-transparent"
                      value={form.primaryColor}
                      onChange={(e) => updateField("primaryColor", e.target.value)}
                    />
                    <Input value={form.primaryColor} onChange={(e) => updateField("primaryColor", e.target.value)} />
                  </div>
                </Field>
                <Field label="Cor de destaque">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="h-11 w-14 rounded-lg border border-input bg-transparent"
                      value={form.accentColor}
                      onChange={(e) => updateField("accentColor", e.target.value)}
                    />
                    <Input value={form.accentColor} onChange={(e) => updateField("accentColor", e.target.value)} />
                  </div>
                </Field>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="size-4 text-primary" />
              Preferencias operacionais
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
                label="Mostrar precos"
                checked={form.showPrices}
                onChange={(checked) => updateField("showPrices", checked)}
              />
              <ToggleRow
                label="Mostrar duracoes"
                checked={form.showDurations}
                onChange={(checked) => updateField("showDurations", checked)}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4 text-primary" />
              Regras de marcação
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Antecedencia minima (horas)">
                <Input
                  type="number"
                  min={0}
                  max={168}
                  value={form.bookingLeadTimeHours}
                  onChange={(e) => updateField("bookingLeadTimeHours", Number(e.target.value))}
                />
              </Field>
              <Field label="Janela de reservas (dias)">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={form.bookingWindowDays}
                  onChange={(e) => updateField("bookingWindowDays", Number(e.target.value))}
                />
              </Field>
              <Field label="Intervalo entre slots (min)">
                <Input
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  value={form.slotIntervalMinutes}
                  onChange={(e) => updateField("slotIntervalMinutes", Number(e.target.value))}
                />
              </Field>
              <Field label="Cancelamento automático até (horas)">
                <Input
                  type="number"
                  min={0}
                  max={168}
                  value={form.cancellationWindowHours}
                  onChange={(e) => updateField("cancellationWindowHours", Number(e.target.value))}
                />
              </Field>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/50 p-4">
            <div className="text-sm text-muted-foreground">
              Estas alteracoes já são persistidas e alimentam imediatamente a página pública.
            </div>
            <button
              type="button"
              className={cn(buttonVariants({ className: "gap-2" }))}
              onClick={handleSave}
              disabled={status === "saving"}
            >
              {status === "saving" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Guardar configuracoes
            </button>
          </div>

          {message ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                status === "error"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-primary/20 bg-primary/5 text-foreground"
              )}
            >
              {message}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70">
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
          <Badge className="mt-5 border-white/20 bg-white/12 text-white hover:bg-white/12">Preview ao vivo</Badge>
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

        <CardContent className="grid gap-5 p-5">
          <div className="rounded-2xl border bg-muted/50 p-4 text-left">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-primary" />
              Posicionamento da barbearia
            </div>
            <p className="text-sm leading-7 text-muted-foreground">{form.description}</p>
          </div>

          <div className="rounded-2xl border bg-muted/50 p-4 text-left">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4 text-primary" />
              Politicas de marcação
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>Antecedencia minima: {form.bookingLeadTimeHours}h.</p>
              <p>Janela de reservas: até {form.bookingWindowDays} dias.</p>
              <p>Intervalo entre horarios: {form.slotIntervalMinutes} min.</p>
              <p>Cancelamento pelo cliente: até {form.cancellationWindowHours}h antes.</p>
            </div>
          </div>

          <div className="grid gap-3">
            {form.onlineBooking ? (
              <a
                href={`/${form.slug || "barbearia-sample"}`}
                className={cn(buttonVariants({ size: "lg", className: "h-12 w-full justify-between rounded-2xl px-5" }))}
              >
                Reservar agora
                <ArrowRight className="size-4" />
              </a>
            ) : (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700">
                As reservas online estão desativadas. A página pública vai mostrar contacto e branding, mas sem CTA de marcação.
              </div>
            )}

            <div className="rounded-2xl border bg-muted/50 p-4 text-left">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-primary" />
                Mensagem em destaque
              </div>
              <p className="text-sm leading-7 text-muted-foreground">{form.subheadline}</p>
              <p className="mt-3 rounded-2xl bg-background px-4 py-3 text-sm text-foreground">{form.welcomeMessage}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {demoBusiness.services.map((service) => (
              <div key={service.id} className="rounded-[1.5rem] border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{service.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{service.description}</p>
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
                  <p className="mt-4 font-semibold" style={{ color: form.primaryColor }}>
                    {formatEuro(service.priceCents)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {form.showTeam ? (
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                <UserRound className="size-4" />
                Equipa visivel na página pública
              </div>
              <div className="grid gap-3">
                {demoBusiness.team.map((member) => (
                  <div key={member.id} className="flex items-start justify-between gap-3 rounded-[1.5rem] border p-4">
                    <div className="flex gap-3">
                      <div
                        className="flex size-12 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                        style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.accentColor})` }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{member.specialties.join(" / ")}</p>
                      </div>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: `${form.primaryColor}14`, color: form.primaryColor }}
                    >
                      Disponível
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-muted/50 p-4">
            <div>
              <p className="text-sm font-medium">Rota pública prevista</p>
              <p className="text-sm text-muted-foreground">/{form.slug || "nome-da-barbearia"}</p>
            </div>
            <a href={`/${form.slug || "barbearia-sample"}`} className={cn(buttonVariants({ className: "gap-2" }))}>
              Ver página pública
              <ArrowRight className="size-4" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
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
    <label className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
