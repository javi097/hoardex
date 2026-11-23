# Spec 007 — Hoardex Wrapped, Exportación CSV y Preparación para Despliegue en Vercel
Estado: aprobada

---

## Contexto y objetivo

Con las fases 1 a 4 completadas, Hoardex cuenta con un catálogo relacional flexible y personalizable, proveedores externos de metadatos, reseñas y notas, un sistema de gamificación completo (XP, niveles, rachas, logros y retos semanales), sincronización en la nube con Supabase bajo arquitectura *Local-First* y respaldo local en formato JSON versionado.

Esta especificación corresponde a la **Fase 5 (final): Hoardex Wrapped, Exportación CSV y Preparación para Despliegue**. Su objetivo es cerrar el ciclo del producto proporcionando:
1. **Hoardex Wrapped anual:** Una experiencia retrospectiva interactiva, lúdica y visual (inspirada en los formatos "Wrapped" anuales) en un diálogo modal accesible (`WrappedDialog.tsx`) que resuma los hitos, horas o ítems catalogados, aficiones más activas, títulos mejor valorados y logros conseguidos a lo largo de un año natural.
2. **Portabilidad de datos tabular (Exportación CSV):** Permitir a los usuarios descargar su inventario completo en formato CSV estándar compatible con Excel, Google Sheets o Notion, complementando el backup técnico en JSON.
3. **Preparación para producción y SEO:** Configuración lista para despliegue en Vercel (soporte de Single Page Application, rewrites limpios), metadatos Open Graph/Twitter Cards, favicons y archivo de variables de entorno documentado (`.env.example`).
4. **Garantía de calidad continua:** Cobertura de tests unitarios puros para analíticas y serialización CSV, garantizando cero regresiones, cero `any` y cumplimiento de los 9 principios de la constitución.

---

## Usuarios

- **Coleccionista nostálgico / reflexivo:** Desea ver un resumen anual visual de todo lo que ha jugado, leído o coleccionado durante el año, descubriendo patrones sobre sus aficiones y valoraciones.
- **Coleccionista social:** Desea compartir con amigos o en redes sociales su resumen anual de aficiones, mostrando su nivel alcanzado, colección reina y títulos favoritos en un formato atractivo y legible.
- **Usuario que gestiona hojas de cálculo:** Desea analizar su inventario en Excel o Google Sheets, o migrar datos a otras herramientas mediante un archivo CSV limpio, bien formateado y compatible internacionalmente.
- **Usuario visitante / público general:** Llega a la aplicación desplegada en producción a través de enlaces compartidos en redes sociales, visualizando una previsualización atractiva (Open Graph) y accediendo a una SPA fluida y responsiva.

---

## Historias de usuario

- **HU-01.** Como usuario, quiero abrir mi "Hoardex Wrapped" desde la cabecera o mi perfil para revivir mis hitos de colección del año actual o de años anteriores en un diálogo modal inmersivo.
- **HU-02.** Como usuario, quiero navegar por las diapositivas de mi Wrapped mediante el teclado o controles táctiles a mi propio ritmo, con animaciones suaves y diseño responsive.
- **HU-03.** Como usuario, quiero una diapositiva final de resumen que consolide mis estadísticas clave del año (ítems completados, colección favorita, valoración media, racha máxima y nivel).
- **HU-04.** Como usuario, quiero poder copiar un resumen textual formateado con emojis en mi portapapeles y descargar una tarjeta visual vectorial `.svg` para compartir mi Wrapped en redes sociales o mensajería sin depender de capturas de pantalla manuales.
- **HU-05.** Como usuario con pocos datos en un año, quiero que la experiencia Wrapped maneje de forma elegante la falta de actividad sin romperse, mostrando mensajes motivacionales acordes.
- **HU-06.** Como usuario, quiero exportar mi catálogo completo a un archivo CSV estándar con un solo clic, asegurando que títulos con comas, comillas o acentos se abran correctamente en Excel.
- **HU-07.** Como visitante web, quiero que al compartir enlaces de Hoardex en redes sociales o mensajería (WhatsApp, Twitter/X, Telegram) se muestre una tarjeta rica con título, descripción e imagen representativa.
- **HU-08.** Como usuario que recarga la página o accede a rutas directas en producción, quiero que la navegación SPA funcione sin errores 404 del servidor.

---

## Definiciones

| Término | Significado en Hoardex |
|---|---|
| **Hoardex Wrapped** | Retrospectiva anual interactiva en modal compuesta por diapositivas secuenciales que sintetizan la actividad, consumos y logros del usuario durante un año natural específico. |
| **Año Objetivo (`targetYear`)** | Año natural (por ejemplo `2026`) sobre el cual se calculan las métricas temporales de creación, actualización y actividad de ítems y gamificación. |
| **Métricas Wrapped (`WrappedStats`)** | Estructura de datos inmutable que contiene: total de ítems agregados en el año, total de ítems completados en el año, ratio de completitud, valoración media, colección con mayor actividad ("Colección del Año"), distribución porcentual por colección, top de ítems mejor puntuados, racha más larga alcanzada y nivel/XP alcanzado. |
| **Tarjeta Vectorial SVG (`hoardex-wrapped-{year}.svg`)** | Tarjeta gráfica temática generada puramente en el cliente mediante plantillas SVG basadas en `WrappedStats`, con dimensiones optimizadas (1080x1350 vertical tipo historia), tipografías del sistema y colores de la identidad visual de Hoardex, sin requerir librerías pesadas de renderizado como `html2canvas`. |
| **Exportación CSV (RFC 4180)** | Serialización de datos en formato de valores separados por coma cumpliendo el estándar RFC 4180: campos de texto que contengan comas, saltos de línea o comillas dobles se envuelven en comillas dobles, escapando las comillas internas duplicándolas (`""`). Con BOM UTF-8 (`\uFEFF`) inicial para asegurar apertura correcta de caracteres en español y acentos en Microsoft Excel. |
| **SPA Rewrite** | Regla de enrutamiento web en el servidor que redirige todas las peticiones a rutas dinámicas hacia `index.html` para permitir el enrutamiento del lado del cliente sin errores 404 en recarga. |

---

## Requisitos funcionales (Sintaxis EARS)

### RF-01 — Motor Analítico Puro de Hoardex Wrapped (`wrapped.ts`)

- **RF-01.1** El sistema debe proveer una función pura `calculateWrappedStats(collections, items, gamificationState, targetYear)` en `src/features/gamification/core/wrapped.ts` que calcule de forma determinista las estadísticas anuales.
- **RF-01.2** Cuando se calcule el total de ítems añadidos en el año, el sistema debe filtrar aquellos ítems cuyo `createdAt` comience por la cadena del año objetivo (`item.createdAt.startsWith(String(targetYear))`).
- **RF-01.3** Cuando se calcule el total de ítems completados en el año, el sistema debe computar aquellos ítems asociados al estado marcado como `isCompleted: true` de su colección cuya fecha de última actualización (`updatedAt ?? createdAt`) corresponda al año objetivo.
- **RF-01.4** Cuando se calcule la valoración media del año, el sistema debe promediar las valoraciones numéricas (`rating > 0`) de los ítems con actividad en dicho año, redondeando a un decimal (ej. `4.3`). Si ningún ítem tiene valoración, debe devolver `null`.
- **RF-01.5** Cuando se determine la "Colección del Año" (colección favorita), el sistema debe seleccionar la colección con mayor número de ítems añadidos o completados en el año; en caso de empate, la que tenga mayor número de ítems completados.
- **RF-01.6** Cuando se genere el ranking de mejores valoraciones del año, el sistema debe listar hasta un máximo de 5 ítems con la mayor puntuación (`rating`), ordenados descendentemente.
- **RF-01.7** Cuando se analice el progreso de gamificación del año, el sistema debe reflejar la racha máxima (`longestStreak`), los hitos/retos logrados y el nivel alcanzado al cierre del periodo.
- **RF-01.8** Si el usuario no tiene ninguna actividad registrada en el año objetivo, la función debe devolver una estructura válida con valores a cero (`totalAdded: 0`, `totalCompleted: 0`, `hasActivity: false`) sin lanzar excepciones ni devolver `null`.

### RF-02 — Experiencia Interactiva "Hoardex Wrapped" (`WrappedDialog.tsx`)

- **RF-02.1** El sistema debe ofrecer acceso a la experiencia Wrapped a través de un diálogo modal inmersivo accesible `WrappedDialog.tsx` (`role="dialog"`, `aria-modal="true"`, foco gestionado, cierre con tecla `Escape`), invocable desde:
  - La cabecera principal (`Header.tsx`) mediante botón con icono festivo/resumen (*"Wrapped 2026"*).
  - El menú de usuario autenticado (`AccountMenu.tsx`).
  - La página de logros y estadísticas (`AchievementsPage.tsx`).
- **RF-02.2** El sistema debe permitir al usuario conmutar el año a visualizar (por defecto el año actual `2026`, o años anteriores donde existan ítems o actividad registrada).
- **RF-02.3** La experiencia Wrapped debe estructurarse en una secuencia de diapositivas accesibles:
  1. **Bienvenida / Portada:** Presentación del año y título introductorio personalizado.
  2. **El Volumen de tu Afición:** Total de ítems sumados a tus estanterías en el año y desglose por categorías.
  3. **La Colección Reina:** La colección protagonista de tu año con su color de acento, icono y porcentaje de dedicación.
  4. **El Salón de la Fama:** Top de títulos mejor valorados con sus portadas y estrellas.
  5. **Métricas y Hábito:** Ítems completados, tasa de finalización y racha récord de días consecutivos.
  6. **Resumen Consolidado ("The Recap Card"):** Tarjeta póster final que resume todos los hitos clave del año en un solo vistazo.
- **RF-02.4** El usuario debe poder avanzar y retroceder entre diapositivas utilizando:
  - Botones visibles *"Anterior"* y *"Siguiente"*.
  - Teclas del teclado `ArrowLeft` y `ArrowRight` (o barra espaciadora para avanzar).
  - Gestos táctiles de deslizamiento (swipe horizontal) en dispositivos móviles.
- **RF-02.5** Cada diapositiva debe mostrar indicadores superiores de progreso en forma de barras segmentadas (estilo "Stories").
- **RF-02.6** Cuando el usuario active la preferencia del sistema `prefers-reduced-motion`, las transiciones entre diapositivas deben ejecutarse de forma instantánea sin animaciones de desplazamiento.

### RF-03 — Compartición Social y Descarga del Resumen

- **RF-03.1** En la diapositiva de resumen consolidado, el sistema debe incluir un botón accesible *"Copiar resumen"* (`Copy`) que copie al portapapeles mediante `navigator.clipboard.writeText` un texto enriquecido con emojis apto para compartir en redes sociales y mensajería (WhatsApp, Telegram, Twitter/X):
  ```text
  ✨ Mi Hoardex Wrapped 2026 ✨
  📚 42 ítems añadidos a mi colección
  🏆 28 completados (67% completitud)
  👑 Colección estrella: Videojuegos
  ⭐ Mejor puntuados: Elden Ring, Metaphor: ReFantazio
  🔥 Racha récord: 14 días
  🎮 Nivel alcanzado: Nivel 5 (Coleccionista Experto)
  Descubre y cataloga tus aficiones en Hoardex!
  ```
- **RF-03.2** Cuando el usuario copie el resumen, el sistema debe emitir una confirmación visual accesible mediante notificación tipo toast (`toast.success('¡Resumen copiado al portapapeles!')`).
- **RF-03.3** El sistema debe incluir un botón accesible para descargar la tarjeta resumen como archivo vectorial temático `hoardex-wrapped-{year}.svg` (generado puramente en cliente a partir de `WrappedStats`, con dimensiones 1080x1350, tipografía legible y colores de acento de Hoardex, sin requerir librerías pesadas como `html2canvas`).

### RF-04 — Exportación Tabular a CSV (`csv.ts`)

- **RF-04.1** El sistema debe implementar la función pura `exportToCsv(collections, items): string` en `src/features/sync/core/csv.ts`.
- **RF-04.2** El formato CSV generado debe contener las siguientes columnas normalizadas en cabecera:
  - `collection_id`: Identificador inmutable de la colección.
  - `collection_name`: Nombre de la colección.
  - `item_id`: Identificador inmutable del ítem.
  - `title`: Título del ítem.
  - `subtitle`: Subtítulo o plataforma (o cadena vacía).
  - `release_year`: Año de lanzamiento (o cadena vacía).
  - `status_id`: Identificador del estado del ítem.
  - `status_label`: Etiqueta legible del estado (obtenida de la colección).
  - `is_completed`: `'true'` si el estado del ítem es el estado completado de su colección, `'false'` en caso contrario.
  - `rating`: Valoración numérica (o cadena vacía si no tiene nota).
  - `notes`: Notas y reseñas personales del ítem (o cadena vacía).
  - `created_at`: Marca temporal ISO de creación.
  - `updated_at`: Marca temporal ISO de última modificación.
- **RF-04.3** La función de serialización debe aplicar el estándar RFC 4180: cualquier campo que contenga comas (`,`), comillas dobles (`"`) o saltos de línea (`\n` / `\r\n`) debe ir delimitado entre comillas dobles, y las comillas internas deben escaparse duplicándolas (`""`).
- **RF-04.4** La cadena CSV debe comenzar con el marcador de orden de bytes UTF-8 (`\uFEFF`) para garantizar que acentos, caracteres especiales y emojis se abran correctamente en Microsoft Excel en Windows y macOS.
- **RF-04.5** El sistema debe ofrecer la descarga del archivo `hoardex-catalog-{YYYY-MM-DD}.csv` desde el menú de cuenta / cabecera con un solo clic.

### RF-05 — Configuración para Despliegue en Vercel y Optimización SEO

- **RF-05.1** El sistema debe proveer el archivo `vercel.json` en la raíz del proyecto configurando la directiva de rewrites para Single Page Applications:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- **RF-05.2** El archivo `index.html` debe actualizarse con etiquetas meta completas y accesibles:
  - `title`: *"Hoardex — Cataloga tus aficiones y gamifica tu colección"*
  - `description`: Descripción atractiva de la aplicación.
  - Metadatos Open Graph (`og:title`, `og:description`, `og:type`, `og:image`, `og:url`).
  - Metadatos Twitter Cards (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`).
  - Favicon e icono temático SVG de Hoardex en alta resolución.
- **RF-05.3** El repositorio debe incluir un archivo `.env.example` rigurosamente documentado que detalle todas las variables de entorno opcionales y requeridas (`VITE_RAWG_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) sin revelar claves privadas.
- **RF-05.4** El comando `npm run build` debe generar una compilación de producción completamente estática y optimizada en la carpeta `dist/`, lista para el despliegue sin dependencias de servidor Node.js en tiempo de ejecución.

---

## Requisitos no funcionales

- **RNF-01 (Pureza y Determinismo):** La lógica de `wrapped.ts` y `csv.ts` debe ser 100% pura: no debe invocar `new Date()` sin parámetro, ni acceder al DOM, ni a `localStorage`, ni a stores de Zustand. Recibe datos y devuelve resultados inmutables.
- **RNF-02 (Cero librerías redundantes):** La serialización CSV debe realizarse con funciones puras nativas en TypeScript sin recurrir a paquetes externos pesados (como `papaparse`). La generación vectorial de tarjetas debe realizarse con plantillas SVG puras sin librerías externas de renderizado como `html2canvas`.
- **RNF-03 (Tipado Estricto):** Cero `any`, cero `as any` y contratos explícitos `WrappedStats`, `WrappedCollectionBreakdown` y `WrappedTopItem` en `src/interfaces/gamification.interface.ts`.
- **RNF-04 (Accesibilidad WCAG 2.1 AA):** El diálogo modal `WrappedDialog.tsx` debe contar con `role="dialog"`, foco atrapado, navegación completa mediante teclado (`ArrowLeft`, `ArrowRight`, `Escape`), soporte para `prefers-reduced-motion` y contraste de color adecuado tanto en tema claro como oscuro.
- **RNF-05 (Puerta de Calidad):** `npx tsc --noEmit`, `npm run lint`, `npm run test` y `npm run build` deben ejecutarse con 0 errores y 0 advertencias antes de dar por cerrada la fase.

---

## Casos límite

- **CL-01 (Usuario sin ningún ítem en el año):** El motor calcula `hasActivity: false`, y el Wrapped muestra una diapositiva inicial empática: *"Aún no tienes actividad registrada en {año}. ¡Empieza a catalogar tus ítems para desbloquear tu Wrapped!"*.
- **CL-02 (Usuario con colecciones pero sin ítems completados):** La tasa de completitud devuelve `0%` sin divisiones por cero (`NaN`), indicando que los ítems continúan en curso.
- **CL-03 (Ningún ítem con puntuación/estrellas en el año):** La sección de "Top Valorados" se sustituye con un mensaje informativo: *"No asignaste valoraciones con estrellas este año. ¡Anímate a puntuar tus ítems favoritos!"*.
- **CL-04 (Empate en la Colección Reina):** Si dos colecciones tienen exactamente el mismo número de ítems añadidos y completados, se desempata deterministamente por fecha de creación o nombre alfabético.
- **CL-05 (Campos con comas, comillas y saltos de línea en CSV):** Si una reseña de usuario contiene saltos de línea (`\n`), comas (`,`) o comillas (`"Título "Especial""`), la exportación debe generar comillas duplicadas (`"""Título ""Especial""""`) y mantener la integridad del CSV sin romper filas ni columnas en Excel.
- **CL-06 (Colección con acentos o caracteres especiales):** Colecciones con nombres como *"Cómics & Manga"*, *"Películas en 4K"* o emojis deben preservarse intactas gracias al BOM `\uFEFF`.
- **CL-07 (Navegación en la primera y última diapositiva):** En la primera diapositiva, el botón *"Anterior"* y la flecha izquierda deben deshabilitarse o no causar retroceso. En la última diapositiva, el botón *"Siguiente"* se convierte en *"Cerrar"* o *"Volver a ver"*.

---

## Fuera de alcance

- Reproducción de pistas musicales o efectos de audio automáticos en la presentación Wrapped.
- Generación de vídeo animado o exportación en formato MP4/GIF.
- Almacenamiento de capturas de pantalla de Wrapped en un servidor o base de datos externa.
- Backend dinámico en Node/Python para generación de imágenes (la descarga o copiado se realiza en el cliente).
- Importador masivo de CSV hacia la base de datos (se cubre la exportación en esta fase; la importación de respaldos continúa centralizada en el formato JSON versionado de la Fase 4).

---

## Criterios de finalización

- [ ] `calculateWrappedStats` implementado en `src/features/gamification/core/wrapped.ts` con cobertura del 100% en `wrapped.test.ts`.
- [ ] `exportToCsv` implementado en `src/features/sync/core/csv.ts` con tests en `csv.test.ts` validando el estándar RFC 4180 y el BOM UTF-8.
- [ ] Función pura `generateWrappedSvg` y generador de texto enriquecido implementados en `src/features/gamification/core/wrappedCard.ts` con tests en `wrappedCard.test.ts`.
- [ ] Componente visual `WrappedDialog.tsx` implementado con navegación por diapositivas, soporte de teclado, gestos móviles, botón para copiar resumen al portapapeles y botón para descargar tarjeta `.svg`.
- [ ] Botón de apertura de Wrapped integrado en `Header.tsx`, `AccountMenu.tsx` y `AchievementsPage.tsx`.
- [ ] Botón para exportar catálogo a CSV integrado en el menú de usuario / cabecera.
- [ ] Archivo `vercel.json` creado en la raíz con la regla de rewrite SPA a `/index.html`.
- [ ] Archivo `.env.example` documentado con todas las variables de entorno.
- [ ] Metadatos SEO, Open Graph y favicon temático configurados en `index.html`.
- [ ] `npx tsc --noEmit` completado con 0 errores (cero `any`).
- [ ] `npm run lint` completado con 0 errores y 0 warnings.
- [ ] `npm run test` completado con el 100% de tests pasando en todas las suites.
- [ ] `npm run build` ejecutado con éxito.
- [ ] Verificación en Chrome DevTools MCP en modo claro y oscuro, desktop y móvil.
- [ ] `MEMORY.md` actualizado cerrando el proyecto.
