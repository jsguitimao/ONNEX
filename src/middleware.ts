import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/api/dashboard(.*)",
  "/api/onboarding(.*)",
  "/api/upload(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isProtectedRoute(request)) return;

  const { userId } = await auth();
  if (userId) return;

  const isApi = request.nextUrl.pathname.startsWith("/api/");
  if (isApi) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("redirect_url", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: [
    // Skip Next internals and static files unless in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
