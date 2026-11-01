/**
 * Favicon (`?tam=32`) y apple-touch-icon (`?tam=180`) de un club, públicos.
 *
 * Con logo: el logo centrado sobre un tile blanco (sirve para cualquier escudo,
 * incluido uno con fondo blanco). Sin logo, o si S3 falla: las iniciales del club
 * en blanco sobre su primario. Lo genera `next/og` (Satori + Resvg) en PNG.
 */

import type { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import { getBrandingPublico } from '@/lib/tenant/clubes';
import { temaDelClub } from '@/lib/branding/tema';
import { inicialesDelClub, TAMANIOS_ICONO, type TamanioIcono } from '@/lib/branding/marca';
import { cacheParaVersion, headersDeImagen, respuestaNoEncontrado } from '@/lib/branding/respuesta-imagen';
import { BLANCO } from '@/lib/branding/tokens';
import { keyLogoEsDelClub, leerObjeto } from '@/lib/s3';

function tamanioPedido(valor: string | null): TamanioIcono | null {
  const n = Number(valor ?? TAMANIOS_ICONO[0]);
  return (TAMANIOS_ICONO as readonly number[]).includes(n) ? (n as TamanioIcono) : null;
}

async function logoComoDataUrl(key: string): Promise<string | null> {
  try {
    const objeto = await leerObjeto(key);
    if (!objeto) return null;
    const bytes = Buffer.from(await new Response(objeto.body).arrayBuffer());
    return `data:image/png;base64,${bytes.toString('base64')}`;
  } catch (error) {
    console.error('icono: no se pudo leer el logo:', error);
    return null;
  }
}

export async function GET(request: NextRequest, ctx: RouteContext<'/api/clubes/[slug]/icono'>) {
  const { slug } = await ctx.params;
  const tam = tamanioPedido(request.nextUrl.searchParams.get('tam'));
  if (tam === null) return new Response('tam inválido', { status: 400 });

  const club = await getBrandingPublico(slug);
  if (!club) return respuestaNoEncontrado();

  const logo = keyLogoEsDelClub(club.logoKey, club.id) ? await logoComoDataUrl(club.logoKey) : null;
  // El favicon chico va redondeado; el apple-touch-icon lo enmascara iOS.
  const radio = tam <= 32 ? Math.round(tam * 0.2) : 0;
  const margen = Math.round(tam * 0.1);
  const lado = tam - margen * 2;

  const contenido = logo ? (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BLANCO,
        borderRadius: radio,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img> */}
      <img src={logo} alt="" width={lado} height={lado} style={{ objectFit: 'contain' }} />
    </div>
  ) : (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: temaDelClub(club).primario,
        color: BLANCO,
        borderRadius: radio,
        fontSize: Math.round(tam * 0.5),
        fontWeight: 700,
        letterSpacing: -tam * 0.02,
      }}
    >
      {inicialesDelClub(club.nombre)}
    </div>
  );

  // Sin logo legible no se cachea largo: puede ser una falla transitoria de S3.
  const cache = logo || !club.logoKey ? cacheParaVersion(club, request.nextUrl.searchParams.get('v')) : 'no-store';
  return new ImageResponse(contenido, { width: tam, height: tam, headers: headersDeImagen(cache) });
}
