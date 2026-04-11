import { CheckCircle2, Palette, Store, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    title: "Dados do negócio",
    description: "Nome, slug público, telefone, e-mail, fuso horário e localização principal.",
    icon: Store,
  },
  {
    title: "Branding da página pública",
    description: "Logo, cores semânticas, imagem de capa e mensagem principal da página de marcações.",
    icon: Palette,
  },
  {
    title: "Equipa e operação",
    description: "Profissionais, serviços, duração, preços e disponibilidade base de cada agenda.",
    icon: Users,
  },
];

export default function OnboardingPreviewPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12">
      <Badge variant="secondary" className="mb-4">
        Preview do onboarding
      </Badge>
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Primeiro contacto do negócio</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        O onboarding vai criar a estrutura mínima do negócio para que ele já possa publicar a sua
        página pública e começar a receber marcações rapidamente.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <step.icon className="size-5" />
              </div>
              <CardTitle className="font-heading text-xl">{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>{step.description}</p>
              <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                <CheckCircle2 className="size-3.5 text-primary" />
                Planeado para fase seguinte
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
