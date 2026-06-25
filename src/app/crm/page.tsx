import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CrmWorkspace } from "@/components/crm/crm-workspace";
import { getCurrentBusiness } from "@/lib/business-modules/core";
import {
  computeCustomerKpis,
  listCustomers,
  toCrmCustomerRowDto,
} from "@/lib/crm/customers";
import { listActiveStaff } from "@/lib/crm/staff";
import {
  listDailyBookings,
  listPendingBookings,
  listWeeklyBookings,
  toCrmBookingRowDto,
  toCrmPendingBookingDto,
} from "@/lib/crm/bookings";
import { listWeeklyAvailabilityForStaffIds } from "@/lib/crm/availability";
import {
  listScheduleBlocks,
  toCrmScheduleBlockRowDto,
} from "@/lib/crm/schedule-blocks";
import { computeFinancialSummary } from "@/lib/crm/finance";
import { loadEditorDraft } from "@/lib/page-editor/load";
import { captureException } from "@/lib/observability";

export const metadata = {
  title: "CRM",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/crm");
  }

  let business;
  try {
    business = await getCurrentBusiness();
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      redirect("/sign-in?redirect_url=/crm");
    }
    captureException("crm.page.load_business_failed", error, { userId });
    throw error;
  }

  const [
    customers,
    customerKpis,
    staff,
    pendingBookings,
    weeklyBookings,
    dailyBookings,
    scheduleBlocks,
    financialSummary,
    editorDraft,
  ] = await Promise.all([
    listCustomers(business.id),
    computeCustomerKpis(business.id),
    listActiveStaff(business.id),
    listPendingBookings(business.id),
    listWeeklyBookings(business.id, { timezone: business.timezone }),
    listDailyBookings(business.id, { timezone: business.timezone }),
    listScheduleBlocks(business.id),
    computeFinancialSummary(business.id, {
      period: "semanal",
      staffMemberId: null,
      timezone: business.timezone,
    }),
    loadEditorDraft(),
  ]);

  const availabilityByStaff = await listWeeklyAvailabilityForStaffIds(
    business.id,
    staff.map((member) => member.id),
  );

  const services = business.services.map((service) => ({
    id: service.id,
    name: service.name,
    durationMinutes: service.durationMinutes,
    priceCents: service.priceCents,
  }));

  return (
    <CrmWorkspace
      customers={customers.map(toCrmCustomerRowDto)}
      customerKpis={customerKpis}
      staff={staff}
      businessAutoAccept={business.autoAcceptBookings}
      pendingBookings={pendingBookings.map(toCrmPendingBookingDto)}
      weeklyBookings={weeklyBookings.map(toCrmBookingRowDto)}
      dailyBookings={dailyBookings.map(toCrmBookingRowDto)}
      businessTimezone={business.timezone}
      availabilityByStaff={availabilityByStaff}
      scheduleBlocks={scheduleBlocks.map(toCrmScheduleBlockRowDto)}
      initialFinancialSummary={financialSummary}
      services={services}
      editorDraft={editorDraft}
    />
  );
}
