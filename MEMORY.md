# MEMORY.md — Hoardex

## Estado actual
- **Fase actual:** Fase 2 completada (`003-reviews-filters-sorting` implementada y verificada).
- **Completado:**
  - `001-core-catalog-mock` (Fase 1a): Arquitectura base, contratos, stores Zustand y UI.
  - `002-external-providers` (Fase 1b): Adaptadores de búsqueda externa (`rawg`, `openLibrary`, `bgg`, `manual`).
  - `003-reviews-filters-sorting` (Fase 2):
    - `Item`: campos opcionales `rating?: number` (1–5) y `notes?: string`. Badge compacto `★ X` en `ItemCard`.
    - `StarRating`: selector accesible (1–5 estrellas, deselección a `undefined`, hover, teclado y `readonly`).
    - `ItemDetailSheet`: panel accesible para ficha, valoración, notas y borrado seguro con `ConfirmDialog`.
    - Lógica pura `filterAndSortItems` con normalización NFD (insensible a tildes) y 7 criterios de ordenación.
    - `CollectionPage`: toolbar con búsqueda por texto, píldoras dinámicas de estado, selector de ordenación y empty state.
    - `EditCollectionSheet`: edición de colección con `hideProvider={true}` y reconciliación pura anti-huérfanos (`reconcileOrphanItems`).
    - 107 tests unitarios y de componentes pasando al 100% en Vitest. Cero `any`, cero warnings.
- **Hoja de ruta SDD (`specs/`):**
  - `001-core-catalog-mock` (Fase 1a: Implementada).
  - `002-external-providers` (Fase 1b: Implementada).
  - `003-reviews-filters-sorting` (Fase 2: Implementada).
  - `004-gamification-engine` (Fase 3a: Motor puro de XP idempotente, niveles y rachas + tests).
  - `005-achievements-challenges` (Fase 3b: Logros declarativos, retos personales y toasts).
  - `006-supabase-auth-sync` (Fase 4: Auth, base de datos en Supabase y perfil público).
  - `007-wrapped-stats-deploy` (Fase 5: Estadísticas anuales tipo Wrapped y despliegue).
- **Siguiente paso:** Iniciar la spec `004-gamification-engine` (`sdd-spec`).

## Decisiones de arquitectura (y su porqué)
- **Normalización NFD en búsqueda:** `normalizeText` elimina diacríticos permitiendo que "anos" o "garcia" encuentren "Años" o "García".
- **Remount por `key` (`key={item.id}`):** Inicializa el estado local de sheets limpiamente sin requerir `useEffect` con `setState`, evitando advertencias de ESLint y condiciones de carrera.
- **Reconciliación pura anti-huérfanos:** `reconcileOrphanItems` reasigna ítems al primer estado disponible con feedback por toast cuando se eliminan estados en uso.
- **Tarjeta accesible sin botones anidados:** Contenedor con `role="button"` aislando `<Select>` y `Trash2` mediante `e.stopPropagation()`.

## Errores a evitar
- **No anidar `<button>` en HTML:** Usar `role="button"` con `tabIndex={0}` y aislar controles internos hijos.
- **No llamar a `setState` en `useEffect` para sincronizar props:** Usar componentes controlados o remount con `key`.
- **No usar `toLowerCase()` plano para búsquedas en español:** Usar siempre normalización NFD con regex diacrítica.
