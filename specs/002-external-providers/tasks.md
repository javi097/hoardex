# Tareas de Implementación 002 — External Search Providers

## Contexto y orden de ejecución
Este plan de tareas desglosa la implementación de la Fase 1b (`specs/002-external-providers/spec.md`) siguiendo el flujo de Spec-Driven Development (`sdd-implement`). Cada tarea es atómica, verificable de forma independiente y respeta la puerta de calidad (`npx tsc --noEmit`, `npm run lint`, `npm run test`).

---

- [x] **T1. Contrato `SearchOptions`, configuración de proxy y variables de entorno.** RF-01.3, RF-03.2, RF-05.3, RNF-01, RNF-04
  - Añadir `export interface SearchOptions { signal?: AbortSignal; }` y actualizar la firma de `SearchProvider.search(query: string, options?: SearchOptions): Promise<SearchResult[]>` en `src/interfaces/provider.interface.ts` (asegurando compatibilidad hacia atrás en `src/providers/mock.ts`).
  - Configurar proxy local en `vite.config.ts`: mapear `/api/bgg` hacia `https://boardgamegeek.com/xmlapi2` con reescritura de ruta y soporte de cabecera `Authorization` si existe `VITE_BGG_API_TOKEN`.
  - Documentar `VITE_RAWG_API_KEY` y `VITE_BGG_API_TOKEN` en `.env.example`.
  - Hecho cuando: `npx tsc --noEmit`, `npm run lint` y los tests existentes pasen en verde con cero `any`.

- [x] **T2. Adaptador RAWG y suite de pruebas unitarias.** RF-01.1, RF-01.2, RF-01.3, RNF-01, RNF-02, RNF-03, RNF-04
  - Crear `src/providers/rawg.ts` con tipos DTO de respuesta (`RawgGame`, `RawgResponse`), función pura `normalizeRawgGame` serializando listas en cadenas para respetar `meta: Record<string, string | number | boolean>`, y objeto `rawgProvider: SearchProvider` consumiendo `https://api.rawg.io/api/games`.
  - Manejo defensivo: verificación de `VITE_RAWG_API_KEY`, retorno inmediato de `[]` ante consultas vacías, códigos HTTP amigables (401, 429, 500) y paso de `options?.signal`.
  - Crear `src/providers/rawg.test.ts` cubriendo normalización pura (completo, sin imagen, sin fecha, sin plataformas), consulta HTTP con API key, errores 401/429/500 y cancelación con `signal`.
  - Hecho cuando: `npm run test src/providers/rawg.test.ts` pase al 100% y `npx tsc --noEmit` y `npm run lint` no emitan errores.

- [x] **T3. Adaptador Open Library y suite de pruebas unitarias.** RF-02.1, RF-02.2, RF-02.3, RF-02.4, RNF-01, RNF-02, RNF-03
  - Crear `src/providers/openLibrary.ts` con tipos DTO (`OpenLibraryDoc`, `OpenLibraryResponse`), función pura `normalizeOpenLibraryDoc` (resolución de portadas con `covers.openlibrary.org`, autores y año con serialización estricta de `meta`) y objeto `openLibraryProvider: SearchProvider` consumiendo `https://openlibrary.org/search.json`.
  - Respetar estándares web: sin cabecera prohibida `User-Agent` en navegador, retorno inmediato de `[]` ante consultas vacías y manejo de errores HTTP.
  - Crear `src/providers/openLibrary.test.ts` cubriendo normalización pura (completo, sin autor, sin portada `cover_i`, sin año), llamada con query y fields, errores 500 y cancelación por `signal`.
  - Hecho cuando: `npm run test src/providers/openLibrary.test.ts` pase al 100% y `npx tsc --noEmit` y `npm run lint` pasen limpios.

- [x] **T4. Adaptador BoardGameGeek y suite de pruebas unitarias.** RF-03.1, RF-03.2, RF-03.3, RF-03.4, RNF-01, RNF-02, RNF-03
  - Crear `src/providers/bgg.ts` con la función pura `parseBggXml` usando `DOMParser` para extraer `<name type="primary">`, año y generar `SearchResult[]` (con portada `undefined` y `meta` estrictamente tipado).
  - Objeto `bggProvider: SearchProvider` consultando `/api/bgg/search?query=...&type=boardgame`, inyectando `Authorization: Bearer <token>` si existe `VITE_BGG_API_TOKEN`, y capturando errores 401 o fallos de red con mensaje amigable invitando a "Alta manual".
  - Crear `src/providers/bgg.test.ts` cubriendo parseo XML puro (múltiples nombres, sin año, XML vacío, error de parser) y llamadas de red con token o errores.
  - Hecho cuando: `npm run test src/providers/bgg.test.ts` pase al 100% y `npx tsc --noEmit` y `npm run lint` pasen en verde.

- [ ] **T5. Proveedor manual y registro unificado con pruebas unitarias.** RF-04.1, RF-04.2, RNF-01, RNF-02
  - Crear `src/providers/manual.ts` con `manualProvider: SearchProvider` que retorna siempre `Promise.resolve([])`.
  - Crear `src/providers/index.ts` exportando la factoría `getSearchProvider(type: ProviderType): SearchProvider` que resuelve dinámicamente `'rawg'`, `'openLibrary'`, `'bgg'`, `'manual'`, con fallback defensivo a `mockProvider`.
  - Crear `src/providers/index.test.ts` cubriendo la resolución de cada proveedor y el fallback defensivo ante tipos desconocidos (`'unknown' as ProviderType` sin usar `any`).
  - Hecho cuando: `npm run test src/providers/index.test.ts` pase al 100% y `npx tsc --noEmit` y `npm run lint` estén en verde.

- [ ] **T6. Integración reactiva en `AddItemSheet.tsx`.** RF-05.1, RF-05.2, RF-05.3, RF-05.4, RF-05.5, RNF-01, RNF-03
  - En `src/features/items/components/AddItemSheet.tsx`:
    - Resolver el proveedor con `getSearchProvider(collection.provider)`.
    - Si `collection.provider === 'manual'`, ocultar las pestañas de selección y renderizar directamente el formulario de "Alta manual".
    - Implementar debounce reactivo de 350 ms en el input de búsqueda.
    - Cancelar peticiones intermedias o al desmontar mediante `AbortController` (`signal`).
    - Añadir banner visual accesible de error (con `AlertCircle` y rol `alert`) cuando la búsqueda falle, con botón para cambiar a "Alta manual" pre-rellenando el campo del título con la búsqueda fallida.
  - Hecho cuando: `npx tsc --noEmit`, `npm run lint` y los tests de componentes pasen sin errores.

- [ ] **T7. Puerta de calidad, verificación visual en Chrome DevTools MCP y memoria.** RNF-01, RNF-05
  - Ejecutar verificación estática completa: `npx tsc --noEmit`, `npm run lint`, `npm run test` (toda la suite) y `npm run build`. Confirmar 0 errores, 0 warnings y 0 `any`.
  - Levantar `npm run dev` y validar con Chrome DevTools MCP en `http://localhost:5173/`:
    - Búsqueda de libros en Open Library (con portadas reales).
    - Búsqueda en RAWG (comprobando feedback con/sin API key).
    - Búsqueda en BGG (con placeholder `ImageOff`).
    - Comportamiento de colecciones manuales (render directo de "Alta manual").
    - Ausencia de parpadeos con debounce y cancelación con `AbortController`.
  - Actualizar `MEMORY.md` resumiendo las decisiones y el estado de la Fase 1b (< 50 líneas).
  - Hecho cuando: Todos los checks pasen en verde, la verificación DevTools sea satisfactoria y `MEMORY.md` esté actualizado.
