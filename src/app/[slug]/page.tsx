import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PublicPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicBookingPage({ params }: PublicPageProps) {
  const { slug } = await params;

  if (slug !== "barbearia-sample") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border bg-card p-8 shadow-sm">
          <Badge variant="secondary" className="mb-5">
            Exemplo de perfil publico
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">Barbearia Sample</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Esta rota representa o tipo de diretório público que cada negócio terá. O objetivo é
            permitir marcação simples, com branding próprio, serviços e equipa disponíveis por slug.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">Corte Tradicional</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                30 minutos · EUR 16.00
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">Barba + Toalha Quente</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                25 minutos · EUR 12.00
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-[2rem] border bg-background p-8 shadow-sm">
          <h2 className="font-heading text-2xl font-semibold">Reserva rápida</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Nesta fase ainda é uma maquete funcional de navegação. O formulário real será ligado a
            disponibilidade, clientes, staff e bookings na próxima etapa.
          </p>

          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border bg-muted/50 p-4 text-sm text-muted-foreground">
              Serviço, profissional, data e hora viverão aqui.
            </div>
            <Button className="w-full" size="lg">
              Continuar para marcacao
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
