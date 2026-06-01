import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { collectBusinessAssetUrls, deleteManagedBlobs } from "@/lib/blob-cleanup";
import { captureException, logWarning } from "@/lib/observability";

async function getCurrentAppUser() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("AUTH_REQUIRED");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return { user, clerkUserId: userId };
}

export async function exportAccountData() {
  const { user, clerkUserId } = await getCurrentAppUser();

  const businesses = await db.business.findMany({
    where: { ownerId: user.id },
    include: {
      bookingPage: true,
      locations: true,
      services: true,
      staffMembers: {
        include: {
          services: { include: { service: { select: { id: true, name: true } } } },
          availabilities: true,
        },
      },
      customers: true,
      bookings: {
        include: {
          service: { select: { id: true, name: true } },
          staffMember: { select: { id: true, fullName: true } },
        },
      },
      scheduleBlocks: true,
      subscription: true,
    },
  });

  return {
    exportedAt: new Date().toISOString(),
    clerkUserId,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    businesses,
  };
}

export async function deleteAccount() {
  const { user, clerkUserId } = await getCurrentAppUser();

  // Recolher URLs de assets no Blob ANTES da cascata apagar as rows que os
  // referenciam — caso contrario perde-se a referencia e ficam ficheiros orfaos.
  const ownedBusinesses = await db.business.findMany({
    where: { ownerId: user.id },
    select: {
      logoUrl: true,
      coverImageUrl: true,
      bookingPage: {
        select: { heroImageUrl: true, heroPosterUrl: true, galleryImages: true },
      },
      staffMembers: {
        select: { avatarUrl: true, portfolioImages: true },
      },
    },
  });
  const blobUrls = collectBusinessAssetUrls(ownedBusinesses);

  // DB cascade: User -> Businesses -> all relations (per schema onDelete: Cascade).
  // Inclui NotificationLog (businessId Cascade), cujo `payload` pode conter PII
  // do provider — logo a cascata ja remove esses logs sem cleanup extra.
  await db.user.delete({ where: { id: user.id } });

  // Blob cleanup: best-effort. Assets do Blob nao tem cascata de DB, por isso
  // apagamos explicitamente. Falhas nao bloqueiam a erasure (DB ja foi limpo).
  if (blobUrls.length > 0) {
    const cleanup = await deleteManagedBlobs(blobUrls);
    if (cleanup.failed > 0) {
      logWarning("account.delete.blob_cleanup_incomplete", {
        requested: cleanup.requested,
        deleted: cleanup.deleted,
        failed: cleanup.failed,
      });
    }
  }

  // Clerk side: best-effort. If the Clerk call fails the DB is already gone,
  // and re-signing in would just re-create a fresh user via syncCurrentUserProfile.
  try {
    const client = await clerkClient();
    await client.users.deleteUser(clerkUserId);
  } catch (error) {
    captureException("account.delete.clerk_delete_failed", error, { userId: user.id });
  }
}
