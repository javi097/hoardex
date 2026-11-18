# Plan técnico 001 — Core Catalog Mock
Estado: aprobado

> Trazabilidad: cada sección indica el RF de `spec.md` que implementa.

---

## 1. Visión general del orden de capas

```
RF-01  Bootstrap (config + deps + limpieza)
  ↓
RF-02  Contratos de datos (src/interfaces/)
  ↓
RF-03  Lógica pura + tests (core/ + providers/)
  ↓
RF-04  Estado Zustand + persistencia (store/)
  ↓
RF-05  Componentes transversales (components/custom/, components/ui/)
  ↓
RF-06  Páginas y navegación (pages/ + features/.../components/)
  ↓
RF-07  Accesibilidad, ajustes finales y validación
```

Cada capa solo depende de las anteriores. Las capas de `core/` son completamente independientes de React y del DOM.

---

## 2. Archivos y responsabilidades

### 2.1 Bootstrap — RF-01

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `tsconfig.app.json` | Modificar | Añadir `"strict": true`, `"paths": { "@/*": ["./src/*"] }` |
| `tsconfig.json` | Modificar | Sin cambios de fondo; `references` ya apunta a `tsconfig.app.json` |
| `vite.config.ts` | Modificar | Añadir `resolve.alias: { '@': path.resolve(__dirname, 'src') }` |
| `package.json` | Modificar | Añadir script `"test": "vitest run"`. Instalar todas las deps de RF-01.3 |
| `vitest.config.ts` | Crear | Config de Vitest: `environment: 'jsdom'`, `globals: true`, `include: ['src/**/*.test.ts']` |
| `tailwind.config.ts` | Crear | Config de Tailwind v4 con `content` apuntando a `./src/**/*.{ts,tsx}` |
| `src/index.css` | Reemplazar | Directivas de Tailwind + variables CSS globales (modo claro/oscuro, `--collection-accent`) |
| `src/App.css` | Eliminar | Boilerplate de Vite |
| `src/App.tsx` | Reemplazar | Contenedor raíz: `BrowserRouter` + `Routes` + `<Toaster />` de Sonner |
| `src/main.tsx` | Revisar | Sin cambios esperados; confirmar que renderiza `<App />` en `#root` |
| `index.html` | Modificar | Añadir script inline en `<head>` para aplicar clase `.dark` antes de hidratación (RF-06, decisión 5) |
| `src/assets/` | Limpiar | Eliminar `react.svg`, `vite.svg`, `hero.png` (boilerplate) |

**Nota sobre Tailwind v4:** Con `@tailwindcss/vite` plugin la configuración es distinta a v3. Las variables CSS se definen en `index.css` con la directiva `@theme` o en `:root` convencional, y `tailwind.config.ts` puede no ser necesario. Se usará el enfoque de variables CSS en `index.css` directamente, compatible con ambas versiones.

**Script anti-FOUC en `index.html`:**
```html
<script>
  (function() {
    var theme = localStorage.getItem('hoardex-theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

---

### 2.2 Contratos de datos — RF-02

| Archivo | Acción | Exports |
|---|---|---|
| `src/interfaces/collection.interface.ts` | Crear | `CollectionStatus`, `ProviderType`, `Collection`, `CollectionTemplate` |
| `src/interfaces/item.interface.ts` | Crear | `Item` |
| `src/interfaces/provider.interface.ts` | Crear | `SearchResult`, `SearchProvider` |

No hay lógica en estos archivos: solo tipos e interfaces TypeScript. Son el único punto de verdad para los contratos de datos.

---

### 2.3 Registro de iconos — RF-01 (decisión 1)

| Archivo | Acción | Exports |
|---|---|---|
| `src/lib/icons.ts` | Crear | `ICON_REGISTRY: Record<string, LucideIcon>`, `getIcon(name: string): LucideIcon` |
| `src/lib/utils.ts` | Crear | `cn(...inputs: ClassValue[]): string` |

**`src/lib/icons.ts`** — Subconjunto curado de ~24 iconos:

```typescript
import {
  Gamepad2, BookOpen, Dice5, Trophy, Disc3, LayoutGrid,
  Film, Music, Camera, Star, Heart, Package,
  Tv, Headphones, Shirt, Brush, Coffee, Zap,
  Globe, Archive, Tag, Bookmark, Gift, Puzzle
} from 'lucide-react';

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Gamepad2, BookOpen, Dice5, Trophy, Disc3, LayoutGrid,
  Film, Music, Camera, Star, Heart, Package,
  Tv, Headphones, Shirt, Brush, Coffee, Zap,
  Globe, Archive, Tag, Bookmark, Gift, Puzzle,
};

export function getIcon(name: string): LucideIcon {
  return ICON_REGISTRY[name] ?? LayoutGrid;
}
```

---

### 2.4 Lógica pura y tests — RF-03

#### `src/features/collections/core/templates.ts`

| Función/Export | Firma | RF |
|---|---|---|
| `COLLECTION_TEMPLATES` | `readonly CollectionTemplate[]` | RF-03.1 |
| `validateStatuses` | `(statuses: CollectionStatus[]) => void` | RF-03.1 |
| `createCollection` | `(params: CreateCollectionParams, now: string) => Collection` | RF-03.1 |

**Flujo de `createCollection`:**
1. Llama a `validateStatuses(params.statuses)` → lanza `Error` si falla.
2. Genera `id` con `crypto.randomUUID()` (disponible en todos los navegadores modernos y en Node 19+; sin dependencia externa).
3. Devuelve objeto `Collection` con `createdAt = now` y todos los campos de `params`.

**`validateStatuses`:**
```
const completed = statuses.filter(s => s.isCompleted);
if (completed.length === 0) throw new Error('...');
if (completed.length > 1) throw new Error('...');
```

#### `src/features/collections/core/templates.test.ts`

Casos cubiertos (5 tests de RF-03.1.B):
1. `createCollection` → `id` no vacío, `createdAt === now`.
2. `createCollection` → error si 0 estados completados.
3. `createCollection` → error si 2+ estados completados.
4. `COLLECTION_TEMPLATES` → 6 entradas, cada una con exactamente 1 `isCompleted: true`.
5. Cada plantilla tiene `id`, `name`, `icon`, `accentColor`, `provider` y `defaultStatuses` no vacíos.

#### `src/features/items/core/items.ts`

| Función | Firma | RF |
|---|---|---|
| `createItemFromSearchResult` | `(params: CreateFromResultParams) => Item` | RF-03.2 |
| `createItemManual` | `(params: CreateManualParams) => Item` | RF-03.2 |
| `changeItemStatus` | `(item: Item, newStatusId: string, isCompleted: boolean, now: string) => Item` | RF-03.2 |

**Flujo de `changeItemStatus`:**
```
const isFirstCompletion = isCompleted && !item.xpAwarded;
return {
  ...item,
  statusId: newStatusId,
  updatedAt: now,
  completedAt: isCompleted && !item.completedAt ? now : item.completedAt,
  xpAwarded: item.xpAwarded || isCompleted,
};
```

Nótese: `xpAwarded` nunca puede pasar de `true` a `false` (OR lógico).

#### `src/features/items/core/items.test.ts`

7 casos de RF-03.2.A:
1. `createItemFromSearchResult` propaga todos los campos de `SearchResult`.
2. `createItemManual` sin `coverUrl` → `coverUrl: undefined`.
3. `changeItemStatus` a no completado → `xpAwarded` y `completedAt` sin cambios.
4. `changeItemStatus` a completado → `xpAwarded: true`, `completedAt === now`.
5. Segunda vez a completado → `xpAwarded` y `completedAt` sin duplicar.
6. Volver de completado a no completado → `xpAwarded: true`, `completedAt` conservado.
7. `updatedAt` siempre actualizado al `now` recibido.

#### `src/providers/mock.ts`

| Export | Tipo | RF |
|---|---|---|
| `mockProvider` | `SearchProvider` | RF-03.3 |

**Diseño del dataset mock:**

Se hardcodean ~20 entradas agrupadas en categorías (videojuegos, libros, música, juegos de mesa, figuras). La función `search` filtra por keywords en `query.toLowerCase()`. Si no hay match de categoría, devuelve las primeras 5 entradas generales.

Dataset garantiza:
- ≥2 entradas sin `coverUrl` (p. ej. libros antiguos, figuras de nicho).
- ≥2 entradas sin `releaseYear` (p. ej. figuras sin fecha de edición).
- Latencia simulada: `await new Promise(r => setTimeout(r, 300 + Math.random() * 300))`.
- Consulta vacía: retorno inmediato de `[]` sin `setTimeout`.

---

### 2.5 Stores Zustand — RF-04

#### `src/features/collections/store/collections.store.ts`

```typescript
interface CollectionsState {
  collections: Collection[];
  addCollection: (collection: Collection) => void;
  removeCollection: (id: string) => void;
  updateCollection: (id: string, patch: Partial<Omit<Collection, 'id' | 'createdAt'>>) => void;
}
```

Acciones (inmutables):
- `addCollection`: `[...state.collections, collection]`
- `removeCollection`: filtra por `id` + llama `useItemsStore.getState().removeItemsByCollection(id)`
- `updateCollection`: `state.collections.map(c => c.id === id ? { ...c, ...patch } : c)`

#### `src/features/items/store/items.store.ts`

```typescript
interface ItemsState {
  items: Item[];
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
  removeItemsByCollection: (collectionId: string) => void;
  updateItemStatus: (itemId: string, newStatusId: string, isCompleted: boolean, now: string) => void;
}
```

`updateItemStatus` delega en `changeItemStatus` de `core/items.ts`.

#### Persistencia — RF-04.3

Ambos stores usan el middleware `persist` de Zustand con la **misma clave** `hoardex-storage`, configurando `partialize` para guardar solo el estado (sin las acciones) y `merge` defensivo:

```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: 'hoardex-storage',
    partialize: (state) => ({ collections: state.collections }),
    merge: (persisted, current) => ({
      ...current,
      ...(persisted as Partial<CollectionsState>),
    }),
  }
)
```

**Decisión técnica:** Usar dos instancias de `persist` con la misma clave `hoardex-storage` puede causar colisiones. La solución es usar **namespaces dentro de la clave** o una única clave con `partialize`. Se optará por dos claves distintas: `hoardex-collections` e `hoardex-items`, ambas documentadas en `AGENTS.md`. _(Alternativa descartada: store único combinado — violaría la separación por dominio de la constitución.)_

---

### 2.6 Hook de tema — RF-05 (decisión 5)

| Archivo | Acción | Exports |
|---|---|---|
| `src/hooks/useTheme.ts` | Crear | `useTheme(): { theme: 'light' \| 'dark'; toggleTheme: () => void }` |

**Flujo:**
1. Inicializa con `localStorage.getItem('hoardex-theme')` o `matchMedia('prefers-color-scheme')`.
2. `toggleTheme` actualiza `localStorage`, el estado React y la clase `.dark` en `document.documentElement`.

---

### 2.7 Componentes transversales — RF-05

#### `src/components/ui/sheet.tsx` — RF-01.3 (decisión 6)

Wrapper sobre `@radix-ui/react-dialog` con la API de Shadcn UI:
- Exports: `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose`.
- `SheetContent` acepta `side: 'left' | 'right' | 'top' | 'bottom'` (por defecto `'right'`).
- Aplica animaciones de entrada/salida con clases Tailwind (`translate-x-full`, `transition-transform`).

#### `src/components/custom/Header.tsx` — RF-05.1

- Logo "Hoardex" enlazado a `/` (con `<Link>` de react-router).
- Botón toggle de tema usando `useTheme`.
- Icono `Sun` si modo oscuro activo (pulsar → modo claro), `Moon` si modo claro activo (pulsar → modo oscuro).
- `aria-label` descriptivo en el botón.

#### `src/components/custom/CoverImage.tsx` — RF-05.2

Estado interno: `'loading' | 'loaded' | 'error'`.

```
src undefined → 'error' directo
src definida → 'loading' → onLoad → 'loaded'
              → onError → 'error'

'loading' → <div animate-pulse />
'loaded'  → <img src alt className />
'error'   → <div><ImageOff /></div>
```

#### `src/components/custom/ConfirmDialog.tsx` — RF-05.3

Wrapper de `@radix-ui/react-dialog` con dos botones ("Cancelar" / "Confirmar") y `role="alertdialog"` semántico.

#### `src/components/custom/EmptyState.tsx` — RF-05.4

Composición flexible: icono centrado, título, descripción opcional y slot de acción.

---

### 2.8 Componentes de features — RF-06

#### `src/features/collections/components/`

| Componente | Responsabilidad |
|---|---|
| `CollectionCard.tsx` | Tarjeta de colección: acento CSS, icono, nombre, contadores, tira de portadas |
| `NewCollectionSheet.tsx` | Sheet lateral: selector de plantilla → formulario de colección |
| `CollectionForm.tsx` | Formulario controlado: nombre, descripción, icono, color, estados |
| `ColorPicker.tsx` | Paleta de 8–10 colores + `<input type="color">` personalizado |
| `IconPicker.tsx` | Grid de ~24 iconos del `ICON_REGISTRY` como botones seleccionables |
| `StatusesEditor.tsx` | Lista editable de estados: añadir, eliminar, reordenar, marcar el completado |

#### `src/features/items/components/`

| Componente | Responsabilidad |
|---|---|
| `ItemCard.tsx` | Tarjeta de ítem: `CoverImage`, título, subtítulo, año, `Select` de estado, botón `Trash2` |
| `AddItemSheet.tsx` | Sheet lateral con dos tabs: Buscar (mock) y Manual |
| `SearchResultCard.tsx` | Resultado de búsqueda: `CoverImage` pequeña, título, año, subtítulo |
| `ItemForm.tsx` | Formulario de alta manual: título, subtítulo, año, URL de portada |

---

### 2.9 Páginas — RF-06

#### `src/pages/HomePage.tsx`

Flujo de datos:
```
useCollectionsStore() → collections[]
useItemsStore()       → items[]

Para cada collection:
  - itemsOfCollection = items.filter(i => i.collectionId === collection.id)
  - completedCount = itemsOfCollection.filter(i => xpAwarded).length  ← proxy de completados
  - recentCovers = itemsOfCollection.slice(-4).map(i => i.coverUrl).reverse()
  → <CollectionCard />
```

Renderizado:
- `<Header />`
- Si collections vacías: `<EmptyState>` con CTA "Crear primera colección".
- Grid de `<CollectionCard />`: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`.
- Botón "Nueva colección" (top-right) → abre `<NewCollectionSheet />`.

#### `src/pages/CollectionPage.tsx`

Flujo de datos:
```
useParams() → { id }
useCollectionsStore() → collection | undefined
useItemsStore()       → items.filter(i => i.collectionId === id)

Si collection === undefined → <EmptyState> con enlace a "/"
```

Renderizado:
- Cabecera con `--collection-accent` en `style`, icono, nombre, descripción, contador completados/total.
- `<Header />` global o integrado en la cabecera de la página.
- Grid de `<ItemCard />`: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`.
- Si items vacíos: `<EmptyState>` con CTA "Añadir primer ítem".
- Botón "Añadir ítem" → `<AddItemSheet />`.
- Botón "Eliminar colección" → `<ConfirmDialog>` → `removeCollection(id)`.

#### `src/App.tsx`

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/"               element={<HomePage />} />
    <Route path="/collection/:id" element={<CollectionPage />} />
    <Route path="*"               element={<Navigate to="/" replace />} />
  </Routes>
  <Toaster richColors position="bottom-right" />
</BrowserRouter>
```

---

## 3. Flujo de datos completo (diagrama)

```
index.html
  └─ script anti-FOUC (aplica .dark antes de React)
  └─ main.tsx → <App />
       └─ BrowserRouter
            ├─ / → HomePage
            │    ├─ useCollectionsStore()
            │    ├─ useItemsStore()
            │    ├─ <Header> (useTheme)
            │    ├─ <CollectionCard> × N
            │    │    └─ <CoverImage> × 4
            │    └─ <NewCollectionSheet>
            │         ├─ <CollectionForm>
            │         │    ├─ <IconPicker> (ICON_REGISTRY)
            │         │    ├─ <ColorPicker>
            │         │    └─ <StatusesEditor>
            │         └─ createCollection(params, now) → addCollection(collection)
            │
            └─ /collection/:id → CollectionPage
                 ├─ useCollectionsStore()
                 ├─ useItemsStore()
                 ├─ <ItemCard> × N
                 │    ├─ <CoverImage>
                 │    ├─ <Select> (estados) → updateItemStatus(...)
                 │    └─ <Trash2> → <ConfirmDialog> → removeItem(id)
                 └─ <AddItemSheet>
                      ├─ Tab "Buscar" → mockProvider.search(query) → createItemFromSearchResult → addItem
                      └─ Tab "Manual" → <ItemForm> → createItemManual → addItem

localStorage
  ├─ hoardex-collections  (persist de collections.store.ts)
  ├─ hoardex-items        (persist de items.store.ts)
  └─ hoardex-theme        (useTheme hook)
```

---

## 4. Decisiones técnicas justificadas

| Decisión | Elección | Alternativa descartada | Razón |
|---|---|---|---|
| Generación de IDs | `crypto.randomUUID()` | `uuid` package | Sin dependencia extra; disponible en Node 19+ y todos los browsers modernos |
| Claves de persistencia | Dos claves separadas (`hoardex-collections`, `hoardex-items`) | Una sola clave compartida `hoardex-storage` | Evita colisiones al persistir stores independientes; facilita migración parcial en fases futuras |
| Sheet sobre Dialog de Radix | `@radix-ui/react-dialog` como base | `@radix-ui/react-sheet` (no existe como primitiva propia) | Shadcn UI implementa `Sheet` sobre `Dialog`; misma primitiva, distintos estilos de posición |
| Selector de iconos | Registro tipado `ICON_REGISTRY` | Import dinámico de lucide-react | Preserva tree-shaking; bundle contiene solo ~24 iconos, no >1000 |
| Paleta de colores | Colores curados + `<input type="color">` | Solo picker nativo | Mejor UX en móvil; garantiza contraste mínimo en la paleta predefinida |
| Anti-FOUC | Script inline en `<head>` de `index.html` | CSS `prefers-color-scheme` sin clase | Permite toggle manual sin flash; Tailwind modo oscuro por clase `.dark` requiere JS de todas formas |
| `changeItemStatus` inmutable | Spread operator + OR lógico para `xpAwarded` | Mutar el objeto `item` | Garantiza pureza de la función; facilita tests deterministas; requerido por constitución |
| `completedAt` idempotente | `!item.completedAt ? now : item.completedAt` | Siempre sobrescribir | Registra la *primera* vez que se completó; relevante para rachas y estadísticas futuras |

---

## 5. Estrategia de tests

### 5.1 Cobertura por RF

| Archivo de test | Tests | RF cubierto |
|---|---|---|
| `templates.test.ts` | 5 | RF-03.1, RF-03.1.B |
| `items.test.ts` | 7 | RF-03.2, RF-03.2.A |

### 5.2 Tests de `templates.test.ts` (detalle)

```
describe('createCollection')
  ✓ genera id no vacío y createdAt igual al now recibido
  ✓ lanza error si statuses no tiene ningún isCompleted:true
  ✓ lanza error si statuses tiene más de un isCompleted:true

describe('COLLECTION_TEMPLATES')
  ✓ tiene exactamente 6 entradas
  ✓ cada plantilla tiene exactamente 1 estado con isCompleted:true
  ✓ cada plantilla tiene id, name, icon, accentColor, provider y defaultStatuses no vacíos
```

### 5.3 Tests de `items.test.ts` (detalle)

```
describe('createItemFromSearchResult')
  ✓ propaga externalId, title, subtitle, releaseYear, coverUrl y meta del SearchResult
  ✓ inicia con xpAwarded:false

describe('createItemManual')
  ✓ sin coverUrl → coverUrl undefined en el Item resultante

describe('changeItemStatus')
  ✓ cambio a estado NO completado: xpAwarded y completedAt sin cambios
  ✓ cambio a estado completado (1ª vez): xpAwarded:true, completedAt === now
  ✓ cambio a estado completado (2ª vez): xpAwarded y completedAt sin modificar
  ✓ volver de completado a no completado: xpAwarded:true, completedAt conservado
  ✓ updatedAt siempre === now recibido
```

### 5.4 Tests no cubiertos en esta fase

- Tests de componentes React (Testing Library): se añadirán en la spec 003 cuando la UI sea más estable.
- Tests de integración de stores: cubiertos manualmente vía Chrome DevTools (criterios de finalización de la spec).
- Tests de `mockProvider`: el comportamiento es trivial (datos hardcodeados + delay); se valida de forma explorativa.

---

## 6. Trazabilidad RF → Archivos

| RF | Archivos |
|---|---|
| RF-01.1 | `tsconfig.app.json` |
| RF-01.2 | `vite.config.ts` |
| RF-01.3 | `package.json`, `vitest.config.ts`, todos los archivos de `src/components/ui/` |
| RF-01.4 | `package.json` |
| RF-01.5 | `src/lib/utils.ts` |
| RF-01.6 | `src/App.css` (eliminar), `src/App.tsx`, `src/assets/` (limpiar) |
| RF-01.7 | `src/index.css` |
| RF-02.1 | `src/interfaces/collection.interface.ts` |
| RF-02.2 | `src/interfaces/item.interface.ts` |
| RF-02.3 | `src/interfaces/provider.interface.ts` |
| RF-03.1 | `src/features/collections/core/templates.ts` + `templates.test.ts` |
| RF-03.2 | `src/features/items/core/items.ts` + `items.test.ts` |
| RF-03.3 | `src/providers/mock.ts` |
| RF-04.1 | `src/features/collections/store/collections.store.ts` |
| RF-04.2 | `src/features/items/store/items.store.ts` |
| RF-04.3–4 | Ambos stores (middleware `persist`) |
| RF-05.1 | `src/components/custom/Header.tsx`, `src/hooks/useTheme.ts`, `index.html` |
| RF-05.2 | `src/components/custom/CoverImage.tsx` |
| RF-05.3 | `src/components/custom/ConfirmDialog.tsx` |
| RF-05.4 | `src/components/custom/EmptyState.tsx` |
| RF-06.1 | `src/App.tsx` |
| RF-06.2 | `src/pages/HomePage.tsx`, `src/features/collections/components/CollectionCard.tsx`, `NewCollectionSheet.tsx`, `CollectionForm.tsx`, `ColorPicker.tsx`, `IconPicker.tsx`, `StatusesEditor.tsx` |
| RF-06.3 | `src/pages/CollectionPage.tsx`, `src/features/items/components/ItemCard.tsx`, `AddItemSheet.tsx`, `SearchResultCard.tsx`, `ItemForm.tsx` |
| RF-07 | Todos los componentes (atributos ARIA, contraste, responsive) |

---

## 7. Árbol de archivos a crear/modificar

```
hoardex/
├── index.html                                    ← MOD: script anti-FOUC
├── package.json                                  ← MOD: deps + script test
├── tsconfig.app.json                             ← MOD: strict + paths
├── vite.config.ts                                ← MOD: alias @
├── vitest.config.ts                              ← NUEVO
│
├── src/
│   ├── index.css                                 ← REEMPLAZAR
│   ├── App.tsx                                   ← REEMPLAZAR
│   ├── App.css                                   ← ELIMINAR
│   ├── assets/                                   ← LIMPIAR (react.svg, vite.svg, hero.png)
│   │
│   ├── lib/
│   │   ├── utils.ts                              ← NUEVO
│   │   └── icons.ts                              ← NUEVO
│   │
│   ├── hooks/
│   │   └── useTheme.ts                           ← NUEVO
│   │
│   ├── interfaces/
│   │   ├── collection.interface.ts               ← NUEVO
│   │   ├── item.interface.ts                     ← NUEVO
│   │   └── provider.interface.ts                 ← NUEVO
│   │
│   ├── providers/
│   │   └── mock.ts                               ← NUEVO
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   └── sheet.tsx                         ← NUEVO
│   │   └── custom/
│   │       ├── Header.tsx                        ← NUEVO
│   │       ├── CoverImage.tsx                    ← NUEVO
│   │       ├── ConfirmDialog.tsx                 ← NUEVO
│   │       └── EmptyState.tsx                    ← NUEVO
│   │
│   ├── features/
│   │   ├── collections/
│   │   │   ├── core/
│   │   │   │   ├── templates.ts                  ← NUEVO
│   │   │   │   └── templates.test.ts             ← NUEVO
│   │   │   ├── store/
│   │   │   │   └── collections.store.ts          ← NUEVO
│   │   │   └── components/
│   │   │       ├── CollectionCard.tsx            ← NUEVO
│   │   │       ├── NewCollectionSheet.tsx        ← NUEVO
│   │   │       ├── CollectionForm.tsx            ← NUEVO
│   │   │       ├── ColorPicker.tsx               ← NUEVO
│   │   │       ├── IconPicker.tsx                ← NUEVO
│   │   │       └── StatusesEditor.tsx            ← NUEVO
│   │   │
│   │   └── items/
│   │       ├── core/
│   │       │   ├── items.ts                      ← NUEVO
│   │       │   └── items.test.ts                 ← NUEVO
│   │       ├── store/
│   │       │   └── items.store.ts                ← NUEVO
│   │       └── components/
│   │           ├── ItemCard.tsx                  ← NUEVO
│   │           ├── AddItemSheet.tsx              ← NUEVO
│   │           ├── SearchResultCard.tsx          ← NUEVO
│   │           └── ItemForm.tsx                  ← NUEVO
│   │
│   └── pages/
│       ├── HomePage.tsx                          ← NUEVO
│       └── CollectionPage.tsx                    ← NUEVO
│
└── specs/
    └── 001-core-catalog-mock/
        ├── spec.md                               ← APROBADA
        ├── plan.md                               ← ESTE ARCHIVO
        └── tasks.md                              ← PENDIENTE (sdd-tasks)
```

**Total:** 10 archivos modificados, 36 archivos nuevos, 3 archivos eliminados/limpiados.
