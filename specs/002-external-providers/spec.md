# Spec 002 — External Search Providers
Estado: implementada

---

## Contexto y objetivo

En la Fase 1a (`001-core-catalog-mock`), Hoardex estableció su arquitectura base, contratos globales, stores y vistas con un proveedor mock. 
Esta especificación cubre la **Fase 1b**: sustituir la dependencia exclusiva del mock por adaptadores reales para las fuentes de datos externas acordadas:
1. **RAWG API** para videojuegos.
2. **Open Library Search API** para libros.
3. **BoardGameGeek (BGG) XML API2** para juegos de mesa.
4. **Registro unificado (`index.ts`)** con resolución dinámica por `collection.provider` y fallback defensivo.

**Objetivo de la fase:** Permitir que el usuario busque títulos reales en internet desde el modal/sheet `AddItemSheet` según el medio de cada colección, recibiendo resultados normalizados al contrato `SearchResult` de forma tolerante a fallos (imágenes faltantes, años ausentes, cortes de red o límites de API), con soporte de debounce, cancelación de peticiones anteriores con `AbortController` y feedback claro al usuario.

---

## Usuarios

- **Coleccionista**: usuario que añade ítems a sus colecciones buscando títulos reales en bases de datos abiertas de videojuegos, libros o juegos de mesa.

---

## Historias de usuario

- **HU-01.** Como coleccionista, cuando añado un videojuego a mi colección, quiero buscar por su título en la base de datos de RAWG para obtener su portada oficial, año y plataformas sin tener que escribirlos manualmente.
- **HU-02.** Como coleccionista, cuando añado un libro a mi colección, quiero buscar por título o autor en Open Library para autocompletar la portada, el autor y el año de primera publicación.
- **HU-03.** Como coleccionista, cuando añado un juego de mesa a mi colección, quiero buscar en BoardGameGeek para autocompletar el nombre oficial y año de lanzamiento.
- **HU-04.** Como coleccionista, si busco un título antiguo o de nicho que no tiene portada o año en la API externa, quiero que se añada correctamente mostrando el placeholder elegante de Hoardex sin romperse.
- **HU-05.** Como coleccionista, si una API externa no responde, está caída o no tiene configurada su clave de acceso, quiero ver un mensaje comprensible en pantalla en lugar de una pantalla congelada o un spinner infinito.
- **HU-06.** Como coleccionista, mientras escribo en la barra de búsqueda, quiero que las peticiones se retrasen brevemente (debounce) y que las búsquedas anteriores se cancelen automáticamente (`AbortController`) para que los resultados no parpadeen ni se mezclen respuestas desordenadas.

---

## Definiciones

| Término | Significado en Hoardex |
|---|---|
| **`SearchProvider`** | Interfaz TypeScript contractual (`{ search(query: string, options?: SearchOptions): Promise<SearchResult[]> }`) que todo adaptador debe implementar. |
| **`SearchResult`** | Estructura normalizada universal: `{ externalId, title, subtitle?, releaseYear?, coverUrl?, meta }`. Ningún dato crudo específico de una API externa se filtra a los stores ni a la UI. |
| **`ProviderType`** | Tipo literal `'manual' | 'rawg' | 'openLibrary' | 'bgg'`. |
| **Debounce** | Técnica que retrasa la ejecución de la búsqueda un tiempo determinado (~350 ms) tras la última pulsación de tecla para evitar saturar las APIs. |
| **`AbortController`** | Mecanismo estándar de JavaScript para cancelar una petición HTTP en vuelo cuando el usuario cambia la consulta o cierra el panel. |

---

## Requisitos funcionales

### RF-01 — Adaptador RAWG (`src/providers/rawg.ts`)

**RF-01.1** Implementar el adaptador `rawgProvider: SearchProvider` consumiendo el endpoint `https://api.rawg.io/api/games`.

**RF-01.2** Parámetros de petición:
- `key`: obtenido desde `import.meta.env.VITE_RAWG_API_KEY`.
- `search`: consulta codificada mediante `encodeURIComponent`.
- `page_size`: fijado en `10` resultados por consulta.
- Cabecera opcional o señal `signal` de `AbortSignal` para cancelación.

**RF-01.3** Normalización de la respuesta de RAWG al contrato `SearchResult`:
- `externalId`: `String(game.id)`.
- `title`: `game.name`.
- `subtitle`: nombres de las primeras 3 plataformas separadas por coma (ej. `"PlayStation 5, PC, Xbox Series X"`), obtenido de `game.platforms[].platform.name`. Si no hay plataformas, `undefined`.
- `releaseYear`: año numérico extraído del primer segmento de `game.released` (`YYYY-MM-DD`). Si no existe o no es numérico, `undefined`.
- `coverUrl`: `game.background_image || undefined`.
- `meta`:
  - `rating`: `game.rating` (número).
  - `metacritic`: `game.metacritic` (número o null).
  - `genres`: cadena con los géneros concatenados por coma (ej. `"Acción, Aventura"`).

**RF-01.4** Manejo de errores y casos de guardia:
- Si `query.trim()` está vacía, retornar `[]` inmediatamente sin llamar a la red.
- Si `VITE_RAWG_API_KEY` no está definida o está vacía, lanzar un error explicativo: `"Clave de API de RAWG no configurada. Añade VITE_RAWG_API_KEY en tu archivo .env.local"`.
- Si la respuesta HTTP no es exitosa (`!response.ok`), mapear los códigos HTTP comunes:
  - 401: `"Clave de API de RAWG inválida o caducada."`
  - 429: `"Límite de peticiones de RAWG excedido. Espera unos momentos."`
  - Otros: `"Error al consultar la API de RAWG (código HTTP ${status})."`
- Documentar la variable de entorno en `.env.example` (`VITE_RAWG_API_KEY=tu_clave_de_rawg_aqui`).

---

### RF-02 — Adaptador Open Library (`src/providers/openLibrary.ts`)

**RF-02.1** Implementar `openLibraryProvider: SearchProvider` consumiendo la API pública `https://openlibrary.org/search.json`.

**RF-02.2** Parámetros de petición:
- `q`: consulta de búsqueda codificada.
- `limit`: `10`.
- `fields`: `key,title,author_name,first_publish_year,cover_i,publisher,number_of_pages_median` (para minimizar ancho de banda y carga en los servidores de Open Library).
- Cabecera estándar del navegador (no se añade cabecera `User-Agent` manual ya que es una cabecera prohibida en navegadores según el estándar Fetch).

**RF-02.3** Normalización al contrato `SearchResult`:
- `externalId`: `doc.key` (ej. `"/works/OL45804W"`).
- `title`: `doc.title`.
- `subtitle`: autores formateados (máximo los 2 primeros unidos por coma, ej. `"Gabriel García Márquez"`). Si no hay autor, `undefined`.
- `releaseYear`: `doc.first_publish_year` si es entero positivo; en caso contrario `undefined`.
- `coverUrl`: si `doc.cover_i` existe, `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`; en caso contrario `undefined`.
- `meta`:
  - `authors`: lista completa de autores en cadena de texto.
  - `publisher`: primer nombre en `doc.publisher` si existe.
  - `pages`: `doc.number_of_pages_median` si existe.

**RF-02.4** Manejo de errores:
- Si `query.trim()` está vacía, retornar `[]` de inmediato.
- Si `!response.ok`, lanzar error: `"Error al consultar Open Library (código HTTP ${status})."`.

---

### RF-03 — Adaptador BoardGameGeek (`src/providers/bgg.ts`)

**RF-03.1** Implementar `bggProvider: SearchProvider` consumiendo la API de BGG. En esta fase se consulta exclusivamente el endpoint `/xmlapi2/search` (sin segunda llamada a `/thing`), mostrando el placeholder elegante `CoverImage` (`ImageOff`).

**RF-03.2** Estrategia de conectividad, proxy y autenticación opcional:
- BGG utiliza `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`.
- Dado que BGG no incluye cabeceras CORS en el navegador en entornos de cliente puro:
  - En entorno de desarrollo Vite, configurar un proxy en `vite.config.ts`: `/api/bgg` -> `https://boardgamegeek.com/xmlapi2` (reescribiendo `/api/bgg` a `/xmlapi2`).
  - Soporte para token opcional `VITE_BGG_API_TOKEN`: si está definido en `import.meta.env.VITE_BGG_API_TOKEN`, se envía en las cabeceras como `Authorization: Bearer <token>` (o se inyecta en el proxy de `vite.config.ts`).
  - Documentar `VITE_BGG_API_TOKEN` en `.env.example`.
  - El cliente debe consultar `/api/bgg/search` en desarrollo y tener fallback a URL directa o proxy configurable vía variable `VITE_BGG_PROXY_URL`.
  - Si la petición falla por CORS, 401 o bloqueo de red, capturar y lanzar un error informativo claro invitando a usar "Alta manual": `"No se pudo conectar con BoardGameGeek (posible restricción CORS, token o bloqueo). Puedes añadir el juego mediante Alta manual."`.

**RF-03.3** Parseo XML y normalización al contrato `SearchResult`:
- Parsear la respuesta XML con `window.DOMParser` (o parser global disponible en el entorno).
- Para cada `<item type="boardgame" id="...">`:
  - `externalId`: atributo `id` de `<item>`.
  - `title`: atributo `value` del nodo `<name type="primary">` (o del primer `<name>` si no hay primary).
  - `subtitle`: `"Juego de mesa"`.
  - `releaseYear`: atributo `value` de `<yearpublished>` convertido a entero. Si no existe o no es numérico, `undefined`.
  - `coverUrl`: `undefined` (en esta fase no se llama a `/thing`; Hoardex renderiza el placeholder `CoverImage` con `ImageOff`).
  - `meta`:
    - `bggId`: atributo `id`.
    - `type`: atributo `type`.

**RF-03.4** Manejo de errores:
- Si `query.trim()` está vacía, retornar `[]` inmediatamente.
- Limitar a un máximo de 10 resultados para evitar sobrecarga del DOM.
- Si BGG responde con `401`, `403` o falla la conexión, mostrar mensaje amigable sugiriendo usar "Alta manual".

---

### RF-04 — Registro unificado de proveedores (`src/providers/index.ts`)

**RF-04.1** Crear una factoría o registro exportando la función:
```typescript
export function getSearchProvider(type: ProviderType): SearchProvider
```

**RF-04.2** Reglas de resolución:
- `'rawg'` -> devuelve `rawgProvider`.
- `'openLibrary'` -> devuelve `openLibraryProvider`.
- `'bgg'` -> devuelve `bggProvider`.
- `'manual'` -> devuelve un proveedor nulo/vacío (`manualProvider: SearchProvider`) que retorna siempre `Promise.resolve([])`.
- Valor desconocido o no soportado -> fallback defensivo a `mockProvider` (para entornos de pruebas) o advertencia controlada.

---

### RF-05 — Integración avanzada en `AddItemSheet`

**RF-05.1** Conexión dinámica:
- En lugar de invocar fijamente a `mockProvider`, `AddItemSheet` debe obtener el proveedor de la colección activa mediante `getSearchProvider(collection.provider)`.

**RF-05.2** Debounce de búsqueda:
- Añadir un debounce de **350 ms** en el input de texto: al escribir, la búsqueda se ejecuta automáticamente tras 350 ms de inactividad, manteniendo además el botón manual "Buscar" y el evento `Enter` para ejecución instantánea.

**RF-05.3** Cancelación con `AbortController`:
- Cada nueva búsqueda debe cancelar (`abort()`) la petición anterior si sigue en vuelo, evitando que una respuesta lenta de una búsqueda previa sobreescriba los resultados más recientes.
- La firma de `SearchProvider.search` debe actualizarse opcionalmente para soportar `{ signal?: AbortSignal }`:
  ```typescript
  export interface SearchOptions {
    signal?: AbortSignal;
  }
  export interface SearchProvider {
    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  }
  ```

**RF-05.4** Experiencia de usuario (UX) ante errores:
- Si la búsqueda falla (por ejemplo, falta la API key de RAWG, error de red o bloqueo de BGG), mostrar un banner/alerta visual dentro del sheet explicando la causa (ej. *"Falta configurar VITE_RAWG_API_KEY en .env.local"*) con un botón sugerido para cambiar a "Alta manual".

**RF-05.5** Colecciones con proveedor `'manual'`:
- Cuando `collection.provider === 'manual'`, `AddItemSheet` oculta la pestaña "Buscar en catálogo" y muestra directamente el formulario de "Alta manual".

---

## Requisitos no funcionales

- **RNF-01 Tipado estricto:** Cero `any` en los adaptadores y tipos de respuesta de APIs externas. Cada API debe tener sus interfaces TypeScript de respuesta cruda tipadas en archivos internos o en `src/interfaces/`.
- **RNF-02 Tests unitarios con mocks de red:** Toda la lógica de normalización, mapeo de campos ausentes y gestión de errores HTTP de `rawg.ts`, `openLibrary.ts` y `bgg.ts` debe estar cubierta al 100% con tests unitarios en Vitest usando `vi.fn()` o `globalThis.fetch` mockeado.
- **RNF-03 Tolerancia a datos corruptos/incompletos:** Ninguna respuesta externa sin portada, sin año o con caracteres especiales puede provocar excepciones no capturadas ni crashes en la UI.
- **RNF-04 Seguridad de secretos:** Ninguna clave de API en código duro. `VITE_RAWG_API_KEY` y `VITE_BGG_API_TOKEN` se leen exclusivamente desde variables de entorno.
- **RNF-05 Puerta de calidad:** `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm run test` deben pasar en verde sin advertencias.

---

## Casos límite

| CL | Escenario | Comportamiento esperado |
|---|---|---|
| CL-01 | RAWG devuelve juego sin `background_image` | `coverUrl` se normaliza a `undefined`; la UI muestra el placeholder `ImageOff`. |
| CL-02 | RAWG devuelve juego sin fecha `released: null` | `releaseYear` se normaliza a `undefined`. |
| CL-03 | RAWG devuelve juego sin plataformas asociadas | `subtitle` se normaliza a `undefined`. |
| CL-04 | No existe `VITE_RAWG_API_KEY` en el entorno | `rawgProvider.search` lanza error informativo claro pidiendo configurarla. |
| CL-05 | Open Library devuelve libro sin autor | `subtitle` se normaliza a `undefined`. |
| CL-06 | Open Library devuelve libro sin `cover_i` | `coverUrl` se normaliza a `undefined`. |
| CL-07 | BGG devuelve XML vacío o sin nodos `<item>` | Retorna array vacío `[]` sin error. |
| CL-08 | BGG devuelve juego con múltiples nombres (primary y alternate) | Se selecciona únicamente el `<name type="primary">`. |
| CL-09 | El usuario teclea rápido múltiples letras | Debounce de 350 ms agrupa las peticiones y `AbortController` cancela las intermedias. |
| CL-10 | Error HTTP 500 o 503 en el servidor externo | Se captura el error y se muestra mensaje amigable al usuario sin bloquear la UI. |
| CL-11 | Consulta con espacios en blanco o caracteres especiales (`&`, `?`, `#`) | Se codifican correctamente con `encodeURIComponent`. |
| CL-12 | Colección con proveedor `'manual'` | `AddItemSheet` oculta la pestaña "Buscar" y renderiza directamente el formulario de "Alta manual". |

---

## Fuera de alcance

- Paginación infinita en el modal de búsqueda (se fija un límite de 10 resultados relevantes).
- Sistema de caché persistente de peticiones externas en IndexedDB / localStorage (se evaluará en fases posteriores).
- Enriquecimiento secundario de BGG mediante petición a `/thing` para obtener imágenes en alta definición (en esta fase la búsqueda de BGG solo consulta `/xmlapi2/search` y delega la imagen al placeholder de Hoardex).
- Base de datos o autenticación con Supabase (Fase 4).

---

## Criterios de finalización

La spec se considera implementada cuando:

- [x] `src/providers/rawg.ts` implementa `SearchProvider` y pasa todos sus tests con mocks en `rawg.test.ts`.
- [x] `src/providers/openLibrary.ts` implementa `SearchProvider` y pasa todos sus tests con mocks en `openLibrary.test.ts`.
- [x] `src/providers/bgg.ts` implementa `SearchProvider` y pasa todos sus tests con mocks en `bgg.test.ts`.
- [x] `src/providers/index.ts` resuelve correctamente los 4 tipos de proveedor (`manual`, `rawg`, `openLibrary`, `bgg`) y pasa sus tests en `index.test.ts`.
- [x] `.env.example` contiene la documentación de `VITE_RAWG_API_KEY` y `VITE_BGG_API_TOKEN`.
- [x] `vite.config.ts` incluye la configuración de proxy para `/api/bgg` en desarrollo (con reenvío de token si existe).
- [x] `AddItemSheet` utiliza el proveedor dinámico de la colección, debounce de 350 ms, `AbortController`, y abre "Alta manual" directamente si el proveedor es `'manual'`.
- [x] `npx tsc --noEmit` pasa con 0 errores y 0 `any`.
- [x] `npm run lint` pasa con 0 errores y 0 warnings.
- [x] `npm run test` ejecuta toda la suite completa (incluyendo los nuevos tests) en verde.
- [x] `npm run build` compila con éxito.
- [x] Verificación con Chrome DevTools MCP en `http://127.0.0.1:5173/`:
  - [x] Búsqueda de libros en Open Library (ej. "Dune" o "Cien años de soledad") devuelve resultados con carátulas reales.
  - [x] Búsqueda en RAWG con API key funciona; sin API key muestra mensaje informativo amigable.
  - [x] Búsqueda en BGG devuelve resultados de juegos de mesa mostrando el placeholder de carátula.
  - [x] Colección manual muestra directamente "Alta manual" sin pestaña de búsqueda.
  - [x] Debounce y cancelación de peticiones operan sin parpadeos.

---

## Dudas resueltas

- **Duda 1 (BGG covers y token):** Resuelta. Se usa únicamente `/xmlapi2/search` en esta fase (sin llamada a `/thing`), mostrando el placeholder elegante `CoverImage` (`ImageOff`). Se añade soporte opcional para `VITE_BGG_API_TOKEN` en cabeceras / proxy (documentado en `.env.example`) y mensaje amigable invitando a "Alta manual" si BGG responde con 401, CORS o bloqueo.
- **Duda 2 (Colecciones manuales):** Resuelta. Cuando `collection.provider === 'manual'`, `AddItemSheet` oculta la pestaña "Buscar" y renderiza directamente el formulario de "Alta manual".
- **Ajuste técnico (Open Library):** Resuelto. Se descarta la cabecera `User-Agent` manual en `openLibrary.ts` para cumplir con las restricciones de cabeceras prohibidas del navegador en la especificación Fetch.
