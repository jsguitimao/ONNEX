import { db } from "@/lib/db";
import { getCurrentBusiness, replaceStaffAvailability } from "./core";
import type { AvailabilityInput, ManagementSnapshot } from "./types";

export async function getManagementSnapshot(): Promise<ManagementSnapshot> {
  const business = await getCurrentBusiness();

  return {
    businessId: business.id,
    businessName: business.name,
    slug: business.slug,
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
      isActive: member.isActive,
      serviceIds: member.services.map((assignment) => assignment.serviceId),
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
    where: { id, businessId: business.id },
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

export async function createStaffMember(input: {
  fullName: string;
  roleTitle?: string;
  bio?: string;
  serviceIds: string[];
  availability: AvailabilityInput[];
}) {
  const business = await getCurrentBusiness();
  const location = business.locations[0];

  const staffMember = await db.staffMember.create({
    data: {
      businessId: business.id,
      locationId: location?.id,
      fullName: input.fullName,
      roleTitle: input.roleTitle || null,
      bio: input.bio || null,
      displayOrder: business.staffMembers.length,
    },
  });

  if (input.serviceIds.length > 0) {
    await db.staffService.createMany({
      data: input.serviceIds.map((serviceId) => ({
        staffMemberId: staffMember.id,
        serviceId,
      })),
      skipDuplicates: true,
    });
  }

  await replaceStaffAvailability(staffMember.id, input.availability);

  return staffMember;
}

export async function updateStaffMember(
  id: string,
  input: {
    fullName: string;
    roleTitle?: string;
    bio?: string;
    isActive: boolean;
    serviceIds: string[];
    availability: AvailabilityInput[];
  }
) {
  const business = await getCurrentBusiness();
  const staffExists = await db.staffMember.findFirst({
    where: { id, businessId: business.id },
  });

  if (!staffExists) {
    throw new Error("STAFF_NOT_FOUND");
  }

  const staffMember = await db.staffMember.update({
    where: { id },
    data: {
      fullName: input.fullName,
      roleTitle: input.roleTitle || null,
      bio: input.bio || null,
      isActive: input.isActive,
    },
  });

  await db.staffService.deleteMany({
    where: { staffMemberId: id },
  });

  if (input.serviceIds.length > 0) {
    await db.staffService.createMany({
      data: input.serviceIds.map((serviceId) => ({
        staffMemberId: id,
        serviceId,
      })),
      skipDuplicates: true,
    });
  }

  await replaceStaffAvailability(id, input.availability);

  return staffMember;
}
