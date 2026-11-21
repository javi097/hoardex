# Tareas de Implementación 005 — Dynamic Challenges, XP History & Collector Stats

## Contexto y orden de ejecución
Este plan de tareas desglosa la implementación de la Fase 3b (`specs/005-achievements-challenges/spec.md`) siguiendo el flujo de Spec-Driven Development (`sdd-implement`). Cada tarea es atómica, verificable de forma independiente y respeta la constitución y la puerta de calidad del proyecto (`npx tsc --noEmit`, `npm run lint`, `npm run test`).

---

- [x] **T1. Contratos y tipado estricto ampliados.** RF-01.1, RF-02.1, RF-04.1, RNF-02
  - En `src/interfaces/gamification.interface.ts`:
    - Ampliar el tipo unión `XpActionType` con `'challenge'`.
    - Definir `ChallengeCategory` (`'weekly' | 'milestone'`).
    - Definir `WeekBoundaries` (`weekKey`, `startOfWeek`, `endOfWeek`).
    - Definir `ChallengeEvaluationState` con acceso a colecciones, ítems, historial de XP, racha y `claimedChallengeIds`.
    - Definir `Challenge` con función pura `computeProgress`.
    - Definir `ChallengeProgress` (`challengeId`, `uniqueKey`, `current`, `target`, `percentage`, `xpReward`, `isCompleted`, `isClaimed`).
    - Definir `CollectorStats` (`totalItems`, `completedItems`, `completionRate`, `ratedItemsCount`, `averageRating`, `reviewedItemsCount`, `totalCollections`, `mostActiveCollection`).
  - Hecho cuando: `npx tsc --noEmit` y `npm run lint` pasen con 0 errores y cero ocurrencias de `any`.

- [ ] **T2. Capa Core: Retos declarativos y cálculo de semanas ISO.** RF-01.1, RF-01.2, RF-01.3, RNF-01, RNF-05
  - Crear `src/features/gamification/core/challenges.ts`:
    - Función pura `getWeekBoundaries(dateStr)`: cálculo matemático determinista en UTC del inicio (lunes), fin (domingo) y clave ISO (`YYYY-Www`) sin `Date.now()`.
    - Catálogo declarativo `CHALLENGES` con 6 retos base (3 semanales: añadir 2 ítems, completar 1 ítem, reseñar 1 ítem; 3 de hito: 2 colecciones, 3 valoraciones con estrellas, racha récord de 3 días).
    - Función pura `calculateChallengeProgress(challenge, state, today, boundaries)` con clamp `0..target`, porcentaje y clave única (`${challenge.id}_${boundaries.weekKey}` para semanales o `${challenge.id}` para hitos).
    - Función pura `evaluateAllChallenges(challenges, state, today)`.
  - Crear `src/features/gamification/core/challenges.test.ts`:
    - Cálculo de semanas ISO (lunes a domingo, fin de año, transiciones de mes y semana 53).
    - Progreso de retos semanales acotado estrictamente al intervalo `[startOfWeek, endOfWeek]`.
    - Progreso de retos de hito acumulativos.
    - Idempotencia del indicador `isClaimed`.
  - Hecho cuando: `npm run test src/features/gamification/core/challenges.test.ts` pase al 100% y `tsc`/`lint` continúen limpios.

- [ ] **T3. Capa Core: Métricas y analíticas del coleccionista.** RF-04.1, RNF-01, RNF-05
  - Crear `src/features/gamification/core/stats.ts`:
    - Función pura `calculateCollectorStats(collections, items)`:
      - Tasa global de completado (`Math.round((completed / total) * 100)` o 0 si total es 0).
      - Promedio exacto de valoración de estrellas con 1 decimal (ej. `4.3`), o `0` si no hay valoraciones.
      - Recuentos de ítems valorados y con reseñas escritas.
      - Detección de la colección más activa/predominante (con nombre, ítems y completados) o `null` si no hay colecciones.
  - Crear `src/features/gamification/core/stats.test.ts`:
    - Tests deterministas con catálogo vacío (evitar división por 0 o `NaN`).
    - Catálogo mixto con ítems sin rating y con notas.
    - Empate en tamaño de colecciones y recuento exacto de completados.
  - Hecho cuando: `npm run test src/features/gamification/core/stats.test.ts` pase al 100%.

- [ ] **T4. Capa Store: Reclamación idempotente de retos y pureza.** RF-02.1, RF-02.2, RF-02.3, RNF-03
  - En `src/features/gamification/store/gamification.store.ts`:
    - Ampliar el estado con `claimedChallengeIds: string[]` persistido bajo `hoardex-gamification`.
    - Implementar la acción pura `claimChallengeReward(params: { uniqueKey: string; xpReward: number; title: string; now: string; isCompleted: boolean })`:
      - Validación dual: si `claimedChallengeIds.includes(uniqueKey)` o `!isCompleted`, abortar retornando `{ totalXpGained: 0, leveledUp: false, ... }` sin mutar el store.
      - Si es válida: suma `xpReward` a `totalXp`, añade `uniqueKey` a `claimedChallengeIds`, registra un evento en `xpHistory` con `action: 'challenge'` y retorna el `ActionResult` estructurado para que la UI gestione el feedback.
  - Actualizar `src/features/gamification/store/gamification.store.test.ts`:
    - Probar reclamación exitosa y suma de XP.
    - Probar que un segundo intento de reclamar la misma clave es ignorado (idempotencia estricta).
    - Probar rechazo si el reto no está completado (`isCompleted === false`).
    - Probar subida de nivel desencadenada por la recompensa del reto.
  - Hecho cuando: `npm run test src/features/gamification/store/` pase al 100%.

- [ ] **T5. Componentes UI y rediseño de `/achievements` con pestañas y badge.** RF-02.4, RF-03.1, RF-03.2, RF-03.3, RF-03.4, RF-04.2, RF-05.1, RF-05.2, RNF-04
  - Crear `src/features/gamification/components/ChallengeCard.tsx`:
    - Tratamiento visual accesible (`role="article"`), badges de categoría (*Semanal* / *Hito*), título, descripción, icono y XP.
    - Barra de progreso porcentual (`role="progressbar"`).
    - Botón de acción: `{current} / {target}` deshabilitado si incompleto, *"Reclamar (+X XP)"* interactivo con animación si completado no reclamado, y *"Reclamado"* con `CheckCircle2` si ya fue reclamado.
    - Crear `ChallengeCard.test.tsx`.
  - Crear `src/features/gamification/components/XpHistoryFeed.tsx`:
    - Feed cronológico accesible mostrando eventos de `xpHistory`.
    - Mapeo de iconos por acción (incluyendo `Zap` para `'challenge'`), descripciones, distintivo `+X XP` y fecha en español.
    - Toggle para alternar entre ver los últimos 5 eventos y expandir hasta 25.
    - Estado vacío sobrio para usuarios sin eventos recientes.
    - Crear `XpHistoryFeed.test.tsx`.
  - Crear `src/features/gamification/components/CollectorStatsPanel.tsx`:
    - Cuadrícula responsiva de tarjetas métricas (tasa de completado, promedio de estrellas, colección destacada y reseñas).
    - Crear `CollectorStatsPanel.test.tsx`.
  - Rediseñar `src/pages/AchievementsPage.tsx`:
    - Organizar la vista mediante 4 pestañas accesibles (`role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`):
      1. *Logros* (catálogo de 12 insignias de la Fase 3a).
      2. *Retos* (cuadrícula de retos con badge numérico en la pestaña indicando cuántos retos están completados pendientes de reclamar).
      3. *Estadísticas* (`CollectorStatsPanel`).
      4. *Historial* (`XpHistoryFeed`).
    - Conectar el botón *"Reclamar"* con `claimChallengeReward`, disparando `notifyGamificationResult` y `toast.success("¡Reto completado! [Título] (+X XP)")`.
    - Actualizar `src/pages/AchievementsPage.test.tsx`.
  - Hecho cuando: `npx tsc --noEmit`, `npm run lint` y los tests de componentes pasen limpios.

- [ ] **T6. Puerta de calidad, verificación visual en Chrome DevTools MCP y memoria.** RNF-01, RNF-02, RNF-03, RNF-04, RNF-05
  - Ejecutar verificación estática completa: `npx tsc --noEmit`, `npm run lint`, `npm run test` (suite completa) y `npm run build`. Confirmar 0 errores, 0 warnings y 0 `any`.
  - Levantar `npm run dev` y validar con Chrome DevTools MCP en `http://localhost:5173/achievements`:
    - Conmutar entre las 4 pestañas con teclado y clics verificando la accesibilidad y estado visual.
    - Comprobar el progreso numérico de retos semanales y de hitos.
    - Cumplir un reto, verificar el badge numérico en la pestaña *Retos*, pulsar *"Reclamar (+X XP)"*, verificar toast, suma de XP en cabecera y cambio a *"Reclamado"*.
    - Consultar la pestaña *Historial* y comprobar que el evento de reto aparece con icono `Zap` y fecha formateada.
    - Consultar el panel de *Estadísticas* comprobando la tasa de completado y promedio de estrellas.
    - Recargar la página (`reload`) y confirmar persistencia completa.
  - Marcar todos los criterios en `specs/005-achievements-challenges/spec.md` (estado `implementada`) y `tasks.md`.
  - Actualizar `MEMORY.md` (< 50 líneas) cerrando la Fase 3b y preparando la Fase 4 (`006-supabase-auth-sync`).
