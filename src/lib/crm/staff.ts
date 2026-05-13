import { db } from "@/lib/db";

export type CrmStaffRow = {
  id: string;
  fullName: string;
  autoAcceptBookings: boolean;
  serviceIds: string[];
};

export type CrmStaffErrorCode = "STAFF_NOT_FOUND";

export class CrmStaffError extends Error {
  constructor(public code: CrmStaffErrorCode, message: string) {
    super(message);
  }
}

export async function listActiveStaff(businessId: string): Promise<CrmStaffRow[]> {
  const staff = await db.staffMember.findMany({
    where: { businessId, isActive: true, deletedAt: null },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      fullName: true,
      autoAcceptBookings: true,
      services: { select: { serviceId: true } },
    },
  });

  return staff.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    autoAcceptBookings: member.autoAcceptBookings,
    serviceIds: member.services.map((assignment) => assignment.serviceId),
  }));
}

export async function setStaffAutoAccept(
  businessId: string,
  staffId: string,
  autoAccept: boolean,
): Promise<CrmStaffRow> {
  const existing = await db.staffMember.findFirst({
    where: { id: staffId, businessId, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    throw new CrmStaffError("STAFF_NOT_FOUND", "Profissional não encontrado.");
  }

  const updated = await db.staffMember.update({
    where: { id: existing.id },
    data: { autoAcceptBookings: autoAccept },
    select: {
      id: true,
      fullName: true,
      autoAcceptBookings: true,
      services: { select: { serviceId: true } },
    },
  });

  return {
    id: updated.id,
    fullName: updated.fullName,
    autoAcceptBookings: updated.autoAcceptBookings,
    serviceIds: updated.services.map((assignment) => assignment.serviceId),
  };
}
