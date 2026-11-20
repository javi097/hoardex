# Tareas de Implementación 004 — Gamification Engine (XP, Levels, Streaks & Achievements)

## Contexto y orden de ejecución
Este plan de tareas desglosa la implementación de la Fase 3a (`specs/004-gamification-engine/spec.md`) siguiendo el flujo de Spec-Driven Development (`sdd-implement`). Cada tarea es atómica, verificable de forma independiente y respeta la puerta de calidad (`npx tsc --noEmit`, `npm run lint`, `npm run test`).

---

- [x] **T1. Contratos globales del motor de gamificación y extensión de ítem.** RF-01.1, RF-01.2, RNF-02, RNF-03
  - Crear `src/interfaces/gamification.interface.ts` con todos los contratos de tipos:
    - Tipos de acción (`XpActionType`) y eventos (`XpEvent`).
    - Progreso de nivel (`LevelProgress`) y datos de racha (`StreakInfo`, `StreakCalculationResult`).
    - Categorías, tiers y modelo de logro (`AchievementCategory`, `AchievementTier`, `Achievement`, `UnlockedAchievement`).
    - Estado agnóstico para evaluación (`GamificationEvaluationState`).
  - Extender `Item` en `src/interfaces/item.interface.ts` con el campo opcional `reviewXpAwarded?: boolean` para garantizar idempotencia al reseñar.
  - Hecho cuando: `npx tsc --noEmit` y `npm run lint` pasen limpios con 0 errores y cero `any`.

- [ ] **T2. Capa de lógica pura del Core (niveles, rachas y logros) con suites de tests en Vitest.** RF-01.1, RF-01.3, RF-01.4, RF-02.1, RF-02.2, RF-02.3, RF-02.4, RF-02.5, RF-03.1, RF-03.2, RF-03.3, RNF-01, RNF-04
  - Crear `src/features/gamification/core/levels.ts`:
    - Constante `XP_RULES` (+10 ítem, +50 completado, +25 reseña, +100 colección completa, +15 bono de racha).
    - Títulos honoríficos de rango `LEVEL_TITLES` (niveles 1 al 10+).
    - Funciones puras `getRequiredXpForLevel` y `calculateLevelProgress(totalXp)` con progresión cuadrática/lineal ($100 + (L-1) \times 50$).
  - Crear `src/features/gamification/core/streaks.ts`:
    - Funciones puras `getDaysDifference` y `calculateStreak` operando deterministamente con fechas en formato `'YYYY-MM-DD'` (sin dependencias de `Date.now()`).
  - Crear `src/features/gamification/core/achievements.ts`:
    - Catálogo declarativo `ACHIEVEMENTS` con los 12 logros base clasificados por categoría y tier.
    - Función evaluadora pura `evaluateAchievements(state)` que filtra contra `alreadyUnlockedIds`.
  - Crear las suites de pruebas unitarias puras:
    - `src/features/gamification/core/levels.test.ts` (límites exactos, cálculo de porcentaje, títulos, saltos de nivel).
    - `src/features/gamification/core/streaks.test.ts` (mismo día, día consecutivo, racha rota, fin de mes/año).
    - `src/features/gamification/core/achievements.test.ts` (condiciones de logros, idempotencia con ya desbloqueados).
  - Hecho cuando: `npm run test src/features/gamification/core/` pase al 100% y `tsc`/`lint` pasen limpios.

- [ ] **T3. Store desacoplado de gamificación con persistencia e idempotencia.** RF-01.1, RF-01.2, RF-03.3, RF-04.1, RF-04.2, RF-04.3, RNF-03, RNF-05
  - Crear `src/features/gamification/store/gamification.store.ts`:
    - Persistencia en `localStorage` bajo `hoardex-gamification`.
    - Estado: `totalXp`, `streak`, `unlockedAchievements`, `xpHistory` y `rewardedCollectionIds: string[]` (salvaguarda anti-duplicados del bono de colección).
    - Acciones atómicas e inmutables: `awardXp`, `recordActivity`, `handleUserAction` y `syncAchievements`.
    - Cero dependencias circulares: recibe las colecciones e ítems planos por parámetro.
  - Actualizar `src/features/items/store/items.store.ts` y `src/features/items/core/sorting.ts` para contemplar `reviewXpAwarded` en `updateItemDetails`.
  - Crear `src/features/gamification/store/gamification.store.test.ts` probando concesión de XP, avance de racha, desbloqueo de logros, salvaguarda de colecciones y persistencia defensiva.
  - Hecho cuando: `npm run test src/features/gamification/store/` pase al 100% y la suite completa continúe en verde.

- [ ] **T4. Componentes UI de Gamificación y página `/achievements`.** RF-03.1, RF-05.1, RF-05.2, RNF-05
  - Crear `src/features/gamification/components/GamificationHeaderBar.tsx`:
    - Insignia de nivel con icono y tooltip de rango honorífico.
    - Mini barra de progreso porcentual al siguiente nivel.
    - Indicador de racha activa (`🔥 X d`) con estado visual hoy/pendiente.
    - Enlace accesible hacia la página de logros `/achievements`.
  - Crear `src/features/gamification/components/AchievementCard.tsx`:
    - Tarjeta accesible (`role="article"`) con tratamiento visual por tier (bronce, plata, oro, platino).
    - Distintivo de XP y fecha de desbloqueo si está conseguido; silueta tenue y candado si está bloqueado.
  - Crear `src/pages/AchievementsPage.tsx`:
    - Tarjeta resumen de perfil (nivel grande, título, barra de XP detallada, experiencia total, racha récord).
    - Selector de píldoras por categoría con contador numérico de desbloqueados.
    - Cuadrícula responsiva de logros.
  - Integrar `GamificationHeaderBar` en `src/components/custom/Header.tsx` y registrar la ruta `/achievements` en `src/App.tsx`.
  - Crear tests unitarios para los componentes creados.
  - Hecho cuando: `npx tsc --noEmit`, `npm run lint` y los tests de componentes pasen sin errores.

- [ ] **T5. Integración de eventos del ciclo de vida y notificaciones toast.** RF-01.1, RF-01.2, RF-04.3, RF-05.3, RNF-03
  - Conectar los puntos clave del ciclo de vida con `handleUserAction` de `useGamificationStore`:
    - Creación de colección en `NewCollectionSheet.tsx`.
    - Adición de ítem en `AddItemSheet.tsx`.
    - Marcado de completado en `ItemCard.tsx` e `ItemDetailSheet.tsx` (concediendo XP y marcando `xpAwarded: true`).
    - Primera valoración o notas en `ItemDetailSheet.tsx` (concediendo XP y marcando `reviewXpAwarded: true`).
  - Configurar alertas Sonner diferenciadas:
    - Toast celebratorio de subida de nivel (`"¡Subiste de nivel! Has alcanzado el Nivel X: [Título]"`).
    - Toast de desbloqueo de logro (`"¡Logro desbloqueado! [Título] (+X XP)"`).
  - Sincronización inicial automática para desbloquear retroactivamente logros en usuarios con catálogo preexistente de fases anteriores sin duplicar XP base.
  - Hecho cuando: las acciones en la app otorguen experiencia, extiendan racha y notifiquen logros sin duplicidades.

- [ ] **T6. Puerta de calidad, verificación visual en Chrome DevTools MCP y memoria.** RNF-01, RNF-02, RNF-03, RNF-04, RNF-05
  - Ejecutar verificación estática completa: `npx tsc --noEmit`, `npm run lint`, `npm run test` (suite completa) y `npm run build`. Confirmar 0 errores, 0 warnings y 0 `any`.
  - Levantar `npm run dev` y validar con Chrome DevTools MCP en `http://localhost:5173/`:
    - Añadir ítem y comprobar concesión de +10 XP y racha de 1 día reflejada en la cabecera.
    - Completar ítem y comprobar +50 XP y desbloqueo de logros ("Primer ejemplar", "Objetivo cumplido").
    - Valorar y reseñar ítem en `ItemDetailSheet` y comprobar +25 XP e idempotencia al re-editar.
    - Navegar a `/achievements` y comprobar visualización, filtros y tarjetas de logros.
  - Marcar todos los criterios en `specs/004-gamification-engine/spec.md` (estado `implementada`) y `tasks.md`.
  - Actualizar `MEMORY.md` (< 50 líneas) registrando la Fase 3a y preparando la Fase 3b (`005-achievements-challenges`).
  - Hecho cuando: Todos los checks pasen en verde, la verificación DevTools sea satisfactoria y `MEMORY.md` esté actualizado.
