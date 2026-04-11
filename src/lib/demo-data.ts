export type DemoService = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  description: string;
};

export type DemoStaffMember = {
  id: string;
  name: string;
  role: string;
  specialties: string[];
};

export type DemoBusiness = {
  name: string;
  slug: string;
  city: string;
  headline: string;
  subheadline: string;
  welcomeMessage: string;
  primaryColor: string;
  accentColor: string;
  services: DemoService[];
  team: DemoStaffMember[];
};

export const demoBusiness: DemoBusiness = {
  name: "Barbearia Sample",
  slug: "barbearia-sample",
  city: "Porto",
  headline: "Marcações simples para uma barbearia moderna.",
  subheadline:
    "Página pública personalizada, equipa visível e experiência pensada para converter visitas em reservas.",
  welcomeMessage:
    "Escolha o serviço, selecione o profissional e reserve em poucos cliques.",
  primaryColor: "#1570ef",
  accentColor: "#0f9f7a",
  services: [
    {
      id: "svc-1",
      name: "Corte Tradicional",
      durationMinutes: 30,
      priceCents: 1600,
      description: "Corte clássico com acabamento limpo para rotina semanal.",
    },
    {
      id: "svc-2",
      name: "Barba + Toalha Quente",
      durationMinutes: 25,
      priceCents: 1200,
      description: "Alinhamento de barba com ritual de conforto e finalização.",
    },
    {
      id: "svc-3",
      name: "Corte + Barba",
      durationMinutes: 55,
      priceCents: 2500,
      description: "Pacote completo para quem quer sair pronto sem encaixes separados.",
    },
  ],
  team: [
    {
      id: "staff-1",
      name: "Guilherme Silva",
      role: "Master Barber",
      specialties: ["Fade", "Barba clássica", "Consultoria de estilo"],
    },
    {
      id: "staff-2",
      name: "Rafa Costa",
      role: "Senior Barber",
      specialties: ["Corte social", "Textura", "Atendimento expresso"],
    },
  ],
};

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
