# MEMORY.md — Hoardex

## Estado actual
- **Etapa 2 iniciada:** Spec 008 (`008-oauth-public-profiles`) implementada y validada al 100%. Preparada Spec 009 (`009-friends-social-feed`).
- **Spec 008 (`008-oauth-public-profiles`):**
  - Autenticación federada multi-proveedor (Google, Apple, GitHub) en `AuthDialog` con conciliación automática LWW al volver del callback OAuth.
  - Perfil de usuario con `@username` alfanumérico sanitizado, `displayName`, `avatarUrl`, `bio` e iniciales de fallback (`UserAvatar`).
  - Edición reactiva accesible en `ProfileSettingsDialog` con validación pura de username (`validateUsername`), aviso de rotura de enlaces y switch `isPublic`.
  - Privacidad granular de colecciones (`isPublic` en `CollectionForm` y `CollectionCard` con candado accesible `Lock`).
  - Ruta pública `/u/:username` (`PublicProfilePage`) con estados de carga, 404, privado, vista previa del dueño (CL-03) y vitrinas públicas de colecciones y logros, aislando datos privados y Wrapped.
- **Métricas globales:** 57 suites, 380 tests pasando (100% verde), 0 errores `tsc`, 0 `any` o `as any`, 0 warnings lint, build limpio en dist/.

## Decisiones de arquitectura (y su porqué)
- **Local-First & Privacidad:** Colecciones privadas (`is_public = false`) excluidas por RLS en Postgres y por filtros puros en cliente.
- **Identidad no bloqueante:** La app funciona en modo invitado; al autenticarse, el trigger `handle_new_user` genera perfil y avatar automáticamente.
- **Renderizado directo sin cascadas:** En `PublicProfilePage`, derivación de colecciones/logros directamente en render sin `useMemo` redundante para compatibilidad con el compilador de React.
- **CL-03 (Dueño en perfil privado):** El propietario puede ver su propia página `/u/:user` aunque sea privada, con banner y botón de edición.

## Errores a evitar
- **No llamar a `clearProfile()` si `!isSupabaseConfigured`:** Solo limpiar el store de perfil si `!user` (cierre de sesión real).
- **Evitar `asChild` en `@base-ui/react`:** Envolver botones en `<Link>` o estilizar enlaces directamente con `buttonVariants`.
- **No llamar a `new Date()` sin parámetro en `core/`:** Inyectar siempre `targetYear` o `today`.
- **Encadenar en PowerShell Windows:** Usar `;` en lugar de `&&`.
