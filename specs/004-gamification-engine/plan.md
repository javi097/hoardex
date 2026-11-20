# Plan de Arquitectura Técnica 004 — Gamification Engine (XP, Levels, Streaks & Achievements)

---

## 1. Archivos y responsabilidades

```text
src/
├── interfaces/
│   ├── gamification.interface.ts             # Contratos globales del motor de gamificación
│   └── item.interface.ts                     # Extensión con reviewXpAwarded?: boolean
├── features/
│   └── gamification/
│       ├── core/
│       │   ├── levels.ts                     # Curva matemática de XP, cálculo de nivel, títulos de rango y XP_RULES
│       │   ├── levels.test.ts                # Tests deterministas de niveles y curva de XP
│       │   ├── streaks.ts                    # Cálculo puro de rachas diarias con fechas 'YYYY-MM-DD'
│       │   ├── streaks.test.ts               # Tests de días consecutivos, mismo día, racha rota y transiciones
│       │   ├── achievements.ts               # Catálogo declarativo ACHIEVEMENTS y función pura evaluateAchievements
│       │   └── achievements.test.ts          # Tests de evaluación e idempotencia de logros
│       ├── store/
│       │   ├── gamification.store.ts         # Store Zustand (hoardex-gamification) desacoplado sin dependencias circulares
│       │   └── gamification.store.test.ts    # Tests unitarios del store y persistencia defensiva
│       └── components/
│           ├── GamificationHeaderBar.tsx     # Widget compacto en Header con nivel, progreso, racha y acceso a logros
│           ├── GamificationHeaderBar.test.tsx# Tests del widget de cabecera
│           ├── AchievementCard.tsx           # Tarjeta accesible de logro (desbloqueado vs bloqueado, tier, recompensa)
│           └── AchievementCard.test.tsx      # Tests de visualización y estados ARIA de la tarjeta
├── pages/
│   └── AchievementsPage.tsx                  # Vista dedicada /achievements con resumen de perfil y catálogo filtrable
├── components/custom/
│   └── Header.tsx                            # Inclusión de GamificationHeaderBar
└── App.tsx                                   # Registro de la ruta /achievements en el router
```

---

## 2. Contratos globales (`src/interfaces/gamification.interface.ts`)

```typescript
export type XpActionType =
  | 'add_item'
  | 'complete_item'
  | 'rate_and_review'
  | 'complete_collection'
  | 'daily_streak'
  | 'achievement';

export interface XpEvent {
  id: string;
  action: XpActionType;
  xpGained: number;
  description: string;
  targetId?: string;
  timestamp: string;
}

export interface LevelProgress {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  totalXp: number;
  progressPercentage: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null; // Formato 'YYYY-MM-DD'
  isActiveToday: boolean;
}

export interface StreakCalculationResult {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  isExtended: boolean;
}

export type AchievementCategory =
  | 'all'
  | 'catalog'
  | 'completion'
  | 'reviews'
  | 'streaks'
  | 'special';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface GamificationEvaluationState {
  collections: { id: string; statuses: { id: string; isCompleted: boolean }[] }[];
  items: {
    id: string;
    collectionId: string;
    statusId: string;
    xpAwarded?: boolean;
    rating?: number;
    notes?: string;
    reviewXpAwarded?: boolean;
  }[];
  totalXp: number;
  streak: StreakInfo;
  alreadyUnlockedIds: Set<string>;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Nombre del icono de Lucide
  category: Exclude<AchievementCategory, 'all'>;
  tier: AchievementTier;
  xpReward: number;
  condition: (state: GamificationEvaluationState) => boolean;
}

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: string; // ISO 8601
}
```

---

## 3. Funciones puras del Core

### 3.1 Niveles y reglas de experiencia (`src/features/gamification/core/levels.ts`)

```typescript
export const XP_RULES = {
  ADD_ITEM: 10,
  COMPLETE_ITEM: 50,
  RATE_AND_REVIEW: 25,
  COMPLETE_COLLECTION: 100,
  DAILY_STREAK_BONUS: 15,
} as const;

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Iniciado',
  2: 'Aprendiz de Coleccionista',
  3: 'Catalogador Curioso',
  4: 'Aficionado Dedicado',
  5: 'Archivista',
  6: 'Guardián de Joyas',
  7: 'Conservador Experto',
  8: 'Gran Erudito',
  9: 'Maestro del Catálogo',
  10: 'Leyenda de Hoardex',
};

/**
 * Cada nivel L requiere 100 + (L - 1) * 50 XP acumulados dentro de ese nivel.
 * Nivel 1: 0..99 (requiere 100)
 * Nivel 2: 100..249 (requiere 150)
 * Nivel 3: 250..449 (requiere 200)
 * Nivel 4: 450..699 (requiere 250)
 */
export function getRequiredXpForLevel(level: number): number {
  return 100 + (Math.max(1, level) - 1) * 50;
}

export function calculateLevelProgress(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let accumulatedXp = 0;

  while (true) {
    const requiredForCurrent = getRequiredXpForLevel(level);
    if (accumulatedXp + requiredForCurrent > safeXp) {
      const currentLevelXp = safeXp - accumulatedXp;
      const progressPercentage = Math.min(
        100,
        Math.floor((currentLevelXp / requiredForCurrent) * 100)
      );
      const title = LEVEL_TITLES[Math.min(10, level)] ?? LEVEL_TITLES[10];

      return {
        level,
        title,
        currentLevelXp,
        nextLevelXp: requiredForCurrent,
        totalXp: safeXp,
        progressPercentage,
      };
    }
    accumulatedXp += requiredForCurrent;
    level++;
  }
}
```

### 3.2 Motor de rachas diarias (`src/features/gamification/core/streaks.ts`)

```typescript
/**
 * Calcula la diferencia en días naturales UTC entre dos fechas 'YYYY-MM-DD'.
 */
export function getDaysDifference(dateStrA: string, dateStrB: string): number {
  const [yA, mA, dA] = dateStrA.split('-').map(Number);
  const [yB, mB, dB] = dateStrB.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  const diffMs = utcB - utcA;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function calculateStreak(
  currentStreak: number,
  longestStreak: number,
  lastActivityDate: string | null,
  today: string
): StreakCalculationResult {
  // Primer registro de actividad
  if (!lastActivityDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, longestStreak),
      lastActivityDate: today,
      isExtended: true,
    };
  }

  const diff = getDaysDifference(lastActivityDate, today);

  // Mismo día calendario: no cambia la racha
  if (diff === 0) {
    return {
      currentStreak,
      longestStreak,
      lastActivityDate: today,
      isExtended: false,
    };
  }

  // Día inmediatamente consecutivo: incrementa racha
  if (diff === 1) {
    const newCurrent = currentStreak + 1;
    return {
      currentStreak: newCurrent,
      longestStreak: Math.max(longestStreak, newCurrent),
      lastActivityDate: today,
      isExtended: true,
    };
  }

  // Si diff > 1 (o fecha anómala anterior): racha rota, se reinicia a 1
  return {
    currentStreak: 1,
    longestStreak: Math.max(1, longestStreak),
    lastActivityDate: today,
    isExtended: true,
  };
}
```

### 3.3 Catálogo y evaluador de logros (`src/features/gamification/core/achievements.ts`)

```typescript
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_item',
    title: 'Primer ejemplar',
    description: 'Añade tu primer ítem a cualquier colección.',
    icon: 'PackagePlus',
    category: 'catalog',
    tier: 'bronze',
    xpReward: 20,
    condition: (state) => state.items.length >= 1,
  },
  {
    id: 'five_items',
    title: 'Coleccionista activo',
    description: 'Acumula al menos 5 ítems en tu catálogo.',
    icon: 'Layers',
    category: 'catalog',
    tier: 'bronze',
    xpReward: 40,
    condition: (state) => state.items.length >= 5,
  },
  {
    id: 'twenty_five_items',
    title: 'Bóveda en expansión',
    description: 'Alcanza los 25 ítems registrados en total.',
    icon: 'Archive',
    category: 'catalog',
    tier: 'silver',
    xpReward: 80,
    condition: (state) => state.items.length >= 25,
  },
  {
    id: 'first_completed',
    title: 'Objetivo cumplido',
    description: 'Marca tu primer ítem como completado.',
    icon: 'CheckCircle2',
    category: 'completion',
    tier: 'bronze',
    xpReward: 30,
    condition: (state) => state.items.some((it) => it.xpAwarded),
  },
  {
    id: 'five_completed',
    title: 'Hábito de finalización',
    description: 'Completa al menos 5 ítems de tus colecciones.',
    icon: 'Trophy',
    category: 'completion',
    tier: 'silver',
    xpReward: 70,
    condition: (state) => state.items.filter((it) => it.xpAwarded).length >= 5,
  },
  {
    id: 'first_review',
    title: 'Crítica constructiva',
    description: 'Valora o escribe notas personales en un ítem.',
    icon: 'PenTool',
    category: 'reviews',
    tier: 'bronze',
    xpReward: 25,
    condition: (state) => state.items.some((it) => it.reviewXpAwarded || it.rating !== undefined || (it.notes && it.notes.trim().length > 0)),
  },
  {
    id: 'five_reviews',
    title: 'Voz autorizada',
    description: 'Valora o reseña al menos 5 ítems diferentes.',
    icon: 'MessageSquareText',
    category: 'reviews',
    tier: 'silver',
    xpReward: 60,
    condition: (state) => state.items.filter((it) => it.rating !== undefined || (it.notes && it.notes.trim().length > 0)).length >= 5,
  },
  {
    id: 'multi_collector',
    title: 'Curiosidad multidisciplinar',
    description: 'Crea y posee ítems en al menos 3 colecciones distintas.',
    icon: 'Boxes',
    category: 'catalog',
    tier: 'silver',
    xpReward: 60,
    condition: (state) => {
      const collectionsWithItems = new Set(state.items.map((it) => it.collectionId));
      return collectionsWithItems.size >= 3;
    },
  },
  {
    id: 'collection_master',
    title: 'Maestro de la estantería',
    description: 'Completa el 100% de los ítems de una colección (mínimo 3 ítems).',
    icon: 'Crown',
    category: 'completion',
    tier: 'gold',
    xpReward: 120,
    condition: (state) => {
      return state.collections.some((col) => {
        const colItems = state.items.filter((it) => it.collectionId === col.id);
        if (colItems.length < 3) return false;
        return colItems.every((it) => it.xpAwarded);
      });
    },
  },
  {
    id: 'streak_3',
    title: 'Constancia inicial',
    description: 'Mantén una racha activa de 3 días consecutivos.',
    icon: 'Flame',
    category: 'streaks',
    tier: 'bronze',
    xpReward: 35,
    condition: (state) => state.streak.currentStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Fervor semanal',
    description: 'Alcanza una racha de 7 días consecutivos.',
    icon: 'Sparkles',
    category: 'streaks',
    tier: 'silver',
    xpReward: 75,
    condition: (state) => state.streak.currentStreak >= 7,
  },
  {
    id: 'level_5',
    title: 'Archivista de prestigio',
    description: 'Alcanza el nivel 5 de experiencia.',
    icon: 'Medal',
    category: 'special',
    tier: 'gold',
    xpReward: 100,
    condition: (state) => state.totalXp >= 700,
  },
];

export function evaluateAchievements(
  state: GamificationEvaluationState
): Achievement[] {
  return ACHIEVEMENTS.filter((ach) => {
    if (state.alreadyUnlockedIds.has(ach.id)) {
      return false;
    }
    return ach.condition(state);
  });
}
```

---

## 4. Algoritmo y flujo de datos

### 4.1 Desacoplamiento de stores sin dependencias circulares

```
[Acción del usuario en UI] (AddItem, CompleteItem, ReviewItem, CreateCollection)
         │
         ├── 1. Store respectivo muta su estado (items.store o collections.store)
         │
         ├── 2. El orquestador o la acción invoca gamificationStore.handleUserAction({
         │        action: 'add_item' | 'complete_item' | ...,
         │        targetId,
         │        description,
         │        today: 'YYYY-MM-DD',
         │        now: ISOString,
         │        collections: collectionsStore.getState().collections,
         │        items: itemsStore.getState().items
         │      })
         │
         ▼
[gamification.store.ts]
1. Calcula la racha con calculateStreak(streak.currentStreak, streak.longestStreak, streak.lastActivityDate, today).
2. Si la racha se extendió a un nuevo día:
   - Concede XP_RULES.DAILY_STREAK_BONUS (+15 XP).
   - Emite toast informativo de racha extendida.
3. Concede el XP de la acción base (ej. +50 XP por ítem completado).
4. Comprueba si hubo subida de nivel comparando calculateLevelProgress antes y después:
   - Si subió de nivel: emite toast.success celebratorio.
5. Invoca evaluateAchievements({ collections, items, totalXp: newTotalXp, streak: newStreak, alreadyUnlockedIds }):
   - Por cada logro devuelto:
     - Añade a unlockedAchievements con timestamp `now`.
     - Suma ach.xpReward a `totalXp`.
     - Registra evento en `xpHistory`.
     - Emite toast.success("¡Logro desbloqueado! " + ach.title).
6. Persiste todo atómicamente en localStorage ('hoardex-gamification').
```

---

## 5. Integración de interfaz

### 5.1 Widget `GamificationHeaderBar` en `Header.tsx`
- Ubicado entre el logotipo y el selector de tema / acciones.
- Elementos:
  - **Insignia de nivel:** Píldora con icono de corona/estrella, etiqueta *"Nivel {level}"* y tooltip con *"Título honorífico"*.
  - **Mini barra de progreso:** Barra compacta de 48px de ancho con porcentaje de XP al siguiente nivel (`progressPercentage%`).
  - **Contador de racha:** Ícono de llama `Flame` con contador *"X d"*, resaltado en color naranja ámbar (`#f59e0b`) si hubo actividad hoy o tenue si aún no se ha registrado actividad en el día.
  - **Enlace accesible:** Botón o enlace envuelto en `<Link to="/achievements">` con `aria-label="Ver logros y progreso de nivel"`.

### 5.2 Vista `/achievements` (`AchievementsPage.tsx`)
- **Cabecera de perfil lúdico:**
  - Nivel grande con icono temático, título honorífico destacado (*"Archivista"*).
  - Barra de progreso expandida con indicación textual: *"140 / 200 XP para el Nivel 3 (70%)"*.
  - Métricas clave: Experiencia total acumulada, racha actual y racha histórica máxima.
- **Barra de filtros de logros:**
  - Selector de píldoras: *Todos*, *Catálogo*, *Completados*, *Reseñas*, *Rachas*, *Especiales*.
  - Indicador numérico: *"X de 12 logros desbloqueados (Y%)"*.
- **Cuadrícula de logros (`AchievementCard`):**
  - Grid responsivo (1 col móvil, 2 col tablet, 3 col desktop).
  - Colores por tier:
    - **Bronze:** Ámbar cobrizo / cálido (`border-amber-700/40 bg-amber-950/10 text-amber-600 dark:text-amber-400`).
    - **Silver:** Plateado / zinc frío (`border-zinc-400/40 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300`).
    - **Gold:** Dorado brillante (`border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400`).
    - **Platinum:** Cian / índigo luminoso (`border-cyan-400/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300`).
  - Estado bloqueado: Silueta atenuada, candado pequeño y texto de cómo desbloquearlo.

---

## 6. Decisiones técnicas justificadas

| Decisión tomada | Alternativa descartada | Justificación técnica |
|---|---|---|
| **Nivel y progreso derivados puramente de `totalXp`** | Almacenar `level` como propiedad mutable en el store | Elimina cualquier riesgo de desincronización o corrupción entre el nivel y la experiencia total. El XP es la única fuente de verdad. |
| **Curva lineal-progresiva ($100 + (L-1) \times 50$)** | Curva exponencial $XP = 100 \times L^{1.8}$ | Facilita el cálculo mental para el usuario, evita números astronómicos en niveles tempranos y proporciona gratificación rápida en las primeras sesiones. |
| **Rachas calculadas con fechas `'YYYY-MM-DD'`** | Comparar timestamps absolutos `(now - last) > 86400000` | Las comparaciones de 24 horas fallan cuando el usuario realiza una acción a las 23:00 y la siguiente a las 08:00 del día siguiente (debería contar como racha consecutiva aunque hayan pasado menos de 24 h). Trabajar con días naturales del calendario es la forma correcta. |
| **`reviewXpAwarded?: boolean` en el ítem** | Otorgar XP en cada guardado de notas o no dar XP por reseñas | Respeta el principio de idempotencia matemática de la constitución. El usuario no puede explotar la edición de notas para ganar XP infinito. |
| **Store desacoplado por inyección de argumentos** | Que `gamification.store.ts` importe `useItemsStore` y `useCollectionsStore` | Evita dependencias circulares y efectos colaterales de renderizado. Los datos se pasan limpiamente desde los puntos de entrada orquestadores. |

---

## 7. Estrategia de tests unitarios (Vitest)

### 7.1 `src/features/gamification/core/levels.test.ts`
- Calcula nivel 1 con 0 XP, progreso 0% y título "Iniciado".
- Calcula límites exactos: 99 XP sigue en nivel 1 (99%), 100 XP pasa a nivel 2 (0%).
- Calcula niveles intermedios correctamente (ej. nivel 3 con 350 XP).
- Maneja saltos múltiples de nivel (de 0 XP a 800 XP pasando directamente a nivel 5).
- Título honorífico asignado correctamente para niveles 1 al 10 y superior.

### 7.2 `src/features/gamification/core/streaks.test.ts`
- Inicialización con `lastActivityDate: null` devuelve racha 1 y `isExtended: true`.
- Dos acciones en el mismo día natural mantienen racha sin alteración (`isExtended: false`).
- Acción en el día natural inmediatamente siguiente incrementa `currentStreak` y actualiza `longestStreak`.
- Salto de 2 o más días rompe la racha reiniciando a 1 y manteniendo el récord histórico `longestStreak`.
- Transición de fin de mes y fin de año (ej. 2026-02-28 a 2026-03-01, o 2026-12-31 a 2027-01-01) calculada con total precisión sin desajustes de zona horaria.

### 7.3 `src/features/gamification/core/achievements.test.ts`
- Desbloqueo de `first_item` con 1 ítem y no desbloqueado previamente.
- Idempotencia: no devuelve logros que ya figuran en `alreadyUnlockedIds`.
- Desbloqueo de `first_completed` únicamente si algún ítem tiene `xpAwarded: true`.
- Desbloqueo de `collection_master` únicamente si la colección tiene $\ge 3$ ítems y todos están completados.
- Desbloqueo de rachas (`streak_3`, `streak_7`).

### 7.4 `src/features/gamification/store/gamification.store.test.ts`
- Concesión de XP aumenta `totalXp` y añade evento al historial.
- `recordActivity` extiende la racha y concede bono diario de XP.
- Detección de subida de nivel y registro de logros desbloqueados.
- Persistencia y rehidratación segura desde `localStorage` (`hoardex-gamification`).

---

## 8. Trazabilidad con Requisitos Funcionales

| Requisito Funcional | Archivo / Componente | Elemento técnico | Test unitario |
|---|---|---|---|
| **RF-01 (XP y Niveles)** | `levels.ts`, `item.interface.ts` | `calculateLevelProgress`, `XP_RULES`, `reviewXpAwarded` | `levels.test.ts` |
| **RF-02 (Rachas)** | `streaks.ts` | `calculateStreak`, `getDaysDifference` | `streaks.test.ts` |
| **RF-03 (Logros)** | `achievements.ts` | `ACHIEVEMENTS`, `evaluateAchievements` | `achievements.test.ts` |
| **RF-04 (Store)** | `gamification.store.ts` | `useGamificationStore`, `hoardex-gamification` | `gamification.store.test.ts` |
| **RF-05 (UI y Página)** | `GamificationHeaderBar.tsx`, `AchievementsPage.tsx`, `AchievementCard.tsx` | Rutas, widgets, toasts Sonner | Tests de componentes |

---

## 9. Verificación y criterios de salida del plan
1. `specs/004-gamification-engine/plan.md` aprobado por el usuario.
2. Desglose en tareas atómicas (`tasks.md`) mediante `sdd-tasks`.
3. Implementación incremental con `sdd-implement` tarea por tarea.
