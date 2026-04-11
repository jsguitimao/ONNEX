import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, Phone, Sparkles, UserRound } from "lucide-react";
import { getBusinessBySlug, getPublicBusinessPayload } from "@/lib/business";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PublicBookingFlow } from "@/components/public-booking-flow";

export const dynamic = "force-dynamic";

type PublicPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicBookingPage({ params }: PublicPageProps) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  const publicBusiness = await getPublicBusinessPayload(slug);

  if (!business || !publicBusiness) {
    notFound();
  }

  const location = business.locations[0];
  const primaryColor = business.primaryColor ?? "#1570ef";
  const accentColor = business.accentColor ?? "#0f9f7a";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,_var(--color-primary)_16%,_transparent),_transparent_50%)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <section className="overflow-hidden rounded-[2rem] border bg-card shadow-xl shadow-black/5">
          <div
            className="px-6 pb-8 pt-10 text-center text-primary-foreground"
            style={{
              background: `linear-gradient(180deg, ${primaryColor} 0%, ${accentColor} 100%)`,
            }}
          >
            <div className="mx-auto flex size-24 items-center justify-center rounded-[1.75rem] border border-white/20 bg-white/12 text-3xl font-semibold shadow-lg shadow-black/10">
              {business.name.charAt(0)}
            </div>
            <Badge className="mt-5 border-white/20 bg-white/12 text-white hover:bg-white/12">
              Link público
            </Badge>
            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight">{business.name}</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/82">{business.bookingPage?.headline}</p>

            <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm text-white/84">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5">
                <MapPin className="size-4" />
                {location?.city ?? "Portugal"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5">
                <UserRound className="size-4" />
                {business.staffMembers.length} profissionais
              </span>
              {business.contactPhone ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5">
                  <Phone className="size-4" />
                  {business.contactPhone}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:p-5">
            <Link
              href="#booking"
              className={buttonVariants({
                size: "lg",
                className: "h-12 w-full justify-between rounded-2xl px-5",
              })}
            >
              Reservar agora
              <ArrowRight className="size-4" />
            </Link>
            <a
              href={`https://wa.me/${(business.contactPhone ?? "").replace(/\D/g, "")}`}
              className={buttonVariants({
                size: "lg",
                variant: "outline",
                className: "h-12 w-full justify-between rounded-2xl px-5",
              })}
            >
              Falar no WhatsApp
              <ArrowRight className="size-4" />
            </a>
          </div>
        </section>

        <section className="rounded-[2rem] border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Sobre a experiência</h2>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">{business.bookingPage?.subheadline}</p>
          <div className="mt-4 rounded-2xl bg-muted/60 p-4 text-sm leading-7 text-foreground">
            {business.bookingPage?.welcomeMessage}
          </div>
        </section>

        <PublicBookingFlow business={publicBusiness} />

        <section className="rounded-[2rem] border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Profissionais</p>
            <h2 className="font-heading text-2xl font-semibold">Escolhe com quem marcar</h2>
          </div>

          <div className="grid gap-3">
            {business.staffMembers.map((member) => (
              <div key={member.id} className="rounded-[1.5rem] border bg-background p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div
                      className="flex size-12 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
                    >
                      {member.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{member.fullName}</p>
                      <p className="text-sm text-muted-foreground">{member.roleTitle}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{member.bio}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                    Disponível
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border bg-card p-5 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Próximo passo do produto</p>
          <h2 className="mt-2 font-heading text-2xl font-semibold">
            Ligar disponibilidade real e confirmação de booking
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            O visual público agora está mais próximo de um link bio premium. A próxima etapa é
            transformar estes blocos em interações reais de marcação.
          </p>
        </section>
      </div>
    </main>
  );
}
