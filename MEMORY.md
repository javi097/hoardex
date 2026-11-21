# MEMORY.md — Hoardex

## Estado actual
- **Fase actual:** Fase 3b completada (`005-achievements-challenges` implementada y verificada).
- **Completado:**
  - `001`, `002`, `003`, `004` (Fases 1a a 3a): Catálogo, adaptadores, reseñas/filtros y motor base de XP/niveles/logros.
  - `005-achievements-challenges` (Fase 3b):
    - Motor de retos declarativos (`challenges.ts`): cálculo ISO UTC de semanas (`getWeekBoundaries`), progreso numérico `0..target`, porcentaje y clave única idempotente (`${id}_${weekKey}`).
    - Métricas del coleccionista (`stats.ts`): tasa completado, nota media con 1 decimal, colección activa y cuaderno de notas.
    - Store `hoardex-gamification`: persistencia de `claimedChallengeIds: string[]`, acción pura `claimChallengeReward` devolviendo `ActionResult` estructurado (sin efectos colaterales en store).
    - UI accesible: `ChallengeCard`, `XpHistoryFeed` (con iconos, toggle 5/25 y `Zap`), `CollectorStatsPanel` y rediseño de `/achievements` en 4 pestañas accesibles con badge de recompensas pendientes.
    - 34 suites y 199 tests pasando al 100% en Vitest. Cero `any`, cero warnings. Verificación DevTools MCP impecable.
- **Hoja de ruta SDD (`specs/`):**
  - `001`, `002`, `003`, `004`, `005`: Implementadas.
  - `006-supabase-auth-sync` (Fase 4: Auth, base de datos en Supabase y sincronización en la nube).
  - `007-wrapped-stats-deploy` (Fase 5: Estadísticas anuales tipo Wrapped y despliegue a producción).
- **Siguiente paso:** Iniciar la spec `006-supabase-auth-sync` (`sdd-spec`).

## Decisiones de arquitectura (y su porqué)
- **Reclamación manual e idempotente de retos:** `claimChallengeReward` valida `isCompleted && !claimedChallengeIds.includes(key)` y retorna `ActionResult`; la capa UI gestiona los toasts de Sonner (`toast.success` y `notifyGamificationResult`).
- **Clave semanal determinista ISO:** Semanas numeradas y delimitadas puramente por `today` (`YYYY-Www`, `[startOfWeek, endOfWeek]`), renovándose de forma transparente al cruzar de lunes UTC sin crons.
- **Pestañas accesibles y navegación por teclado:** 4 vistas en `/achievements` (`Logros`, `Retos`, `Estadísticas`, `Historial`) con `tablist`, `tab`, `tabpanel` y navegación cíclica con flechas (`ArrowLeft`/`ArrowRight`).

## Errores a evitar
- **No importar stores de Zustand dentro de otros stores:** Pasar datos como argumentos en las acciones.
- **No llamar a `new Date()` dentro de `core/`:** La lógica pura debe recibir fechas como parámetros `today` e `isoString`.
- **PowerShell en Windows:** Encadenar comandos secuenciales con `;` y no con `&&`.
- **Text matchers en Testing Library:** Usar regex acotada (ej. `/^Semanal$/i`) para evitar colisiones con textos largos que contengan la misma palabra (ej. "Catalogador semanal").
