# MEMORY.md — Hoardex

## Estado actual
- **Fase actual:** Fase 3a completada (`004-gamification-engine` implementada y verificada).
- **Completado:**
  - `001-core-catalog-mock` (Fase 1a): Arquitectura base, contratos, stores Zustand y UI.
  - `002-external-providers` (Fase 1b): Adaptadores externos (`rawg`, `openLibrary`, `bgg`, `manual`).
  - `003-reviews-filters-sorting` (Fase 2): Ficha de ítem, valoración con estrellas, notas, búsqueda NFD y ordenación.
  - `004-gamification-engine` (Fase 3a):
    - Motor puro de XP idempotente (`levels.ts`, `streaks.ts`, `achievements.ts`).
    - Store `hoardex-gamification` desacoplado (recibe colecciones e ítems planos, cero dependencias circulares).
    - `reviewXpAwarded?: boolean` y `rewardedCollectionIds: string[]` para idempotencia matemática de XP.
    - `GamificationHeaderBar`: nivel, rango honorífico, mini-barra de progreso, racha hoy/pendiente y enlace a logros.
    - `AchievementsPage` (`/achievements`): perfil de coleccionista, filtros por categoría y cuadrícula de tarjetas con tiers.
    - Ciclo de vida y toasts celebratorios de Sonner (subida de nivel y desbloqueo de logros).
    - 29 suites y 166 tests pasando al 100% en Vitest. Cero `any`, cero warnings.
- **Hoja de ruta SDD (`specs/`):**
  - `001`, `002`, `003`, `004`: Implementadas.
  - `005-achievements-challenges` (Fase 3b: Retos personales, desafíos temporales y progreso avanzado).
  - `006-supabase-auth-sync` (Fase 4: Auth, base de datos en Supabase y perfil público).
  - `007-wrapped-stats-deploy` (Fase 5: Estadísticas anuales tipo Wrapped y despliegue).
- **Siguiente paso:** Iniciar la spec `005-achievements-challenges` (`sdd-spec`).

## Decisiones de arquitectura (y su porqué)
- **Desacoplamiento total de stores:** `gamification.store.ts` no importa `collections.store` ni `items.store`; recibe datos planos por parámetro, evitando ciclos de dependencia.
- **Idempotencia de XP:** `xpAwarded` (completar ítem) y `reviewXpAwarded` (estrellas o notas) impiden duplicar puntos al conmutar estados o editar notas.
- **Cálculo puro de rachas UTC:** `calculateStreak` compara fechas `'YYYY-MM-DD'` mediante diferencias naturales en UTC sin invocar `Date.now()`.
- **Sincronización retroactiva segura:** `useGamificationSync` evalúa logros preexistentes exactamente una vez al montar `App`.

## Errores a evitar
- **No importar stores de Zustand dentro de otros stores:** Pasar datos como argumentos en las acciones.
- **No llamar a `new Date()` dentro de `core/`:** La lógica pura debe recibir fechas como parámetros `today` e `isoString`.
- **Evitar bucles de toasts:** Sincronizar y evaluar logros solo ante transiciones reales de estado.
