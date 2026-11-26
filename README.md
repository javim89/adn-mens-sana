# BioTeam

Plataforma multi-club para la gestión integral del deportista.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Desarrollo con Docker (OrbStack)

Requiere [OrbStack](https://orbstack.dev) y `.env.local` (copiar de `.env.example`, con claves `pk_test_` de Clerk). No hace falta Node en el host. El package manager es pnpm (`pnpm-lock.yaml`).

```bash
make up        # https://bioteam.local y https://<slug>.bioteam.local
make logs      # logs del dev server
make stop      # frenar
make restart   # reiniciar (reinstala si cambió pnpm-lock.yaml)
make down      # borrar el contenedor (conserva volúmenes)
make lint | make test | make build
make smoke     # dominios, TLS y redirects
make run CMD="pnpm seed:all"
```

- `bioteam.local` usa la CA de OrbStack. Si los dominios no responden, revisar en OrbStack "Allow access to container domains & IPs".
- `compose.yaml` fija `NEXT_PUBLIC_ROOT_DOMAIN` y `NEXT_PUBLIC_APP_URL`; el resto sale de `.env.local`, que Next lee por el bind mount.
- La base es la que apunte `.env.local`: `make run` con scripts o migraciones y `make e2e` escriben ahí.
- La sesión de Clerk en desarrollo es por host: puede pedir login en cada subdominio.
- Para subir fotos, el CORS del bucket de S3 tiene que incluir `https://bioteam.local` y `https://*.bioteam.local`.

## Desarrollo sin Docker

Requiere Node 22 y Corepack (`corepack enable`): la versión de pnpm sale de `packageManager` en `package.json`.

```bash
pnpm install
pnpm dev
```

Queda en [http://localhost:3000](http://localhost:3000).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
