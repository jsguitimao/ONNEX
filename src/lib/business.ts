export type {
  AvailabilityInput,
  BookingAgendaItem,
  BookingAgendaSnapshot,
  BookingAgendaViewSnapshot,
  BookingAgendaWeekSnapshot,
  BookingSlot,
  CommunicationSnapshot,
  CustomerSnapshot,
  ManagementSnapshot,
  OnboardingDraft,
  PublicBookingDetails,
  PublicBusinessPayload,
} from "@/lib/business-modules/types";

export { ensureDemoBusiness, getBusinessBySlug } from "@/lib/business-modules/core";
export { getBusinessForOnboarding, updateBusinessFromOnboarding } from "@/lib/business-modules/onboarding";
export {
  createPublicBooking,
  getAvailableSlots,
  getPublicBookingByToken,
  getPublicBookingRescheduleSlots,
  getPublicBusinessPayload,
  reschedulePublicBookingByToken,
  updatePublicBookingByToken,
} from "@/lib/business-modules/public";
export {
  createManualBooking,
  createScheduleBlock,
  getCommunicationSnapshot,
  deleteScheduleBlock,
  getBookingAgenda,
  getBookingAgendaView,
  getBookingAgendaWeek,
  getDashboardSnapshot,
  retryCommunicationNotification,
  updateBookingStatus,
  updateDashboardBooking,
} from "@/lib/business-modules/dashboard";
export {
  createService,
  createStaffMember,
  getManagementSnapshot,
  updateService,
  updateStaffMember,
} from "@/lib/business-modules/management";
export { getCustomersSnapshot, updateCustomer } from "@/lib/business-modules/customers";
