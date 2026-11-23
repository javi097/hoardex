# Tareas de Implementación — Spec 007
**Fase 5: Hoardex Wrapped, Exportación CSV y Preparación para Despliegue en Vercel**

---

- [x] **T1. Contratos ampliados, configuración de despliegue en Vercel y metadatos SEO.** RF-05.1, RF-05.2, RF-05.3, RF-05.4, RNF-03
  - En `src/interfaces/gamification.interface.ts`:
    - Definir contratos `WrappedCollectionBreakdown`, `WrappedTopItem` y `WrappedStats` con cero `any`.
  - Crear `vercel.json` en la raíz del proyecto configurando rewrites para Single Page Applications:
    - `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.
  - Crear `.env.example` documentando rigurosamente `VITE_RAWG_API_KEY`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` sin revelar claves sensibles.
  - Actualizar `index.html`:
    - Meta tags completos de SEO (`title`, `description`).
    - Metadatos Open Graph (`og:title`, `og:description`, `og:type`, `og:image`, `og:url`).
    - Metadatos Twitter Cards (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`).
    - Meta tag `theme-color` y favicon SVG temático de Hoardex.
  - Hecho cuando: `npx tsc --noEmit` y `npm run build` compilen sin errores con cero `any`.

- [x] **T2. Motor analítico Wrapped (`wrapped.ts`) y generador de resumen social y tarjeta SVG (`wrappedCard.ts`).** RF-01.1, RF-01.2, RF-01.3, RF-01.4, RF-01.5, RF-01.6, RF-01.7, RF-01.8, RF-03.1, RF-03.3, RNF-01, RNF-02, RNF-03
  - Crear `src/features/gamification/core/wrapped.ts`:
    - Implementar la función pura `calculateWrappedStats(collections, items, gamification, targetYear)`.
    - Filtrar altas e ítems completados por año, cálculo de ratio de completitud, valoración media redondeada a 1 decimal, desempate determinista de "Colección Reina", top 5 de ítems mejor puntuados, nivel y racha récord.
    - Manejo defensivo cuando no hay actividad en el año (`hasActivity: false`, métricas a cero sin `NaN`).
  - Crear `src/features/gamification/core/wrapped.test.ts` con cobertura total (años vacíos, valoraciones nulas, empates y filtros de año).
  - Crear `src/features/gamification/core/wrappedCard.ts`:
    - Implementar el helper puro `escapeXml(str: string): string` para sanitizar `&`, `<`, `>`, `"` y `'`.
    - Implementar la función pura `generateWrappedShareText(stats: WrappedStats): string` con emojis estructurados para redes sociales.
    - Implementar la función pura `generateWrappedSvg(stats: WrappedStats): string` generando un documento SVG vectorial temático (1080x1350, gradientes Hoardex, textos escapados con `escapeXml` y logo SVG).
  - Crear `src/features/gamification/core/wrappedCard.test.ts` verificando el formateo de texto, el escapado estricto XML y la estructura de etiquetas del SVG.
  - Hecho cuando: `npm run test src/features/gamification/core/` pase al 100%.

- [x] **T3. Serializador puro de exportación CSV RFC 4180 con UTF-8 BOM.** RF-04.1, RF-04.2, RF-04.3, RF-04.4, RNF-01, RNF-02, RNF-03
  - Crear `src/features/sync/core/csv.ts`:
    - Implementar la función pura `exportToCsv(collections: Collection[], items: Item[]): string`.
    - Cabecera estandarizada con columnas: `collection_id`, `collection_name`, `item_id`, `title`, `subtitle`, `release_year`, `status_id`, `status_label`, `is_completed`, `rating`, `notes`, `created_at`, `updated_at`.
    - Helper puro `escapeCsvValue(value)` aplicando el estándar RFC 4180 (delimitación con comillas dobles si contiene comas, saltos de línea o comillas, y duplicación de comillas internas `""`).
    - Inclusión del marcador UTF-8 Byte Order Mark (`\uFEFF`) al inicio del archivo.
  - Crear `src/features/sync/core/csv.test.ts`:
    - Tests de cabecera y formato tabular.
    - Tests de escapado con comas, saltos de línea y comillas internas.
    - Verificación del BOM UTF-8 y preservación de acentos y caracteres especiales en español.
  - Hecho cuando: `npm run test src/features/sync/core/csv.test.ts` pase al 100%.

- [x] **T4. Modal interactivo accesible `WrappedDialog.tsx` con navegación por diapositivas.** RF-02.1, RF-02.2, RF-02.3, RF-02.4, RF-02.5, RF-02.6, RF-03.1, RF-03.2, RF-03.3, RNF-04
  - Crear `src/features/gamification/components/WrappedDialog.tsx`:
    - Diálogo modal accesible (`role="dialog"`, `aria-modal="true"`, foco atrapado, cierre con tecla `Escape`).
    - 6 diapositivas secuenciales estilo Stories con indicadores de progreso segmentados en cabecera:
      1. Bienvenida / Portada.
      2. El Volumen de tu Afición (ítems sumados y desglose).
      3. La Colección Reina (icono y color de acento).
      4. El Salón de la Fama (top items con portadas y estrellas).
      5. Métricas y Hábitos (completados y racha récord).
      6. The Recap Card (resumen consolidado).
    - Navegación por teclado (`ArrowLeft`, `ArrowRight`, `Escape`, `Space`) y botones visibles.
    - Gestos táctiles móviles (`onTouchStart` y `onTouchEnd` calculando swipe horizontal).
    - Soporte de `prefers-reduced-motion` mediante transiciones condicionales.
    - Botón para copiar resumen al portapapeles (`navigator.clipboard.writeText`) con notificación toast (`Sonner`).
    - Botón para descargar tarjeta vectorial `.svg` (`hoardex-wrapped-{year}.svg`) mediante URL Blob limpia (`URL.createObjectURL`).
    - Selector de año para conmutar periodos con actividad y diapositiva empática ante `hasActivity === false`.
  - Crear `src/features/gamification/components/WrappedDialog.test.tsx` verificando renderizado accesible, teclado, cambio de diapositivas, copiado de texto y descarga SVG.
  - Hecho cuando: `npm run test src/features/gamification/components/WrappedDialog.test.tsx` pase al 100%.

- [x] **T5. Integración accesible de Wrapped y descarga CSV en `Header.tsx`, `AccountMenu.tsx` y `AchievementsPage.tsx`.** RF-02.1, RF-04.5, RNF-04
  - En `src/components/custom/Header.tsx`:
    - Añadir botón accesible con icono de destellos (`Sparkles`) y texto *"Wrapped"* para abrir `WrappedDialog`.
    - En modo invitado o sin Supabase, ofrecer opción directa para descargar catálogo CSV (`hoardex-catalog-{YYYY-MM-DD}.csv`).
  - En `src/features/sync/components/AccountMenu.tsx`:
    - Añadir acción con icono `Sparkles` *"Hoardex Wrapped"* para abrir el diálogo.
    - Añadir acción con icono `Download` *"Exportar catálogo CSV"*.
  - En `src/pages/AchievementsPage.tsx`:
    - En la pestaña de estadísticas, añadir tarjeta destacada *"Hoardex Wrapped"* para abrir la retrospectiva.
    - Añadir botón accesible para exportar catálogo CSV en local.
  - Actualizar y ampliar las suites de pruebas de los componentes afectados (`Header.test.tsx`, `AccountMenu.test.tsx`, etc.).
  - Hecho cuando: `npm run test` pase al 100% en todas las suites de componentes integrados.

- [x] **T6. Puerta de calidad, verificación visual en Chrome DevTools MCP y memoria.** RNF-01, RNF-02, RNF-03, RNF-04, RNF-05
  - Ejecutar verificación estática completa: `npx tsc --noEmit`, `npm run lint`, `npm run test` (suite completa) y `npm run build`. Confirmar 0 errores, 0 warnings y 0 `any` en todo el proyecto.
  - Levantar `npm run dev` y validar con Chrome DevTools MCP en `http://localhost:5173/`:
    - Abrir `WrappedDialog` y recorrer las 6 diapositivas con teclado (`ArrowRight`/`ArrowLeft`) y botones.
    - Probar copiado de resumen al portapapeles y verificar emisión del toast.
    - Probar descarga de `hoardex-wrapped-{year}.svg` y verificar la integridad del XML SVG generado.
    - Probar exportación de CSV en modo invitado y autenticado; abrir el contenido y verificar cabecera, UTF-8 BOM y escapado RFC 4180.
    - Comprobar adaptación visual en móvil (375x667) y temas claro y oscuro.
    - Verificar ausencia de errores o advertencias en consola.
  - Marcar todos los criterios en `specs/007-wrapped-stats-deploy/spec.md` (estado `implementada`) y `tasks.md`.
  - Actualizar `MEMORY.md` (< 50 líneas) documentando el cierre de la Fase 5 y la finalización del proyecto Hoardex.
  - Hecho cuando: Todas las suites estén en verde, la UI esté verificada en DevTools MCP y `MEMORY.md` esté actualizado.
