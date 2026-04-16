import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MoveRight } from "lucide-react";
import { PublicBookingFlow } from "@/components/public-booking-flow";
import { getBusinessBySlug, getPublicBusinessPayload } from "@/lib/business";
import { getAppUrl } from "@/lib/app-config";
import { formatEuro } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

type PublicPageProps = {
  params: Promise<{ slug: string }>;
};

function buildPublicPageMetadata(input: {
  name: string;
  slug: string;
  description: string;
  imageUrl?: string | null;
}) {
  const url = `${getAppUrl()}/${input.slug}`;
  const images = input.imageUrl ? [{ url: input.imageUrl }] : undefined;

  return {
    title: input.name,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.name,
      description: input.description,
      url,
      type: "website",
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: input.name,
      description: input.description,
      images: input.imageUrl ? [input.imageUrl] : undefined,
    },
  } satisfies Metadata;
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);

  if (!business) {
    return {
      title: "Página não encontrada | BUKBARBEARIA.COM",
      description: "A página pública pedida não está disponível.",
    };
  }

  const title =
    business.bookingPage?.seoTitle?.trim() ||
    `${business.name} | Marcação online na BUKBARBEARIA.COM`;
  const description =
    business.bookingPage?.seoDescription?.trim() ||
    business.bookingPage?.headline?.trim() ||
    business.description?.trim() ||
    `Marca online com ${business.name} na BUKBARBEARIA.COM.`;

  return buildPublicPageMetadata({
    name: title,
    slug: business.slug,
    description,
    imageUrl: business.coverImageUrl || business.logoUrl,
  });
}

export default async function PublicBookingPage({ params }: PublicPageProps) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  const publicBusiness = await getPublicBusinessPayload(slug);

  if (!business || !publicBusiness) {
    notFound();
  }

  const location = business.locations[0];
  const phoneDigits = (business.contactPhone ?? "").replace(/\D/g, "");
  const servicesPreview = publicBusiness.services.slice(0, 3);
  const fallbackImage = business.coverImageUrl ?? business.logoUrl;
  const heroImage = publicBusiness.heroImageUrl ?? fallbackImage;
  const aboutImage = publicBusiness.aboutImageUrl ?? fallbackImage;
  const servicesImage = publicBusiness.servicesImageUrl ?? business.coverImageUrl ?? null;
  const teamImage = publicBusiness.teamImageUrl ?? null;

  return (
    <main className="relative min-h-screen bg-[#0b1020] text-white">
      {/* TOP NAV — flutuante sobre o hero */}
      <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-10">
        <p className="font-serif text-xl tracking-tight">{business.name}</p>
        <div className="hidden items-center gap-7 text-[11px] uppercase tracking-[0.25em] text-white/80 sm:flex">
          {business.description ? (
            <a href="#sobre" className="transition hover:text-amber-300">
              Sobre
            </a>
          ) : null}
          {servicesPreview.length ? (
            <a href="#servicos" className="transition hover:text-amber-300">
              Serviços
            </a>
          ) : null}
          {publicBusiness.showTeam && business.staffMembers.length ? (
            <a href="#equipa" className="transition hover:text-amber-300">
              Equipa
            </a>
          ) : null}
        </div>
        {publicBusiness.onlineBooking ? (
          <a
            href="#booking"
            className="rounded-full bg-amber-400 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0b1020] transition hover:-translate-y-0.5 hover:bg-amber-300"
          >
            Agendar
          </a>
        ) : (
          <span className="opacity-0" aria-hidden />
        )}
      </nav>

      {/* 1. HERO — imagem full-bleed com fusão no navy + CTA âmbar */}
      <section className="relative">
        <div className="relative h-[90vh] w-full sm:h-screen">
          <div
            className="absolute inset-0 bg-[#0b1020] bg-cover bg-center"
            style={
              heroImage ? { backgroundImage: `url(${heroImage})` } : undefined
            }
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b1020]/60 via-transparent to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-b from-transparent via-[#0b1020]/85 to-[#0b1020]" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-5 pb-12 text-center sm:pb-20">
            <div className="flex w-full max-w-[640px] flex-col items-center gap-6">
              <p className="text-[10px] uppercase tracking-[0.5em] text-amber-300/90 sm:text-xs">
                Barbearia {location?.city ? `· ${location.city}` : "Premium"}
              </p>
              <h1 className="font-serif text-5xl leading-[0.95] tracking-tight sm:text-7xl">
                {business.name}
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-neutral-300 sm:text-base">
                {business.bookingPage?.headline?.trim() ||
                  business.description?.trim() ||
                  "Estilo é um reflexo da tua atitude e personalidade."}
              </p>

              <div className="mt-2 flex items-center gap-3">
                {phoneDigits ? (
                  <a
                    href={`https://wa.me/${phoneDigits}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="WhatsApp"
                    className="flex size-10 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white backdrop-blur-sm transition hover:border-amber-300 hover:bg-amber-300 hover:text-[#0b1020]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.9-1.4A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.3-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.2-4.4-3.8-4.5-4-.1-.2-1-1.3-1-2.5 0-1.2.6-1.8.9-2.1.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.7.8 1.8.1.1.1.3 0 .5l-.3.4-.4.5c-.1.1-.3.2-.1.5.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l.8-1c.2-.3.5-.2.7-.1l1.7.8c.3.2.5.3.5.5.1.2.1.9-.1 1.6z" />
                    </svg>
                  </a>
                ) : null}
                <a
                  href="#"
                  aria-label="Instagram"
                  className="flex size-10 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white backdrop-blur-sm transition hover:border-amber-300 hover:bg-amber-300 hover:text-[#0b1020]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                  </svg>
                </a>
                {business.websiteUrl ? (
                  <a
                    href={business.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Website"
                    className="flex size-10 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white backdrop-blur-sm transition hover:border-amber-300 hover:bg-amber-300 hover:text-[#0b1020]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
                    </svg>
                  </a>
                ) : null}
              </div>

              {publicBusiness.onlineBooking ? (
                <a
                  href="#booking"
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#0b1020] shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-300"
                >
                  Agendar horário
                  <MoveRight className="size-4" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* 2. SOBRE — navy, colagem + texto */}
      {business.description ? (
        <section id="sobre" className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
          <div className="grid gap-12 sm:grid-cols-2 sm:items-center sm:gap-16">
            {/* Colagem fotográfica */}
            <div className="relative h-[420px] sm:h-[520px]">
              {aboutImage ? (
                <>
                  <div
                    className="absolute right-0 top-0 h-72 w-52 rounded-3xl bg-cover bg-center shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:h-96 sm:w-72"
                    style={{ backgroundImage: `url(${aboutImage})` }}
                  />
                  <div
                    className="absolute bottom-0 left-0 h-64 w-44 rounded-3xl bg-cover bg-center shadow-2xl shadow-black/60 ring-4 ring-[#0b1020] sm:h-72 sm:w-56"
                    style={{
                      backgroundImage: `url(${aboutImage})`,
                      filter: "grayscale(0.35) brightness(0.85)",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute -left-6 top-20 size-32 rounded-full bg-amber-400/10 blur-3xl"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute bottom-16 right-8 size-24 rounded-full bg-amber-400/20 blur-2xl"
                    aria-hidden
                  />
                </>
              ) : (
                <div className="h-full w-full rounded-3xl bg-white/5 ring-1 ring-white/10" />
              )}
            </div>

            {/* Texto */}
            <div className="space-y-6">
              <p className="text-[10px] uppercase tracking-[0.5em] text-amber-300">Sobre</p>
              <h2 className="font-serif text-4xl leading-tight sm:text-5xl">
                O ofício, a paixão.
              </h2>
              <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
                {business.description}
              </p>
              {location?.city || location?.addressLine1 ? (
                <div className="border-t border-white/10 pt-5">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-amber-300">
                    Onde
                  </p>
                  <p className="mt-2 text-sm text-neutral-200">
                    {[location?.addressLine1, location?.city].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* 3. SERVIÇOS — WHITE section */}
      {servicesPreview.length ? (
        <section id="servicos" className="bg-white py-16 text-[#0b1020] sm:py-24">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mb-10 text-center sm:mb-14">
              <p className="text-[10px] uppercase tracking-[0.5em] text-amber-600">Serviços</p>
              <h2 className="mt-3 font-serif text-4xl sm:text-5xl">O que oferecemos</h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-neutral-600">
                Cortes desenhados à tua medida. Escolhe o serviço e vem ter connosco.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
              {servicesPreview.map((service) => (
                <div
                  key={service.id}
                  className="group overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/5 ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div
                    className="aspect-[4/3] w-full bg-[#0b1020] bg-cover bg-center"
                    style={
                      servicesImage
                        ? { backgroundImage: `url(${servicesImage})` }
                        : undefined
                    }
                  />
                  <div className="flex items-center justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{service.name}</p>
                      {publicBusiness.showDurations ? (
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {service.durationMinutes} min
                        </p>
                      ) : null}
                    </div>
                    {publicBusiness.showPrices ? (
                      <span className="shrink-0 rounded-full bg-[#0b1020] px-3.5 py-1.5 text-xs font-semibold text-amber-300">
                        {formatEuro(service.priceCents)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 4. EQUIPA — navy, "Equipa" vertical + cards */}
      {publicBusiness.showTeam && business.staffMembers.length ? (
        <section id="equipa" className="relative overflow-hidden py-16 sm:py-24">
          <div className="relative mx-auto flex max-w-6xl items-start gap-10 px-5">
            {/* Vertical label */}
            <p
              className="hidden shrink-0 font-serif text-7xl text-white/5 sm:block"
              style={{ writingMode: "vertical-rl" }}
              aria-hidden
            >
              Equipa
            </p>

            <div className="flex-1">
              <div className="mb-10 sm:mb-12">
                <p className="text-[10px] uppercase tracking-[0.5em] text-amber-300">
                  Equipa
                </p>
                <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Os barbeiros</h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
                {business.staffMembers.slice(0, 3).map((member) => (
                  <div
                    key={member.id}
                    className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition hover:-translate-y-1 hover:ring-amber-300/40"
                  >
                    {teamImage ? (
                      <div
                        className="aspect-[3/4] w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${teamImage})` }}
                        aria-label={member.fullName}
                      />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-white/10 via-white/5 to-transparent text-7xl font-semibold text-white/15">
                        {member.fullName.charAt(0)}
                      </div>
                    )}
                    <div className="p-5 text-center">
                      <p className="font-semibold text-amber-300">{member.fullName}</p>
                      {member.roleTitle ? (
                        <p className="mt-0.5 text-xs uppercase tracking-widest text-neutral-400">
                          {member.roleTitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* 5. UNIDADES — WHITE section */}
      {business.locations.length ? (
        <section className="bg-white py-16 text-[#0b1020] sm:py-24">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mb-10 text-center sm:mb-14">
              <p className="text-[10px] uppercase tracking-[0.5em] text-amber-600">
                Localização
              </p>
              <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Onde estamos</h2>
            </div>
            <div
              className={`mx-auto grid gap-6 ${
                business.locations.length === 1
                  ? "max-w-xl"
                  : "sm:grid-cols-2"
              }`}
            >
              {business.locations.slice(0, 4).map((loc, idx) => {
                const mapQuery = [loc.addressLine1, loc.city]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-2xl shadow-xl shadow-black/10 ring-1 ring-black/5"
                  >
                    {mapQuery ? (
                      <iframe
                        src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                        title={`Mapa de ${loc.addressLine1 ?? loc.city ?? "localização"}`}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="aspect-[4/3] w-full border-0"
                        allowFullScreen
                      />
                    ) : (
                      <div className="aspect-[4/3] w-full bg-[#0b1020]" />
                    )}
                    <div className="absolute bottom-4 left-1/2 w-[85%] -translate-x-1/2 rounded-2xl bg-[#0b1020] px-5 py-3 text-center shadow-xl">
                      <p className="text-sm font-medium text-white">
                        {loc.addressLine1 ?? loc.city ?? "Morada"}
                      </p>
                      {loc.addressLine1 && loc.city ? (
                        <p className="mt-0.5 text-[11px] uppercase tracking-[0.3em] text-amber-300">
                          {loc.city}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* 6. BOOKING — navy card com flow existente */}
      {publicBusiness.onlineBooking ? (
        <section id="booking" className="py-16 sm:py-24">
          <div className="mx-auto max-w-[680px] px-5">
            <div className="mb-10 text-center">
              <p className="text-[10px] uppercase tracking-[0.5em] text-amber-300">Reserva</p>
              <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Agendar horário</h2>
              <p className="mx-auto mt-4 max-w-md text-sm text-neutral-400">
                Escolhe serviço, barbeiro e horário. Confirmação imediata.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-[#141a2d] p-2 shadow-2xl shadow-black/50">
              <PublicBookingFlow business={publicBusiness} />
            </div>
          </div>
        </section>
      ) : null}

      {/* 7. FOOTER */}
      <footer className="border-t border-white/10 bg-[#080c18] py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 text-center">
          <p className="font-serif text-3xl">{business.name}</p>
          <div className="flex items-center gap-3">
            {phoneDigits ? (
              <a
                href={`https://wa.me/${phoneDigits}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex size-9 items-center justify-center rounded-full border border-white/15 text-neutral-400 transition hover:border-amber-300 hover:text-amber-300"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.9-1.4A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.3-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.2-4.4-3.8-4.5-4-.1-.2-1-1.3-1-2.5 0-1.2.6-1.8.9-2.1.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.7.8 1.8.1.1.1.3 0 .5l-.3.4-.4.5c-.1.1-.3.2-.1.5.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l.8-1c.2-.3.5-.2.7-.1l1.7.8c.3.2.5.3.5.5.1.2.1.9-.1 1.6z" />
                </svg>
              </a>
            ) : null}
            <a
              href="#"
              aria-label="Instagram"
              className="flex size-9 items-center justify-center rounded-full border border-white/15 text-neutral-400 transition hover:border-amber-300 hover:text-amber-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
            </a>
          </div>
          {business.contactEmail ? (
            <a
              href={`mailto:${business.contactEmail}`}
              className="text-xs text-neutral-500 transition hover:text-amber-300"
            >
              {business.contactEmail}
            </a>
          ) : null}
          <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600">
            © {new Date().getFullYear()} · {business.name} · Marcação segura
            {publicBusiness.cancellationWindowHours
              ? ` · Cancelamento até ${publicBusiness.cancellationWindowHours}h antes`
              : ""}
          </p>
          <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-700">
            Powered by BUK
          </p>
        </div>
      </footer>
    </main>
  );
}
