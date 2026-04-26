import { db } from "@/lib/db";
import { getCurrentBusiness, replaceStaffAvailability } from "./core";
import type { AvailabilityInput, ManagementSnapshot } from "./types";

export async function getManagementSnapshot(): Promise<ManagementSnapshot> {
  const business = await getCurrentBusiness();

  return {
    businessId: business.id,
    businessName: business.name,
    slug: business.slug,
    autoAcceptBookings: business.autoAcceptBookings,
    services: business.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      isActive: service.isActive,
    })),
    staffMembers: business.staffMembers.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      roleTitle: member.roleTitle,
      bio: member.bio,
      avatarUrl: member.avatarUrl ?? null,
      isActive: member.isActive,
      autoAcceptBookings: member.autoAcceptBookings,
      serviceIds: member.services.map((assignment) => assignment.serviceId),
      portfolioImages: Array.isArray(member.portfolioImages)
        ? (member.portfolioImages as unknown[]).filter((v): v is string => typeof v === "string")
        : [],
      availability: member.availabilities
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
        .map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
    })),
  };
}

export async function updateAutoAcceptBookings(enabled: boolean) {
  const business = await getCurrentBusiness();

  return db.business.update({
    where: { id: business.id },
    data: { autoAcceptBookings: enabled },
  });
}

export async function createService(input: {
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
}) {
  const business = await getCurrentBusiness();

  const displayOrder = business.services.length;

  return db.service.create({
    data: {
      businessId: business.id,
      name: input.name,
      description: input.description || null,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      displayOrder,
    },
  });
}

export async function updateService(
  id: string,
  input: {
    name: string;
    description?: string;
    durationMinutes: number;
    priceCents: number;
    isActive: boolean;
  }
) {
  const business = await getCurrentBusiness();
  const service = await db.service.findFirst({
    where: { id, businessId: business.id, deletedAt: null },
  });

  if (!service) {
    throw new Error("SERVICE_NOT_FOUND");
  }

  return db.service.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description || null,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      isActive: input.isActive,
    },
  });
}

export async function deleteService(id: string) {
  const business = await getCurrentBusiness();
  const service = await db.service.findFirst({
    where: { id, businessId: business.id, deletedAt: null },
  });

  if (!service) {
    throw new Error("SERVICE_NOT_FOUND");
  }

  const activeBookings = await db.booking.count({
    where: {
      serviceId: id,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  if (activeBookings > 0) {
    throw new Error("SERVICE_HAS_ACTIVE_BOOKINGS");
  }

  await db.$transaction([
    db.staffService.deleteMany({ where: { serviceId: id } }),
    db.service.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    }),
  ]);
}

export async function createStaffMember(input: {
  fullName: string;
  roleTitle?: string;
  bio?: string;
  avatarUrl?: string | null;
  serviceIds: string[];
  portfolioImages?: string[];
  availability: AvailabilityInput[];
}) {
  const business = await getCurrentBusiness();
  const location = business.locations[0];
  const validServiceIds = new Set(business.services.map((service) => service.id));
  const requestedServiceIds = Array.from(new Set(input.serviceIds));

  if (
    requestedServiceIds.length === 0 ||
    requestedServiceIds.some((serviceId) => !validServiceIds.has(serviceId))
  ) {
    throw new Error("STAFF_SERVICE_INVALID");
  }

  const staffMember = await db.staffMember.create({
    data: {
      businessId: business.id,
      locationId: location?.id,
      fullName: input.fullName,
      roleTitle: input.roleTitle || null,
      bio: input.bio || null,
      avatarUrl: input.avatarUrl || null,
      portfolioImages: input.portfolioImages ?? [],
      displayOrder: business.staffMembers.length,
    },
  });

  await db.staffService.createMany({
    data: requestedServiceIds.map((serviceId) => ({
      staffMemberId: staffMember.id,
      serviceId,
    })),
    skipDuplicates: true,
  });

  await replaceStaffAvailability(staffMember.id, input.availability);

  return staffMember;
}

export async function updateStaffMember(
  id: string,
  input: {
    fullName: string;
    roleTitle?: string;
    bio?: string;
    avatarUrl?: string | null;
    isActive: boolean;
    autoAcceptBookings?: boolean;
    serviceIds: string[];
    portfolioImages?: string[];
    availability: AvailabilityInput[];
  }
) {
  const business = await getCurrentBusiness();
  const staffExists = await db.staffMember.findFirst({
    where: { id, businessId: business.id, deletedAt: null },
  });

  if (!staffExists) {
    throw new Error("STAFF_NOT_FOUND");
  }
  const validServiceIds = new Set(business.services.map((service) => service.id));
  const requestedServiceIds = Array.from(new Set(input.serviceIds));

  if (
    requestedServiceIds.length === 0 ||
    requestedServiceIds.some((serviceId) => !validServiceIds.has(serviceId))
  ) {
    throw new Error("STAFF_SERVICE_INVALID");
  }

  const staffMember = await db.$transaction(async (tx) => {
    const updated = await tx.staffMember.update({
      where: { id },
      data: {
        fullName: input.fullName,
        roleTitle: input.roleTitle || null,
        bio: input.bio || null,
        isActive: input.isActive,
        ...(typeof input.avatarUrl !== "undefined"
          ? { avatarUrl: input.avatarUrl || null }
          : {}),
        ...(typeof input.autoAcceptBookings === "boolean"
          ? { autoAcceptBookings: input.autoAcceptBookings }
          : {}),
        ...(Array.isArray(input.portfolioImages)
          ? { portfolioImages: input.portfolioImages }
          : {}),
      },
    });

    await tx.staffService.deleteMany({
      where: { staffMemberId: id },
    });

    await tx.staffService.createMany({
      data: requestedServiceIds.map((serviceId) => ({
        staffMemberId: id,
        serviceId,
      })),
      skipDuplicates: true,
    });

    return updated;
  });

  await replaceStaffAvailability(id, input.availability);

  return staffMember;
}

export async function deleteStaffMember(id: string) {
  const business = await getCurrentBusiness();
  const member = await db.staffMember.findFirst({
    where: { id, businessId: business.id, deletedAt: null },
  });

  if (!member) {
    throw new Error("STAFF_NOT_FOUND");
  }

  const activeBookings = await db.booking.count({
    where: {
      staffMemberId: id,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  if (activeBookings > 0) {
    throw new Error("STAFF_HAS_ACTIVE_BOOKINGS");
  }

  await db.$transaction([
    db.weeklyAvailability.deleteMany({ where: { staffMemberId: id } }),
    db.staffService.deleteMany({ where: { staffMemberId: id } }),
    db.scheduleBlock.deleteMany({ where: { staffMemberId: id } }),
    db.staffMember.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    }),
  ]);
}
