import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Quote,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  UserCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/landing/site-header";

const BOOKING_URL = "/mock";
const WHATSAPP_URL = "https://wa.me/351912345678?text=Ol%C3%A1!%20Quero%20marcar%20um%20hor%C3%A1rio.";
const PHONE_URL = "tel:+351912345678";
const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Rua+Garrett+24+Lisboa";
const INSTAGRAM_URL = "https://www.instagram.com/onnex.barbearia";
const ADDRESS = "Rua Garrett 24, Chiado · 1200-203 Lisboa";

export const metadata: Metadata = {
  title: "ONNEX Barbearia em Lisboa | Marcação Online de Corte e Barba",
  description:
    "Barbearia premium no Chiado, Lisboa. Marca online o teu corte, barba ou combo em segundos: escolhe serviço, barbeiro e hora com confirmação imediata e zero filas.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "ONNEX Barbearia em Lisboa | Marcação Online",
    description:
      "Corte, barba e grooming masculino premium no Chiado. Marca online com confirmação imediata.",
    type: "website",
    locale: "pt_PT",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: "ONNEX Barbearia",
  description:
    "Barbearia premium no Chiado, Lisboa, com marcação online de corte, barba e grooming masculino.",
  url: "https://www.onnex.pt",
  telephone: "+351912345678",
  priceRange: "€€",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua Garrett 24",
    addressLocality: "Lisboa",
    postalCode: "1200-203",
    addressCountry: "PT",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "1024",
  },
  openingHours: "Tu-Sa 09:30-19:30",
};

const valuePillars = [
  {
    icon: CalendarCheck,
    title: "Só por marcação",
    body: "Cada cliente tem a sua hora reservada. Chegas, és atendido — sem esperar na fila.",
  },
  {
    icon: UserCheck,
    title: "Barbeiros experientes",
    body: "Profissionais com anos de ofício em corte clássico, fade e desenho de barba.",
  },
  {
    icon: Sparkles,
    title: "Ambiente moderno",
    body: "Espaço cuidado, música certa e um café enquanto preparas o teu visual.",
  },
  {
    icon: ShieldCheck,
    title: "Resultado garantido",
    body: "Conversamos o corte antes de começar. Sais como imaginaste — ou ajustamos.",
  },
];

const services = [
  {
    name: "Corte masculino",
    duration: "30 min",
    price: "16€",
    description: "Corte à tesoura ou máquina, lavagem e finalização com produto.",
    benefit: "Visual alinhado para o dia a dia ou para uma ocasião.",
  },
  {
    name: "Barba",
    duration: "25 min",
    price: "12€",
    description: "Aparo, desenho e toalha quente com óleos e bálsamo.",
    benefit: "Barba simétrica, hidratada e com contornos definidos.",
  },
  {
    name: "Corte + barba",
    duration: "45 min",
    price: "25€",
    description: "O combo completo: corte, barba e acabamento num só horário.",
    benefit: "A imagem toda tratada de uma vez, sem voltar outro dia.",
    featured: true,
  },
  {
    name: "Degradê / fade",
    duration: "35 min",
    price: "18€",
    description: "Skin fade, low ou mid fade com transições limpas e precisas.",
    benefit: "Aquele degradê nítido que se nota — e que dura.",
  },
  {
    name: "Acabamento",
    duration: "15 min",
    price: "8€",
    description: "Retoque de contornos, pescoço e patilhas entre cortes.",
    benefit: "Mantém o corte fresco sem comprometer o comprimento.",
  },
  {
    name: "Tratamento capilar",
    duration: "30 min",
    price: "20€",
    description: "Diagnóstico, lavagem técnica e massagem com produtos premium.",
    benefit: "Couro cabeludo saudável e cabelo com outra presença.",
  },
  {
    name: "Experiência ONNEX",
    duration: "60 min",
    price: "38€",
    description: "Corte, barba, toalha quente, tratamento e finalização completa.",
    benefit: "O grooming completo do homem moderno, sem pressa.",
    featured: true,
  },
];

const benefits = [
  { icon: Scissors, title: "Visual alinhado", body: "Sais com um corte pensado para o teu rosto e estilo." },
  { icon: Sparkles, title: "Confiança renovada", body: "Aquela sensação de estar impecável antes de qualquer compromisso." },
  { icon: CalendarCheck, title: "Praticidade real", body: "Marcas do telemóvel em segundos, a qualquer hora do dia." },
  { icon: Clock3, title: "Atendimento sem pressa", body: "O teu horário é só teu. Sem despachar, sem atropelos." },
  { icon: UserCheck, title: "Resultado profissional", body: "Técnica e produtos certos para um acabamento consistente." },
  { icon: ShieldCheck, title: "Pontualidade", body: "Respeitamos a tua hora marcada e o teu tempo." },
  { icon: Star, title: "Cuidado pessoal", body: "Conselhos de manutenção para o cabelo e barba durarem mais." },
  { icon: Timer, title: "Zero espera", body: "Chegas e entras. A fila acabou quando começaste a marcar online." },
];

const problems = [
  "Ligas, ninguém atende — e perdes a vontade de marcar.",
  "Vais sem hora marcada e ficas 40 minutos à espera.",
  "Cada vez sai um corte diferente do que pediste.",
  "Não tens tempo para andar a tentar encaixar no horário deles.",
  "Sais a pensar que podia ter ficado melhor.",
];

const steps = [
  {
    number: "01",
    title: "Escolhe o serviço",
    body: "Corte, barba, combo ou a experiência completa — com preço e duração claros à frente.",
  },
  {
    number: "02",
    title: "Seleciona dia e hora",
    body: "Vês os horários livres em tempo real e escolhes o barbeiro. Confirmação imediata.",
  },
  {
    number: "03",
    title: "Aparece e aproveita",
    body: "Chegas à tua hora, sem fila. Tratamos do resto enquanto relaxas.",
  },
];

const testimonials = [
  {
    name: "Ricardo M.",
    location: "Cliente há 2 anos",
    quote:
      "Marco sempre pelo site na noite anterior. Chego, está tudo a postos e nunca esperei mais de cinco minutos. O fade ficou exatamente como pedi.",
  },
  {
    name: "André P.",
    location: "Chiado, Lisboa",
    quote:
      "Mudei de barbearia por causa da espera. Aqui é por marcação a sério — e nota-se o cuidado. A barba com toalha quente passou a ser ritual.",
  },
  {
    name: "Tiago F.",
    location: "Corte + barba",
    quote:
      "O combo num só horário resolve-me a vida. Profissionais simpáticos, ambiente top e o resultado é sempre consistente. Recomendo sem dúvida.",
  },
];

const differentiators = [
  { title: "Marcação online simples", body: "Em segundos, sem instalar nada nem criar conta complicada." },
  { title: "Atendimento personalizado", body: "Falamos contigo antes de cortar para perceber o que procuras." },
  { title: "Profissionais experientes", body: "Equipa formada e a par das tendências do grooming masculino." },
  { title: "Ambiente premium", body: "Um espaço pensado para te sentires bem do início ao fim." },
  { title: "Higiene rigorosa", body: "Material esterilizado e descartáveis a cada atendimento." },
  { title: "Localização acessível", body: "No coração do Chiado, com transportes à porta." },
];

const authorityStats = [
  { value: "4,9/5", label: "avaliação média" },
  { value: "+1.000", label: "clientes satisfeitos" },
  { value: "12+", label: "anos de ofício" },
  { value: "98%", label: "marcações pontuais" },
];

const faqs = [
  {
    q: "Preciso de marcar horário?",
    a: "Sim, trabalhamos por marcação para garantir que és atendido à tua hora, sem filas. Marcar online demora menos de um minuto.",
  },
  {
    q: "Posso agendar pelo WhatsApp?",
    a: "Podes. O mais rápido é marcar online (vês os horários livres na hora), mas se preferires falamos pelo WhatsApp e tratamos da marcação contigo.",
  },
  {
    q: "Quanto tempo dura um corte?",
    a: "Um corte demora cerca de 30 minutos. O combo corte + barba ronda os 45 minutos e a Experiência ONNEX completa cerca de 60 minutos.",
  },
  {
    q: "Fazem barba e cabelo no mesmo horário?",
    a: "Sim. O serviço corte + barba trata da imagem toda numa só marcação, sem precisares de voltar outro dia.",
  },
  {
    q: "Posso escolher o barbeiro?",
    a: "Claro. Ao marcar online escolhes o profissional disponível com quem preferes ser atendido.",
  },
  {
    q: "Onde fica a barbearia?",
    a: `Estamos na ${ADDRESS}, em pleno Chiado, com transportes públicos à porta.`,
  },
  {
    q: "O que acontece se me atrasar?",
    a: "Há uma tolerância de alguns minutos. A partir daí pode ser necessário ajustar o serviço para não atrasar quem vem a seguir — avisa-nos pelo WhatsApp se estiveres a chegar.",
  },
  {
    q: "Quais as formas de pagamento?",
    a: "Aceitamos multibanco, MB WAY, contactless e dinheiro. Pagas no fim do atendimento, no balcão.",
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="bg-background text-foreground">
        {/* 1 · HERO */}
        <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
          <div className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:46px_46px]" />
          <div className="absolute -right-24 top-0 -z-10 h-[520px] w-[520px] rounded-full bg-[var(--chart-3)] opacity-20 blur-[120px]" />

          <SiteHeader />

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28 lg:pt-16">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-3 py-1.5 text-xs font-medium tracking-wide text-primary-foreground/85">
                <span className="flex items-center gap-1 text-[var(--chart-3)]">
                  <Star className="size-3.5 fill-current" />
                  4,9
                </span>
                <span className="text-primary-foreground/40">·</span>
                Barbearia premium no Chiado, Lisboa
              </p>

              <h1 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
                Marca o teu corte em segundos.{" "}
                <span className="text-[var(--chart-3)]">Aparece e sai impecável.</span>
              </h1>

              <p className="mt-6 text-lg leading-8 text-primary-foreground/75">
                Escolhe o serviço, o barbeiro e a hora — com confirmação imediata e zero
                filas. Corte, barba e grooming masculino tratados por quem percebe do ofício.
              </p>

              <p className="mt-3 text-base leading-7 text-primary-foreground/55">
                A tua hora é só tua. Chegas, és atendido, sais a sentir-te bem.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={BOOKING_URL}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--chart-3)] px-6 text-sm font-semibold text-primary transition hover:opacity-90"
                >
                  <CalendarCheck className="size-[18px]" />
                  Agendar online
                </Link>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-primary-foreground/20 px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary-foreground/10"
                >
                  <MessageCircle className="size-[18px]" />
                  Falar por WhatsApp
                </a>
              </div>

              <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-primary-foreground/55">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-[var(--chart-3)]" /> Menos de 30 segundos
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-[var(--chart-3)]" /> Confirmação imediata
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-[var(--chart-3)]" /> Cancela quando precisares
                </span>
              </p>
            </div>

            <div className="lg:justify-self-end">
              <HeroBookingCard />
            </div>
          </div>
        </section>

        {/* 2 · PROPOSTA DE VALOR */}
        <section className="border-b border-border bg-background py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chart-3)]">
                Porquê a ONNEX
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Uma barbearia pensada para o homem que valoriza o seu tempo.
              </h2>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {valuePillars.map(({ icon: Icon, title, body }) => (
                <div key={title}>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3 · SERVIÇOS */}
        <section id="servicos" className="bg-primary py-16 text-primary-foreground sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chart-3)]">
                  Serviços
                </p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  Escolhe o que precisas. Marca em segundos.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-primary-foreground/65">
                Preços e duração sempre à frente. Sem surpresas no balcão.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <article
                  key={service.name}
                  className={[
                    "flex flex-col rounded-2xl border p-6 transition",
                    service.featured
                      ? "border-[var(--chart-3)]/40 bg-primary-foreground/[0.06]"
                      : "border-primary-foreground/12 bg-primary-foreground/[0.03] hover:bg-primary-foreground/[0.06]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold">{service.name}</h3>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-primary-foreground/55">
                        <Clock3 className="size-3.5" />
                        {service.duration}
                      </p>
                    </div>
                    <span className="rounded-lg bg-[var(--chart-3)] px-2.5 py-1 text-sm font-bold text-primary">
                      {service.price}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-primary-foreground/75">
                    {service.description}
                  </p>
                  <p className="mt-3 inline-flex items-start gap-2 text-sm leading-6 text-primary-foreground/55">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--chart-3)]" />
                    {service.benefit}
                  </p>
                  <Link
                    href={BOOKING_URL}
                    className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary-foreground/20 text-sm font-medium text-primary-foreground transition hover:border-[var(--chart-3)] hover:text-[var(--chart-3)]"
                  >
                    Agendar este serviço
                    <ArrowRight className="size-4" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 4 · BENEFÍCIOS */}
        <section className="border-b border-border bg-background py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chart-3)]">
                O que ganhas
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Não é só um corte. É sair daqui melhor do que entraste.
              </h2>
            </div>
            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-card p-6">
                  <Icon className="size-5 text-[var(--chart-3)]" />
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 · DOR / PROBLEMA */}
        <section className="bg-primary py-16 text-primary-foreground sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chart-3)]">
                Conhecemos a frustração
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Cortar o cabelo não devia ser uma maçada.
              </h2>
              <p className="mt-5 text-base leading-7 text-primary-foreground/70">
                Sabemos o que te afasta de uma barbearia. Por isso construímos a
                experiência ONNEX para resolver exatamente isto.
              </p>
              <Link
                href={BOOKING_URL}
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--chart-3)] px-6 text-sm font-semibold text-primary transition hover:opacity-90"
              >
                Marcar sem complicações
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <ul className="grid gap-3">
              {problems.map((problem) => (
                <li
                  key={problem}
                  className="flex items-start gap-3 rounded-xl border border-primary-foreground/12 bg-primary-foreground/[0.03] p-4 text-sm leading-6 text-primary-foreground/80"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                    <span className="text-xs font-bold">✕</span>
                  </span>
                  {problem}
                </li>
              ))}
              <li className="flex items-start gap-3 rounded-xl border border-[var(--chart-3)]/40 bg-[var(--chart-3)]/10 p-4 text-sm font-medium leading-6 text-primary-foreground">
                <Check className="mt-0.5 size-5 shrink-0 text-[var(--chart-3)]" />
                Com a ONNEX: marcas online, tens hora certa e sais como imaginaste.
              </li>
            </ul>
          </div>
        </section>

        {/* 6 · COMO FUNCIONA */}
        <section id="como-funciona" className="border-b border-border bg-background py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chart-3)]">
                Como funciona
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Três passos entre ti e o teu próximo corte.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="relative rounded-2xl border border-border bg-card p-7">
                  <span className="text-4xl font-bold tracking-tight text-[var(--chart-3)]">
                    {step.number}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link
                href={BOOKING_URL}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Começar agora
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 7 · PROVA SOCIAL */}
        <section id="avaliacoes" className="bg-primary py-16 text-primary-foreground sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chart-3)]">
                  Quem já confia
                </p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  Mais de 1.000 homens já marcam connosco.
                </h2>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-primary-foreground/12 bg-primary-foreground/[0.04] px-5 py-4">
                <div>
                  <p className="text-3xl font-bold">4,9</p>
                  <div className="mt-1 flex items-center gap-0.5 text-[var(--chart-3)]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="size-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                <div className="h-10 w-px bg-primary-foreground/15" />
                <p className="text-sm leading-5 text-primary-foreground/65">
                  +1.000 clientes
                  <br />
                  satisfeitos
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <figure
                  key={testimonial.name}
                  className="flex flex-col rounded-2xl border border-primary-foreground/12 bg-primary-foreground/[0.03] p-6"
                >
                  <Quote className="size-7 text-[var(--chart-3)]/70" />
                  <blockquote className="mt-4 flex-1 text-base leading-7 text-primary-foreground/85">
                    {testimonial.quote}
                  </blockquote>
                  <figcaption className="mt-6 border-t border-primary-foreground/10 pt-4">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="mt-0.5 text-sm text-primary-foreground/55">
                      {testimonial.location}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* 8 · DIFERENCIAIS */}
        <section className="border-b border-border bg-background py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chart-3)]">
                Diferenciais
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Aquilo que faz a diferença, do clique ao espelho.
              </h2>
            </div>
            <div className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {differentiators.map((item) => (
                <div key={item.title} className="border-l-2 border-[var(--chart-3)] pl-4">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9 · AUTORIDADE / CONFIANÇA */}
        <section className="bg-primary py-16 text-primary-foreground sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chart-3)]">
                Técnica e detalhe
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Precisão em cada passagem da máquina.
              </h2>
              <p className="mt-5 text-base leading-7 text-primary-foreground/70">
                Não improvisamos. Cada corte começa com uma conversa, segue uma técnica
                e termina com um acabamento que se nota. Do primeiro minuto ao último,
                o compromisso é o mesmo: pontualidade, higiene e um resultado de que te
                orgulhas.
              </p>
              <ul className="mt-6 grid gap-3 text-sm text-primary-foreground/80">
                {[
                  "Diagnóstico do cabelo e barba antes de começar",
                  "Material esterilizado e descartáveis a cada cliente",
                  "Acabamento revisto ao espelho antes de saíres",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--chart-3)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {authorityStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-primary-foreground/12 bg-primary-foreground/[0.03] p-6"
                >
                  <p className="text-3xl font-bold tracking-tight text-[var(--chart-3)] sm:text-4xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-primary-foreground/65">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 10 · CTA INTERMÉDIO */}
        <section className="bg-[var(--chart-3)] py-14 text-primary sm:py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                O teu próximo corte está a um clique.
              </h2>
              <p className="mt-2 text-base leading-7 text-primary/75">
                Escolhe a hora que te dá jeito e deixa o resto connosco.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2">
              <Link
                href={BOOKING_URL}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <CalendarCheck className="size-[18px]" />
                Agendar online
              </Link>
              <span className="text-xs text-primary/70">Confirmação imediata · Sem compromisso</span>
            </div>
          </div>
        </section>

        {/* 11 · GALERIA / RESULTADOS */}
        <section className="border-b border-border bg-background py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chart-3)]">
                Resultados
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                O ambiente, o detalhe e o acabamento.
              </h2>
            </div>
            <GalleryGrid />
          </div>
        </section>

        {/* 12 · FAQ */}
        <section id="faq" className="border-b border-border bg-secondary/40 py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chart-3)]">
                Perguntas frequentes
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Tudo o que precisas de saber antes de marcar.
              </h2>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                Ainda com dúvidas? Fala connosco pelo{" "}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  WhatsApp
                </a>{" "}
                e respondemos em minutos.
              </p>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {faqs.map((faq) => (
                <details key={faq.q} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium">
                    {faq.q}
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 text-sm leading-6 text-muted-foreground">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 13 · URGÊNCIA ÉTICA */}
        <section className="border-b border-border bg-background py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:px-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--chart-3)]/30 bg-[var(--chart-3)]/10 px-4 py-1.5 text-sm font-medium text-foreground">
              <Timer className="size-4 text-[var(--chart-3)]" />
              Horários limitados por dia
            </p>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              As tardes e os fins de semana são os primeiros a esgotar. Marca com
              antecedência para garantires o horário que te dá jeito.
            </p>
          </div>
        </section>

        {/* 14 · CTA FINAL */}
        <section className="relative isolate overflow-hidden bg-primary py-20 text-primary-foreground sm:py-28">
          <div className="absolute left-1/2 top-0 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--chart-3)] opacity-20 blur-[120px]" />
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Pronto para o melhor corte da tua rotina?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-primary-foreground/75">
              Marca em segundos, aparece à tua hora e sai a sentir-te no teu melhor.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={BOOKING_URL}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--chart-3)] px-7 text-sm font-semibold text-primary transition hover:opacity-90"
              >
                <CalendarCheck className="size-[18px]" />
                Agendar online
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-primary-foreground/20 px-7 text-sm font-medium text-primary-foreground transition hover:bg-primary-foreground/10"
              >
                <MessageCircle className="size-[18px]" />
                Falar por WhatsApp
              </a>
            </div>
            <p className="mt-4 text-xs text-primary-foreground/55">
              Confirmação imediata · Cancelamento flexível · Sem criar conta
            </p>
          </div>
        </section>

        {/* 15 · FOOTER */}
        <footer className="bg-primary text-primary-foreground">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--chart-3)] text-primary">
                  <Scissors className="size-4" />
                </span>
                <span className="text-base font-semibold tracking-wide">
                  ONNEX<span className="text-primary-foreground/55">.PT</span>
                </span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-6 text-primary-foreground/60">
                Barbearia premium no Chiado, em Lisboa. Corte, barba e grooming
                masculino com marcação online.
              </p>
              <div className="mt-5 flex gap-3">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex size-10 items-center justify-center rounded-lg border border-primary-foreground/15 transition hover:bg-primary-foreground/10"
                >
                  <Camera className="size-[18px]" />
                </a>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="flex size-10 items-center justify-center rounded-lg border border-primary-foreground/15 transition hover:bg-primary-foreground/10"
                >
                  <MessageCircle className="size-[18px]" />
                </a>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Google Maps"
                  className="flex size-10 items-center justify-center rounded-lg border border-primary-foreground/15 transition hover:bg-primary-foreground/10"
                >
                  <MapPin className="size-[18px]" />
                </a>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold">Serviços</p>
              <ul className="mt-4 grid gap-2.5 text-sm text-primary-foreground/65">
                <li>
                  <Link href={BOOKING_URL} className="transition hover:text-primary-foreground">
                    Corte masculino
                  </Link>
                </li>
                <li>
                  <Link href={BOOKING_URL} className="transition hover:text-primary-foreground">
                    Barba
                  </Link>
                </li>
                <li>
                  <Link href={BOOKING_URL} className="transition hover:text-primary-foreground">
                    Corte + barba
                  </Link>
                </li>
                <li>
                  <Link href={BOOKING_URL} className="transition hover:text-primary-foreground">
                    Experiência ONNEX
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold">Contacto</p>
              <ul className="mt-4 grid gap-2.5 text-sm text-primary-foreground/65">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--chart-3)]" />
                  <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-primary-foreground">
                    {ADDRESS}
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 size-4 shrink-0 text-[var(--chart-3)]" />
                  <a href={PHONE_URL} className="transition hover:text-primary-foreground">
                    +351 912 345 678
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-[var(--chart-3)]" />
                  <span>Terça a sábado · 09:30 – 19:30</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-primary-foreground/10">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-primary-foreground/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>© {new Date().getFullYear()} ONNEX.PT · Todos os direitos reservados.</p>
              <div className="flex gap-5">
                <Link href="/privacidade" className="transition hover:text-primary-foreground">
                  Privacidade
                </Link>
                <Link href="/termos" className="transition hover:text-primary-foreground">
                  Termos
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}

function HeroBookingCard() {
  const cardServices = [
    { name: "Corte masculino", price: "16€", selected: false },
    { name: "Corte + barba", price: "25€", selected: true },
    { name: "Barba", price: "12€", selected: false },
  ];
  const slots = ["17:00", "17:45", "18:30"];

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-[var(--chart-3)]/15 blur-2xl" />
      <div className="overflow-hidden rounded-3xl border border-primary-foreground/12 bg-card text-card-foreground shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs text-muted-foreground">onnex.pt</p>
            <p className="mt-0.5 text-base font-semibold">ONNEX Barbearia</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-sm font-semibold">
            <Star className="size-3.5 fill-[var(--chart-3)] text-[var(--chart-3)]" />
            4,9
          </span>
        </div>

        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Escolhe o serviço
          </p>
          <div className="mt-3 grid gap-2">
            {cardServices.map((service) => (
              <div
                key={service.name}
                className={[
                  "flex items-center justify-between rounded-xl border px-4 py-3 text-sm",
                  service.selected
                    ? "border-[var(--chart-3)] bg-[var(--chart-3)]/10 font-semibold"
                    : "border-border",
                ].join(" ")}
              >
                <span className="flex items-center gap-2">
                  {service.selected ? (
                    <Check className="size-4 text-[var(--chart-3)]" />
                  ) : (
                    <span className="size-4 rounded-full border border-border" />
                  )}
                  {service.name}
                </span>
                <span>{service.price}</span>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Horários de hoje
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {slots.map((slot) => (
              <span
                key={slot}
                className={[
                  "flex h-10 items-center justify-center rounded-lg border text-sm",
                  slot === "17:45"
                    ? "border-[var(--chart-3)] bg-[var(--chart-3)] font-semibold text-primary"
                    : "border-border text-foreground",
                ].join(" ")}
              >
                {slot}
              </span>
            ))}
          </div>

          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            <CalendarCheck className="size-[18px]" />
            Confirmar marcação
          </button>
        </div>
      </div>

      <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-xl">
        <span className="flex size-8 items-center justify-center rounded-full bg-[var(--chart-2)]/20 text-[var(--chart-2)]">
          <Check className="size-4" />
        </span>
        <div className="text-card-foreground">
          <p className="text-xs font-semibold leading-tight">Marcação confirmada</p>
          <p className="text-[11px] leading-tight text-muted-foreground">Hoje às 17:45</p>
        </div>
      </div>
    </div>
  );
}

function GalleryGrid() {
  const tiles = [
    { label: "Fade", caption: "Degradê preciso", className: "from-primary to-secondary lg:col-span-2 lg:row-span-2" },
    { label: "Barba", caption: "Toalha quente", className: "from-[var(--chart-3)]/80 to-primary" },
    { label: "Ambiente", caption: "Espaço ONNEX", className: "from-secondary to-primary" },
    { label: "Corte clássico", caption: "Tesoura e máquina", className: "from-primary to-[var(--chart-3)]/70" },
    { label: "Acabamento", caption: "Contornos definidos", className: "from-accent to-primary" },
  ];

  return (
    <div className="mt-10 grid auto-rows-[140px] grid-cols-2 gap-3 sm:auto-rows-[180px] lg:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={[
            "group relative overflow-hidden rounded-2xl bg-gradient-to-br p-5",
            tile.className,
          ].join(" ")}
        >
          <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:14px_14px]" />
          <div className="relative flex h-full flex-col justify-end text-primary-foreground">
            <Scissors className="absolute right-0 top-0 size-5 text-primary-foreground/40" />
            <p className="text-xs uppercase tracking-[0.16em] text-primary-foreground/70">
              {tile.caption}
            </p>
            <p className="mt-0.5 text-lg font-semibold">{tile.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
