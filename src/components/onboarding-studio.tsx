"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  Palette,
  Phone,
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

  const updateField = (field: keyof OnboardingDraft, value: string) => {
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
      setMessage("Configuração guardada com sucesso.");
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
            Onboarding realista
          </Badge>
          <CardTitle className="font-heading text-2xl">Estrutura do primeiro setup do negócio</CardTitle>
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

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/50 p-4">
            <div className="text-sm text-muted-foreground">
              Estas alterações já são persistidas no Neon e alimentam a rota pública por slug.
            </div>
            <button
              type="button"
              className={cn(buttonVariants({ className: "gap-2" }))}
              onClick={handleSave}
              disabled={status === "saving"}
            >
              {status === "saving" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Guardar onboarding
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
          <div className="mx-auto flex size-24 items-center justify-center rounded-[1.75rem] border border-white/20 bg-white/12 text-3xl font-semibold shadow-lg shadow-black/10">
            {form.businessName.charAt(0)}
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
          </div>
        </div>

        <CardContent className="grid gap-5 p-5">
          <div className="grid gap-3">
            <a
              href={`/${form.slug || "barbearia-sample"}`}
              className={cn(buttonVariants({ size: "lg", className: "h-12 w-full justify-between rounded-2xl px-5" }))}
            >
              Reservar agora
              <ArrowRight className="size-4" />
            </a>
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
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ backgroundColor: `${form.accentColor}20`, color: form.accentColor }}
                  >
                    {service.durationMinutes} min
                  </span>
                </div>
                <p className="mt-4 font-semibold" style={{ color: form.primaryColor }}>
                  {formatEuro(service.priceCents)}
                </p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2 text-sm font-medium">
              <UserRound className="size-4" />
              Equipa visível na página pública
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
                      <p className="mt-2 text-sm text-muted-foreground">{member.specialties.join(" · ")}</p>
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

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-muted/50 p-4">
            <div>
              <p className="text-sm font-medium">Rota pública prevista</p>
              <p className="text-sm text-muted-foreground">/{form.slug || "nome-do-negocio"}</p>
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
