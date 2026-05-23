import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// A página /dashboard NÃO entra aqui: o auth.protect() do Clerk
// faz um internal rewrite para /clerk_<ts> quando não autenticado, o que cai
// no catch-all /[slug] da app e quebra o routing. As próprias pages já
// redirecionam para /sign-in no try/catch (defense at the page boundary).
//
// /api/upload TAMBÉM não pode estar aqui: o webhook `onUploadCompleted` do
// Vercel Blob faz POST de volta sem cookies de utilizador. Se for bloqueado
// pelo Clerk, o cliente `upload()` fica preso até ao timeout de 120s. A própria
// route já valida auth via `getCurrentBusiness()` em `onBeforeGenerateToken`.
const isProtectedRoute = createRouteMatcher([
  "/api/account(.*)",
  "/api/dashboard(.*)",
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
