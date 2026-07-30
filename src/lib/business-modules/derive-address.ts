// Deriva a morada legível de uma barbearia: prioriza o texto livre que o dono
// escreve no editor (bookingPage.mapsAddress) e, na falta dele, monta a morada
// a partir do registo estruturado de localização. Usado pela página pública
// (getPublicBusinessPayload) e pelo diretório "barbearias perto de ti", que
// TÊM de concordar na morada mostrada.
type AddressSource = {
  bookingPage: { mapsAddress: string | null } | null;
  locations: {
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    postalCode: string | null;
    countryCode: string | null;
  }[];
};

export function deriveBusinessAddress(business: AddressSource): string | null {
  const mapsAddress = business.bookingPage?.mapsAddress?.trim();
  if (mapsAddress) return mapsAddress;

  const location = business.locations[0];
  if (!location) return null;

  const derived = [
    location.addressLine1,
    location.addressLine2,
    [location.postalCode, location.city].filter(Boolean).join(" "),
    location.countryCode,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ");

  return derived || null;
}
