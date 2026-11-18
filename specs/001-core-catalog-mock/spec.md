# Spec 001 — Core Catalog Mock
Estado: aprobada

---

## Contexto y objetivo

Hoardex es una aplicación web para catalogar colecciones de aficiones (videojuegos, libros, juegos de mesa, figuras, discos y cualquier colección personalizada). Esta primera especificación cubre la **Fase 1a**: establecer la arquitectura base completa y construir una biblioteca funcional con datos mock que valide el diseño de los contratos, el flujo de creación de colecciones/ítems y la interfaz de usuario, antes de conectar APIs externas reales.

**Objetivo de la fase:** Al terminar, el usuario podrá crear colecciones a partir de plantillas predefinidas, añadir ítems (manualmente o buscando en un proveedor mock), cambiar el estado de cada ítem y ver cómo la aplicación persiste todo en `localStorage`, todo ello con un diseño mobile-first accesible y con soporte de modo claro/oscuro.

---

## Usuarios

- **Coleccionista**: usuario que gestiona una o más colecciones de aficiones.
- _(Fases futuras: usuario autenticado con perfil público — fuera del alcance aquí)._

---

## Historias de usuario

- **HU-01.** Como coleccionista, quiero crear una colección nueva eligiendo una plantilla predefinida (Videojuegos, Libros, Juegos de mesa, Figuras, Discos) o desde cero, para empezar a catalogar sin tener que configurarlo todo a mano.
- **HU-02.** Como coleccionista, quiero ver mis colecciones en una página de inicio tipo estantería, donde cada colección muestre su icono, color de acento, nombre, número de ítems y miniaturas de las últimas portadas añadidas.
- **HU-03.** Como coleccionista, quiero entrar en una colección y ver sus ítems en cuadrícula, con la portada, el título y el estado actual de cada uno.
- **HU-04.** Como coleccionista, quiero añadir un ítem a una colección buscando en el proveedor mock (que simula una búsqueda externa) o rellenando un formulario manual.
- **HU-05.** Como coleccionista, quiero cambiar el estado de un ítem (por ejemplo: Pendiente → En curso → Completado) desde la cuadrícula sin abrir una ficha completa.
- **HU-06.** Como coleccionista, quiero que el estado de mis colecciones e ítems persista entre sesiones (recarga del navegador), almacenado en `localStorage`.
- **HU-07.** Como coleccionista, quiero activar el modo oscuro o claro desde la cabecera de la aplicación, respetando también mi preferencia del sistema operativo por defecto.
- **HU-08.** Como coleccionista, quiero que las portadas de los ítems muestren un placeholder elegante cuando no existan o fallen al cargar, en lugar de un error roto.
- **HU-09.** Como coleccionista, quiero eliminar una colección (con confirmación) o eliminar un ítem de una colección.

---

## Definiciones

| Término | Significado en Hoardex |
|---|---|
| **Colección** | Agrupador temático de ítems (p. ej. "Mis Videojuegos") con su propio color, icono, estados y proveedor de búsqueda. |
| **Ítem** | Elemento genérico dentro de una colección. Lo específico del medio (plataforma, autor, editorial…) va en `item.meta`. |
| **Estado de ítem** | Valor definido por la colección (p. ej. Pendiente / En curso / Completado). Exactamente uno de ellos tiene `isCompleted: true`. |
| **Plantilla** | Configuración predefinida de una colección (nombre sugerido, icono, color, estados, proveedor). No crea la colección automáticamente. |
| **Proveedor mock** | Implementación de `SearchProvider` que devuelve datos simulados realistas sin llamadas reales a ninguna API. |
| **XP idempotente** | El XP se marca como concedido (`xpAwarded: true`) la primera vez que un ítem alcanza el estado completado; cambiar el estado de nuevo no duplica el XP. _(La lógica de puntos y niveles es de Fase 3; aquí solo se cimenta el flag.)_ |
| **Color de acento** | Color hexadecimal asociado a la colección, aplicado como variable CSS `--collection-accent` para que todos sus componentes lo hereden sin clases hardcodeadas. |

---

## Requisitos funcionales

### RF-01 — Bootstrap del entorno base

**RF-01.1** `tsconfig.app.json` debe incluir `"strict": true` y el path mapping `"@/*": ["./src/*"]`. El campo `"lib"` debe incluir `"DOM"` y al menos `"ES2023"`.

**RF-01.2** `vite.config.ts` debe configurar el alias `@` → `./src` mediante `resolve.alias` (compatible con el path mapping de TypeScript).

**RF-01.3** Las siguientes dependencias deben estar instaladas y operativas:
  - **UI/Estilos:** `tailwindcss`, `@tailwindcss/vite` (o integración equivalente), `clsx`, `tailwind-merge`, `class-variance-authority`.
  - **Primitivas Radix:** `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-separator`.
  - **Iconos:** `lucide-react`.
  - **Estado:** `zustand`.
  - **Notificaciones:** `sonner`.
  - **Enrutamiento:** `react-router` (v7+, con `BrowserRouter` y `Routes`).
  - **Tests:** `vitest`, `@vitest/ui` (opcional), `jsdom`, `@testing-library/react`, `@testing-library/user-event`.

**RF-01.4** `package.json` debe tener el script `"test": "vitest run"` y, opcionalmente, `"test:ui": "vitest --ui"`.

**RF-01.5** `src/lib/utils.ts` debe exportar la función `cn(...inputs: ClassValue[]): string` usando `clsx` + `tailwind-merge`. Este es el único punto de composición de clases en toda la app.

**RF-01.6** El boilerplate inicial de Vite debe limpiarse por completo:
  - Eliminar `src/App.css` y los imports de logos (`react.svg`, `vite.svg`, `hero.png`) y del boilerplate (`App.css`) de `src/App.tsx`.
  - Vaciar `src/index.css` del CSS de Vite existente y sustituirlo con las directivas de Tailwind y las variables CSS de Hoardex (ver RF-01.7).
  - `src/App.tsx` pasa a ser el contenedor raíz del router con `<Toaster />` de Sonner.

**RF-01.7** `src/index.css` debe definir las siguientes variables CSS globales mediante `@layer base` o en `:root`:

```
/* Paleta de modo claro */
:root {
  --background: <oklch o hsl>;
  --foreground: <oklch o hsl>;
  --muted: ...;
  --muted-foreground: ...;
  --card: ...;
  --card-foreground: ...;
  --border: ...;
  --input: ...;
  --primary: ...;         /* color de acción principal de la app */
  --primary-foreground: ...;
  --ring: ...;
  --radius: 0.5rem;       /* radio base de bordes */
  --collection-accent: #6366f1;  /* valor por defecto; se sobreescribe por colección */
}

/* Paleta de modo oscuro (clase .dark en <html>) */
.dark { ... }
```

La variable `--collection-accent` es el mecanismo central de tematización por colección: los componentes de colección la consumen directamente (`bg-[var(--collection-accent)]`, `text-[var(--collection-accent)]`). No se crean clases Tailwind por color de colección.

---

### RF-02 — Contratos de datos globales (`src/interfaces/`)

> Todos los archivos viven en `src/interfaces/`. Ningún campo puede ser `any`.

**RF-02.1** `collection.interface.ts`:

```typescript
export interface CollectionStatus {
  id: string;
  label: string;
  isCompleted: boolean;
  order: number;
}

export type ProviderType = 'manual' | 'rawg' | 'openLibrary' | 'bgg';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon: string;              // nombre de icono de lucide-react (p. ej. "Gamepad2")
  accentColor: string;       // valor hexadecimal (p. ej. "#6366f1")
  provider: ProviderType;
  statuses: CollectionStatus[];
  createdAt: string;         // ISO 8601
}

export interface CollectionTemplate {
  id: string;                // p. ej. "videogames", "books", "boardgames", "figures", "music", "custom"
  name: string;              // nombre de la plantilla en español
  description: string;       // descripción breve
  icon: string;              // nombre de icono de lucide-react
  accentColor: string;
  provider: ProviderType;
  defaultStatuses: CollectionStatus[];
}
```

**Regla de integridad:** `statuses` debe contener exactamente un elemento con `isCompleted: true`. La función de creación de colecciones debe validar y hacer cumplir esta regla; si se recibe un array sin ningún estado completado o con más de uno, debe lanzar un error descriptivo.

**RF-02.2** `item.interface.ts`:

```typescript
export interface Item {
  id: string;
  collectionId: string;
  externalId?: string;      // ID en la API externa (RAWG, Open Library, BGG)
  title: string;
  subtitle?: string;         // autor, desarrollador, editorial…
  releaseYear?: number;
  coverUrl?: string;
  statusId: string;          // referencia a CollectionStatus.id
  xpAwarded: boolean;        // true una vez concedido; nunca vuelve a false
  meta: Record<string, string | number | boolean>;
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
  completedAt?: string;      // ISO 8601; se establece al alcanzar isCompleted por primera vez
}
```

**RF-02.3** `provider.interface.ts`:

```typescript
export interface SearchResult {
  externalId: string;
  title: string;
  subtitle?: string;
  releaseYear?: number;
  coverUrl?: string;
  meta: Record<string, string | number | boolean>;
}

export interface SearchProvider {
  search(query: string): Promise<SearchResult[]>;
}
```

---

### RF-03 — Lógica pura y tests (`core/` + Vitest)

> Todas las funciones de `core/` son puras: sin efectos secundarios, sin imports de React, sin acceso a Zustand y sin llamadas a `Date.now()` o `new Date()`. La fecha actual se recibe siempre como parámetro `string` (ISO 8601).

**RF-03.1** `src/features/collections/core/templates.ts`:

Debe exportar:
- `COLLECTION_TEMPLATES: CollectionTemplate[]` — array inmutable con las seis plantillas predefinidas (ver RF-03.1.A).
- `createCollection(params: CreateCollectionParams, now: string): Collection` — función pura que genera un objeto `Collection` con `id` único (UUID v4), valida que haya exactamente un estado con `isCompleted: true` y aplica `createdAt = now`. Si la validación falla, lanza `Error`.
- `validateStatuses(statuses: CollectionStatus[]): void` — auxiliar que lanza `Error` si hay 0 o más de 1 estado con `isCompleted: true`.

```typescript
interface CreateCollectionParams {
  name: string;
  description?: string;
  icon: string;
  accentColor: string;
  provider: ProviderType;
  statuses: CollectionStatus[];
}
```

**RF-03.1.A** Las seis plantillas predefinidas (con sus estados por defecto):

| `id` | `name` | `icon` (lucide) | `accentColor` | `provider` | Estados por defecto |
|---|---|---|---|---|---|
| `videogames` | Videojuegos | `Gamepad2` | `#6366f1` | `rawg` | Pendiente (order 0), En curso (order 1), Completado ✓ (order 2), Abandonado (order 3) |
| `books` | Libros | `BookOpen` | `#10b981` | `openLibrary` | Pendiente (order 0), Leyendo (order 1), Leído ✓ (order 2), Abandonado (order 3) |
| `boardgames` | Juegos de mesa | `Dice5` | `#f59e0b` | `bgg` | Quiero jugarlo (order 0), Jugado ✓ (order 1) |
| `figures` | Figuras | `Trophy` | `#ec4899` | `manual` | Deseada (order 0), Adquirida ✓ (order 1), En exhibición (order 2), Vendida (order 3) |
| `music` | Discos | `Disc3` | `#14b8a6` | `manual` | Pendiente (order 0), Escuchando (order 1), Escuchado ✓ (order 2) |
| `custom` | Personalizada | `LayoutGrid` | `#8b5cf6` | `manual` | Pendiente (order 0), Hecho ✓ (order 1) |

**RF-03.1.B** `src/features/collections/core/templates.test.ts` debe cubrir:
- `createCollection` genera un `id` no vacío y `createdAt` igual al parámetro `now`.
- `createCollection` lanza error si `statuses` no tiene ningún estado con `isCompleted: true`.
- `createCollection` lanza error si `statuses` tiene más de un estado con `isCompleted: true`.
- `COLLECTION_TEMPLATES` tiene exactamente 6 entradas y cada una tiene exactamente 1 estado con `isCompleted: true`.
- Cada plantilla tiene `id`, `name`, `icon`, `accentColor`, `provider` y `defaultStatuses` no vacíos.

**RF-03.2** `src/features/items/core/items.ts`:

Debe exportar:
- `createItemFromSearchResult(params: { collectionId: string; result: SearchResult; initialStatusId: string; now: string }): Item` — genera un `Item` con `id` único, `xpAwarded: false` y `createdAt = updatedAt = now`.
- `createItemManual(params: { collectionId: string; title: string; subtitle?: string; releaseYear?: number; coverUrl?: string; initialStatusId: string; meta?: Record<string, string | number | boolean>; now: string }): Item` — igual que el anterior pero a partir de datos manuales (sin `externalId`).
- `changeItemStatus(item: Item, newStatusId: string, isCompleted: boolean, now: string): Item` — devuelve un nuevo `Item` con `statusId` actualizado, `updatedAt = now`, `completedAt` establecido (si `isCompleted` y `completedAt` era undefined) y `xpAwarded` puesto a `true` si `isCompleted && !item.xpAwarded`. **Nunca** pone `xpAwarded` de `true` a `false`.

**RF-03.2.A** `src/features/items/core/items.test.ts` debe cubrir:
- `createItemFromSearchResult` propaga `externalId`, `title`, `subtitle`, `releaseYear`, `coverUrl` y `meta` correctamente.
- `createItemManual` sin `coverUrl` crea un ítem con `coverUrl: undefined`.
- `changeItemStatus` a un estado no completado no modifica `xpAwarded` ni `completedAt`.
- `changeItemStatus` a un estado completado establece `xpAwarded: true` y `completedAt = now`.
- `changeItemStatus` a completado por segunda vez (ya con `xpAwarded: true`) no duplica ni altera `completedAt`.
- Volver a un estado no completado tras haber completado el ítem mantiene `xpAwarded: true` y `completedAt` existente (idempotencia).
- `updatedAt` siempre se actualiza al `now` recibido en cada cambio de estado.

**RF-03.3** `src/providers/mock.ts`:

Debe exportar `mockProvider: SearchProvider` con un método `search(query: string): Promise<SearchResult[]>` que:
- Devuelve entre 3 y 8 resultados simulados realistas según si `query` contiene términos relacionados con videojuegos, libros, música, juegos de mesa o figuras (cualquier conjunto de datos razonables hardcodeados).
- Incluye al menos **2 resultados sin `coverUrl`** y al menos **2 sin `releaseYear`** entre el conjunto total de datos mock, para garantizar que la UI valida los placeholders desde el principio.
- Simula una latencia asíncrona de 300–600 ms con `setTimeout` / `Promise`.
- Si `query` está vacía, devuelve un array vacío inmediatamente.
- No lanza excepciones; en caso de error interno devuelve array vacío.

---

### RF-04 — Estado con Zustand y persistencia (`store/`)

> Las acciones son puras e inmutables: nunca se mutan arrays u objetos del estado directamente.

**RF-04.1** `src/features/collections/store/collections.store.ts`:

Estado: `{ collections: Collection[] }`.

Acciones:
- `addCollection(collection: Collection): void` — añade al array sin mutar.
- `removeCollection(id: string): void` — elimina la colección con ese `id`; los ítems huérfanos deben eliminarse también (coordinado con `items.store.ts` vía suscripción o acción combinada — ver RF-04.3).
- `updateCollection(id: string, patch: Partial<Omit<Collection, 'id' | 'createdAt'>>): void` — actualiza campos permitidos.

**RF-04.2** `src/features/items/store/items.store.ts`:

Estado: `{ items: Item[] }`.

Acciones:
- `addItem(item: Item): void`.
- `removeItem(id: string): void`.
- `removeItemsByCollection(collectionId: string): void` — elimina todos los ítems de esa colección.
- `updateItemStatus(itemId: string, newStatusId: string, isCompleted: boolean, now: string): void` — llama internamente a `changeItemStatus` de `core/` y reemplaza el ítem en el array.

**RF-04.3** Persistencia: ambos stores se persisten bajo la misma clave `hoardex-storage` usando el middleware `persist` de Zustand. Si los datos en `localStorage` son parciales o de un esquema antiguo, los stores deben inicializarse con valores por defecto sin lanzar excepción (uso de `merge` defensivo o `version` + `migrate`).

**RF-04.4** `removeCollection` debe desencadenar `removeItemsByCollection` para garantizar que no queden ítems huérfanos. La implementación preferida es llamar a `useItemsStore.getState().removeItemsByCollection(id)` desde la acción del store de colecciones.

---

### RF-05 — Componentes transversales (`src/components/`)

**RF-05.1** `src/components/custom/Header.tsx`:
- Muestra el nombre/logo de la app ("Hoardex") con enlace a `/`.
- Incluye un botón de toggle de modo claro/oscuro (icono `Sun` / `Moon` de lucide-react) que añade/elimina la clase `dark` en `<html>`.
- El estado del modo (claro u oscuro) se inicializa respetando `prefers-color-scheme` del sistema y se persiste en `localStorage` bajo la clave `hoardex-theme`.
- `interface Props` tipada explícitamente (aunque en este caso puede estar vacía).

**RF-05.2** `src/components/custom/CoverImage.tsx`:
- Props: `src?: string`, `alt: string`, `className?: string`.
- Mientras carga muestra un skeleton animado (`animate-pulse` de Tailwind).
- Si `src` es `undefined` o la carga falla (`onError`), muestra un placeholder con un icono de `ImageOff` de lucide-react centrado sobre un fondo neutro.
- No usa `any` ni accede al DOM directamente; gestiona estado interno con `useState`.

**RF-05.3** `src/components/custom/ConfirmDialog.tsx`:
- Wrapper accesible sobre `@radix-ui/react-dialog` con props: `title: string`, `description: string`, `onConfirm: () => void`, `onCancel?: () => void`, `open: boolean`, `onOpenChange: (open: boolean) => void`.
- Usado para confirmar eliminación de colecciones e ítems (HU-09).

**RF-05.4** `src/components/custom/EmptyState.tsx`:
- Props: `icon?: React.ReactNode`, `title: string`, `description?: string`, `action?: React.ReactNode`.
- Usado cuando una colección no tiene ítems o la búsqueda no devuelve resultados.

---

### RF-06 — Páginas y navegación (`src/pages/`)

**RF-06.1** Enrutamiento:
- `/` → `HomePage`.
- `/collection/:id` → `CollectionPage`.
- Ruta comodín `*` → redirección a `/` o página 404 simple.
- El router se configura con `BrowserRouter` + `Routes` + `Route` en `src/App.tsx`.

**RF-06.2** `src/pages/HomePage.tsx` (`/`):

- Muestra todas las colecciones del store en una **cuadrícula responsiva** (mínimo 2 columnas en móvil, 3–4 en escritorio).
- Cada tarjeta de colección (`CollectionCard`) debe:
  - Aplicar `--collection-accent` vía `style={{ '--collection-accent': collection.accentColor } as React.CSSProperties }` en el elemento raíz.
  - Mostrar el icono de lucide-react correspondiente (cargado dinámicamente o mapeado en un registro).
  - Mostrar el nombre de la colección, el número total de ítems y el número de ítems completados.
  - Mostrar hasta 4 miniaturas de portadas recientes (`CoverImage`) en una tira horizontal, con `cover-url` del ítem más reciente primero.
  - Al hacer clic, navegar a `/collection/:id`.
- Si no hay colecciones, muestra `EmptyState` con un CTA para crear la primera.
- Incluye un botón "Nueva colección" (prominente, con icono `Plus`) que abre el `NewCollectionSheet` (ver RF-06.2.A).

**RF-06.2.A** `NewCollectionSheet` (sheet/drawer lateral, puede vivir en `src/features/collections/components/`):
- Muestra las 6 plantillas como tarjetas seleccionables y una opción "Desde cero".
- Al seleccionar una plantilla, pre-rellena el formulario (nombre, icono, color, estados).
- El formulario permite editar nombre, descripción, color de acento (input tipo `color` o selector predefinido), icono (lista desplegable de Lucide) y estados (editar etiquetas, marcar cuál es el completado).
- Al guardar, llama a `createCollection` de `core/` con el `now` del momento y luego a `addCollection` del store.
- Validación inline: nombre obligatorio, al menos un estado, exactamente uno marcado como completado.

**RF-06.3** `src/pages/CollectionPage.tsx` (`/collection/:id`):

- Lee el `id` de los params de react-router; si no existe la colección, muestra `EmptyState` con enlace a `/`.
- **Cabecera de colección**: aplica `--collection-accent` al fondo/borde, muestra icono grande, nombre, descripción (si existe) y el número de ítems completados vs total.
- **Cuadrícula de ítems**: similar a la HomePage pero mostrando `ItemCard` en lugar de `CollectionCard`.
  - `ItemCard` muestra: `CoverImage`, título, subtítulo (si existe), año (si existe) y el estado actual como `<Select>` de Radix con las opciones de la colección. Al cambiar el estado, llama a `updateItemStatus` del store.
  - Indicador visual diferenciado para ítems en estado completado (p. ej. borde o badge de color de acento).
- Si no hay ítems, muestra `EmptyState` con CTA para añadir el primero.
- **Botón "Añadir ítem"** que abre el `AddItemSheet` (ver RF-06.3.A).
- **Botón "Eliminar colección"** (con `ConfirmDialog`) que llama a `removeCollection`.

**RF-06.3.A** `AddItemSheet` (puede vivir en `src/features/items/components/`):
- Dos tabs o modos: "Buscar" y "Manual".
- **Modo Buscar**: campo de búsqueda de texto que llama a `mockProvider.search(query)`, muestra resultados (con `CoverImage`, título, año, subtítulo), estado de carga (spinner) y estado de error/vacío (`EmptyState`). Al seleccionar un resultado, llama a `createItemFromSearchResult` y `addItem`.
- **Modo Manual**: formulario con campos: título (obligatorio), subtítulo, año, URL de portada. Al guardar, llama a `createItemManual` y `addItem`.
- En ambos modos, el estado inicial del ítem nuevo es el primer estado de la colección (el de `order: 0`).
- El `now` se toma en el momento de confirmar (no al abrir el sheet).

---

### RF-07 — Accesibilidad y diseño

**RF-07.1** Todo elemento interactivo (botones, selects, inputs, links) debe ser alcanzable y operable mediante teclado.

**RF-07.2** Las imágenes decorativas usan `alt=""`. Las portadas de ítems usan `alt={item.title}`.

**RF-07.3** Los colores de acento de las plantillas deben mantener una relación de contraste mínima de 4.5:1 con el texto que se renderiza sobre ellos (texto claro sobre color oscuro o viceversa según la paleta).

**RF-07.4** El diseño es *mobile-first*: la cuadrícula de colecciones e ítems es funcional y usable desde 320 px de ancho.

**RF-07.5** Los estados de carga (búsqueda en el proveedor mock, carga de portadas) se comunican visualmente y no bloquean la UI completa.

---

## Requisitos no funcionales

- **RNF-01 Tipado estricto:** `npx tsc --noEmit` debe pasar sin errores con `"strict": true`. Cero `any` en código de producción.
- **RNF-02 Tests en verde:** `npm run test` debe ejecutar todos los tests de `core/` y pasar sin fallos.
- **RNF-03 Sin errores de linter:** `npm run lint` sin warnings ni errores.
- **RNF-04 Build limpio:** `npm run build` produce un bundle sin errores.
- **RNF-05 Persistencia defensiva:** Si `localStorage` contiene datos con un esquema diferente, la app carga sin excepción con valores por defecto.
- **RNF-06 Sin dependencias de fases futuras:** No instalar Supabase, TanStack Query, Framer Motion ni Zod en esta fase.
- **RNF-07 Rendimiento de carga:** La página inicial debe mostrar el contenido útil en menos de 2 s en conexión 3G simulada (Chrome DevTools Throttling). No es un criterio bloqueante, pero sí una guía de diseño.

---

## Casos límite

| CL | Escenario | Comportamiento esperado |
|---|---|---|
| CL-01 | Colección sin ítems | `CollectionPage` muestra `EmptyState` con CTA para añadir el primero. |
| CL-02 | Ítem sin `coverUrl` (desde mock o manual) | `CoverImage` muestra placeholder con icono `ImageOff`. |
| CL-03 | Falla la carga de una portada (URL rota) | `CoverImage` cae al placeholder (via `onError`). |
| CL-04 | Mock sin resultados para la consulta | `AddItemSheet` muestra `EmptyState` ("Sin resultados para…"). |
| CL-05 | Consulta vacía en búsqueda | `mockProvider.search("")` devuelve `[]` inmediatamente sin ninguna llamada asíncrona. |
| CL-06 | Colección con exactamente 1 estado (y es el completado) | `createCollection` la acepta sin error. |
| CL-07 | Colección con 0 estados | `createCollection` lanza error; el formulario muestra mensaje inline. |
| CL-08 | Colección con 2+ estados marcados como `isCompleted: true` | `createCollection` lanza error; el formulario corrige forzando solo uno. |
| CL-09 | Cambiar estado de completado a no completado | `xpAwarded` y `completedAt` se mantienen; solo `statusId` y `updatedAt` cambian. |
| CL-10 | Completar un ítem ya completado de nuevo | `xpAwarded` y `completedAt` no se duplican ni alteran. |
| CL-11 | Eliminar colección con ítems | Todos los ítems de esa colección se eliminan del store (no quedan huérfanos). |
| CL-12 | `localStorage` con clave `hoardex-storage` corrupta o con esquema antiguo | La app carga con estado vacío por defecto, sin excepción. |
| CL-13 | Navegar a `/collection/:id` con un `id` inexistente | La página muestra `EmptyState` con enlace a `/`. |
| CL-14 | Icono de colección personalizada no reconocido | La UI muestra un icono de fallback (`LayoutGrid`) sin romper. |
| CL-15 | Nombre de colección con solo espacios | El formulario lo trata como vacío (validación `trim()`). |

---

## Fuera de alcance

- Autenticación o perfil de usuario (Fase 4).
- Adaptadores reales de APIs externas: RAWG, Open Library, BGG (Fase 1b, spec 002).
- Notas y reseñas por ítem (Fase 2, spec 003).
- Sistema de XP, niveles, rachas, logros y retos (Fase 3, specs 004–005).
- Estadísticas anuales tipo Wrapped (Fase 5, spec 007).
- Filtros, búsqueda y ordenación avanzada dentro de colecciones (Fase 2, spec 003).
- Importación/exportación de datos.
- Soporte PWA u offline.
- Internacionalización (i18n).

---

## Criterios de finalización

La spec se considera implementada cuando **todos** los siguientes puntos son verdaderos:

- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] `npm run test` ejecuta los tests de `templates.test.ts` e `items.test.ts` y todos pasan.
- [ ] `npm run lint` no emite errores ni advertencias.
- [ ] `npm run build` produce un bundle sin errores.
- [ ] En `http://localhost:5173/`:
  - [ ] La `HomePage` muestra las colecciones con su color de acento y miniaturas de portadas.
  - [ ] Es posible crear una colección desde plantilla y desde cero.
  - [ ] Tras crear una colección, navegar a ella y añadir un ítem (tanto por búsqueda mock como de forma manual).
  - [ ] Cambiar el estado de un ítem desde la cuadrícula actualiza el estado visualmente.
  - [ ] Recargar la página mantiene todas las colecciones e ítems (persistencia en `localStorage`).
  - [ ] El toggle de modo claro/oscuro funciona y se recuerda entre recargas.
  - [ ] Los ítems sin portada muestran el placeholder de `CoverImage`.
  - [ ] Eliminar una colección (con confirmación) elimina también sus ítems.
- [ ] La vista en dispositivo móvil (≤ 375 px) es funcional y usable.
- [ ] No existe ninguna variable o propiedad de tipo `any` en el código de producción de `src/`.

---

## Decisiones de diseño aprobadas

Decisiones tomadas al aprobar la spec (2026-11-18):

1. **Selector de iconos:** Subconjunto curado de **~24 iconos** relevantes mapeados en un registro tipado `Record<string, LucideIcon>` en `src/lib/icons.ts`. Fallback a `LayoutGrid` si el icono no existe en el registro. Evita imports dinámicos de toda la librería para preservar el tree-shaking de Vite.

2. **Color de acento:** Paleta curada de **8–10 colores predefinidos** con buen contraste (incluye los 6 colores de las plantillas más 2–4 adicionales), con un `<input type="color">` opcional para colores personalizados. Implementado como componente `ColorPicker` ligero dentro de `src/features/collections/components/`.

3. **Vista en `CollectionPage`:** Solo **cuadrícula de portadas** en esta spec (2 columnas en móvil, 4–5 en escritorio). El toggle cuadrícula/lista se introduce en la spec 003.

4. **Eliminar ítem individual:** Botón discreto directamente en `ItemCard` (icono `Trash2`, accesible con `aria-label`) que dispara `ConfirmDialog`. La ficha detallada de ítem pertenece a la spec 003.

5. **Persistencia del tema:** `localStorage` bajo la clave `hoardex-theme`, gestionado con un hook ligero `useTheme` en `src/hooks/useTheme.ts` (sin Zustand). Para evitar el flash visual (FOUC) al recargar, se inyecta un script inline en `<head>` de `index.html` que aplica la clase `.dark` antes de que React hidrate.

6. **Componente `Sheet`:** `src/components/ui/sheet.tsx` construido sobre `@radix-ui/react-dialog` (ya requerido en RF-01.3), siguiendo el patrón de Shadcn UI. Es la base de `NewCollectionSheet` y `AddItemSheet`.

## Dudas abiertas

_(Todas las dudas han sido resueltas. No quedan aclaraciones pendientes.)_
