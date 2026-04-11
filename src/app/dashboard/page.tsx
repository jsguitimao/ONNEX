import Link from "next/link";
import { CalendarRange, LayoutDashboard, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const panels = [
  "Agenda com visão diária e lista de marcações",
  "Gestão de serviços, equipa e disponibilidade",
  "Clientes, notas e histórico de marcações",
];

export default function DashboardPreviewPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-4">
            Preview estrutural
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">Dashboard do negócio</h1>
          <p className="mt-3 text-muted-foreground">
            Esta área já está reservada para o fluxo autenticado com Clerk. No próximo ciclo ela
            receberá agenda, serviços, equipa, clientes e configurações do perfil público.
          </p>
        </div>

        <Link href="/onboarding" className={buttonVariants()}>
          Ir para onboarding
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {panels.map((panel, index) => (
          <Card key={panel}>
            <CardHeader>
              <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {index === 0 ? (
                  <LayoutDashboard className="size-5" />
                ) : index === 1 ? (
                  <Users className="size-5" />
                ) : (
                  <CalendarRange className="size-5" />
                )}
              </div>
              <CardTitle className="font-heading text-xl">{panel}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              A base foi pensada para suportar múltiplos serviços, equipa, disponibilidade semanal,
              reservas públicas por slug e crescimento de produto sem retrabalho estrutural.
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
