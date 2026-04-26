type Props = {
  address: string;
};

const buttonClassName =
  "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.02] text-sm font-medium text-[#fafafa] transition hover:border-white/[0.24] hover:bg-white/[0.06] active:bg-white/[0.1]";

export function BioMapsActions({ address }: Props) {
  const encoded = encodeURIComponent(address);
  const wazeUrl = `https://waze.com/ul?q=${encoded}&navigate=yes`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-xs leading-relaxed text-[#a1a1aa]">{address}</p>
      <div className="flex w-full gap-2">
        <a
          href={wazeUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Abrir morada no Waze: ${address}`}
          className={buttonClassName}
        >
          <WazeIcon />
          Abrir com Waze
        </a>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Abrir morada no Google Maps: ${address}`}
          className={buttonClassName}
        >
          <GoogleMapsIcon />
          Abrir no Maps
        </a>
      </div>
    </div>
  );
}

function WazeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

function GoogleMapsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
