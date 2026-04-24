import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function maskEnv(value: string | undefined) {
  if (!value) return null;
  if (value.length <= 8) return "set";
  return `${value.slice(0, 4)}…${value.slice(-4)} (len ${value.length})`;
}

async function check<T>(name: string, fn: () => Promise<T>) {
  try {
    const result = await fn();
    return { name, ok: true as const, result };
  } catch (error) {
    return {
      name,
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split("\n").slice(0, 6).join("\n") : undefined,
    };
  }
}

export async function GET() {
  const env = {
    DATABASE_URL: maskEnv(process.env.DATABASE_URL),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: maskEnv(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    CLERK_SECRET_KEY: maskEnv(process.env.CLERK_SECRET_KEY),
    CLERK_WEBHOOK_SECRET: maskEnv(process.env.CLERK_WEBHOOK_SECRET),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
    VERCEL_URL: process.env.VERCEL_URL ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
  };

  const checks = await Promise.all([
    check("db.raw_select_1", async () => {
      await db.$queryRaw`SELECT 1 as ok`;
      return "ok";
    }),
    check("db.count_business", async () => {
      return await db.business.count();
    }),
    check("db.count_booking_page", async () => {
      return await db.bookingPage.count();
    }),
    check("db.count_staff", async () => {
      return await db.staffMember.count();
    }),
    check("db.read_booking_page_columns", async () => {
      const page = await db.bookingPage.findFirst({
        select: { id: true, theme: true },
      });
      return { exists: Boolean(page), themePresent: page ? "column readable" : "no rows" };
    }),
    check("db.read_staff_columns", async () => {
      const staff = await db.staffMember.findFirst({
        select: { id: true, portfolioImages: true, avatarUrl: true },
      });
      return {
        exists: Boolean(staff),
        portfolioPresent: staff ? "column readable" : "no rows",
      };
    }),
    check("clerk.auth", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const result = await auth();
      return { userId: result.userId ?? null };
    }),
  ]);

  const overall = checks.every((c) => c.ok) ? "ok" : "failing";

  return NextResponse.json(
    {
      overall,
      env,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
