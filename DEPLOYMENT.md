# Despliegue de EnlazadosTWFE

## Cloudflare Pages

- Framework preset: `Angular`
- Build command: `npm run build:production`
- Build output directory: `www`
- Root directory: dejar vacio si este repositorio contiene solamente el frontend
- Node.js: `22.14.0` (tambien se puede definir `NODE_VERSION=22.14.0`)

La configuracion de produccion usa `src/environments/environment.prod.ts`. El archivo
`src/_redirects` hace que las rutas de Angular funcionen al abrir enlaces directos,
incluidos verificacion de email, recuperacion de contrasena e invitaciones.

## Builds nativos

Android:

```bash
npm run sync:android
```

iOS (requiere macOS y Xcode):

```bash
npm run sync:ios
```

Ambos comandos compilan primero la configuracion de produccion, por lo que utilizan
la misma URL del backend desplegado que la version web.

## Variables del backend

Cuando Cloudflare asigne el dominio definitivo, actualizar en Render:

- `APP_CORS_ALLOWED_ORIGIN_PATTERNS`: agregar el origen exacto de Cloudflare Pages.
- `APP_FRONTEND_VERIFY_EMAIL_URL`: `<dominio>/verify-email`.
- `APP_FRONTEND_RESET_PASSWORD_URL`: `<dominio>/reset-password`.
- `APP_FRONTEND_THERAPEUTIC_TEAM_INVITATION_URL`: `<dominio>/therapeutic-team-invitation`.
