# Tasks 001 — Core Catalog Mock
Estado: pendiente

> Cada tarea es atómica (~30–45 min), sigue el orden estricto de capas del plan y referencia los RF que cubre.
> Ninguna tarea modifica código de producción sin que la anterior esté en verde.

---

- [x] **T1. Bootstrap e infraestructura base.** RF-01.1, RF-01.2, RF-01.3, RF-01.4, RF-01.5, RF-01.6, RF-01.7
  - Instalar dependencias: `tailwindcss @tailwindcss/vite clsx tailwind-merge class-variance-authority @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-separator lucide-react zustand sonner react-router` (producción) y `vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event` (dev).
  - Añadir en `tsconfig.app.json`: `"strict": true` y `"paths": { "@/*": ["./src/*"] }`.
  - Añadir en `vite.config.ts`: `resolve.alias: { '@': path.resolve(__dirname, 'src') }`.
  - Crear `vitest.config.ts` con `environment: 'jsdom'`, `globals: true`, `include: ['src/**/*.test.ts']` y `setupFiles` si es necesario.
  - Añadir script `"test": "vitest run"` en `package.json`.
  - Añadir script anti-FOUC (`.dark` en `<html>`) como inline en `<head>` de `index.html`.
  - Reemplazar `src/index.css`: directivas de Tailwind (`@import "tailwindcss"` o `@tailwind base/components/utilities`) + variables CSS en `:root` y `.dark` (paleta de modo claro/oscuro, `--collection-accent: #6366f1`, `--radius: 0.5rem`).
  - Eliminar `src/App.css` y limpiar `src/assets/` (borrar `react.svg`, `vite.svg` y `hero.png`).
  - Crear `src/lib/utils.ts` exportando `cn(...inputs: ClassValue[]): string` con `clsx` + `tailwind-merge`.
  - Crear `src/lib/icons.ts` con `ICON_REGISTRY: Record<string, LucideIcon>` (24 iconos curados) y `getIcon(name: string): LucideIcon` con fallback a `LayoutGrid`.
  - Hecho cuando: `npx tsc --noEmit` pasa sin errores, `npm run lint` sin advertencias, `npm run build` produce bundle sin errores y `npm run test` ejecuta sin fallos (0 tests inicialmente es válido).

---

- [x] **T2. Contratos de datos globales.** RF-02.1, RF-02.2, RF-02.3
  - Crear `src/interfaces/collection.interface.ts` con `CollectionStatus`, `ProviderType`, `Collection` y `CollectionTemplate` exactamente según la spec (sin `any`, sin lógica).
  - Crear `src/interfaces/item.interface.ts` con `Item` (todos los campos de la spec, incluidos `xpAwarded: boolean` y `completedAt?: string`).
  - Crear `src/interfaces/provider.interface.ts` con `SearchResult` y `SearchProvider`.
  - Hecho cuando: `npx tsc --noEmit` pasa sin errores y los tres archivos exportan únicamente tipos/interfaces (ningún valor en tiempo de ejecución).

---

- [x] **T3. Lógica pura de colecciones y sus tests.** RF-03.1, RF-03.1.A, RF-03.1.B
  - Crear `src/features/collections/core/templates.ts` con:
    - `validateStatuses(statuses: CollectionStatus[]): void` — lanza `Error` si 0 o más de 1 estado tiene `isCompleted: true`.
    - `createCollection(params: CreateCollectionParams, now: string): Collection` — llama a `validateStatuses`, genera `id` con `crypto.randomUUID()`, devuelve objeto inmutable.
    - `COLLECTION_TEMPLATES: readonly CollectionTemplate[]` — 6 plantillas predefinidas (Videojuegos, Libros, Juegos de mesa, Figuras, Discos, Personalizada) con los iconos, colores y estados por defecto de la spec.
  - Crear `src/features/collections/core/templates.test.ts` con los 6 tests definidos en el plan (sección 5.2): id no vacío, createdAt === now, error con 0 completados, error con 2+ completados, 6 plantillas con exactamente 1 isCompleted, campos no vacíos en cada plantilla.
  - Hecho cuando: `npm run test` ejecuta `templates.test.ts` y los **6 tests pasan** sin fallos.

---

- [x] **T4. Lógica pura de ítems y sus tests.** RF-03.2, RF-03.2.A
  - Crear `src/features/items/core/items.ts` con:
    - `createItemFromSearchResult(params): Item` — genera `id` con `crypto.randomUUID()`, propaga todos los campos de `SearchResult`, `xpAwarded: false`, `createdAt = updatedAt = now`.
    - `createItemManual(params): Item` — igual pero sin `externalId` y con campos manuales.
    - `changeItemStatus(item, newStatusId, isCompleted, now): Item` — spread inmutable: actualiza `statusId`, `updatedAt = now`; si `isCompleted && !item.completedAt` establece `completedAt = now`; `xpAwarded = item.xpAwarded || isCompleted` (nunca puede bajar a `false`).
  - Crear `src/features/items/core/items.test.ts` con los 8 tests del plan (sección 5.3): propagación de campos, `coverUrl` opcional, cambio a no completado no toca `xpAwarded`/`completedAt`, primera y segunda completación, vuelta de completado a pendiente, `updatedAt` siempre actualizado.
  - Hecho cuando: `npm run test` ejecuta ambos archivos de test y los **14 tests totales** (6 + 8) pasan sin fallos.

---

- [x] **T5. Proveedor mock y stores Zustand.** RF-03.3, RF-04.1, RF-04.2, RF-04.3, RF-04.4
  - Crear `src/providers/mock.ts` exportando `mockProvider: SearchProvider` con un dataset de ~20 entradas hardcodeadas en categorías (videojuegos, libros, música, juegos de mesa, figuras); incluir ≥2 sin `coverUrl` y ≥2 sin `releaseYear`. La función `search` filtra por keywords, simula 300–600 ms de latencia y devuelve `[]` inmediatamente si `query` está vacía.
  - Crear `src/features/collections/store/collections.store.ts` con `useCollectionsStore` (Zustand + `persist`, clave `hoardex-collections`): estado `{ collections: Collection[] }`, acciones `addCollection`, `removeCollection` (que llama a `useItemsStore.getState().removeItemsByCollection(id)`), `updateCollection`. Persistencia defensiva con `merge` que no lanza si los datos son parciales.
  - Crear `src/features/items/store/items.store.ts` con `useItemsStore` (Zustand + `persist`, clave `hoardex-items`): estado `{ items: Item[] }`, acciones `addItem`, `removeItem`, `removeItemsByCollection`, `updateItemStatus` (delega en `changeItemStatus` de `core/`).
  - Hecho cuando: `npx tsc --noEmit` pasa, los 14 tests siguen en verde, y en la consola del navegador (DevTools) se puede confirmar que los stores se inicializan sin excepción aunque `localStorage` esté vacío.

---

- [x] **T6. Componentes UI primitivos y transversales.** RF-01.3 (decisión 6), RF-05.1, RF-05.2, RF-05.3, RF-05.4
  - Crear `src/components/ui/sheet.tsx` sobre `@radix-ui/react-dialog`: exportar `Sheet`, `SheetTrigger`, `SheetContent` (con prop `side`), `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose`. Animaciones de entrada/salida con clases Tailwind.
  - Crear `src/components/ui/` los primitivos adicionales que necesiten wrappers propios: `button.tsx` (con `class-variance-authority`), `input.tsx`, `label.tsx`, `select.tsx` (sobre `@radix-ui/react-select`), `badge.tsx`, `separator.tsx`. Seguir la convención Shadcn UI (props estándar HTML + `cn()`).
  - Crear `src/hooks/useTheme.ts`: inicializa desde `localStorage['hoardex-theme']` o `matchMedia`, expone `{ theme, toggleTheme }`, actualiza la clase `.dark` en `document.documentElement` y persiste en `localStorage`.
  - Crear `src/components/custom/Header.tsx`: logo "Hoardex" enlazado a `/` con `<Link>`, botón de toggle tema con `useTheme` (iconos `Sun`/`Moon`), `aria-label` descriptivo.
  - Crear `src/components/custom/CoverImage.tsx`: estados internos `'loading' | 'loaded' | 'error'`; skeleton animado en carga, `<img>` en éxito, placeholder con `ImageOff` en error o `src` undefined.
  - Crear `src/components/custom/ConfirmDialog.tsx`: wrapper de `@radix-ui/react-dialog` con `role="alertdialog"`, props `{ title, description, open, onOpenChange, onConfirm, onCancel? }`.
  - Crear `src/components/custom/EmptyState.tsx`: props `{ icon?, title, description?, action? }`, composición centrada y accesible.
  - Hecho cuando: `npx tsc --noEmit` pasa, `npm run lint` sin errores, los 14 tests siguen en verde y todos los componentes se pueden importar sin errores de compilación desde un archivo de prueba temporal.

---

- [x] **T7. Componentes de dominio y páginas.** RF-06.1, RF-06.2, RF-06.2.A, RF-06.3, RF-06.3.A, RF-07
  - Crear componentes de colecciones en `src/features/collections/components/`:
    - `ColorPicker.tsx`: paleta de 8–10 colores predefinidos (incluye los 6 de plantillas) + `<input type="color">` para personalizado; prop `value: string`, `onChange: (color: string) => void`.
    - `IconPicker.tsx`: grid de los 24 iconos del `ICON_REGISTRY` como botones seleccionables; prop `value: string`, `onChange: (name: string) => void`.
    - `StatusesEditor.tsx`: lista editable de `CollectionStatus[]`; añadir/eliminar estados, editar etiqueta, radio para marcar el completado (garantiza exactamente uno). Props `value: CollectionStatus[]`, `onChange`.
    - `CollectionForm.tsx`: formulario controlado con nombre (obligatorio), descripción, `IconPicker`, `ColorPicker`, `StatusesEditor`. Props `defaultValues?`, `onSubmit`.
    - `NewCollectionSheet.tsx`: `Sheet` lateral que muestra las 6 plantillas como tarjetas seleccionables + opción "Desde cero"; al seleccionar, pre-rellena `CollectionForm`; al guardar llama a `createCollection(params, now)` y `addCollection(collection)`.
    - `CollectionCard.tsx`: aplica `--collection-accent` vía `style`, muestra icono (con `getIcon`), nombre, contador ítems/completados, tira de hasta 4 `CoverImage` recientes. `onClick` navega a `/collection/:id`.
  - Crear componentes de ítems en `src/features/items/components/`:
    - `ItemForm.tsx`: formulario manual con título (obligatorio), subtítulo, año, URL de portada. Props `onSubmit`.
    - `SearchResultCard.tsx`: tarjeta compacta con `CoverImage` pequeña, título, año, subtítulo y botón "Añadir". Props `result: SearchResult`, `onAdd`.
    - `AddItemSheet.tsx`: `Sheet` lateral con dos tabs ("Buscar" / "Manual"); tab Buscar: input de texto → `mockProvider.search(query)` con estado de carga, lista de `SearchResultCard`, `EmptyState` si sin resultados; tab Manual: `ItemForm`. Al añadir, llama a `createItemFromSearchResult` o `createItemManual` con `now` del momento y luego `addItem`.
    - `ItemCard.tsx`: `CoverImage`, título, subtítulo, año, `Select` de Radix con los estados de la colección (llama a `updateItemStatus` al cambiar), botón `Trash2` que abre `ConfirmDialog` → `removeItem(id)`. Indicador visual en estado completado (borde/badge con `--collection-accent`).
  - Crear páginas:
    - `src/pages/HomePage.tsx`: `<Header>`, grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` de `CollectionCard`, `EmptyState` si sin colecciones, botón "Nueva colección" que abre `NewCollectionSheet`.
    - `src/pages/CollectionPage.tsx`: lee `useParams()`, redirige a `EmptyState` si colección no existe; cabecera con `--collection-accent` en `style`, icono, nombre, descripción y contador; grid `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` de `ItemCard`; `EmptyState` si sin ítems; botón "Añadir ítem" → `AddItemSheet`; botón "Eliminar colección" → `ConfirmDialog` → `removeCollection(id)`.
  - Reemplazar `src/App.tsx`: `<BrowserRouter>` + `<Routes>` con rutas `/`, `/collection/:id` y comodín `*` → `<Navigate to="/" replace />`, más `<Toaster richColors position="bottom-right" />`.
  - Hecho cuando: `npm run dev` arranca sin errores, la `HomePage` renderiza sin excepciones en consola y la navegación a `/collection/:id` funciona.

---

- [ ] **T8. Puerta de calidad y cierre.** RF-07, RNF-01 a RNF-05
  - Ejecutar `npx tsc --noEmit` → debe terminar sin errores.
  - Ejecutar `npm run test` → los 14 tests (6 + 8) deben pasar en verde.
  - Ejecutar `npm run lint` → sin errores ni advertencias.
  - Ejecutar `npm run build` → bundle sin errores.
  - Verificación visual con Chrome DevTools MCP en `http://localhost:5173/`:
    - [ ] `HomePage` muestra colecciones con color de acento y tira de portadas.
    - [ ] Crear colección desde plantilla y desde cero funciona correctamente.
    - [ ] Desde `CollectionPage` se puede añadir un ítem por búsqueda mock y de forma manual.
    - [ ] Cambiar el estado de un ítem desde la cuadrícula actualiza la UI sin recargar.
    - [ ] Los ítems sin portada muestran el placeholder de `CoverImage` (icono `ImageOff`).
    - [ ] Eliminar colección con confirmación elimina también sus ítems (no quedan huérfanos en DevTools → Application → Local Storage).
    - [ ] Recargar la página mantiene todas las colecciones e ítems (persistencia en `localStorage`).
    - [ ] El toggle de modo oscuro funciona y se recuerda entre recargas; no hay flash visual (FOUC) al recargar.
    - [ ] La vista en móvil (emulación 375 px en DevTools) es funcional y usable.
    - [ ] No existe ningún `any` explícito en `src/` (búsqueda en editor o `grep -r ": any" src/`).
  - Actualizar `MEMORY.md`: estado de la spec 001 como "implementada", decisiones clave adoptadas (claves de persistencia separadas, `crypto.randomUUID`, registro de iconos curado) y errores a evitar en fases siguientes.
  - Hecho cuando: todos los checks de arriba están marcados, `MEMORY.md` está actualizado y la spec puede considerarse cerrada.
