# MEMORY.md — Hoardex

## Estado actual
- **Fase actual:** Fase 1b completada (`002-external-providers` implementada).
- **Completado:**
  - `001-core-catalog-mock`: Arquitectura base, contratos, stores Zustand, vistas y UI.
  - `002-external-providers`: Adaptadores de búsqueda externa reales (`rawg`, `openLibrary`, `bgg`, `manual`).
  - Funciones puras de normalización y parseo (`normalizeRawgGame`, `normalizeOpenLibraryDoc`, `parseBggXml`) con DTOs estrictos y `meta: Record<string, string | number | boolean>`.
  - Factoría y registro dinámico `getSearchProvider(collection.provider)` con fallback a mock.
  - Proxy `/api/bgg` en Vite para sortear CORS y soporte de token Bearer.
  - Integración reactiva en `AddItemSheet`: debounce 350 ms, `AbortController`, banner de error accesible con botón de fallback a "Alta manual" pre-rellenada, y render directo sin pestañas para colecciones manuales.
  - 80 tests unitarios y de componentes pasando al 100% en Vitest. Cero `any`.
- **Hoja de ruta SDD (`specs/`):**
  - `001-core-catalog-mock` (Fase 1a: Implementada).
  - `002-external-providers` (Fase 1b: Implementada).
  - `003-reviews-filters-sorting` (Fase 2: Notas, reseñas, búsqueda, filtros y ordenación).
  - `004-gamification-engine` (Fase 3a: Motor puro de XP idempotente, niveles y rachas + tests).
  - `005-achievements-challenges` (Fase 3b: Logros declarativos, retos personales y toasts).
  - `006-supabase-auth-sync` (Fase 4: Auth, base de datos en Supabase y perfil público).
  - `007-wrapped-stats-deploy` (Fase 5: Estadísticas anuales tipo Wrapped y despliegue).
- **Siguiente paso:** Iniciar la spec `003-reviews-filters-sorting` (`sdd-spec`).

## Decisiones de arquitectura (y su porqué)
- **Adaptadores desacoplados con funciones puras:** Aísla la normalización de datos externos de las peticiones de red, permitiendo probar exhaustivamente casos límite sin mockear red.
- **Proxy dev server `/api/bgg`:** Resuelve la ausencia de cabeceras CORS en BGG XMLAPI2 sin requerir un backend intermediario.
- **Cancelación con `AbortSignal`:** Cancela conexiones HTTP previas en vuelo evitando condiciones de carrera y parpadeos en búsquedas rápidas.
- **Renderizado directo en colecciones `'manual'`:** Oculta pestañas de búsqueda en figuras/custom para eliminar fricción al usuario.
- **Persistencia en Zustand con claves independientes (`hoardex-collections`, `hoardex-items`):** Evita colisiones entre stores modulares.

## Errores a evitar
- **No poner cabecera `User-Agent` en fetch de navegador:** Es cabecera prohibida en estándar Fetch.
- **No llamar a `setState` en effects para resetear formularios:** Manejar el reseteo en handlers de apertura/cierre o `key`.
- **No devolver arrays nuevos en selectores de Zustand:** Seleccionar el array base y derivar con `useMemo`.
