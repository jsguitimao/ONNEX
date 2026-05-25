import { BookingSheetProvider } from "@/components/booking-sheet";
import { PublicPageRenderer } from "@/components/public-page-renderer";
import { mockBusiness } from "@/lib/mock-business";
import { fromPublicBusiness } from "@/lib/public-page/from-public-business";

export const dynamic = "force-static";

// /mock renderiza atraves do MESMO renderer publico unico (PublicPageRenderer)
// usado em /[slug] (live) e no preview do editor — sem composicao paralela.
//
// fromPublicBusiness filtra media por extensao de ficheiro (regra de seguranca
// para URLs arbitrarios de negocios reais). Os URLs de demonstracao do mock
// (Unsplash) nao tem extensao no path, por isso o hero e a galeria sao repostos
// aqui a partir dos dados curados do mock — caso contrario desapareceriam.
export default function MockPublicPage() {
  const galleryImages = Array.from(
    new Set(mockBusiness.staffMembers.flatMap((m) => m.portfolioImages)),
  );
  const heroUrl = mockBusiness.heroImageUrl ?? mockBusiness.coverImageUrl;

  const viewModel = {
    ...fromPublicBusiness(mockBusiness),
    hero: heroUrl ? { kind: "image" as const, url: heroUrl, posterUrl: null } : null,
    galleryImages,
  };

  return (
    <BookingSheetProvider business={mockBusiness} mockMode>
      <PublicPageRenderer viewModel={viewModel} bookingMode="live" />
    </BookingSheetProvider>
  );
}
