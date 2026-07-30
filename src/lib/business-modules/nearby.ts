// Diretório público "barbearias perto de ti".
//
// Junta duas fontes, ordenadas pela distância à origem (a localização que o
// consumidor escreveu):
//   1. Barbearias ONNEX — listáveis pela MESMA regra do sitemap (ACTIVE + acesso
//      ativo). Estas têm página de reservas no ONNEX (/[slug]).
//   2. Barbearias EXTERNAS — do OpenStreetMap; não estão no ONNEX, abrem no
//      Google Maps. Fazem o diretório parecer completo e servem de isco.

import { db } from "@/lib/db";
import { hasActiveAccess } from "@/lib/subscription-access";
import { distanceKm, geocodeAddress, type GeoPoint } from "@/lib/geo/geocode";
import { listExternalBarbershops } from "@/lib/geo/external-barbershops";
import { deriveBusinessAddress } from "./derive-address";

export type NearbyResult =
  | {
      source: "onnex";
      slug: string;
      name: string;
      city: string | null;
      distanceKm: number;
    }
  | {
      source: "external";
      name: string;
      city: string | null;
      distanceKm: number;
      mapsUrl: string;
    };

type OnnexNearby = {
  slug: string;
  name: string;
  city: string | null;
  distanceKm: number;
  point: GeoPoint;
};

type ListedBusiness = {
  slug: string;
  name: string;
  bookingPage: { mapsAddress: string | null } | null;
  locations: {
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    postalCode: string | null;
    countryCode: string | null;
  }[];
  subscription: {
    status: string;
    providerCustomerId: string | null;
    currentPeriodEnd: Date | null;
  } | null;
};

// Distância abaixo da qual assumimos que uma barbearia externa (OSM) é a mesma
// que uma ONNEX e a escondemos para não duplicar.
const DEDUPE_KM = 0.15;

async function listOnnexNearby(origin: GeoPoint): Promise<OnnexNearby[]> {
  const businesses: ListedBusiness[] = await db.business.findMany({
    where: { status: "ACTIVE" },
    select: {
      slug: true,
      name: true,
      bookingPage: { select: { mapsAddress: true } },
      locations: {
        where: { isDefault: true },
        take: 1,
        select: {
          addressLine1: true,
          addressLine2: true,
          city: true,
          postalCode: true,
          countryCode: true,
        },
      },
      subscription: {
        select: { status: true, providerCustomerId: true, currentPeriodEnd: true },
      },
    },
  });

  const listed = businesses.filter((business) => hasActiveAccess(business.subscription));

  const results: OnnexNearby[] = [];
  for (const business of listed) {
    const address = deriveBusinessAddress(business);
    if (!address) continue;

    const point = await geocodeAddress(address);
    if (!point) continue;

    results.push({
      slug: business.slug,
      name: business.name,
      city: business.locations[0]?.city ?? null,
      distanceKm: distanceKm(origin, point),
      point,
    });
  }

  return results;
}

// Devolve barbearias ONNEX + externas, sem duplicados, ordenadas por distância.
export async function searchBarbershopsNearby(origin: GeoPoint): Promise<NearbyResult[]> {
  const [onnex, external] = await Promise.all([
    listOnnexNearby(origin),
    listExternalBarbershops(origin),
  ]);

  // Esconde externas que coincidem (por proximidade) com uma barbearia ONNEX.
  const dedupedExternal = external.filter(
    (ext) =>
      !onnex.some((shop) => distanceKm(shop.point, { lat: ext.lat, lng: ext.lng }) < DEDUPE_KM),
  );

  const results: NearbyResult[] = [
    ...onnex.map(
      (shop): NearbyResult => ({
        source: "onnex",
        slug: shop.slug,
        name: shop.name,
        city: shop.city,
        distanceKm: shop.distanceKm,
      }),
    ),
    ...dedupedExternal.map(
      (ext): NearbyResult => ({
        source: "external",
        name: ext.name,
        city: ext.city,
        distanceKm: ext.distanceKm,
        mapsUrl: ext.mapsUrl,
      }),
    ),
  ];

  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results;
}
