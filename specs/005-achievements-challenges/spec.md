# Spec 005 — Dynamic Challenges, XP History & Collector Stats
Estado: implementada

---

## Contexto y objetivo

En la fase anterior (`004-gamification-engine`), Hoardex estableció su motor de gamificación: curva de experiencia (`totalXp`), progresión continua de niveles (`levels.ts`), cálculo determinista de rachas diarias (`streaks.ts`), catálogo declarativo de 12 logros base (`achievements.ts`), persistencia desacoplada en `hoardex-gamification`, la barra de cabecera `GamificationHeaderBar` y la página `/achievements`.

Esta especificación corresponde a la **Fase 3b: Retos dinámicos, historial de XP y estadísticas del coleccionista**. Su objetivo es profundizar en la motivación y retención del usuario mediante tres pilares:
1. **Motor puro de retos declarativos (`challenges.ts`):** Retos semanales y de hitos con seguimiento numérico de progreso en tiempo real (`current / target`), porcentajes y concesión idempotente de recompensas (`claimedChallengeIds: string[]`).
2. **Historial de actividad reciente de XP (`XpHistoryFeed`):** Registro visual y accesible de las últimas acciones de experiencia almacenadas en `xpHistory` (añadir ítems, completar, valorar, rachas, logros y retos).
3. **Panel de analíticas del coleccionista (`CollectorStatsPanel`):** Métricas calculadas mediante funciones puras (`stats.ts`) sobre el catálogo del usuario (tasa global de completado, valoración media, desglose por colecciones y ratios de dedicación).

---

## Usuarios

- **Coleccionista habitual:** Desea tener metas a corto plazo (retos semanales) que le animen a interactuar con su biblioteca periódicamente.
- **Usuario orientado a datos:** Desea consultar métricas cuantitativas sobre sus hábitos de consumo y catalogación (promedio de estrellas, ítems completados, colección predominante).
- **Usuario curioso / auditor:** Desea inspeccionar cómo y cuándo obtuvo sus puntos de experiencia para validar la justicia y coherencia del sistema.

---

## Historias de usuario

- **HU-01.** Como usuario, quiero ver una lista de retos activos con una barra de progreso numérica (`current / target`) para saber exactamente cuánto me falta para completarlos.
- **HU-02.** Como usuario, quiero que los retos semanales se computen estrictamente dentro del marco de la semana natural en curso, renovándose al cambiar de semana.
- **HU-03.** Como usuario, quiero reclamar la recompensa de un reto completado y recibir los puntos de experiencia e indicadores visuales de forma garantizadamente idempotente.
- **HU-04.** Como usuario, quiero consultar un historial cronológico de mis eventos recientes de experiencia (qué acción realicé, cuánta XP gané y cuándo ocurrió).
- **HU-05.** Como usuario, quiero visualizar estadísticas globales de mi colección (porcentaje total completado, valoración promedio de estrellas, colección más activa) para comprender mejor mis aficiones.

---

## Definiciones

| Término | Significado en Hoardex |
|---|---|
| **Reto Declarativo (`Challenge`)** | Meta definida por catálogo con id, título, descripción, icono, tipo (`weekly` o `milestone`), meta numérica (`target`), recompensa en XP (`xpReward`) y evaluador puro de progreso. |
| **Progreso de Reto (`ChallengeProgress`)** | Objeto puro `{ current, target, percentage, isCompleted, isClaimed }` derivado del estado actual y la fecha. |
| **Reto Semanal (`weekly`)** | Reto vinculado a una ventana temporal que abarca desde el lunes 00:00 UTC hasta el domingo 23:59:59 UTC de la semana dada por `today`. Se identifica con un sufijo de semana (p. ej. `_2026_W47`). |
| **Reto de Hito (`milestone`)** | Reto permanente acumulativo a medio/largo plazo que no caduca con el paso de las semanas. |
| **Reclamación Idempotente (`isClaimed`)** | Estado que garantiza que la recompensa en XP de un reto completado solo se sume una única vez mediante el registro de su ID en `claimedChallengeIds: string[]`. |
| **Historial de XP (`XpHistory`)** | Lista ordenada cronológicamente de eventos `{ id, action, xpGained, description, timestamp }` persistidos en el store. |
| **Estadísticas del Coleccionista (`CollectorStats`)** | Estructura pura con métricas calculadas sobre el catálogo completo (tasa de completado, promedio de estrellas, recuentos). |

---

## Requisitos funcionales (Sintaxis EARS)

### RF-01 — Motor Puro de Retos y Ventanas Temporales (`challenges.ts`)

- **RF-01.1** El sistema debe definir un catálogo base de retos declarativos (`CHALLENGES`) dividido en:
  - **Retos semanales (`category: 'weekly'`):**
    1. *Catalogador semanal:* Añadir al menos 2 ítems en la semana en curso (+30 XP).
    2. *Avance constante:* Completar al menos 1 ítem en la semana en curso (+40 XP).
    3. *Ojo crítico:* Escribir notas o valorar al menos 1 ítem en la semana en curso (+25 XP).
  - **Retos de hito (`category: 'milestone'`):**
    4. *Cimientos firmes:* Crear al menos 2 colecciones (+30 XP).
    5. *Crítico consagrado:* Valorar al menos 3 ítems con puntuación de estrellas (+50 XP).
    6. *Constancia de bronce:* Alcanzar una racha récord de al menos 3 días (+40 XP).
- **RF-01.2** El sistema debe calcular las fronteras de la semana ISO (`getWeekBoundaries(dateStr)`) de forma 100% pura y determinista, recibiendo `today` (`YYYY-MM-DD`) y devolviendo `{ weekKey: 'YYYY-Www', startOfWeek: 'YYYY-MM-DD', endOfWeek: 'YYYY-MM-DD' }` sin usar `Date.now()`.
- **RF-01.3** La función pura `calculateChallengeProgress(challenge, state, today)` debe evaluar el progreso numérico del usuario devolviendo:
  - `current`: número de unidades alcanzadas (clamp entre 0 y `target`).
  - `target`: meta requerida.
  - `percentage`: entero entre 0 y 100 (`Math.min(100, Math.floor((current / target) * 100))`).
  - `isCompleted`: booleano (`current >= target`).
  - `isClaimed`: booleano indicando si el ID del reto (con su sufijo de semana para los semanales) ya figura en `claimedChallengeIds`.

### RF-02 — Reclamación de Recompensas e Idempotencia en Store

- **RF-02.1** El store `gamification.store.ts` debe ampliar su estado persistido con `claimedChallengeIds: string[]`.
- **RF-02.2** La acción `claimChallengeReward(challengeId, now)` debe ser atómica e idempotente:
  - Si el reto no está completado o su ID ya está registrado en `claimedChallengeIds`, no debe alterar el estado ni conceder puntos.
  - Si el reto está completado y no reclamado, debe sumar los puntos de `xpReward`, registrar el ID en `claimedChallengeIds`, añadir un evento en `xpHistory` con acción `'challenge'`, evaluar subidas de nivel y retornar un `ActionResult` estructurado.
- **RF-02.3** Al reclamar exitosamente un reto, el sistema debe disparar un toast de Sonner:
  `toast.success("¡Reto completado! [Título] (+X XP)")` junto con el toast de nivel si se produce subida.
- **RF-02.4** El sistema debe calcular la cantidad de retos completados pendientes de reclamar para alimentar un badge visual numérico en la pestaña *"Retos"*.

### RF-03 — Historial de Actividad de XP (`XpHistoryFeed`)

- **RF-03.1** El sistema debe crear el componente accesible `XpHistoryFeed.tsx` para renderizar los eventos de `xpHistory`.
- **RF-03.2** Cada elemento del historial debe mostrar:
  - Icono asociado al tipo de acción (`Sparkles` para subida/bonus, `PackagePlus` para ítem, `CheckCircle2` para completado, `Star` para reseña, `Flame` para racha, `Trophy` para logro, `Zap` para reto).
  - Descripción legible de la acción.
  - Distintivo de XP ganada (p. ej. `+25 XP` en verde o acento temático).
  - Fecha y hora formateada en español (`"20 nov, 22:15"`).
- **RF-03.3** Si `xpHistory` está vacío, el componente debe mostrar un estado vacío sobrio indicando que la actividad reciente aparecerá al catalogar o completar ítems.
- **RF-03.4** El feed debe incluir un control para alternar entre ver los últimos 5 eventos o expandir hasta los 25 más recientes.

### RF-04 — Panel de Estadísticas del Coleccionista (`CollectorStatsPanel` & `stats.ts`)

- **RF-04.1** El módulo puro `src/features/gamification/core/stats.ts` debe implementar `calculateCollectorStats(params)` recibiendo colecciones e ítems y devolviendo:
  - `totalItems`: cantidad total de ítems.
  - `completedItems`: cantidad de ítems completados (`item.xpAwarded === true` o estado completado).
  - `completionRate`: porcentaje entero de 0 a 100 (`Math.round((completed / total) * 100)` o 0 si total es 0).
  - `ratedItemsCount`: ítems con valoración numérica (`rating !== undefined`).
  - `averageRating`: promedio de estrellas con un decimal (p. ej. `4.3`), o `0` si no hay valoraciones.
  - `reviewedItemsCount`: ítems con notas o reseña escrita.
  - `totalCollections`: cantidad total de colecciones.
  - `mostActiveCollection`: objeto `{ name, itemCount, completedCount }` de la colección con más ítems, o `null` si no hay colecciones.
- **RF-04.2** El componente `CollectorStatsPanel.tsx` debe renderizar estas métricas en tarjetas visuales de alto contraste con etiquetas semánticas y legibilidad táctil:
  - Tasa de completado general con barra de progreso.
  - Valoración media con visualización de estrellas.
  - Colección destacada con nombre e icono.
  - Total de notas y reseñas redactadas.

### RF-05 — Navegación e Integración en `/achievements`

- **RF-05.1** La página `AchievementsPage.tsx` debe estructurar su contenido mediante pestañas accesibles (`Tabs` o pills con `role="tablist"`):
  - **Pestaña "Logros":** La cuadrícula de 12 insignias y filtros de categoría de la Fase 3a.
  - **Pestaña "Retos":** Lista de retos semanales y de hitos con barras de progreso y botón interactivo *"Reclamar (+X XP)"*.
  - **Pestaña "Estadísticas":** El componente `CollectorStatsPanel`.
  - **Pestaña "Historial":** El componente `XpHistoryFeed`.
- **RF-05.2** La pestaña seleccionada debe persistir en el estado local de la página y ser totalmente operable mediante teclado (flechas o tabulación con `role="tab"`).

---

## Requisitos no funcionales

- **RNF-01 Pureza algorítmica y determinismo:** Las funciones de cálculo de semanas (`getWeekBoundaries`), evaluación de retos (`calculateChallengeProgress`) y estadísticas (`calculateCollectorStats`) deben ser 100% puras, recibiendo `today` como argumento sin usar `new Date()` ni `Date.now()`.
- **RNF-02 Tipado estricto:** Cero `any`, contratos explícitos en `src/interfaces/gamification.interface.ts` y props tipadas con `interface Props`.
- **RNF-03 Idempotencia:** Reclamar un reto ya reclamado o llamar repetidamente a `claimChallengeReward` debe ser inocuo.
- **RNF-04 Accesibilidad (WCAG 2.1 AA):** Pestañas con atributos ARIA (`role="tab"`, `aria-selected`, `aria-controls`), barras de progreso con `role="progressbar"` y contraste mínimo 4.5:1.
- **RNF-05 Rendimiento:** El cómputo de estadísticas y evaluación de retos sobre 500 ítems y 50 eventos de historial debe ejecutarse en menos de 5 ms.

---

## Casos límite

| CL | Escenario | Comportamiento esperado |
|---|---|---|
| CL-01 | Usuario nuevo con catálogo y retos vacíos | Las estadísticas muestran 0% de completado y 0.0 de valoración media sin errores de división por cero. Los retos muestran progreso `0 / target`. |
| CL-02 | Cambio de semana natural (lunes 00:00 UTC) | Los retos semanales se reinician a 0 de progreso bajo la nueva clave de semana. Retos semanales no reclamados de la semana anterior caducan limpiamente. |
| CL-03 | Usuario pulsa múltiples veces el botón "Reclamar" | Solo la primera pulsación suma XP y emite toast. Las pulsaciones posteriores quedan deshabilitadas con estado "Reclamado". |
| CL-04 | Colecciones sin ítems o con empate en cantidad | `mostActiveCollection` selecciona de forma determinista la primera con mayor número de ítems, o `null` si ninguna tiene ítems. |
| CL-05 | Historial de XP alcanza el tope de 50 eventos | El historial descarta los eventos más antiguos manteniendo los 50 más recientes sin desbordamiento de memoria ni de `localStorage`. |
| CL-06 | Todos los ítems tienen rating `undefined` | `averageRating` devuelve 0 y el panel muestra "Sin valoraciones aún" en lugar de `NaN` o `0.0`. |

---

## Fuera de alcance

- Retos multijugador competitivos o cooperativos entre diferentes usuarios.
- Recompensas de ítems cosméticos, skins o avatares (fuera de la economía de XP).
- Notificaciones push nativas fuera del navegador web.
- Exportación o backup en archivo CSV de las estadísticas (reservado para Fase 5).

---

## Criterios de finalización

La spec se considerará implementada cuando:

- [x] Contratos ampliados en `src/interfaces/gamification.interface.ts` (`Challenge`, `ChallengeProgress`, `CollectorStats`, `ChallengeCategory`) sin ningún `any`.
- [x] Lógica pura en `src/features/gamification/core/challenges.ts` con catálogo base, cálculo de semanas ISO y evaluador de progreso, con 100% de tests en `challenges.test.ts`.
- [x] Lógica pura en `src/features/gamification/core/stats.ts` con cálculo de analíticas del coleccionista, con 100% de tests en `stats.test.ts`.
- [x] Store `gamification.store.ts` ampliado con `claimedChallengeIds: string[]`, acción `claimChallengeReward` y tests en `gamification.store.test.ts`.
- [x] Componente `ChallengeCard.tsx` accesible con barra de progreso, estado reclamable y botón interactivo.
- [x] Componente `XpHistoryFeed.tsx` accesible mostrando eventos recientes de XP con iconos y fechas relativas/formateadas.
- [x] Componente `CollectorStatsPanel.tsx` con métricas clave del coleccionista.
- [x] Integración en `AchievementsPage.tsx` mediante pestañas organizadas (*Logros*, *Retos*, *Estadísticas*, *Historial*).
- [x] Puerta de calidad estática impecable: `npx tsc --noEmit`, `npm run lint`, `npm run test` y `npm run build` en verde.
- [x] Verificación en vivo mediante Chrome DevTools MCP en `http://localhost:5173/`.
- [x] `MEMORY.md` actualizado (< 50 líneas).

---

## Dudas resueltas

- **Duda 1 (Reclamación manual e interactiva — Opción A):** Confirmada la reclamación manual explícita mediante botón *"Reclamar (+X XP)"* en `ChallengeCard` al alcanzar `current >= target`. Al pulsar, se invoca `claimChallengeReward` en `gamification.store.ts`, se suma la XP, se registra la clave en `claimedChallengeIds` y se emiten los toasts celebratorios. La pestaña *Retos* muestra un badge contador con las recompensas pendientes de reclamar.
- **Duda 2 (Clave semanal ISO determinista — Opción A):** Confirmada la composición `${challenge.id}_${weekKey}` (p. ej. `weekly_add_items_2026_W47`), evaluando las fechas de ítems y eventos dentro del rango `[startOfWeek, endOfWeek]` derivado puramente de `today` (`YYYY-MM-DD`). Los retos se renuevan automáticamente cada lunes a las 00:00 UTC sin necesidad de procesos de fondo.
- **Duda 3 (Navegación por pestañas accesibles — Opción A):** Confirmada la estructuración de `AchievementsPage.tsx` en cuatro pestañas modulares (*Logros*, *Retos*, *Estadísticas*, *Historial*) con atributos ARIA completos (`role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`).
