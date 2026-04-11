import { notFound } from "next/navigation";
import { Clock3, MapPin, UserRound } from "lucide-react";
import { getBusinessBySlug } from "@/lib/business";
import { formatEuro } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type PublicPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicBookingPage({ params }: PublicPageProps) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);

  if (!business) {
    notFound();
  }

  const location = business.locations[0];

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border bg-card p-8 shadow-sm">
          <Badge variant="secondary" className="mb-5">
            Página pública do negócio
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">{business.name}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            {business.bookingPage?.headline}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            {business.bookingPage?.subheadline}
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
              <MapPin className="size-4" />
              {location?.city ?? "Portugal"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
              <UserRound className="size-4" />
              {business.staffMembers.length} profissionais
            </span>
          </div>

          <div
            className="mt-6 rounded-3xl p-5 text-primary-foreground"
            style={{ backgroundColor: business.primaryColor ?? "#1570ef" }}
          >
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-foreground/70">Mensagem de boas-vindas</p>
            <p className="mt-3 max-w-2xl text-sm leading-7">{business.bookingPage?.welcomeMessage}</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {business.services.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <CardTitle className="font-heading text-lg">{service.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{service.description}</p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="size-4" />
                      {service.durationMinutes} minutos
                    </span>
                    <span className="font-semibold text-foreground">{formatEuro(service.priceCents)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">Profissionais</h2>
            <div className="mt-4 grid gap-3">
              {business.staffMembers.map((member) => (
                <div key={member.id} className="rounded-2xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{member.fullName}</p>
                      <p className="text-sm text-muted-foreground">{member.roleTitle}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{member.bio}</p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                      Disponível
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border bg-background p-8 shadow-sm">
          <h2 className="font-heading text-2xl font-semibold">Reserva rápida</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Este bloco já representa o desenho do fluxo final. A próxima etapa vai ligar
            disponibilidade real, cliente, equipa e criação de booking em base de dados.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border bg-muted/50 p-4">
              <p className="text-sm font-medium">1. Serviço</p>
              <p className="mt-1 text-sm text-muted-foreground">{business.services[0]?.name ?? "Sem serviços"}</p>
            </div>
            <div className="rounded-2xl border bg-muted/50 p-4">
              <p className="text-sm font-medium">2. Profissional</p>
              <p className="mt-1 text-sm text-muted-foreground">{business.staffMembers[0]?.fullName ?? "A definir"}</p>
            </div>
            <div className="rounded-2xl border bg-muted/50 p-4">
              <p className="text-sm font-medium">3. Data e hora</p>
              <p className="mt-1 text-sm text-muted-foreground">Slots reais entram na próxima etapa.</p>
            </div>
            <Button className="w-full" size="lg">
              Continuar para marcação
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
