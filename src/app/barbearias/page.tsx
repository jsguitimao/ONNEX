import type { Metadata } from "next";
import Link from "next/link";
import { getAppUrl } from "@/lib/app-config";
import { listPublicBarbershops } from "@/lib/business-modules/public";
import { serializeJsonLd } from "@/lib/safe-json-ld";

// Diretório renderizado no servidor (indexável). Recache a cada 5 min: novas
// barbearias entram sem esperar por um novo deploy, mas sem tocar na BD a cada
// visita.
export const revalidate = 300;

const PAGE_TITLE = "Barbearias em Portugal";
const PAGE_DESCRIPTION =
  "Encontra barbearias em Portugal e marca online. Diretório de barbearias no ONNEX, com reserva direta e sem telefonemas.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/barbearias" },
  openGraph: {
    title: `${PAGE_TITLE} | ONNEX.PT`,
    description: PAGE_DESCRIPTION,
    url: `${getAppUrl()}/barbearias`,
    type: "website",
  },
};

function groupByCity(barbershops: { slug: string; name: string; city: string | null }[]) {
  const groups = new Map<string, { slug: string; name: string }[]>();
  for (const shop of barbershops) {
    const city = shop.city?.trim() || "Outras localidades";
    const bucket = groups.get(city) ?? [];
    bucket.push({ slug: shop.slug, name: shop.name });
    groups.set(city, bucket);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt"));
}

export default async function BarbershopsDirectoryPage() {
  const barbershops = await listPublicBarbershops();
  const grouped = groupByCity(barbershops);
  const appUrl = getAppUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: PAGE_TITLE,
    itemListElement: barbershops.map((shop, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${appUrl}/${shop.slug}`,
      name: shop.name,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
          <header className="flex flex-col gap-4">
            <Link href="/" className="text-sm font-semibold tracking-tight text-muted-foreground">
              ONNEX
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{PAGE_TITLE}</h1>
            <p className="max-w-xl text-base text-muted-foreground">
              Descobre barbearias em Portugal e marca online, sem telefonemas. Todas as barbearias
              aqui usam o ONNEX para gerir a agenda e receber reservas.
            </p>
          </header>

          {barbershops.length === 0 ? (
            <p className="text-muted-foreground">
              Ainda não há barbearias publicadas. Volta em breve.
            </p>
          ) : (
            <div className="flex flex-col gap-10">
              {grouped.map(([city, shops]) => (
                <section key={city} className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold">{city}</h2>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {shops.map((shop) => (
                      <li key={shop.slug}>
                        <Link
                          href={`/${shop.slug}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-foreground"
                        >
                          <span className="font-medium">{shop.name}</span>
                          <span className="text-sm text-muted-foreground">Marcar →</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <footer className="flex flex-col gap-3 border-t border-border pt-8">
            <p className="text-sm text-muted-foreground">
              Tens uma barbearia? Cria a tua página de reservas e aparece aqui.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex w-fit items-center rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
            >
              Começar grátis →
            </Link>
          </footer>
        </div>
      </main>
    </>
  );
}
