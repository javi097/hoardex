# Plan Técnico 002 — External Search Providers

## Resumen ejecutivo y contexto de arquitectura
Este plan técnico detalla la arquitectura de implementación para la **Fase 1b** (`specs/002-external-providers/spec.md`). Sustituirá la dependencia estática del proveedor mock por adaptadores reales para RAWG (videojuegos), Open Library (libros) y BoardGameGeek (juegos de mesa), orquestados a través de un registro dinámico (`getSearchProvider`) y con integración reactiva en `AddItemSheet` soportando debounce, cancelación con `AbortController` y renderizado condicional para colecciones de entrada manual.

---

## 1. Archivos y responsabilidades

| Archivo | Acción | Responsabilidad técnica | Trazabilidad RF |
|---|---|---|---|
| `src/interfaces/provider.interface.ts` | Modificar | Extender `SearchProvider` añadiendo `options?: SearchOptions` con `signal?: AbortSignal`. Cero `any`. | RF-05.3 |
| `src/providers/rawg.ts` | Crear | Adaptador de RAWG API: tipos DTO de respuesta, función pura `normalizeRawgGame` y objeto `rawgProvider`. | RF-01.1, RF-01.2, RF-01.3 |
| `src/providers/rawg.test.ts` | Crear | Tests unitarios con mocks de `fetch`: normalización, mapeo de campos ausentes, manejo de errores 401/429/500 y cancelación con `signal`. | RF-01, RNF-02 |
| `src/providers/openLibrary.ts` | Crear | Adaptador de Open Library Search API: tipos DTO de respuesta, función pura `normalizeOpenLibraryDoc` y objeto `openLibraryProvider`. | RF-02.1, RF-02.2, RF-02.3 |
| `src/providers/openLibrary.test.ts` | Crear | Tests unitarios con mocks de `fetch`: normalización, resolución de portadas `cover_i`, autores ausentes y errores HTTP. | RF-02, RNF-02 |
| `src/providers/bgg.ts` | Crear | Adaptador de BGG XMLAPI2: función pura `parseBggXml`, objeto `bggProvider`, soporte de token opcional y captura defensiva de CORS/errores. | RF-03.1, RF-03.2, RF-03.3 |
| `src/providers/bgg.test.ts` | Crear | Tests unitarios: parseo de XML con múltiples nombres, nodos sin año, XML vacío, errores 401 y fallback amigable. | RF-03, RNF-02 |
| `src/providers/manual.ts` | Crear | Proveedor nulo `manualProvider: SearchProvider` que retorna siempre `Promise.resolve([])`. | RF-04.2 |
| `src/providers/index.ts` | Crear | Registro y factoría `getSearchProvider(type: ProviderType): SearchProvider` con fallback defensivo a `mockProvider`. | RF-04.1, RF-04.2 |
| `src/providers/index.test.ts` | Crear | Tests de resolución de proveedores para todos los valores de `ProviderType` y entradas inválidas. | RF-04, RNF-02 |
| `vite.config.ts` | Modificar | Configurar proxy dev server `/api/bgg` -> `https://boardgamegeek.com/xmlapi2` reescribiendo path para sortear restricciones de CORS en local. | RF-03.2 |
| `.env.example` | Modificar | Documentar variables de entorno públicas `VITE_RAWG_API_KEY` y `VITE_BGG_API_TOKEN`. | RF-01.3, RF-03.2, RNF-04 |
| `src/features/items/components/AddItemSheet.tsx` | Modificar | Resolver proveedor dinámicamente con `getSearchProvider`, implementar debounce de 350 ms, cancelar peticiones previas con `AbortController`, gestionar banners de error amigables y renderizar exclusivamente "Alta manual" cuando `collection.provider === 'manual'`. | RF-05.1, RF-05.2, RF-05.3, RF-05.4, RF-05.5 |

---

## 2. Funciones puras de lógica

Siguiendo el principio de arquitectura desacoplada y libre de efectos secundarios, la transformación de datos crudos externos al contrato `SearchResult` se extrae en funciones puras exportadas de forma independiente para permitir pruebas unitarias exhaustivas sin acoplamiento a llamadas de red.

### 2.1 Normalización RAWG (`src/providers/rawg.ts`)
```typescript
export interface RawgPlatform {
  platform: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface RawgGame {
  id: number;
  name: string;
  released: string | null;
  background_image: string | null;
  platforms?: RawgPlatform[] | null;
  genres?: Array<{ id: number; name: string }> | null;
  rating?: number;
}

export function normalizeRawgGame(game: RawgGame): SearchResult {
  const releaseYear = game.released ? parseInt(game.released.slice(0, 4), 10) : undefined;
  const platforms = game.platforms?.map((p) => p.platform.name).filter(Boolean) ?? [];
  const subtitle = platforms.length > 0 ? platforms.slice(0, 3).join(', ') : undefined;

  const meta: Record<string, string | number | boolean> = {
    rawgId: game.id,
  };
  if (platforms.length > 0) meta.platforms = platforms.join(', ');
  const genres = game.genres?.map((g) => g.name).filter(Boolean) ?? [];
  if (genres.length > 0) meta.genres = genres.join(', ');
  if (typeof game.rating === 'number') meta.rating = game.rating;

  return {
    externalId: String(game.id),
    title: game.name,
    subtitle,
    releaseYear: Number.isInteger(releaseYear) && (releaseYear as number) > 0 ? releaseYear : undefined,
    coverUrl: game.background_image || undefined,
    meta,
  };
}
```

### 2.2 Normalización Open Library (`src/providers/openLibrary.ts`)
```typescript
export interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  publisher?: string[];
  number_of_pages_median?: number;
}

export function normalizeOpenLibraryDoc(doc: OpenLibraryDoc): SearchResult {
  const authors = doc.author_name ?? [];
  const subtitle = authors.length > 0 ? authors.slice(0, 2).join(', ') : undefined;
  const releaseYear = typeof doc.first_publish_year === 'number' && doc.first_publish_year > 0
    ? doc.first_publish_year
    : undefined;
  const coverUrl = typeof doc.cover_i === 'number' && doc.cover_i > 0
    ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
    : undefined;

  const meta: Record<string, string | number | boolean> = {
    openLibraryKey: doc.key,
  };
  if (authors.length > 0) meta.authors = authors.join(', ');
  if (doc.publisher?.[0]) meta.publisher = doc.publisher[0];
  if (typeof doc.number_of_pages_median === 'number') meta.pages = doc.number_of_pages_median;

  return {
    externalId: doc.key,
    title: doc.title,
    subtitle,
    releaseYear,
    coverUrl,
    meta,
  };
}
```

### 2.3 Parseo XML puro para BoardGameGeek (`src/providers/bgg.ts`)
```typescript
export function parseBggXml(xmlString: string): SearchResult[] {
  if (!xmlString.trim()) return [];

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
  
  // Detección de error de parseo en DOMParser
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Error al interpretar el XML de BoardGameGeek.');
  }

  const items = xmlDoc.querySelectorAll('item');
  const results: SearchResult[] = [];

  for (let i = 0; i < items.length && results.length < 10; i++) {
    const item = items[i];
    const id = item.getAttribute('id');
    if (!id) continue;

    // Buscar nombre con type="primary" o fallback al primer nodo <name>
    const primaryName = item.querySelector('name[type="primary"]') ?? item.querySelector('name');
    const title = primaryName?.getAttribute('value') ?? 'Sin título';

    // Año de publicación
    const yearNode = item.querySelector('yearpublished');
    const yearRaw = yearNode?.getAttribute('value');
    const releaseYear = yearRaw ? parseInt(yearRaw, 10) : undefined;

    results.push({
      externalId: id,
      title,
      subtitle: 'Juego de mesa',
      releaseYear: Number.isInteger(releaseYear) && (releaseYear as number) > 0 ? releaseYear : undefined,
      coverUrl: undefined, // En esta fase se delega al placeholder ImageOff
      meta: {
        bggId: id,
        type: item.getAttribute('type') ?? 'boardgame',
      },
    });
  }

  return results;
}
```

---

## 3. Algoritmo y flujo de datos

### 3.1 Flujo reactivo de búsqueda en `AddItemSheet`
```
[Usuario teclea en el input]
       │
       ▼
1. Actualizar estado local `query` inmediatamente.
2. Si `collection.provider === 'manual'`:
     └─> No hay input de búsqueda. Solo se renderiza "Alta manual".
3. Si `query.trim() === ''`:
     └─> Cancelar timer de debounce.
     └─> Abortar petición previa con `abortControllerRef.current?.abort()`.
     └─> Limpiar `results = []`, `error = null`, `isSearching = false`.
4. Si `query.trim() !== ''`:
     └─> Cancelar timer de debounce previo.
     └─> Iniciar nuevo timer de 350 ms:
           │
           ▼
     [Al expirar los 350 ms o al pulsar Enter/Click Buscar]
     a. `abortControllerRef.current?.abort()`
     b. `const controller = new AbortController()`
     c. `abortControllerRef.current = controller`
     d. `isSearching = true`, `error = null`
     e. Intentar:
          `const provider = getSearchProvider(collection.provider)`
          `const data = await provider.search(query, { signal: controller.signal })`
          `setResults(data)`
     f. Capturar error:
          Si `error.name === 'AbortError'`: ignorar (petición cancelada deliberadamente).
          En otro caso: `setError(error.message)`.
     g. Finalmente:
          Si la petición no fue cancelada: `isSearching = false`.
```

### 3.2 Flujo de resolución de proveedores (`getSearchProvider`)
```
getSearchProvider(type: ProviderType): SearchProvider
  ├── case 'rawg': return rawgProvider
  ├── case 'openLibrary': return openLibraryProvider
  ├── case 'bgg': return bggProvider
  ├── case 'manual': return manualProvider
  └── default: return mockProvider (fallback de seguridad)
```

---

## 4. Integración de interfaz (`AddItemSheet.tsx`)

### 4.1 Colecciones con proveedor `'manual'`
- Si `collection.provider === 'manual'`:
  - Se oculta la barra de pestañas (`TabsList` con "Buscar en catálogo" y "Alta manual").
  - Se renderiza de forma fija y directa el formulario de "Alta manual".
  - Se ahorra un paso innecesario de interacción para figuras, maquetas o colecciones personalizadas sin base de datos en internet.

### 4.2 Banner accesible de error y feedback amigable
- Si `error !== null`:
  - Se muestra un componente de alerta visual (fondo tenue con borde temático, icono de advertencia `AlertCircle`, rol `alert` para lectores de pantalla).
  - El texto explica la razón (ej. *"Falta configurar VITE_RAWG_API_KEY en .env.local"* o *"No se pudo conectar con BoardGameGeek. Puedes añadir el juego mediante Alta manual"*).
  - Incluye un botón secundario que cambia automáticamente a la pestaña "Alta manual" rellenando el nombre con la búsqueda fallida.

---

## 5. Decisiones técnicas justificadas

| Decisión tomada | Alternativa descartada | Justificación técnica |
|---|---|---|
| **Proxy de desarrollo en `vite.config.ts` para BGG (`/api/bgg`)** | Consumir BGG directamente desde el navegador o montar un backend Express/Node | La API XML2 de BGG no envía cabeceras CORS para clientes web. El proxy de desarrollo de Vite redirige las peticiones localmente de forma transparente sin requerir un backend adicional en esta fase. |
| **`AbortController` nativo desacoplado en `SearchOptions`** | Variable booleana de control o ignorar respuestas desordenadas | `AbortController` cancela la conexión HTTP en el socket del navegador, ahorrando ancho de banda, CPU y evitando condiciones de carrera reales. |
| **Funciones puras de normalización (`normalizeRawgGame`, `normalizeOpenLibraryDoc`, `parseBggXml`)** | Lógica de mapeo dentro del `fetch` en el mismo método `search` | Permite probar al 100% todos los casos límite (faltan portadas, autores nulos, formatos inesperados) con datos sintéticos sin necesidad de simular mocks de red complejos. |
| **Omitir carátulas en BGG en esta fase (usar `CoverImage` con `ImageOff`)** | Consulta secundaria en bucle a `/xmlapi2/thing?id=...` para cada resultado | BGG no devuelve carátulas en `/search`. Lanzar hasta 10 peticiones secundarias por cada búsqueda multiplicaría la latencia por 10 y provocaría errores de rate limit (HTTP 429) en los servidores comunitarios de BGG. |
| **Ocultar pestaña de búsqueda en colecciones `'manual'`** | Mostrar la pestaña de búsqueda deshabilitada o con un mensaje de "No disponible" | Reduce fricción cognitiva y clics del usuario: si la colección es manual, el usuario solo necesita rellenar los datos. |

---

## 6. Estrategia de tests

La suite de pruebas se ejecutará con Vitest (`npm run test`) manteniendo el 100% de la lógica de negocio y proveedores probada con aislamiento y determinismo:

### 6.1 `src/providers/rawg.test.ts`
- Normalización pura: juego completo con portada, plataformas y año.
- Normalización pura: juego sin `background_image`, sin fecha `released` y sin plataformas.
- `rawgProvider.search`: retorno inmediato de `[]` si la consulta está vacía o contiene solo espacios.
- `rawgProvider.search`: llamada a la URL esperada con clave de API y query codificada.
- `rawgProvider.search`: error explícito si `VITE_RAWG_API_KEY` no está definida.
- `rawgProvider.search`: manejo de códigos de estado HTTP 401, 429 y 500.
- `rawgProvider.search`: soporte de cancelación mediante `AbortSignal`.

### 6.2 `src/providers/openLibrary.test.ts`
- Normalización pura: libro completo con múltiples autores, año y `cover_i`.
- Normalización pura: libro sin autores, sin `cover_i` y sin año.
- `openLibraryProvider.search`: llamada con parámetros `q`, `limit=10` y selección de `fields`.
- `openLibraryProvider.search`: retorno inmediato de `[]` con query vacía.
- `openLibraryProvider.search`: manejo de error ante fallo de red o HTTP 500.
- `openLibraryProvider.search`: cancelación con `AbortSignal`.

### 6.3 `src/providers/bgg.test.ts`
- Parseo XML puro: documento con múltiples `<item>` extrayendo `<name type="primary">` y año.
- Parseo XML puro: ítem con múltiples nombres alternativos ignorados (solo primary seleccionado).
- Parseo XML puro: ítem sin `<yearpublished>`.
- Parseo XML puro: XML vacío o sin resultados retornando `[]`.
- Parseo XML puro: lanzamiento de excepción controlada ante XML mal formado (`parsererror`).
- `bggProvider.search`: inyección de cabecera `Authorization: Bearer <token>` cuando `VITE_BGG_API_TOKEN` está configurado.
- `bggProvider.search`: mensaje de fallback amigable si la llamada HTTP devuelve 401 o falla por CORS.

### 6.4 `src/providers/index.test.ts`
- `getSearchProvider('rawg')` devuelve instancia de `rawgProvider`.
- `getSearchProvider('openLibrary')` devuelve instancia de `openLibraryProvider`.
- `getSearchProvider('bgg')` devuelve instancia de `bggProvider`.
- `getSearchProvider('manual')` devuelve instancia de `manualProvider` (que resuelve `[]`).
- `getSearchProvider('unknown' as ProviderType)` recurre de forma segura a `mockProvider`.

---

## 7. Trazabilidad con Requisitos Funcionales

| Requisito Funcional | Componente / Archivo | Función / Mecanismo | Test unitario |
|---|---|---|---|
| **RF-01 (RAWG)** | `src/providers/rawg.ts` | `normalizeRawgGame`, `rawgProvider.search` | `src/providers/rawg.test.ts` |
| **RF-02 (Open Library)** | `src/providers/openLibrary.ts` | `normalizeOpenLibraryDoc`, `openLibraryProvider.search` | `src/providers/openLibrary.test.ts` |
| **RF-03 (BGG)** | `src/providers/bgg.ts`, `vite.config.ts` | `parseBggXml`, `bggProvider.search`, Vite proxy `/api/bgg` | `src/providers/bgg.test.ts` |
| **RF-04 (Registro unificado)** | `src/providers/index.ts`, `manual.ts` | `getSearchProvider`, `manualProvider` | `src/providers/index.test.ts` |
| **RF-05.1 (Proveedor dinámico)** | `src/features/items/components/AddItemSheet.tsx` | `getSearchProvider(collection.provider)` | Verificación UI / E2E |
| **RF-05.2 (Debounce 350 ms)** | `src/features/items/components/AddItemSheet.tsx` | `setTimeout` reactivo con limpieza | Verificación UI / E2E |
| **RF-05.3 (AbortController)** | `src/interfaces/provider.interface.ts`, `AddItemSheet.tsx` | `SearchOptions.signal`, `controller.abort()` | `rawg.test.ts`, `openLibrary.test.ts` |
| **RF-05.4 (UX ante errores)** | `src/features/items/components/AddItemSheet.tsx` | Alerta de error con sugerencia "Alta manual" | Verificación UI / E2E |
| **RF-05.5 (Colecciones manuales)** | `src/features/items/components/AddItemSheet.tsx` | Ocultación de pestaña "Buscar" y render directo | Verificación UI / E2E |

---

## 8. Verificación y criterios de salida del plan
1. `specs/002-external-providers/plan.md` aprobado por el usuario.
2. Desglose en tareas atómicas (`tasks.md`) con `/sdd-tasks`.
3. Implementación incremental con `/sdd-implement` tarea por tarea (respetando la puerta de calidad en cada paso).
