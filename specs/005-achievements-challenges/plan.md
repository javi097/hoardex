# Plan de Arquitectura Técnica 005 — Dynamic Challenges, XP History & Collector Stats
Estado: borrador

---

## 1. Archivos y responsabilidades

```text
src/
├── interfaces/
│   └── gamification.interface.ts             # Ampliación: Challenge, ChallengeProgress, CollectorStats, WeekBoundaries
├── features/
│   └── gamification/
│       ├── core/
│       │   ├── challenges.ts                 # Catálogo declarativo CHALLENGES, getWeekBoundaries y calculateChallengeProgress
│       │   ├── challenges.test.ts            # Tests deterministas de cálculo de semana ISO, progreso de retos y clamp
│       │   ├── stats.ts                      # Función pura calculateCollectorStats (tasa completado, media estrellas, colección activa)
│       │   └── stats.test.ts                 # Tests deterministas de cálculo de estadísticas y casos de borde (catálogo vacío/nulos)
│       ├── store/
│       │   ├── gamification.store.ts         # Ampliación: claimedChallengeIds: string[], acción claimChallengeReward
│       │   └── gamification.store.test.ts    # Tests de reclamación idempotente, suma de XP, historial y subida de nivel
│       └── components/
│           ├── ChallengeCard.tsx             # Tarjeta de reto con barra de progreso, XP y botón interactivo "Reclamar (+X XP)"
│           ├── ChallengeCard.test.tsx        # Tests de estados de reto (en progreso, completado reclamable, reclamado)
│           ├── XpHistoryFeed.tsx             # Lista cronológica accesible de eventos de XP con iconos y formato de fechas
│           ├── XpHistoryFeed.test.tsx        # Tests de renderizado de eventos, toggle de expansión y empty state
│           ├── CollectorStatsPanel.tsx       # Cuadrícula de tarjetas de métricas del coleccionista
│           └── CollectorStatsPanel.test.tsx  # Tests del panel de estadísticas y formateo
└── pages/
    ├── AchievementsPage.tsx                  # Rediseño con navegación por pestañas accesibles (Logros, Retos, Estadísticas, Historial)
    └── AchievementsPage.test.tsx             # Tests de conmutación de pestañas con teclado y badge de retos pendientes
```

---

## 2. Contratos y tipos (`src/interfaces/gamification.interface.ts`)

```typescript
export type ChallengeCategory = 'weekly' | 'milestone';

export interface WeekBoundaries {
  weekKey: string;     // Formato 'YYYY-Www', ej. '2026-W47'
  startOfWeek: string; // Formato 'YYYY-MM-DD' (Lunes 00:00 UTC)
  endOfWeek: string;   // Formato 'YYYY-MM-DD' (Domingo 23:59 UTC)
}

export interface ChallengeEvaluationState {
  collections: {
    id: string;
    name: string;
    statuses: { id: string; isCompleted: boolean }[];
  }[];
  items: {
    id: string;
    collectionId: string;
    statusId: string;
    xpAwarded?: boolean;
    rating?: number;
    notes?: string;
    reviewXpAwarded?: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  xpHistory: XpEvent[];
  totalXp: number;
  streak: StreakInfo;
  claimedChallengeIds: string[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  icon: string;
  target: number;
  xpReward: number;
  computeProgress: (
    state: ChallengeEvaluationState,
    today: string,
    boundaries: WeekBoundaries
  ) => number;
}

export interface ChallengeProgress {
  challengeId: string;
  uniqueKey: string;       // id o id_YYYY-Www para retos semanales
  title: string;
  description: string;
  category: ChallengeCategory;
  icon: string;
  current: number;
  target: number;
  percentage: number;
  xpReward: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface CollectorStats {
  totalItems: number;
  completedItems: number;
  completionRate: number;      // 0..100
  ratedItemsCount: number;
  averageRating: number;       // 0.0..5.0 con 1 decimal
  reviewedItemsCount: number;
  totalCollections: number;
  mostActiveCollection: {
    name: string;
    itemCount: number;
    completedCount: number;
  } | null;
}
```

---

## 3. Algoritmos matemáticos y lógica del Core

### 3.1 Cálculo puro de semanas ISO (`getWeekBoundaries(dateStr)`)

```typescript
/**
 * Calcula de forma 100% determinista el lunes inicial y el domingo final de la semana ISO
 * para una fecha 'YYYY-MM-DD', además de la clave 'YYYY-Www'.
 * Sin Date.now() ni reloj del sistema.
 */
export function getWeekBoundaries(dateStr: string): WeekBoundaries {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  // Fecha en UTC medianoche
  const target = new Date(Date.UTC(year, month, day));
  const dayOfWeek = target.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  // Ajuste ISO: Lunes = 0, Domingo = 6
  const isoDay = (dayOfWeek + 6) % 7;

  // Lunes de la semana
  const monday = new Date(target);
  monday.setUTCDate(target.getUTCDate() - isoDay);

  // Domingo de la semana
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  // Clave de semana ISO
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const weekNumber = Math.round(
    ((thursday.getTime() - firstThursday.getTime()) / 86400000 +
      ((firstThursday.getUTCDay() + 6) % 7)) /
      7
  );

  const weekPad = String(weekNumber).padStart(2, '0');
  const weekKey = `${thursday.getUTCFullYear()}-W${weekPad}`;

  return {
    weekKey,
    startOfWeek: monday.toISOString().slice(0, 10),
    endOfWeek: sunday.toISOString().slice(0, 10),
  };
}
```

### 3.2 Catálogo base de retos y evaluación pura (`challenges.ts`)

- **Retos semanales:**
  - `weekly_add_items`: Añadir 2 ítems en la semana actual. Cuenta ítems con `createdAt.slice(0, 10)` entre `startOfWeek` y `endOfWeek`. Meta: 2 (+30 XP).
  - `weekly_complete_items`: Completar 1 ítem en la semana actual. Cuenta eventos en `xpHistory` con `action: 'complete_item'` entre `startOfWeek` y `endOfWeek`, o ítems completados con `updatedAt` en rango. Meta: 1 (+40 XP).
  - `weekly_review_items`: Valorar o reseñar 1 ítem en la semana actual. Cuenta eventos con `action: 'rate_and_review'` entre `startOfWeek` y `endOfWeek`. Meta: 1 (+25 XP).
- **Retos de hitos:**
  - `milestone_collections`: Crear al menos 2 colecciones. Meta: 2 (+30 XP).
  - `milestone_star_ratings`: Calificar al menos 3 ítems con estrellas (`rating !== undefined`). Meta: 3 (+50 XP).
  - `milestone_streak`: Alcanzar racha récord de al menos 3 días (`streak.longestStreak >= 3`). Meta: 3 (+40 XP).

### 3.3 Estadísticas puras del coleccionista (`stats.ts`)

```typescript
export function calculateCollectorStats(
  collections: { id: string; name: string }[],
  items: {
    collectionId: string;
    xpAwarded?: boolean;
    rating?: number;
    notes?: string;
  }[]
): CollectorStats {
  const totalItems = items.length;
  const completedItems = items.filter((it) => it.xpAwarded).length;
  const completionRate =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const ratedItems = items.filter(
    (it) => it.rating !== undefined && it.rating > 0
  );
  const ratedItemsCount = ratedItems.length;
  const averageRating =
    ratedItemsCount > 0
      ? Math.round(
          (ratedItems.reduce((acc, it) => acc + (it.rating ?? 0), 0) /
            ratedItemsCount) *
            10
        ) / 10
      : 0;

  const reviewedItemsCount = items.filter(
    (it) => Boolean(it.notes && it.notes.trim().length > 0)
  ).length;

  let mostActiveCollection: CollectorStats['mostActiveCollection'] = null;
  if (collections.length > 0) {
    let bestCount = -1;
    for (const col of collections) {
      const colItems = items.filter((it) => it.collectionId === col.id);
      if (colItems.length > bestCount) {
        bestCount = colItems.length;
        const colCompleted = colItems.filter((it) => it.xpAwarded).length;
        mostActiveCollection = {
          name: col.name,
          itemCount: colItems.length,
          completedCount: colCompleted,
        };
      }
    }
  }

  return {
    totalItems,
    completedItems,
    completionRate,
    ratedItemsCount,
    averageRating,
    reviewedItemsCount,
    totalCollections: collections.length,
    mostActiveCollection,
  };
}
```

---

## 4. Ampliación del Store (`gamification.store.ts`)

- **Estado:**
  `claimedChallengeIds: string[]` (inicializado como `[]`, persistido bajo `hoardex-gamification`).
- **Acción `claimChallengeReward(challengeKey: string, now: string)`:**
  1. Si `claimedChallengeIds.includes(challengeKey)`, aborta y devuelve resultado nulo (idempotencia estricta).
  2. Localiza la definición del reto y su recompensa en XP.
  3. Suma `xpReward` a `totalXp`.
  4. Añade `challengeKey` a `claimedChallengeIds`.
  5. Agrega un evento a `xpHistory`: `{ id, action: 'achievement', description: 'Reto completado: ...', xpGained, timestamp: now }`.
  6. Recalcula el nivel y dispara notificaciones correspondientes mediante `notifyGamificationResult`.

---

## 5. Diseño de Componentes UI

### 5.1 `ChallengeCard.tsx`
- Tarjeta estilizada con borde sutil y categoría ("SEMANAL" en azul/índigo, "HITO" en ámbar).
- Título, descripción e icono representativo.
- Barra de progreso porcentual (`role="progressbar"`).
- Botón de acción:
  - Si `!isCompleted`: botón deshabilitado con texto `{current} / {target}`.
  - Si `isCompleted && !isClaimed`: botón primario con animación de brillo *"Reclamar (+X XP)"*.
  - Si `isClaimed`: badge o botón desactivado con icono `CheckCircle2` y texto *"Reclamado"*.

### 5.2 `XpHistoryFeed.tsx`
- Contenedor con lista accesible (`role="feed"` o lista semántica).
- Cada elemento muestra icono contextual según la acción, descripción, distinción de XP (+X XP en tipografía mono) y fecha formateada.
- Control de alternancia entre los 5 más recientes y desplegar hasta 25 eventos.
- Estado vacío elegante si no hay actividad registrada.

### 5.3 `CollectorStatsPanel.tsx`
- Grid responsivo de tarjetas métricas:
  - Tasa global de finalización (con medidor visual porcentual).
  - Promedio de estrellas con visualización compacta de estrellas de valoración.
  - Colección más activa (con número de ítems y ratio de completado).
  - Reseñas redactadas y total de ítems catalogados.

### 5.4 `AchievementsPage.tsx`
- Reestructuración mediante pestañas accesibles de Shadcn/Tailwind (`role="tablist"`):
  - Tab 1: **Logros** (12 insignias de la Fase 3a con filtros de categorías).
  - Tab 2: **Retos** (lista de retos activos semanales e hitos, con badge numérico en la pestaña indicando cuántos retos están completados pendientes de reclamar).
  - Tab 3: **Estadísticas** (`CollectorStatsPanel`).
  - Tab 4: **Historial** (`XpHistoryFeed`).

---

## 6. Plan de Implementación por Capas (Tareas)

- **T1. Contratos y tipado estricto:**
  Ampliación de `src/interfaces/gamification.interface.ts` con todos los contratos de retos y estadísticas.
- **T2. Capa Core: Retos declarativos y cálculo de semanas ISO:**
  Creación de `src/features/gamification/core/challenges.ts` y suite de tests `challenges.test.ts`.
- **T3. Capa Core: Métricas del coleccionista:**
  Creación de `src/features/gamification/core/stats.ts` y suite de tests `stats.test.ts`.
- **T4. Capa Store: Reclamación idempotente de retos:**
  Actualización de `gamification.store.ts` con `claimedChallengeIds`, `claimChallengeReward` y tests en `gamification.store.test.ts`.
- **T5. Componentes UI y navegación por pestañas:**
  Creación de `ChallengeCard.tsx`, `XpHistoryFeed.tsx`, `CollectorStatsPanel.tsx`, integración de pestañas accesibles y badge contador en `AchievementsPage.tsx`, con sus suites de pruebas.
- **T6. Puerta de calidad, verificación visual en Chrome DevTools MCP y memoria:**
  Ejecución de `tsc`, `lint`, `test`, `build`, validación interactiva completa con DevTools MCP y actualización de `MEMORY.md`.

---

## 7. Verificación y Criterios de Aceptación de la Fase

1. **Pureza y Determinismo:** Cero llamadas a `Date.now()` o `new Date()` en `challenges.ts` y `stats.ts`.
2. **Idempotencia:** Reclamar un reto suma la experiencia una sola vez, deshabilitando el botón permanentemente.
3. **Reseteo semanal determinista:** Al cambiar la fecha `today` al lunes siguiente, los retos semanales calculan su nueva clave `YYYY-Www` e inician en 0.
4. **Calidad:** 100% de tests en verde en Vitest, 0 warnings en ESLint y compilación de producción exitosa.
