// Geocoding leve para o diretório público "barbearias perto de ti".
//
// Converte texto de morada ("Rua da Misericórdia 50, Lisboa") em coordenadas
// via Nominatim (OpenStreetMap) — gratuito, sem chave. Corre SEMPRE no servidor
// (route handler), por isso não esbarra na CSP nem no Permissions-Policy do
// browser. A política de uso do Nominatim pede User-Agent identificável e
// volume baixo; guardamos os resultados numa cache em memória por isolate para
// não repetir pedidos da mesma morada a cada pesquisa.

export type GeoPoint = { lat: number; lng: number };

type GeoCacheGlobal = typeof globalThis & {
  __onnexGeocodeCache?: Map<string, GeoPoint | null>;
};

function getCache() {
  const globalStore = globalThis as GeoCacheGlobal;
  if (!globalStore.__onnexGeocodeCache) {
    globalStore.__onnexGeocodeCache = new Map<string, GeoPoint | null>();
  }
  return globalStore.__onnexGeocodeCache;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const cache = getCache();
  if (cache.has(normalized)) {
    return cache.get(normalized) ?? null;
  }

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    // As barbearias e os turistas que as procuram estão em Portugal; restringir
    // ao país melhora bastante a precisão de moradas curtas ("Lisboa").
    url.searchParams.set("countrycodes", "pt");
    url.searchParams.set("q", query);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "ONNEX/1.0 (https://onnex.pt)",
        "Accept-Language": "pt-PT",
      },
    });

    if (!response.ok) {
      cache.set(normalized, null);
      return null;
    }

    const data: unknown = await response.json();
    const first = Array.isArray(data) ? (data[0] as { lat?: string; lon?: string }) : null;
    if (!first || first.lat === undefined || first.lon === undefined) {
      cache.set(normalized, null);
      return null;
    }

    const point: GeoPoint = { lat: Number.parseFloat(first.lat), lng: Number.parseFloat(first.lon) };
    if (Number.isNaN(point.lat) || Number.isNaN(point.lng)) {
      cache.set(normalized, null);
      return null;
    }

    cache.set(normalized, point);
    return point;
  } catch {
    // Falha de rede/serviço não deve rebentar a pesquisa; tratamos como
    // "sem coordenadas" e seguimos.
    cache.set(normalized, null);
    return null;
  }
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

// Distância em linha reta (Haversine) entre dois pontos, em quilómetros.
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}
