# MEMORY.md — Hoardex

## Estado actual
- **Proyecto completado al 100%:** Fases 1 a 5 (`001` a `007`) implementadas, probadas y listas para producción.
- **Fase 5 (`007-wrapped-stats-deploy`):**
  - Motor analítico `calculateWrappedStats` puro con filtros de año, completitud y top valorados.
  - Generador social de texto con emojis y tarjeta vectorial temática `generateWrappedSvg` con `escapeXml`.
  - Serializador RFC 4180 `exportToCsv` con BOM UTF-8 (`\uFEFF`) y helper de descarga `downloadCatalogCsv`.
  - Modal interactivo accesible `WrappedDialog` con 6 diapositivas estilo Stories, teclado, swipe y reducción de movimiento.
  - Integración de Wrapped accesible en `Header`, `AccountMenu` y `AchievementsPage`. Desbloqueo estacional (`isWrappedAvailable`) a partir del 10 de diciembre.
  - Configuración Vercel (`vercel.json`), `.env.example`, metadatos SEO/Open Graph/Twitter Cards en `index.html`.
- **Métricas globales:** 48 suites, 316 tests pasando (100% verde), 0 errores `tsc`, 0 `any` o `as any`, 0 warnings lint, build en 1.92s.

## Decisiones de arquitectura (y su porqué)
- **Local-First & Resiliencia:** App 100% funcional sin conexión ni Supabase; respaldo en JSON versionado y CSV RFC 4180.
- **Tarjetas SVG puras en cliente:** Generación vectorial ligera y nítida sin librerías pesadas (`html2canvas`).
- **Reseteo de estado en render:** Control de diapositiva inicial en `WrappedDialog` derivando de props en render para evitar cascades de React.
- **Conciliación LWW e idempotencia:** Fusión de datos remotos por `updatedAt`, XP por `Math.max` y unión de sets.

## Errores a evitar
- **No importar stores dentro de otros stores:** Pasar datos por parámetro en acciones puras.
- **No llamar a `new Date()` sin parámetro en `core/`:** Inyectar siempre `targetYear` o `today`.
- **Encadenar en PowerShell Windows:** Usar `;` en lugar de `&&`.
- **Botones con nombres duplicados en Radix Dialog:** Nombrar de forma unívoca para evitar colisiones con el botón cerrar (`sr-only`).
