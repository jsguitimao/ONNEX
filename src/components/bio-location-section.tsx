import { BioSection } from "@/components/bio-section";
import { BioMapsActions } from "@/components/bio-maps-actions";

type Props = {
  address: string;
};

export function BioLocationSection({ address }: Props) {
  const encoded = encodeURIComponent(address);

  return (
    <BioSection id="onde-estamos" title="Onde estamos">
      <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#1a1a1d]">
        <iframe
          title={`Mapa de ${address}`}
          src={`https://www.google.com/maps?q=${encoded}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="aspect-[5/3] w-full border-0"
          style={{ colorScheme: "dark" }}
        />
      </div>
      <BioMapsActions address={address} />
    </BioSection>
  );
}
