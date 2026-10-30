/**
 * Logo de un club, público (login del club, sidebar, íconos). Sin sesión: el logo
 * no es un dato privado y `proxy.ts` deja pasar esta ruta.
 *
 * El bucket es privado, así que el PNG se lee de S3 y se re-sirve en streaming.
 */

import type { NextRequest } from 'next/server';
import { getBrandingPublico } from '@/lib/tenant/clubes';
import { cacheParaVersion, headersDeImagen, respuestaNoEncontrado } from '@/lib/branding/respuesta-imagen';
import { keyLogoEsDelClub, leerObjeto } from '@/lib/s3';

export async function GET(request: NextRequest, ctx: RouteContext<'/api/clubes/[slug]/logo'>) {
  const { slug } = await ctx.params;
  const club = await getBrandingPublico(slug);
  if (!club || !keyLogoEsDelClub(club.logoKey, club.id)) return respuestaNoEncontrado();

  let objeto;
  try {
    objeto = await leerObjeto(club.logoKey);
  } catch (error) {
    console.error(`GET /api/clubes/${slug}/logo error:`, error);
    return new Response('Error', { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!objeto) return respuestaNoEncontrado();

  const headers = headersDeImagen(cacheParaVersion(club, request.nextUrl.searchParams.get('v')));
  if (objeto.contentLength !== null) headers['Content-Length'] = String(objeto.contentLength);
  return new Response(objeto.body, { status: 200, headers });
}
