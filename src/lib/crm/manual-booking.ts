import { db } from "@/lib/db";
import { upsertBookingCustomer } from "@/lib/business-modules/customers";
import { assertSlotAvailable, runBookingTransaction } from "@/lib/booking-transaction";
import { sanitizeBookingCustomerInput } from "@/lib/customer-identity";
import { getSafeTimeZone, zonedTimeToUtc } from "@/lib/timezone";

export type CrmManualBookingInput = {
  serviceId: string;
  staffMemberId: string;
  dateKey: string;
  time: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  notifyClient: boolean;
};

export type CrmManualBookingResult = {
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
  staffMemberId: string;
  staffMemberName: string;
  serviceName: string;
  customerName: string;
  notifyClient: boolean;
};

export type CrmManualBookingErrorCode =
  | "SERVICE_NOT_FOUND"
  | "STAFF_NOT_FOUND"
  | "STAFF_SERVICE_MISMATCH"
  | "LOCATION_NOT_FOUND"
  | "INVALID_DATETIME"
  | "SLOT_TAKEN"
  | "SLOT_BLOCKED";

export class CrmManualBookingError extends Error {
  constructor(public code: CrmManualBookingErrorCode, message: string) {
    super(message);
  }
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function createManualBooking(
  businessId: string,
  businessTimezone: string | null | undefined,
  input: CrmManualBookingInput,
): Promise<CrmManualBookingResult> {
  if (!DATE_KEY_PATTERN.test(input.dateKey) || !TIME_PATTERN.test(input.time)) {
    throw new CrmManualBookingError("INVALID_DATETIME", "Data ou hora inválida.");
  }

  const tz = getSafeTimeZone(businessTimezone);
  const startsAt = zonedTimeToUtc(input.dateKey, `${input.time}:00`, tz);
  if (!startsAt) {
    throw new CrmManualBookingError("INVALID_DATETIME", "Data ou hora inválida.");
  }

  const [service, staffMember, location] = await Promise.all([
    db.service.findFirst({
      where: { id: input.serviceId, businessId, isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        priceCents: true,
      },
    }),
    db.staffMember.findFirst({
      where: { id: input.staffMemberId, businessId, isActive: true, deletedAt: null },
      include: { services: true },
    }),
    db.location.findFirst({
      where: { businessId, isDefault: true },
      select: { id: true },
    }),
  ]);

  if (!service) {
    throw new CrmManualBookingError("SERVICE_NOT_FOUND", "Serviço não encontrado.");
  }
  if (!staffMember) {
    throw new CrmManualBookingError("STAFF_NOT_FOUND", "Profissional não encontrado.");
  }
  if (!location) {
    throw new CrmManualBookingError("LOCATION_NOT_FOUND", "Sem localização configurada para o negócio.");
  }
  if (!staffMember.services.some((assignment) => assignment.serviceId === service.id)) {
    throw new CrmManualBookingError(
      "STAFF_SERVICE_MISMATCH",
      "O profissional escolhido não realiza este serviço.",
    );
  }

  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

  const customerInput = sanitizeBookingCustomerInput({
    fullName: input.customerName,
    email: input.customerEmail,
    phone: input.customerPhone,
  });

  const internalNotes = input.notes?.trim() || null;

  try {
    const booking = await runBookingTransaction(async (tx) => {
      await assertSlotAvailable(tx, {
        businessId,
        staffMemberId: staffMember.id,
        startsAt,
        endsAt,
      });

      const customer = await upsertBookingCustomer(
        {
          businessId,
          fullName: customerInput.fullName,
          email: customerInput.email,
          phone: customerInput.phone,
          lastBookedAt: startsAt,
        },
        tx,
      );

      return tx.booking.create({
        data: {
          businessId,
          locationId: location.id,
          serviceId: service.id,
          staffMemberId: staffMember.id,
          customerId: customer.id,
          status: "CONFIRMED",
          source: "MANUAL",
          paymentStatus: "UNPAID",
          startsAt,
          endsAt,
          priceCents: service.priceCents,
          customerName: customerInput.fullName,
          customerEmail: customerInput.email,
          customerPhone: customerInput.phone,
          internalNotes,
        },
        select: { id: true },
      });
    });

    return {
      bookingId: booking.id,
      startsAt,
      endsAt,
      staffMemberId: staffMember.id,
      staffMemberName: staffMember.fullName,
      serviceName: service.name,
      customerName: customerInput.fullName,
      notifyClient: input.notifyClient,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "HORARIO_OCUPADO") {
      throw new CrmManualBookingError("SLOT_TAKEN", "Já existe outra marcação neste horário.");
    }
    if (error instanceof Error && error.message === "HORARIO_BLOQUEADO") {
      throw new CrmManualBookingError("SLOT_BLOCKED", "Este horário está bloqueado por uma folga.");
    }
    throw error;
  }
}
