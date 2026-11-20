# Spec 004 — Gamification Engine (XP, Levels, Streaks & Achievements)
Estado: implementada

---

## Contexto y objetivo

En las fases anteriores (`001-core-catalog-mock`, `002-external-providers` y `003-reviews-filters-sorting`), Hoardex consolidó su catálogo integral: colecciones personalizadas, adaptadores externos reales, fichas técnicas enriquecidas con valoración y notas, y herramientas avanzadas de búsqueda y ordenación.

Esta especificación corresponde a la **Fase 3a: Motor de Gamificación**. Su objetivo es dotar a la aplicación de un sistema de progresión intrínseco, motivador y lúdico para transformar la catalogación y el consumo de aficiones en un hábito gratificante mediante cuatro pilares:
1. **Economía de Experiencia (XP) idempotente:** Concesión de puntos de experiencia basada en acciones reales del usuario (añadir ítems, completarlos, redactar reseñas y dominar colecciones), garantizando matemáticamente que ninguna acción repetida o deshecha duplique puntos.
2. **Curva matemática de niveles y rangos:** Progresión continua donde el nivel y el porcentaje de avance se derivan puramente del XP acumulado, asignando rangos temáticos prestigiosos ("Iniciado", "Archivista", "Maestro del Catálogo").
3. **Sistema de rachas diarias determinista:** Detección de días consecutivos de actividad mediante funciones puras que reciben fechas naturales del calendario (`YYYY-MM-DD`), otorgando bonificaciones de racha.
4. **Catálogo declarativo de logros y visualización de progreso:** Reglas desacopladas para evaluar hitos (coleccionar, completar, evaluar, rachas), acompañadas de una barra compacta en la cabecera (`GamificationHeaderBar`) y una vista completa de logros (`/achievements`).

---

## Usuarios

- **Coleccionista motivado:** Usuario que disfruta viendo crecer su nivel y acumulando experiencia al completar ítems o catalogar nuevos ejemplares.
- **Buscador de hábitos (Streaker):** Usuario que busca mantener una racha diaria activa visitando, catalogando o completando sus aficiones con regularidad.
- **Completista / Cazador de logros:** Usuario orientado a metas que busca desbloquear todos los logros declarativos (bronce, plata, oro, platino) y explorar las diferentes capacidades de la plataforma.

---

## Historias de usuario

- **HU-01.** Como coleccionista, quiero ganar puntos de experiencia (XP) al añadir ítems, completarlos o redactar reseñas, para sentir que mi esfuerzo de catalogación tiene recompensa.
- **HU-02.** Como coleccionista, quiero que el XP por completar un ítem se otorgue una única vez, de modo que cambiar un ítem entre completado y pendiente no genere puntos infinitos ni corruptos.
- **HU-03.** Como coleccionista, quiero ver en la cabecera de la app mi nivel actual, barra de progreso al siguiente nivel y mi racha de días activos.
- **HU-04.** Como coleccionista, quiero recibir una notificación toast visualmente celebratoria cada vez que suba de nivel o desbloquee un nuevo logro.
- **HU-05.** Como cazador de logros, quiero consultar una página dedicada (`/achievements`) con todos los logros disponibles, su nivel de dificultad (tier), su recompensa en XP, fecha de obtención y progreso de los pendientes.
- **HU-06.** Como buscador de hábitos, quiero que mi racha aumente si realizo acciones en días consecutivos, se mantenga si hago varias acciones en el mismo día, y se reinicie con justicia si transcurre más de un día sin actividad.

---

## Definiciones

| Término | Significado en Hoardex |
|---|---|
| **Experiencia Total (`totalXp`)** | Suma acumulada de todos los puntos de experiencia obtenidos por el usuario a lo largo de su historial. Fuente de verdad inmutable y creciente. |
| **Nivel Derivado (`level`)** | Número entero positivo derivado puramente de `totalXp` mediante la curva matemática del core. No se almacena por separado en el store. |
| **Progreso de Nivel (`LevelProgress`)** | Objeto puro que calcula el nivel actual, título honorífico, XP relativo dentro del nivel, XP necesario para el siguiente nivel y porcentaje de 0 a 100%. |
| **Racha Diaria (`StreakInfo`)** | Número de días naturales consecutivos con al menos una acción registrada. Calculada con funciones puras en base a `lastActivityDate` y `today`. |
| **Logro Declarativo (`Achievement`)** | Objeto inmutable con identificador, título, descripción, icono, categoría, tier (bronce, plata, oro, platino), recompensa en XP y predicado puro `(state) => boolean`. |
| **Idempotencia de Logros** | Un logro solo puede ser desbloqueado una única vez; si ya existe en `unlockedAchievements`, no se vuelve a recompensar ni notificar. |

---

## Requisitos funcionales (Sintaxis EARS)

### RF-01 — Curva de Experiencia y Niveles Derivados

- **RF-01.1** El sistema debe otorgar experiencia en base a la tabla de reglas fijas `XP_RULES`:
  - `add_item`: +10 XP al registrar un ítem nuevo.
  - `complete_item`: +50 XP al marcar un ítem como completado por primera vez (`item.xpAwarded === false`).
  - `rate_and_review`: +25 XP al asignar una valoración (estrellas) o redactar notas por primera vez a un ítem (`item.reviewXpAwarded === false`).
  - `complete_collection`: +100 XP cuando todos los ítems de una colección (mínimo 3 ítems) alcancen el estado completado.
  - `daily_streak_bonus`: +15 XP al extender una racha a un nuevo día consecutivo.
- **RF-01.2** Cuando un ítem completado sea devuelto a un estado no completado y posteriormente vuelto a completar, el sistema **no debe** otorgar experiencia adicional.
- **RF-01.3** El sistema debe derivar el nivel y el progreso mediante la función pura `calculateLevelProgress(totalXp)`:
  - Cada nivel $L$ requiere una cantidad base de $100 + (L - 1) \times 50$ XP.
  - La progresión es determinista: Nivel 1 (0–99 XP), Nivel 2 (100–249 XP), Nivel 3 (250–449 XP), Nivel 4 (450–699 XP), Nivel 5 (700–999 XP), etc.
- **RF-01.4** El sistema debe asociar un título de rango honorífico según el nivel alcanzado:
  - Nivel 1: *Iniciado*
  - Nivel 2: *Aprendiz de Coleccionista*
  - Nivel 3: *Catalogador Curioso*
  - Nivel 4: *Aficionado Dedicado*
  - Nivel 5: *Archivista*
  - Nivel 6: *Guardián de Joyas*
  - Nivel 7: *Conservador Experto*
  - Nivel 8: *Gran Erudito*
  - Nivel 9: *Maestro del Catálogo*
  - Nivel 10+: *Leyenda de Hoardex*

### RF-02 — Motor Puro de Rachas Diarias (`streaks.ts`)

- **RF-02.1** El sistema debe evaluar y actualizar las rachas mediante la función pura `calculateStreak(currentStreak, longestStreak, lastActivityDate, today)`:
  - `lastActivityDate` y `today` deben ser cadenas en formato ISO de día natural (`YYYY-MM-DD`).
- **RF-02.2** Cuando el usuario realiza una acción en el mismo día que `lastActivityDate` (`today === lastActivityDate`), el sistema debe mantener `currentStreak` y `longestStreak` intactos (`updated: false`).
- **RF-02.3** Cuando el usuario realiza una acción en el día inmediatamente posterior a `lastActivityDate` (diferencia de exactamente 1 día calendario), el sistema debe incrementar `currentStreak` en 1 y actualizar `longestStreak` si la nueva racha supera la máxima histórica (`updated: true`).
- **RF-02.4** Cuando el usuario realiza una acción habiendo transcurrido más de 1 día calendario desde `lastActivityDate`, el sistema debe reiniciar `currentStreak` a 1 manteniendo `longestStreak` como récord histórico.
- **RF-02.5** Si el usuario no cuenta con actividad previa (`lastActivityDate === null`), el sistema debe inicializar `currentStreak` a 1 y `longestStreak` a 1.

### RF-03 — Catálogo Declarativo y Evaluador de Logros (`achievements.ts`)

- **RF-03.1** El sistema debe definir una colección declarativa de logros (`ACHIEVEMENTS`) clasificados por categorías (`'catalog'`, `'completion'`, `'reviews'`, `'streaks'`, `'special'`) y tiers (`'bronze'`, `'silver'`, `'gold'`, `'platinum'`).
- **RF-03.2** El catálogo base inicial debe incluir al menos los siguientes 12 logros:
  1. `first_item` (*Primer ejemplar*, Bronce, +20 XP): Añadir el primer ítem al catálogo.
  2. `five_items` (*Coleccionista activo*, Bronce, +40 XP): Añadir 5 ítems en total.
  3. `twenty_five_items` (*Bóveda en expansión*, Plata, +80 XP): Acumular 25 ítems en total.
  4. `first_completed` (*Objetivo cumplido*, Bronce, +30 XP): Completar tu primer ítem.
  5. `five_completed` (*Hábito de finalización*, Plata, +70 XP): Completar 5 ítems en total.
  6. `first_review` (*Crítica constructiva*, Bronce, +25 XP): Escribir tu primera reseña o nota personal.
  7. `five_reviews` (*Voz autorizada*, Plata, +60 XP): Valorar y reseñar 5 ítems.
  8. `multi_collector` (*Curiosidad multidisciplinar*, Plata, +60 XP): Poseer ítems en al menos 3 colecciones distintas.
  9. `collection_master` (*Maestro de la estantería*, Oro, +120 XP): Completar el 100% de los ítems de una colección de al menos 3 ítems.
  10. `streak_3` (*Constancia inicial*, Bronce, +35 XP): Mantener una racha de 3 días consecutivos.
  11. `streak_7` (*Fervor semanal*, Plata, +75 XP): Mantener una racha de 7 días consecutivos.
  12. `level_5` (*Archivista de prestigio*, Oro, +100 XP): Alcanzar el nivel 5 de experiencia.
- **RF-03.3** El evaluador puro `evaluateAchievements(evaluationState)` debe recibir de forma agnóstica el estado del catálogo (`collections`, `items`, `totalXp`, `streak`, `alreadyUnlockedIds`) y devolver exclusivamente los nuevos logros que cumplen la condición y no estaban desbloqueados previamente.

### RF-04 — Store de Gamificación (`gamification.store.ts`)

- **RF-04.1** El sistema debe persistir el estado de gamificación en `localStorage` bajo la clave `hoardex-gamification`, conteniendo: `totalXp`, `streak` (`currentStreak`, `longestStreak`, `lastActivityDate`), `unlockedAchievements` (array de `{ achievementId, unlockedAt }`) e historial reciente de eventos de XP (`xpHistory`).
- **RF-04.2** Las acciones del store (`awardXp`, `recordActivity`, `checkAchievements`) deben operar de forma atómica e inmutable.
- **RF-04.3** Cuando se produzca una subida de nivel o se desbloqueen nuevos logros tras una acción, el store debe actualizar la experiencia concedida por el logro y notificar visualmente al usuario.

### RF-05 — Componentes UI de Gamificación

- **RF-05.1** El sistema debe integrar en el encabezado general (`Header.tsx`) el componente `GamificationHeaderBar`:
  - Visualización del nivel actual y título de rango.
  - Mini barra de progreso porcentual al siguiente nivel.
  - Indicador de racha activa (`🔥 X días`), resaltado si se realizó actividad hoy o atenuado si está pendiente para el día en curso.
  - Enlace directo a la página de logros `/achievements`.
- **RF-05.2** El sistema debe crear la página `/achievements` (`AchievementsPage.tsx`):
  - Encabezado con tarjeta de estado general: Nivel, título, barra de XP detallada (p. ej. *140 / 200 XP al Nivel 3*), total acumulado y estadísticas de racha.
  - Píldoras de filtrado por categoría de logro (Todas, Catálogo, Completados, Reseñas, Rachas).
  - Contador global de logros desbloqueados (p. ej. *4 de 12 logros conseguidos*).
  - Cuadrícula de tarjetas de logro (`AchievementCard.tsx`):
    - Logros desbloqueados: icono en color según su tier, fecha de desbloqueo formateada y distintivo de XP obtenida.
    - Logros bloqueados: aspecto atenuado con candado/silueta tenue, descripción del reto y XP a obtener.
- **RF-05.3** El sistema debe disparar notificaciones toast distintivas con Sonner:
  - Al subir de nivel: `toast.success("¡Subiste de nivel! Has alcanzado el Nivel X: [Título]")`.
  - Al desbloquear logro: `toast.success("¡Logro desbloqueado! [Título] (+X XP)")`.

---

## Requisitos no funcionales

- **RNF-01 Pureza y determinismo:** Toda la matemática de niveles, progreso, días de racha y evaluación de logros debe residir en funciones puras en `src/features/gamification/core/`, sin llamadas a `Date.now()`, `new Date()` ni dependencias de React/Zustand.
- **RNF-02 Tipado estricto:** Cero `any`, contratos explícitos en `src/interfaces/gamification.interface.ts` y props tipadas con `interface Props`.
- **RNF-03 Idempotencia:** La reactivación o edición de ítems no debe generar XP duplicado. La apertura múltiple de logros no debe disparar recompensas adicionales.
- **RNF-04 Rendimiento y no-bloqueo:** El cálculo de nivel y evaluación de logros sobre un catálogo de hasta 500 ítems debe ejecutarse en menos de 5 ms.
- **RNF-05 Accesibilidad:** Todos los elementos interactivos, barras de progreso y tarjetas de logros deben tener etiquetas ARIA (`role="progressbar"`, `aria-valuenow`, `aria-valuemax`, `aria-label`).

---

## Casos límite

| CL | Escenario | Comportamiento esperado |
|---|---|---|
| CL-01 | Usuario nuevo con 0 XP | Nivel 1 ("Iniciado"), 0/100 XP, 0% de progreso, racha 0 días, ningún logro desbloqueado. |
| CL-02 | Usuario completa un ítem, lo vuelve a pendiente y lo completa de nuevo | El XP (+50) se otorga únicamente la primera vez. `xpAwarded` permanece en `true`. |
| CL-03 | Dos o más acciones en el mismo día natural | La racha se mantiene en su valor actual sin sumar días dobles; `longestStreak` no se altera indebidamente. |
| CL-04 | Acción realizada tras 2 o más días de inactividad | La racha actual se reinicia a 1; `longestStreak` conserva el récord previo. |
| CL-05 | Salto múltiple de niveles con una sola recompensa grande (p. ej. logro de +150 XP) | `calculateLevelProgress` calcula correctamente el nuevo nivel resultante y emite notificación adecuada. |
| CL-06 | Catálogo vacío en la página de logros | Los logros bloqueados se muestran con claridad sin errores de índice ni `undefined`. |
| CL-07 | Edición sucesiva de notas en un ítem | Solo la primera vez que se añade valoración o nota se otorga el XP de reseña (`reviewXpAwarded: true`). |
| CL-08 | Colección completada pero con menos de 3 ítems | La regla de colección maestra requiere un mínimo de 3 ítems para evitar exploits con colecciones triviales de 1 ítem. |

---

## Fuera de alcance

- Tienda de cosméticos o compra de avatares con puntos de XP.
- Tablas de clasificación globales multijugador (requieren backend y persistencia distribuida en Fase 4/Supabase).
- Retos semanales temporizados con caducidad en servidor (se abordarán tras la sincronización de usuarios).
- Sistema de gemas o monedas premium.

---

## Criterios de finalización

La spec se considera implementada cuando:

- [x] Contratos definidos en `src/interfaces/gamification.interface.ts` sin ningún `any`.
- [x] Módulo puro `src/features/gamification/core/levels.ts` con curva de XP, cálculo de niveles y títulos honoríficos, con 100% de tests unitarios pasando en `levels.test.ts`.
- [x] Módulo puro `src/features/gamification/core/streaks.ts` con cálculo determinista de rachas (mismo día, día consecutivo, racha rota, inicialización), con 100% de tests en `streaks.test.ts`.
- [x] Módulo puro `src/features/gamification/core/achievements.ts` con catálogo de logros y evaluador idempotente `evaluateAchievements`, con 100% de tests en `achievements.test.ts`.
- [x] Store `src/features/gamification/store/gamification.store.ts` con persistencia en `localStorage` (`hoardex-gamification`) y tests en `gamification.store.test.ts`.
- [x] Integración en stores de ítems y colecciones para disparar la concesión de XP y evaluación de logros al añadir, completar o reseñar.
- [x] Componente `GamificationHeaderBar` integrado en `Header.tsx` mostrando nivel, XP y racha.
- [x] Página `/achievements` (`AchievementsPage.tsx`) con desglose de progreso, estadísticas y cuadrícula de tarjetas de logros.
- [x] Notificaciones toast configuradas para subidas de nivel y desbloqueo de logros.
- [x] Puerta de calidad estática limpia: `npx tsc --noEmit`, `npm run lint`, `npm run test` y `npm run build` en verde.
- [x] Verificación en vivo mediante Chrome DevTools MCP en `http://localhost:5173/`:
  - [x] Añadir ítem y verificar incremento de XP e inicio de racha.
  - [x] Completar ítem y verificar concesión de XP (+50) y desbloqueo de logro "Primer paso" / "Objetivo cumplido".
  - [x] Visualización en cabecera de la barra de nivel y racha.
  - [x] Navegación y consulta de logros en `/achievements`.

---

## Dudas resueltas

- **Duda 1 (Ubicación de la vista de Logros — Opción A):** Confirmada la ruta dedicada `/achievements` (`AchievementsPage.tsx`) en el router principal, enlazada desde el widget `GamificationHeaderBar` en el encabezado general y con navegación accesible de regreso al inicio.
- **Duda 2 (Acciones que extienden la racha diaria — Opción A):** Confirmado que únicamente extienden la racha diaria las acciones significativas del usuario: crear una colección, añadir un ítem, completar un ítem por primera vez o valorar/reseñar un ítem por primera vez. La apertura pasiva de la web no cuenta para la racha.
- **Duda 3 (Idempotencia de XP en reseñas — Opción A):** Confirmada la ampliación de `Item` con `reviewXpAwarded?: boolean` (inicializado como `false` por defecto en ítems previos), asegurando que el XP de valoración y reseña se conceda una única vez por ítem de forma estrictamente idempotente.
- **Directriz de arquitectura (Desacoplamiento de stores):** `gamification.store.ts` se diseña sin dependencias circulares con `collections.store.ts` ni `items.store.ts`. Las funciones de evaluación reciben los arrays planos de colecciones e ítems desde los componentes orquestadores o acciones del ciclo de vida.
