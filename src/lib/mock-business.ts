import type { BookingSlot, PublicBusinessPayload } from "@/lib/business-modules/types";

export const MOCK_SLUG = "mock-barbearia";

// Hero quadrado (1:1) — segue padrão de "link in bio" premium.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&h=1200&q=85";
const COVER_IMAGE =
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80";

const STAFF_AVATARS = {
  guilherme:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  rafa: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
};

const PORTFOLIO_GUILHERME = [
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?auto=format&fit=crop&w=900&q=80",
];

const PORTFOLIO_RAFA = [
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80",
];

export const mockBusiness: PublicBusinessPayload = {
  id: "mock-business",
  name: "Studio Lapidar",
  slug: MOCK_SLUG,
  city: "Lisboa",
  mapsAddress: "Rua da Misericórdia 50, 1200-273 Lisboa, Portugal",
  phone: "+351 912 345 678",
  instagramUrl: "https://instagram.com/studiolapidar",
  tiktokUrl: "https://tiktok.com/@studiolapidar",
  facebookUrl: "https://facebook.com/studiolapidar",
  description:
    "Barbearia contemporânea no coração de Lisboa. Cortes precisos, ritual de barba e estilo sem compromissos.",
  primaryColor: "#0b0b0b",
  accentColor: "#fbbf24",
  logoUrl: null,
  coverImageUrl: COVER_IMAGE,
  heroImageUrl: HERO_IMAGE,
  headline: "Marcações simples para uma barbearia moderna.",
  theme: "dark",
  onlineBooking: true,
  showTeam: true,
  showPrices: true,
  showDurations: true,
  bookingLeadTimeHours: 1,
  bookingWindowDays: 30,
  slotIntervalMinutes: 30,
  cancellationWindowHours: 2,
  timezone: "Europe/Lisbon",
  services: [
    {
      id: "svc-corte",
      name: "Corte Tradicional",
      description: "Corte clássico com acabamento limpo para a rotina semanal.",
      durationMinutes: 30,
      priceCents: 1600,
    },
    {
      id: "svc-barba",
      name: "Barba + Toalha Quente",
      description: "Alinhamento de barba com ritual de conforto e finalização.",
      durationMinutes: 25,
      priceCents: 1200,
    },
    {
      id: "svc-completo",
      name: "Corte + Barba",
      description: "Pacote completo para quem quer sair pronto sem encaixes separados.",
      durationMinutes: 55,
      priceCents: 2500,
    },
    {
      id: "svc-tesoura",
      name: "Corte à Tesoura",
      description: "Trabalho artesanal à tesoura para texturas mais soltas.",
      durationMinutes: 45,
      priceCents: 2200,
    },
    {
      id: "svc-sobrancelhas",
      name: "Design de Sobrancelhas",
      description: "Definição masculina, sem exageros, com pinça e navalha.",
      durationMinutes: 15,
      priceCents: 800,
    },
    {
      id: "svc-infantil",
      name: "Corte Infantil",
      description: "Cortes para crianças até aos 10 anos, com paciência e jogo.",
      durationMinutes: 25,
      priceCents: 1300,
    },
  ],
  staffMembers: [
    {
      id: "staff-guilherme",
      fullName: "Guilherme Silva",
      roleTitle: "Master Barber",
      bio: "Fade · Barba clássica · Consultoria de estilo",
      avatarUrl: STAFF_AVATARS.guilherme,
      portfolioImages: PORTFOLIO_GUILHERME,
      serviceIds: ["svc-corte", "svc-barba", "svc-completo", "svc-tesoura", "svc-sobrancelhas"],
    },
    {
      id: "staff-rafa",
      fullName: "Rafa Costa",
      roleTitle: "Senior Barber",
      bio: "Corte social · Textura · Atendimento expresso",
      avatarUrl: STAFF_AVATARS.rafa,
      portfolioImages: PORTFOLIO_RAFA,
      serviceIds: ["svc-corte", "svc-completo", "svc-sobrancelhas", "svc-infantil"],
    },
  ],
};

export function generateMockSlots(date: string): BookingSlot[] {
  if (!date) return [];

  const slots: BookingSlot[] = [];
  const start = 9;
  const end = 19;
  const intervalMinutes = mockBusiness.slotIntervalMinutes;

  for (let hour = start; hour < end; hour += 1) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const hh = String(hour).padStart(2, "0");
      const mm = String(minute).padStart(2, "0");
      const iso = new Date(`${date}T${hh}:${mm}:00`).toISOString();
      slots.push({ iso, label: `${hh}:${mm}` });
    }
  }

  return slots.filter((slot) => new Date(slot.iso).getTime() > Date.now());
}
