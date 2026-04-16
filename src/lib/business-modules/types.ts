export type OnboardingDraft = {
  businessName: string;
  slug: string;
  city: string;
  phone: string;
  contactEmail: string;
  websiteUrl: string;
  description: string;
  headline: string;
  subheadline: string;
  welcomeMessage: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  coverImageUrl: string;
  heroImageUrl: string;
  aboutImageUrl: string;
  servicesImageUrl: string;
  teamImageUrl: string;
  onlineBooking: boolean;
  showTeam: boolean;
  showPrices: boolean;
  showDurations: boolean;
  bookingLeadTimeHours: number;
  bookingWindowDays: number;
  slotIntervalMinutes: number;
  cancellationWindowHours: number;
};

export type PublicBusinessPayload = {
  id: string;
  name: string;
  slug: string;
  city: string;
  phone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  description: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  heroImageUrl: string | null;
  aboutImageUrl: string | null;
  servicesImageUrl: string | null;
  teamImageUrl: string | null;
  headline: string | null;
  subheadline: string | null;
  welcomeMessage: string | null;
  onlineBooking: boolean;
  showTeam: boolean;
  showPrices: boolean;
  showDurations: boolean;
  bookingLeadTimeHours: number;
  bookingWindowDays: number;
  slotIntervalMinutes: number;
  cancellationWindowHours: number;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceCents: number;
  }>;
  staffMembers: Array<{
    id: string;
    fullName: string;
    roleTitle: string | null;
    bio: string | null;
    serviceIds: string[];
  }>;
};

export type PublicBookingDetails = {
  id: string;
  publicToken: string;
  tokenExpiresAt: Date;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  startsAt: Date;
  endsAt: Date;
  serviceId: string;
  staffMemberId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string;
  staffName: string | null;
  businessName: string;
  businessSlug: string;
  canConfirm: boolean;
  canCancel: boolean;
  canReschedule: boolean;
  cancellationWindowHours: number;
  cancellationDeadline: Date;
  bookingLeadTimeHours: number;
  bookingWindowDays: number;
};

export type BookingSlot = {
  iso: string;
  label: string;
};

export type AvailabilityInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type ManagementSnapshot = {
  businessId: string;
  businessName: string;
  slug: string;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceCents: number;
    isActive: boolean;
  }>;
  staffMembers: Array<{
    id: string;
    fullName: string;
    roleTitle: string | null;
    bio: string | null;
    isActive: boolean;
    serviceIds: string[];
    availability: AvailabilityInput[];
  }>;
};

export type BookingAgendaItem = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  source: "ONLINE" | "MANUAL" | "IMPORTED";
  serviceId: string;
  staffMemberId: string | null;
  priceCents: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  internalNotes: string | null;
  serviceName: string;
  staffName: string;
};

export type BookingAgendaSnapshot = {
  date: string;
  staffMembers: Array<{
    id: string;
    fullName: string;
  }>;
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
  }>;
  scheduleBlocks: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    reason: string | null;
    staffMemberId: string | null;
    staffName: string | null;
  }>;
  bookings: BookingAgendaItem[];
};

export type BookingAgendaWeekSnapshot = {
  weekStart: string;
  weekEnd: string;
  bookingsByDate: Record<string, BookingAgendaItem[]>;
};

export type BookingAgendaViewSnapshot = {
  agenda: BookingAgendaSnapshot;
  week: BookingAgendaWeekSnapshot;
};

export type CustomerSnapshot = {
  customers: Array<{
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    marketingOptIn: boolean;
    lastBookedAt: Date | null;
    totalBookings: number;
    totalSpentCents: number;
    lastServiceName: string | null;
  }>;
};

export type CommunicationSnapshot = {
  channels: {
    emailConfigured: boolean;
    smsConfigured: boolean;
    cronSecretConfigured: boolean;
  };
  reminderEngine: {
    latestRun: {
      id: string;
      source: "CRON" | "DASHBOARD";
      status: "SUCCESS" | "FAILED" | "UNAUTHORIZED" | "MISCONFIGURED";
      createdAt: Date;
      scanned: number;
      sent: number;
      skipped: number;
      failed: number;
      errorMessage: string | null;
    } | null;
    runs: Array<{
      id: string;
      source: "CRON" | "DASHBOARD";
      status: "SUCCESS" | "FAILED" | "UNAUTHORIZED" | "MISCONFIGURED";
      createdAt: Date;
      scanned: number;
      sent: number;
      skipped: number;
      failed: number;
      errorMessage: string | null;
    }>;
  };
  totals: {
    sentLast24h: number;
    failedLast24h: number;
    skippedLast24h: number;
  };
  notifications: Array<{
    id: string;
    createdAt: Date;
    sentAt: Date | null;
    status: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
    channel: "EMAIL" | "SMS";
    kind:
      | "BOOKING_CREATED"
      | "BOOKING_CONFIRMED"
      | "BOOKING_CANCELLED"
      | "BOOKING_CANCELLED_INTERNAL"
      | "BOOKING_RESCHEDULED"
      | "BOOKING_REMINDER";
    recipientMasked: string;
    errorMessage: string | null;
    booking: {
      id: string;
      customerName: string;
      serviceName: string;
      startsAt: Date;
    };
  }>;
};
