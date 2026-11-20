# Tareas de Implementación 003 — Reviews, Filters, Sorting & Collection Editing

## Contexto y orden de ejecución
Este plan de tareas desglosa la implementación de la Fase 2 (`specs/003-reviews-filters-sorting/spec.md`) siguiendo el flujo de Spec-Driven Development (`sdd-implement`). Cada tarea es atómica, verificable de forma independiente y respeta la puerta de calidad (`npx tsc --noEmit`, `npm run lint`, `npm run test`).

---

- [x] **T1. Contratos globales ampliados y tipos de ordenación y filtrado.** RF-01.1, RF-01.2, RF-04, RF-05.1, RNF-02
  - Extender `Item` en `src/interfaces/item.interface.ts` con `rating?: number` y `notes?: string`.
  - Definir tipos contractuales `ItemSortField`, `SortDirection`, `ItemSortOption` e `ItemFilters`.
  - Hecho cuando: `npx tsc --noEmit` y `npm run lint` pasen con 0 errores y cero `any`.

- [x] **T2. Lógica pura de filtrado, ordenación y reconciliación de estados huérfanos con suites de tests.** RF-04.2, RF-04.4, RF-05.1, RF-05.2, RF-06.5, RF-06.6, RNF-01
  - Crear `src/features/items/core/sorting.ts`: función pura `normalizeText` (búsqueda insensible a tildes/mayúsculas con NFD), `filterAndSortItems` implementando filtrado por query y estado junto con los 7 criterios de ordenación (situando valores ausentes de año y rating al final), `updateItemDetails` y la constante `ITEM_SORT_OPTIONS`.
  - Crear `src/features/collections/core/reconciliation.ts`: función pura `reconcileOrphanItems` que detecta ítems en estados eliminados de una colección y los reasigna de forma segura al primer estado (menor `order`), actualizando `isCompleted` e idempotencia de XP.
  - Crear `src/features/items/core/sorting.test.ts` y `src/features/collections/core/reconciliation.test.ts` cubriendo todos los casos de filtrado, ordenación, diacríticos, huérfanos y casos límite.
  - Hecho cuando: `npm run test src/features/items/core/sorting.test.ts src/features/collections/core/reconciliation.test.ts` pase al 100% y `tsc`/`lint` pasen limpios.

- [x] **T3. Ampliación del store de ítems y tests unitarios.** RF-01.2, RF-02.3, RF-06.5, RNF-01, RNF-05
  - Añadir acciones en `src/features/items/store/items.store.ts`:
    - `updateItem(id, patch, now)`: actualiza inmutablemente campos de un ítem (como `rating`, `notes`, etc.) refrescando `updatedAt`.
    - `reassignItemsStatus(itemIds, newStatusId, isCompleted, now)`: reasigna en lote el estado de ítems específicos preservando la idempotencia de XP.
  - Actualizar `src/features/items/store/items.store.test.ts` con tests específicos para las nuevas acciones.
  - Hecho cuando: `npm run test src/features/items/store/items.store.test.ts` pase al 100% y `tsc`/`lint` pasen limpios.

- [x] **T4. Componente accesible de valoración por estrellas y suite de pruebas.** RF-03.1, RF-03.2, RNF-04
  - Crear `src/components/custom/StarRating.tsx` con soporte para 1–5 estrellas:
    - Modo interactivo: teclado (`Enter`/`Space`), clic, `aria-label`, y desmarcado a `undefined` al pulsar la estrella activa.
    - Modo solo lectura (`readonly: true`) y tamaños configurables (`sm`, `md`, `lg`).
  - Crear `src/components/custom/StarRating.test.tsx` verificando renderizado, interacción, desmarcado, modo readonly y atributos de accesibilidad.
  - Hecho cuando: `npm run test src/components/custom/StarRating.test.tsx` pase al 100% y `tsc`/`lint` pasen limpios.

- [x] **T5. Paneles laterales `ItemDetailSheet.tsx` y `EditCollectionSheet.tsx`.** RF-02.1, RF-02.2, RF-02.3, RF-02.4, RF-06.1, RF-06.2, RF-06.3, RF-06.4, RF-06.5, RNF-04
  - Añadir prop opcional `hideProvider?: boolean` en `src/features/collections/components/CollectionForm.tsx` para ocultar el selector de proveedor durante la edición (RF-06.3).
  - Crear `src/features/items/components/ItemDetailSheet.tsx`: panel lateral accesible con carátula ampliada, metadatos, selector de estado, estrellas `StarRating`, textarea de notas/reseña, fechas formateadas y botón de eliminación con confirmación.
  - Crear `src/features/collections/components/EditCollectionSheet.tsx`: panel lateral que pre-carga los valores de la colección, reutiliza `CollectionForm` (con `hideProvider={true}`), ejecuta `reconcileOrphanItems`, actualiza ítems reasignados en `itemsStore` con toast informativo y guarda los cambios en `collectionsStore`.
  - Hecho cuando: `npx tsc --noEmit` y `npm run lint` pasen con 0 errores.

- [x] **T6. Integración en `ItemCard.tsx` y `CollectionPage.tsx`.** RF-02.1, RF-03.3, RF-04.1, RF-04.3, RF-04.5, RF-05.1, RF-05.3, RF-06.1, RNF-04
  - En `src/features/items/components/ItemCard.tsx`:
    - Añadir distintivo visual de valoración compacta (`★ 4`) en la tarjeta si `item.rating` existe.
    - Implementar disparador accesible (`role="button"`, `tabIndex={0}`, `onKeyDown` con `Enter`/`Space`) en el bloque de portada/información sin anidar elementos `<button>` inválidos en HTML.
    - Aislar con `e.stopPropagation()` el selector rápido de estado y el botón de eliminación.
  - En `src/pages/CollectionPage.tsx`:
    - Incorporar barra de herramientas: input de búsqueda por texto con botón de borrado rápido.
    - Píldoras horizontales de estado con scroll táctil, color de acento y contadores dinámicos de ítems.
    - Menú desplegable para seleccionar criterio de ordenación (`ITEM_SORT_OPTIONS`).
    - Contador informativo de ítems visibles (*"Mostrando X de Y ítems"*).
    - Estado vacío específico de filtros con botón "Restablecer filtros".
    - Botón "Editar colección" en la cabecera conectando `EditCollectionSheet`.
    - Conectar la apertura de `ItemDetailSheet` al seleccionar un ítem.
  - Hecho cuando: `npx tsc --noEmit`, `npm run lint` y los tests existentes pasen limpios.

- [x] **T7. Puerta de calidad, verificación visual en Chrome DevTools MCP y memoria.** RNF-01, RNF-02, RNF-03, RNF-04, RNF-05
  - Ejecutar verificación estática completa: `npx tsc --noEmit`, `npm run lint`, `npm run test` (suite completa) y `npm run build`. Confirmar 0 errores, 0 warnings y 0 `any`.
  - Levantar `npm run dev` y validar con Chrome DevTools MCP en `http://localhost:5173/`:
    - Ficha y reseña: abrir `ItemDetailSheet`, puntuar con estrellas, escribir notas, guardar y verificar badge en `ItemCard`.
    - Búsqueda en vivo: escribir término con tildes y comprobar filtrado en tiempo real.
    - Píldoras de estado: conmutar estados y validar contadores dinámicos.
    - Ordenación: cambiar criterios (año, título, mejor valorados) y comprobar ordenación inmediata.
    - Edición de colección: abrir `EditCollectionSheet`, modificar nombre/color/estados, comprobar reasignación segura de ítems huérfanos con toast.
  - Marcar todos los criterios en `specs/003-reviews-filters-sorting/spec.md` (estado `implementada`) y `tasks.md`.
  - Actualizar `MEMORY.md` (< 50 líneas) registrando la Fase 2 y el siguiente paso (`004-gamification-engine`).
  - Hecho cuando: Todos los checks pasen en verde, la verificación DevTools sea satisfactoria y `MEMORY.md` esté actualizado.
