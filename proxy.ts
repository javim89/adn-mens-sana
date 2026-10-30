import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Las rutas de cron no llevan sesión de Clerk: las invoca una scheduled function
// de Netlify y se autentican con CRON_SECRET en el propio route handler.
// "/" es la landing pública y va EXACTA: "/(.*)" abriría el sitio entero.
// El login con la marca de cada club (/c/<slug>/sign-in) y su logo e íconos son
// públicos: se ven antes de iniciar sesión.
export const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/c/:slug/sign-in(.*)",
  "/c/:slug/sign-up(.*)",
  "/api/clubes/:slug/logo",
  "/api/clubes/:slug/icono",
  "/api/cron/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
