import type { BookingSlot, PublicBusinessPayload } from "@/lib/business-modules/types";

export const MOCK_SLUG = "mock-barbearia";

// Hero 5:4 — segue padrão de "link in bio" premium.
const HERO_IMAGE =
  "https://images.pexels.com/photos/3998414/pexels-photo-3998414.jpeg?auto=compress&cs=tinysrgb&w=1200&h=960&dpr=1";
const COVER_IMAGE =
  "https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg?auto=compress&cs=tinysrgb&w=1200&dpr=1";

const STAFF_AVATARS = {
  guilherme:
    "https://images.pexels.com/photos/2035738/pexels-photo-2035738.jpeg?auto=compress&cs=tinysrgb&w=600&dpr=1",
  rafa: "https://images.pexels.com/photos/3998417/pexels-photo-3998417.jpeg?auto=compress&cs=tinysrgb&w=600&dpr=1",
  andre:
    "https://images.pexels.com/photos/3998414/pexels-photo-3998414.jpeg?auto=compress&cs=tinysrgb&w=600&dpr=1",
  tomas:
    "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&cs=tinysrgb&w=600&dpr=1",
  diogo:
    "https://images.pexels.com/photos/3998429/pexels-photo-3998429.jpeg?auto=compress&cs=tinysrgb&w=600&dpr=1",
  joao:
    "https://images.pexels.com/photos/3992870/pexels-photo-3992870.jpeg?auto=compress&cs=tinysrgb&w=600&dpr=1",
  miguel:
    "https://images.pexels.com/photos/3998406/pexels-photo-3998406.jpeg?auto=compress&cs=tinysrgb&w=600&dpr=1",
};

const PORTFOLIO_IMAGES = [
  "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1",
  "https://images.pexels.com/photos/3998429/pexels-photo-3998429.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1",
  "https://images.pexels.com/photos/3998419/pexels-photo-3998419.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1",
  "https://images.pexels.com/photos/3992870/pexels-photo-3992870.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1",
  "https://images.pexels.com/photos/3998406/pexels-photo-3998406.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1",
  "https://images.pexels.com/photos/3992869/pexels-photo-3992869.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1",
  "https://images.pexels.com/photos/3998417/pexels-photo-3998417.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1",
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
    {
      id: "svc-fade",
      name: "Corte Degrade (Fade)",
      description: "Fade progressivo com acabamento preciso na nuca e laterais.",
      durationMinutes: 35,
      priceCents: 1800,
    },
    {
      id: "svc-corte-sobrancelhas",
      name: "Corte + Sobrancelhas",
      description: "Corte completo com limpeza e definição de sobrancelhas.",
      durationMinutes: 40,
      priceCents: 2200,
    },
    {
      id: "svc-barba-lenhador",
      name: "Barba Lenhador",
      description: "Modelação de barba longa com hidratação e acabamento.",
      durationMinutes: 30,
      priceCents: 1500,
    },
    {
      id: "svc-hidratacao",
      name: "Hidratação Capilar",
      description: "Tratamento rápido para devolver brilho e controlo ao cabelo.",
      durationMinutes: 20,
      priceCents: 1400,
    },
    {
      id: "svc-tratamento",
      name: "Tratamento Capilar",
      description: "Diagnóstico e cuidado capilar para couro cabeludo e fios.",
      durationMinutes: 30,
      priceCents: 2500,
    },
    {
      id: "svc-pintura-cabelo",
      name: "Pintura de Cabelo",
      description: "Coloração masculina com preparação e finalização profissional.",
      durationMinutes: 50,
      priceCents: 2800,
    },
    {
      id: "svc-pintura-barba",
      name: "Pintura de Barba",
      description: "Cobertura e uniformização de tom para barba.",
      durationMinutes: 30,
      priceCents: 1800,
    },
    {
      id: "svc-limpeza",
      name: "Limpeza Facial Masculina",
      description: "Limpeza facial prática para pele mais fresca e equilibrada.",
      durationMinutes: 40,
      priceCents: 3000,
    },
    {
      id: "svc-noivo",
      name: "Pacote Noivo",
      description: "Preparação completa para o dia: cabelo, barba e acabamento.",
      durationMinutes: 90,
      priceCents: 6000,
    },
    {
      id: "svc-massagem",
      name: "Massagem Capilar",
      description: "Massagem relaxante no couro cabeludo com finalização leve.",
      durationMinutes: 20,
      priceCents: 1600,
    },
    {
      id: "svc-platinado",
      name: "Platinado / Descoloração",
      description: "Descoloração controlada com matização e cuidado pós-química.",
      durationMinutes: 60,
      priceCents: 4000,
    },
    {
      id: "svc-penteado",
      name: "Penteado para Eventos",
      description: "Styling com fixação para ocasiões especiais.",
      durationMinutes: 30,
      priceCents: 2000,
    },
  ],
  staffMembers: [
    {
      id: "staff-guilherme",
      fullName: "Guilherme Silva",
      roleTitle: "Master Barber",
      bio: "Fade · Barba clássica · Consultoria de estilo",
      avatarUrl: STAFF_AVATARS.guilherme,
      portfolioImages: PORTFOLIO_IMAGES.slice(0, 5),
      serviceIds: [
        "svc-corte",
        "svc-barba",
        "svc-completo",
        "svc-tesoura",
        "svc-sobrancelhas",
        "svc-fade",
        "svc-corte-sobrancelhas",
      ],
    },
    {
      id: "staff-rafa",
      fullName: "Rafa Costa",
      roleTitle: "Senior Barber",
      bio: "Corte social · Textura · Atendimento expresso",
      avatarUrl: STAFF_AVATARS.rafa,
      portfolioImages: PORTFOLIO_IMAGES.slice(3),
      serviceIds: [
        "svc-corte",
        "svc-completo",
        "svc-sobrancelhas",
        "svc-infantil",
        "svc-fade",
        "svc-massagem",
      ],
    },
    {
      id: "staff-andre",
      fullName: "André Pinto",
      roleTitle: "Color Specialist",
      bio: "Coloração · Platinado · Tratamentos capilares",
      avatarUrl: STAFF_AVATARS.andre,
      portfolioImages: [],
      serviceIds: [
        "svc-pintura-cabelo",
        "svc-pintura-barba",
        "svc-platinado",
        "svc-hidratacao",
        "svc-tratamento",
        "svc-corte",
      ],
    },
    {
      id: "staff-tomas",
      fullName: "Tomás Almeida",
      roleTitle: "Barber",
      bio: "Corte clássico · Tesoura · Barba longa",
      avatarUrl: STAFF_AVATARS.tomas,
      portfolioImages: [],
      serviceIds: [
        "svc-corte",
        "svc-barba",
        "svc-completo",
        "svc-tesoura",
        "svc-barba-lenhador",
      ],
    },
    {
      id: "staff-diogo",
      fullName: "Diogo Mendes",
      roleTitle: "Fade Specialist",
      bio: "Fade · Corte infantil · Acabamentos rápidos",
      avatarUrl: STAFF_AVATARS.diogo,
      portfolioImages: [],
      serviceIds: [
        "svc-corte",
        "svc-infantil",
        "svc-fade",
        "svc-sobrancelhas",
        "svc-corte-sobrancelhas",
      ],
    },
    {
      id: "staff-joao",
      fullName: "João Ferreira",
      roleTitle: "Grooming Specialist",
      bio: "Noivo · Limpeza facial · Penteados de evento",
      avatarUrl: STAFF_AVATARS.joao,
      portfolioImages: [],
      serviceIds: [
        "svc-noivo",
        "svc-penteado",
        "svc-completo",
        "svc-limpeza",
        "svc-tratamento",
      ],
    },
    {
      id: "staff-miguel",
      fullName: "Miguel Carvalho",
      roleTitle: "Barber",
      bio: "Corte moderno · Barba · Massagem capilar",
      avatarUrl: STAFF_AVATARS.miguel,
      portfolioImages: [],
      serviceIds: [
        "svc-corte",
        "svc-barba",
        "svc-fade",
        "svc-completo",
        "svc-massagem",
        "svc-limpeza",
      ],
    },
  ],
  galleryImages: PORTFOLIO_IMAGES,
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
