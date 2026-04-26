import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

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

  // DB cascade: User -> Businesses -> all relations (per schema onDelete: Cascade)
  await db.user.delete({ where: { id: user.id } });

  // Clerk side: best-effort. If the Clerk call fails the DB is already gone,
  // and re-signing in would just re-create a fresh user via syncCurrentUserProfile.
  try {
    const client = await clerkClient();
    await client.users.deleteUser(clerkUserId);
  } catch (error) {
    console.error("[account.delete] clerk_delete_failed", error);
  }
}
