import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { BookingManageCard } from "@/components/booking-manage-card";
import { buttonVariants } from "@/components/ui/button";
import { getPublicBookingByToken } from "@/lib/business";

type RouteProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export default async function BookingManagePage({ params }: RouteProps) {
  const { token } = await params;
  const booking = await getPublicBookingByToken(token);

  if (!booking) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12">
      <Link href={`/${booking.businessSlug}`} className={buttonVariants({ variant: "ghost", className: "mb-6 w-fit gap-2" })}>
        <ArrowLeft className="size-4" />
        Voltar para a página pública
      </Link>

      <BookingManageCard initialBooking={booking} />
    </main>
  );
}
