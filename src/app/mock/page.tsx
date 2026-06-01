import { BookingSheetProvider } from "@/components/booking-sheet";
import { PublicPageRenderer } from "@/components/public-page-renderer";
import { mockBusiness } from "@/lib/mock-business";
import { fromPublicBusiness } from "@/lib/public-page/from-public-business";

export const dynamic = "force-static";

export default function MockPublicPage() {
  return (
    <BookingSheetProvider business={mockBusiness} mockMode>
      <PublicPageRenderer
        viewModel={fromPublicBusiness(mockBusiness)}
      />
    </BookingSheetProvider>
  );
}
