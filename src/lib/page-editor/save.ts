import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ValidatedDraft } from "@/lib/page-editor/schema";

export class PageEditorError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export async function saveEditorDraft(
  businessId: string,
  draft: ValidatedDraft,
): Promise<void> {
  const incomingServiceIds = new Set(
    draft.services.map((s) => s.id).filter((id) => isPersistedId(id)),
  );
  const incomingStaffIds = new Set(
    draft.staffMembers.map((s) => s.id).filter((id) => isPersistedId(id)),
  );

  await db.$transaction(async (tx) => {
    // 1) Slug uniqueness (excepto self).
    const slugConflict = await tx.business.findFirst({
      where: { slug: draft.slug, NOT: { id: businessId } },
      select: { id: true },
    });
    if (slugConflict) {
      throw new PageEditorError("SLUG_TAKEN", "Slug já está em uso");
    }

    // 2) Verifica que ids enviados (não-novos) pertencem mesmo a este business.
    if (incomingServiceIds.size > 0) {
      const owned = await tx.service.findMany({
        where: { businessId, id: { in: [...incomingServiceIds] } },
        select: { id: true },
      });
      const ownedSet = new Set(owned.map((o) => o.id));
      for (const id of incomingServiceIds) {
        if (!ownedSet.has(id)) {
          throw new PageEditorError(
            "FORBIDDEN_SERVICE_ID",
            `Serviço ${id} não pertence a este negócio`,
          );
        }
      }
    }
    if (incomingStaffIds.size > 0) {
      const owned = await tx.staffMember.findMany({
        where: { businessId, id: { in: [...incomingStaffIds] } },
        select: { id: true },
      });
      const ownedSet = new Set(owned.map((o) => o.id));
      for (const id of incomingStaffIds) {
        if (!ownedSet.has(id)) {
          throw new PageEditorError(
            "FORBIDDEN_STAFF_ID",
            `Membro ${id} não pertence a este negócio`,
          );
        }
      }
    }

    // 3) Update Business (campos top-level).
    await tx.business.update({
      where: { id: businessId },
      data: {
        name: draft.name,
        slug: draft.slug,
        description: nullableString(draft.description),
        contactPhone: nullableString(draft.phone),
        instagramUrl: nullableString(draft.instagramUrl),
        tiktokUrl: nullableString(draft.tiktokUrl),
        facebookUrl: nullableString(draft.facebookUrl),
      },
    });

    // 3b) Update Location.city no default location.
    const defaultLocation = await tx.location.findFirst({
      where: { businessId, isDefault: true },
      select: { id: true },
    });
    if (defaultLocation) {
      await tx.location.update({
        where: { id: defaultLocation.id },
        data: { city: nullableString(draft.city) },
      });
    }

    // 4) Upsert BookingPage.
    await tx.bookingPage.upsert({
      where: { businessId },
      create: {
        businessId,
        headline: nullableString(draft.headline),
        heroImageUrl: draft.hero?.url ?? null,
        heroPosterUrl: draft.hero?.posterUrl ?? null,
        heroMediaKind: draft.hero?.kind ?? null,
        seoTitle: nullableString(draft.seoTitle),
        seoDescription: nullableString(draft.seoDescription),
        mapsAddress: nullableString(draft.mapsAddress),
        whatsappEnabled: draft.whatsappEnabled,
        galleryImages: draft.galleryImages as Prisma.InputJsonValue,
      },
      update: {
        headline: nullableString(draft.headline),
        heroImageUrl: draft.hero?.url ?? null,
        heroPosterUrl: draft.hero?.posterUrl ?? null,
        heroMediaKind: draft.hero?.kind ?? null,
        seoTitle: nullableString(draft.seoTitle),
        seoDescription: nullableString(draft.seoDescription),
        mapsAddress: nullableString(draft.mapsAddress),
        whatsappEnabled: draft.whatsappEnabled,
        galleryImages: draft.galleryImages as Prisma.InputJsonValue,
      },
    });

    // 5) Sync services (diff por id).
    const existingServices = await tx.service.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true },
    });
    const existingServiceIds = new Set(existingServices.map((s) => s.id));
    const toSoftDeleteServices = [...existingServiceIds].filter(
      (id) => !incomingServiceIds.has(id),
    );
    if (toSoftDeleteServices.length > 0) {
      await tx.service.updateMany({
        where: { businessId, id: { in: toSoftDeleteServices } },
        data: { deletedAt: new Date(), isActive: false },
      });
    }
    for (let i = 0; i < draft.services.length; i += 1) {
      const s = draft.services[i];
      if (isPersistedId(s.id)) {
        await tx.service.update({
          where: { id: s.id },
          data: {
            name: s.name,
            description: s.description,
            durationMinutes: s.durationMinutes,
            priceCents: s.priceCents,
            displayOrder: i,
            isActive: true,
            deletedAt: null,
          },
        });
      } else {
        await tx.service.create({
          data: {
            businessId,
            name: s.name,
            description: s.description,
            durationMinutes: s.durationMinutes,
            priceCents: s.priceCents,
            displayOrder: i,
          },
        });
      }
    }

    // 6) Sync staff (diff por id).
    const existingStaff = await tx.staffMember.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true },
    });
    const existingStaffIds = new Set(existingStaff.map((s) => s.id));
    const toSoftDeleteStaff = [...existingStaffIds].filter(
      (id) => !incomingStaffIds.has(id),
    );
    if (toSoftDeleteStaff.length > 0) {
      await tx.staffMember.updateMany({
        where: { businessId, id: { in: toSoftDeleteStaff } },
        data: { deletedAt: new Date(), isActive: false },
      });
    }
    // Mapa: id-cliente → id-DB para resolver os assignments depois.
    const staffIdResolution = new Map<string, string>();
    for (let i = 0; i < draft.staffMembers.length; i += 1) {
      const m = draft.staffMembers[i];
      const portfolio = m.portfolioImages as Prisma.InputJsonValue;
      if (isPersistedId(m.id)) {
        await tx.staffMember.update({
          where: { id: m.id },
          data: {
            fullName: m.fullName,
            roleTitle: m.roleTitle,
            bio: m.bio,
            avatarUrl: m.avatarUrl,
            portfolioImages: portfolio,
            displayOrder: i,
            isActive: true,
            deletedAt: null,
          },
        });
        staffIdResolution.set(m.id, m.id);
      } else {
        const created = await tx.staffMember.create({
          data: {
            businessId,
            fullName: m.fullName,
            roleTitle: m.roleTitle,
            bio: m.bio,
            avatarUrl: m.avatarUrl,
            portfolioImages: portfolio,
            displayOrder: i,
          },
          select: { id: true },
        });
        staffIdResolution.set(m.id, created.id);
      }
    }

    // 7) Sync StaffService (assignments).
    // Para cada staff, substitui o conjunto de serviços atribuídos.
    for (const m of draft.staffMembers) {
      const dbStaffId = staffIdResolution.get(m.id);
      if (!dbStaffId) continue;

      // Resolve serviceIds: novos serviços ainda têm UUID v4 (cliente),
      // ignoramos esses (não dá para fazer assignment a serviço inexistente).
      // Após save, draft é recarregado com cuids reais.
      const persistedServiceIds = m.serviceIds.filter(isPersistedId);

      await tx.staffService.deleteMany({
        where: { staffMemberId: dbStaffId },
      });
      if (persistedServiceIds.length > 0) {
        await tx.staffService.createMany({
          data: persistedServiceIds.map((serviceId) => ({
            staffMemberId: dbStaffId,
            serviceId,
          })),
          skipDuplicates: true,
        });
      }
    }
  });
}

function nullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// IDs gerados pelo cliente (crypto.randomUUID) são novos.
// IDs do Prisma usam cuid (formato c…). Aceitamos ambos os formatos como persistidos
// se forem strings de ≥ 20 chars não vazias e não-uuid v4.
function isPersistedId(id: string): boolean {
  if (!id) return false;
  // UUID v4 = 36 chars com hífenes. Cuid = ~25 chars, sem hífenes.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return false;
  }
  return id.length >= 20;
}
