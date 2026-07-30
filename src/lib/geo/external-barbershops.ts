// Barbearias EXTERNAS (não registadas no ONNEX) para o diretório público.
//
// Fonte: OpenStreetMap via Overpass API — gratuito, sem chave, e a licença
// (ODbL) permite usar/guardar desde que se dê crédito ao OpenStreetMap. Corre
// no servidor, por isso não esbarra na CSP do browser. Estas barbearias não têm
// página no ONNEX: o consumidor abre-as no Google Maps. Servem para o diretório
// parecer completo e como isco para essas barbearias virem para o ONNEX.

import { distanceKm, type GeoPoint } from "@/lib/geo/geocode";

export type ExternalBarbershop = {
  name: string;
  city: string | null;
  distanceKm: number;
  lat: number;
  lng: number;
  mapsUrl: string;
};

type OverpassElement = {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Cache em memória por zona (lat/lng arredondados a ~1km) + parâmetros. O
// Overpass público é gratuito mas limita pedidos por IP; guardar a lista de
// cada cidade durante horas evita re-pedir a cada pesquisa e — importante —
// aguenta uma falha temporária do Overpass devolvendo a última lista boa.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

type ExternalCacheEntry = { results: ExternalBarbershop[]; at: number };
type ExternalCacheGlobal = typeof globalThis & {
  __onnexExternalBarbershopsCache?: Map<string, ExternalCacheEntry>;
};

function getCache() {
  const globalStore = globalThis as ExternalCacheGlobal;
  if (!globalStore.__onnexExternalBarbershopsCache) {
    globalStore.__onnexExternalBarbershopsCache = new Map<string, ExternalCacheEntry>();
  }
  return globalStore.__onnexExternalBarbershopsCache;
}

function buildMapsUrl(name: string, tags: Record<string, string>) {
  const parts = [
    name,
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:city"],
  ].filter(Boolean);
  const query = encodeURIComponent(parts.join(" "));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

// Procura barbearias (shop=hairdresser / shop=barber / craft=barber) num raio à
// volta da origem. radiusMeters por defeito 8 km cobre bem uma cidade.
export async function listExternalBarbershops(
  origin: GeoPoint,
  radiusMeters = 10000,
  limit = 50,
): Promise<ExternalBarbershop[]> {
  const cache = getCache();
  const cacheKey = `${origin.lat.toFixed(2)},${origin.lng.toFixed(2)}:${radiusMeters}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.results;
  }

  const query = `[out:json][timeout:20];
(
  node["shop"="hairdresser"](around:${radiusMeters},${origin.lat},${origin.lng});
  way["shop"="hairdresser"](around:${radiusMeters},${origin.lat},${origin.lng});
  node["shop"="barber"](around:${radiusMeters},${origin.lat},${origin.lng});
  way["shop"="barber"](around:${radiusMeters},${origin.lat},${origin.lng});
  node["craft"="barber"](around:${radiusMeters},${origin.lat},${origin.lng});
);
out center ${limit * 3};`;

  // Se o Overpass falhar mas tivermos uma lista antiga (mesmo expirada) para
  // esta zona, é melhor devolvê-la do que nada.
  const staleFallback = () => cached?.results ?? [];

  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "ONNEX/1.0 (https://onnex.pt)",
      },
      body: `data=${encodeURIComponent(query)}`,
      // O Overpass público é gratuito mas por vezes lento/instável. Cortamos aos
      // 8s para a pesquisa nunca ficar presa; nesse caso mostramos só ONNEX.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return staleFallback();

    const data = (await response.json()) as { elements?: OverpassElement[] };
    const elements = Array.isArray(data.elements) ? data.elements : [];

    const results: ExternalBarbershop[] = [];
    for (const element of elements) {
      const tags = element.tags ?? {};
      const name = tags.name?.trim();
      if (!name) continue; // sem nome não vale a pena mostrar

      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;
      if (typeof lat !== "number" || typeof lng !== "number") continue;

      results.push({
        name,
        city: tags["addr:city"]?.trim() || null,
        distanceKm: distanceKm(origin, { lat, lng }),
        lat,
        lng,
        mapsUrl: buildMapsUrl(name, tags),
      });
    }

    results.sort((a, b) => a.distanceKm - b.distanceKm);
    const trimmed = results.slice(0, limit);
    cache.set(cacheKey, { results: trimmed, at: Date.now() });
    return trimmed;
  } catch {
    // OSM em baixo / timeout não deve rebentar a pesquisa — devolvemos a última
    // lista boa desta zona (se houver) ou, na falta, só as barbearias ONNEX.
    return staleFallback();
  }
}
