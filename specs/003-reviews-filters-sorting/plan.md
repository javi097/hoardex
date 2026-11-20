# Plan Técnico 003 — Reviews, Filters, Sorting & Collection Editing

## Resumen ejecutivo y contexto de arquitectura
Este plan técnico detalla la arquitectura de implementación para la **Fase 2** (`specs/003-reviews-filters-sorting/spec.md`). Amplía el modelo de datos de `Item` para incorporar puntuación (`rating?: number`, escala de 1 a 5 estrellas) y notas personales (`notes?: string`), introduce un panel lateral `ItemDetailSheet`, implementa lógica pura de búsqueda, filtrado y ordenación multinivel en `CollectionPage`, y proporciona un flujo de edición integral de colecciones (`EditCollectionSheet`) con reconciliación automática anti-estados huérfanos.

Todo el diseño preserva la compatibilidad hacia atrás con los datos existentes en `localStorage`, garantiza tipado estricto sin `any`, y mantiene la pureza y determinismo en el `core/` con cobertura de tests en Vitest.

---

## 1. Archivos y responsabilidades

| Archivo | Acción | Responsabilidad técnica | Trazabilidad RF |
|---|---|---|---|
| `src/interfaces/item.interface.ts` | Modificar | Extender `Item` con `rating?: number` y `notes?: string`. Definir contratos `ItemSortField`, `SortDirection`, `ItemSortOption` e `ItemFilters`. | RF-01.1, RF-04, RF-05.1 |
| `src/features/items/core/sorting.ts` | Crear | Funciones puras: `normalizeText` (insensible a tildes/mayúsculas), `filterAndSortItems` (filtrado y 7 criterios de ordenación) y `updateItemDetails`. Constante `ITEM_SORT_OPTIONS`. | RF-04.2, RF-04.4, RF-05.1, RF-05.2 |
| `src/features/items/core/sorting.test.ts` | Crear | Pruebas unitarias de `filterAndSortItems`: búsqueda por texto con tildes, filtrado por estado, ordenación por fecha, título, año y valoración (con valores ausentes al final), y actualización pura de ítem. | RNF-01, RF-04, RF-05 |
| `src/features/collections/core/reconciliation.ts` | Crear | Función pura `reconcileOrphanItems`: compara estados anteriores y nuevos, detecta ítems en estados eliminados y los reasigna al primer estado disponible (menor `order`). | RF-06.5, RF-06.6, RNF-01 |
| `src/features/collections/core/reconciliation.test.ts` | Crear | Pruebas unitarias de `reconcileOrphanItems`: conservación de ítems válidos, reasignación segura de huérfanos, y activación de completado si el primer estado es `isCompleted`. | RF-06.5, RF-06.6 |
| `src/features/items/store/items.store.ts` | Modificar | Añadir acciones `updateItem(id, patch, now)` y `reassignItemsStatus(itemIds, newStatusId, isCompleted, now)` garantizando inmutabilidad. | RF-01.2, RF-02.3, RF-06.5 |
| `src/features/items/store/items.store.test.ts` | Modificar | Tests unitarios para las nuevas acciones de actualización de ítems y reasignación de estados en lote. | RNF-01, RF-02.3 |
| `src/components/custom/StarRating.tsx` | Crear | Primitiva UI accesible de valoración con 5 estrellas (`Star` de Lucide): modo interactivo (clic / teclado / desmarcar a `undefined`) y modo solo lectura (`readonly`). | RF-03.1, RF-03.2, RNF-04 |
| `src/components/custom/StarRating.test.tsx` | Crear | Tests unitarios de `StarRating`: selección de 1–5 estrellas, deselección al hacer clic en la misma estrella activa, y modo readonly. | RF-03.1, RF-03.2 |
| `src/features/items/components/ItemCard.tsx` | Modificar | Mostrar badge de calificación (`★ rating`). Abrir `ItemDetailSheet` al hacer clic en portada/cuerpo sin anidar botones HTML y aislando eventos con `e.stopPropagation()`. | RF-02.1, RF-03.3 |
| `src/features/items/components/ItemDetailSheet.tsx` | Crear | Panel lateral con ficha técnica completa del ítem: carátula, datos, metadatos, selector de estado, estrellas interactivas, textarea de notas, fechas y eliminación. | RF-02.1, RF-02.2, RF-02.3, RF-02.4 |
| `src/features/collections/components/EditCollectionSheet.tsx` | Crear | Panel lateral para editar colección existente con `CollectionForm` (con `provider` bloqueado) y reconciliación de estados huérfanos con toast informativo. | RF-06.1, RF-06.2, RF-06.3, RF-06.4, RF-06.5 |
| `src/pages/CollectionPage.tsx` | Modificar | Incorporar barra de herramientas: input de búsqueda, píldoras de estado con contadores dinámicos, selector de ordenación, botón "Editar colección", y modal `ItemDetailSheet`. | RF-04.1, RF-04.3, RF-04.5, RF-05.3, RF-06.1 |

---

## 2. Contratos y tipos (`src/interfaces/item.interface.ts`)

```typescript
export interface Item {
  id: string;
  collectionId: string;
  externalId?: string;
  title: string;
  subtitle?: string;
  releaseYear?: number;
  coverUrl?: string;
  statusId: string;
  xpAwarded: boolean;
  rating?: number; // 1 | 2 | 3 | 4 | 5 (opcional)
  notes?: string;  // Reseña o notas personales multilínea
  meta: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type ItemSortField = 'createdAt' | 'title' | 'releaseYear' | 'rating';
export type SortDirection = 'asc' | 'desc';

export interface ItemSortOption {
  id: string;
  field: ItemSortField;
  direction: SortDirection;
  label: string;
}

export interface ItemFilters {
  query: string;
  statusId: string; // 'all' o ID específico de estado
}
```

---

## 3. Funciones puras de lógica

### 3.1 Normalización de texto y ordenación (`src/features/items/core/sorting.ts`)
```typescript
export const ITEM_SORT_OPTIONS: ItemSortOption[] = [
  { id: 'createdAt-desc', field: 'createdAt', direction: 'desc', label: 'Más recientes' },
  { id: 'createdAt-asc', field: 'createdAt', direction: 'asc', label: 'Más antiguos' },
  { id: 'title-asc', field: 'title', direction: 'asc', label: 'Título (A - Z)' },
  { id: 'title-desc', field: 'title', direction: 'desc', label: 'Título (Z - A)' },
  { id: 'releaseYear-desc', field: 'releaseYear', direction: 'desc', label: 'Año (más reciente)' },
  { id: 'releaseYear-asc', field: 'releaseYear', direction: 'asc', label: 'Año (más antiguo)' },
  { id: 'rating-desc', field: 'rating', direction: 'desc', label: 'Mejor valorados' },
];

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterAndSortItems(
  items: Item[],
  filters: ItemFilters,
  sort: ItemSortOption
): Item[] {
  const cleanQuery = normalizeText(filters.query);

  // 1. Filtrado
  const filtered = items.filter((item) => {
    // Filtro por estado
    if (filters.statusId && filters.statusId !== 'all') {
      if (item.statusId !== filters.statusId) {
        return false;
      }
    }

    // Filtro por texto
    if (cleanQuery) {
      const matchTitle = normalizeText(item.title).includes(cleanQuery);
      const matchSubtitle = item.subtitle ? normalizeText(item.subtitle).includes(cleanQuery) : false;
      if (!matchTitle && !matchSubtitle) {
        return false;
      }
    }

    return true;
  });

  // 2. Ordenación inmutable
  return [...filtered].sort((a, b) => {
    const dir = sort.direction === 'asc' ? 1 : -1;

    switch (sort.field) {
      case 'title': {
        const titleA = normalizeText(a.title);
        const titleB = normalizeText(b.title);
        return titleA.localeCompare(titleB, 'es') * dir;
      }

      case 'releaseYear': {
        // Los ítems sin año se posicionan siempre al final
        if (a.releaseYear === undefined && b.releaseYear === undefined) return 0;
        if (a.releaseYear === undefined) return 1;
        if (b.releaseYear === undefined) return -1;
        return (a.releaseYear - b.releaseYear) * dir;
      }

      case 'rating': {
        // Los ítems sin valoración se posicionan siempre al final
        if (a.rating === undefined && b.rating === undefined) return 0;
        if (a.rating === undefined) return 1;
        if (b.rating === undefined) return -1;
        return (a.rating - b.rating) * dir;
      }

      case 'createdAt':
      default: {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    }
  });
}
```

### 3.2 Reconciliación de estados huérfanos (`src/features/collections/core/reconciliation.ts`)
```typescript
export interface ReconcileResult {
  updatedItems: Item[];
  reassignedCount: number;
}

export function reconcileOrphanItems(
  items: Item[],
  validStatuses: CollectionStatus[],
  collectionId: string,
  now: string
): ReconcileResult {
  if (validStatuses.length === 0) {
    throw new Error('La colección debe tener al menos un estado válido.');
  }

  // El estado de destino para huérfanos es el primer estado por orden
  const sortedStatuses = [...validStatuses].sort((a, b) => a.order - b.order);
  const fallbackStatus = sortedStatuses[0];
  const validStatusIds = new Set(validStatuses.map((s) => s.id));

  let reassignedCount = 0;

  const updatedItems = items.map((item) => {
    if (item.collectionId !== collectionId) {
      return item;
    }

    if (!validStatusIds.has(item.statusId)) {
      reassignedCount++;
      const isCompleted = Boolean(fallbackStatus.isCompleted);
      const xpAwarded = item.xpAwarded || isCompleted;
      const completedAt = isCompleted ? (item.completedAt ?? now) : item.completedAt;

      return {
        ...item,
        statusId: fallbackStatus.id,
        xpAwarded,
        completedAt,
        updatedAt: now,
      };
    }

    return item;
  });

  return { updatedItems, reassignedCount };
}
```

---

## 4. Algoritmo y flujo de datos

### 4.1 Apertura y edición en `ItemDetailSheet`
```
[Usuario pulsa portada o cuerpo en ItemCard]
       │
       ▼
1. Se dispara `onClick` del contenedor de la tarjeta.
   (Nota: botones internos de selector de estado y borrado usan `e.stopPropagation()`).
2. Se establece `selectedItem = item` en `CollectionPage`.
3. `ItemDetailSheet` se abre con los datos del ítem:
   - Modificar valoración (estrellas 1-5).
   - Escribir en notas/reseña.
   - Cambiar estado.
4. Al pulsar "Guardar cambios":
   - Se invoca `useItemsStore.getState().updateItem(item.id, patch, now)`.
   - Se emite toast de confirmación.
   - Se actualiza la UI reactivamente.
```

### 4.2 Edición de colección con Reconciliación Anti-huérfanos
```
[Usuario guarda cambios en EditCollectionSheet]
       │
       ▼
1. Validar que la colección tenga exactamente un estado con `isCompleted: true`.
2. Obtener todos los ítems actuales de `useItemsStore`.
3. Ejecutar función pura `reconcileOrphanItems(allItems, newStatuses, collection.id, now)`.
4. Si `reassignedCount > 0`:
   - Actualizar los ítems en `useItemsStore` mediante `set({ items: updatedItems })`.
   - Disparar `toast.info("${reassignedCount} ítems reasignados al estado inicial.")`.
5. Actualizar la colección en `useCollectionsStore.getState().updateCollection(collection.id, patch)`.
6. Disparar `toast.success("Colección actualizada.")` y cerrar el sheet.
```

---

## 5. Integración de interfaz

### 5.1 Barra de filtros y ordenación en `CollectionPage`
- **Barra de herramientas compacta y responsiva:**
  - `Input` de búsqueda con icono `Search` a la izquierda y botón de borrado rápido (`X`).
  - Grupo de píldoras horizontales con scroll táctil (`overflow-x-auto`):
    - Píldora "Todos" con badge del total.
    - Píldora por cada estado (`collection.statuses`), con su color de acento y contador de ítems en ese estado.
  - Menú desplegable `<Select>` para elegir entre las 7 opciones de `ITEM_SORT_OPTIONS`.
  - Texto informativo: *"Mostrando {filtered.length} de {total} ítems"*.
- **Estado vacío de filtros:** Si la colección tiene ítems pero el filtro actual devuelve 0, renderizar `EmptyState` con descripción *"No hay ítems que coincidan con los filtros aplicados"* y botón *"Restablecer filtros"*.

### 5.2 Estructura accesible de `ItemCard` (sin botones anidados)
- Para cumplir el estándar HTML y de accesibilidad (WCAG 2.1), la tarjeta no será un elemento `<button>` envolviendo a otros botones.
- En su lugar, el contenedor es un `<div role="article" tabIndex={0} onKeyDown={...} onClick={openDetail}>` con `cursor-pointer`.
- La cabecera interactiva y el selector inferior contienen controles independientes con `onClick={(e) => e.stopPropagation()}` y `onKeyDown={(e) => e.stopPropagation()}` para no accionar la apertura del detalle accidentalmente.

### 5.3 Componente `StarRating`
- Visualiza 5 estrellas en línea.
- Accesible con teclado (flechas o tabulación con `aria-label="Calificar con X estrellas"`).
- Distingue estrellas activas (icono `Star` relleno de color ámbar `#f59e0b`) de inactivas (`Star` con trazo tenue).
- Soporta desmarcar la calificación actual (devolviendo `undefined`).

---

## 6. Decisiones técnicas justificadas

| Decisión tomada | Alternativa descartada | Justificación técnica |
|---|---|---|
| **Escala de 1 a 5 estrellas con deselección** | Escala 1 a 10 numérica | Las 5 estrellas ofrecen una lectura visual inmediata tanto en el badge de la tarjeta (`★ 4`) como en el detalle, y son el estándar de plataformas de catalogación. |
| **Normalización NFD para búsqueda de texto** | `toLowerCase().includes()` directo | Permite que búsquedas como "pokemon" encuentren "Pokémon" o "cienfuegos" encuentre "Cienfuegos", mejorando drásticamente la experiencia de usuario en español. |
| **Reasignación automática con toast ante eliminación de estados** | Diálogo modal bloqueante preguntando a qué estado migrar cada ítem | Reduce la fricción operativa drásticamente. Al ordenar los estados por `order`, el primer estado es siempre el punto de entrada natural de la colección (p. ej. "Pendiente" o "Deseado"). |
| **Tarjeta accesible sin anidación de `<button>`** | Envolver toda la tarjeta en `<button>` o crear botón "Ver detalle" | Anidar `<button>` o `<select>` dentro de `<button>` es HTML inválido y rompe la navegación con lectores de pantalla. |
| **Lógica pura en `sorting.ts` y `reconciliation.ts`** | Lógica dispersa dentro de componentes React o stores | Permite probar el 100% de combinaciones de ordenación y casos de huérfanos con datos sintéticos deterministas en Vitest. |

---

## 7. Estrategia de tests unitarios (Vitest)

### 7.1 `src/features/items/core/sorting.test.ts`
- Búsqueda por texto: coincidencia parcial en título insensible a mayúsculas y acentos.
- Búsqueda por texto: coincidencia en subtítulo / autor.
- Filtrado por estado: filtra correctamente ítems de un estado y devuelve todos con `'all'`.
- Combinación de filtros: query + `statusId`.
- Ordenación por `createdAt` (desc y asc).
- Ordenación por `title` alfabético (A-Z y Z-A en español con tildes).
- Ordenación por `releaseYear`: orden numérico correcto con ítems sin año situados al final.
- Ordenación por `rating`: ítems de 5 a 1 estrellas con ítems no valorados (`undefined`) situados al final.
- `updateItemDetails`: función pura que actualiza campos y refresca `updatedAt`.

### 7.2 `src/features/collections/core/reconciliation.test.ts`
- Mantiene sin cambios los ítems con estados existentes.
- Reasigna ítems con estados eliminados al primer estado de la colección.
- Marca `isCompleted: true` si el estado de destino es completado.
- No modifica ítems de otras colecciones.
- Lanza error si la lista de estados válidos está vacía.

### 7.3 `src/components/custom/StarRating.test.tsx`
- Renderiza 5 estrellas con los atributos de accesibilidad adecuados.
- Marca como seleccionadas las estrellas hasta el valor de `value`.
- Emite `onChange(3)` al pulsar en la estrella 3.
- Emite `onChange(undefined)` al pulsar en la estrella ya seleccionada.
- No emite eventos ni reacciona si `readonly: true`.

---

## 8. Trazabilidad con Requisitos Funcionales

| Requisito Funcional | Componente / Archivo | Función / Elemento | Test unitario |
|---|---|---|---|
| **RF-01 (Ampliación contrato)** | `item.interface.ts` | `rating`, `notes` | Tipado estricto `tsc` |
| **RF-02 (Panel de detalle)** | `ItemDetailSheet.tsx` | Ficha técnica y edición | Test de componente |
| **RF-03 (Estrellas)** | `StarRating.tsx`, `ItemCard.tsx` | Selector 1–5 y badge | `StarRating.test.tsx` |
| **RF-04 (Filtros y búsqueda)** | `sorting.ts`, `CollectionPage.tsx` | `filterAndSortItems`, píldoras | `sorting.test.ts` |
| **RF-05 (Ordenación)** | `sorting.ts`, `CollectionPage.tsx` | `ITEM_SORT_OPTIONS` | `sorting.test.ts` |
| **RF-06 (Edición y anti-huérfanos)**| `reconciliation.ts`, `EditCollectionSheet.tsx` | `reconcileOrphanItems` | `reconciliation.test.ts` |

---

## 9. Verificación y criterios de salida del plan
1. `specs/003-reviews-filters-sorting/plan.md` aprobado por el usuario.
2. Desglose en tareas atómicas (`tasks.md`) mediante `sdd-tasks`.
3. Implementación incremental con `sdd-implement` tarea por tarea.
