import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Páginas /dashboard e /onboarding NÃO entram aqui: o auth.protect() do Clerk
// faz um internal rewrite para /clerk_<ts> quando não autenticado, o que cai
// no catch-all /[slug] da app e quebra o routing. As próprias pages já
// redirecionam para /sign-in no try/catch (defense at the page boundary).
const isProtectedRoute = createRouteMatcher([
  "/api/dashboard(.*)",
  "/api/onboarding(.*)",
  "/api/upload(.*)",
  "/api/account(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
