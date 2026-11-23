# MEMORY.md — Hoardex

## Estado actual
- **Fase actual:** Fase 4 completada (`006-supabase-auth-sync` implementada y verificada).
- **Completado:**
  - `001` a `005` (Fases 1a a 3b): Catálogo, adaptadores RAWG/OpenLibrary/BGG, reseñas, XP, rachas, retos y stats.
  - `006-supabase-auth-sync` (Fase 4):
    - Arquitectura Local-First con cliente seguro y fallback defensivo ante falta de credenciales de Supabase.
    - Contratos PostgREST (`CollectionRow`, `ItemRow`, `GamificationStateRow`) y DDL PostgreSQL con RLS estricta.
    - Conciliación pura LWW (`updatedAt`), unión idempotente de gamificación y validador de backups nativo (`version: 1`).
    - Acciones atómicas de hidratación en stores (`hydrateCollections`, `hydrateItems`, `hydrateGamification`).
    - Motor reactivo `useSyncEngine` con debounce de 1500 ms, sync en foco y hooks `useAuth`/`useSyncStore`.
    - Componentes UI accesibles: `AuthDialog`, `AccountMenu`, `ImportBackupDialog` e integración en `Header`.
    - 44 suites y 276 tests pasando al 100% en Vitest. Cero `any`, cero warnings. Verificación DevTools MCP impecable.
- **Hoja de ruta SDD (`specs/`):**
  - `001` a `006`: Implementadas y testeadas.
  - `007-wrapped-stats-deploy` (Fase 5: Estadísticas anuales tipo Wrapped y despliegue a producción).
- **Siguiente paso:** Redactar spec para Fase 5 (`007-wrapped-stats-deploy`).

## Decisiones de arquitectura (y su porqué)
- **Local-First por diseño:** Hoardex opera al 100% como invitado sin credenciales; el login fusiona datos sin sobreescribir destructivamente.
- **Conciliación LWW y unión idempotente:** Conflictos en ítems resueltos por `updatedAt`; gamificación toma `Math.max(XP)`, la racha activa y unión única de logros y retos.
- **Backup JSON nativo y versionado:** Validador defensivo en TypeScript puro sin librerías externas para portabilidad y respaldo en frío.
- **Tipado PostgREST estricto:** Tipos alias con index signatures implícitas para satisfacer genéricos de Supabase sin recurrir a `any`.

## Errores a evitar
- **No importar stores de Zustand dentro de otros stores:** Pasar datos como argumentos en las acciones.
- **No llamar a `new Date()` dentro de `core/`:** La lógica pura debe recibir fechas como parámetros `today` e `isoString`.
- **PowerShell en Windows:** Encadenar comandos secuenciales con `;` y no con `&&`.
- **Index signatures en tipos Supabase:** Usar `type` en lugar de `interface` para rows que interactúen con `GenericTable`.
