import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { HEADER_CLUB_SLUG, HEADER_RUTA, slugDesdeHost, urlDelClub } from "@/lib/tenant/host";

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

export type RuteoPorHost =
  | { tipo: "redirect"; url: string }
  | { tipo: "seguir"; headers: Headers; rewrite: URL | null };

/**
 * Lo que el host le hace a la request, antes del guard de sesión:
 * - Siempre se pisan los headers internos (`x-club-slug`, `x-bt-ruta`): el cliente
 *   no los puede inyectar. Sin club en el host, `x-club-slug` no llega.
 * - En `<slug>.<raíz>`, `/sign-in*` y `/sign-up*` se reescriben al login del club
 *   (`/c/<slug>/...`), `/` va a `/dashboard` y `/c/<otro>/...` se manda al
 *   subdominio de ese otro club.
 */
export function ruteoPorHost(request: NextRequest): RuteoPorHost {
  const { pathname, search } = request.nextUrl;
  const slug = slugDesdeHost(request.headers.get("host"));

  const headers = new Headers(request.headers);
  headers.delete(HEADER_CLUB_SLUG);
  // Sin `_rsc` (el cache-buster de las requests RSC): es la ruta que ve el usuario.
  const query = new URLSearchParams(search);
  query.delete("_rsc");
  const qs = query.toString();
  headers.set(HEADER_RUTA, `${pathname}${qs ? `?${qs}` : ""}`);
  if (!slug) return { tipo: "seguir", headers, rewrite: null };

  headers.set(HEADER_CLUB_SLUG, slug);

  // La landing es de BioTeam: en el subdominio de un club, `/` es la app (y sin sesión,
  // el guard manda al login del club). Es también adonde vuelve el logout de Clerk.
  if (pathname === "/") return { tipo: "redirect", url: new URL(`/dashboard${search}`, request.url).toString() };

  const otro = /^\/c\/([^/]+)(\/.*)?$/.exec(pathname);
  if (otro && otro[1] !== slug) {
    const url = urlDelClub(otro[1], `${otro[2] ?? "/"}${search}`);
    if (url) return { tipo: "redirect", url };
  }

  if (/^\/sign-(in|up)(\/|$)/.test(pathname)) {
    const rewrite = request.nextUrl.clone();
    rewrite.pathname = `/c/${slug}${pathname}`;
    return { tipo: "seguir", headers, rewrite };
  }
  return { tipo: "seguir", headers, rewrite: null };
}

export default clerkMiddleware(async (auth, request) => {
  const ruteo = ruteoPorHost(request);
  if (ruteo.tipo === "redirect") return NextResponse.redirect(ruteo.url);

  if (!isPublicRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  // `request.headers` (no `headers`): así llegan al render y no vuelven al cliente.
  // Clerk suma los suyos a los mismos `x-middleware-request-*`.
  const opciones = { request: { headers: ruteo.headers } };
  return ruteo.rewrite ? NextResponse.rewrite(ruteo.rewrite, opciones) : NextResponse.next(opciones);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
