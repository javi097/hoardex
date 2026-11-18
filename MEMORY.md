# MEMORY.md — Hoardex

## Estado actual
- **Fase actual:** Fase 0 — Configuración inicial y arquitectura base.
- **Completado:**
  - Inicialización del proyecto (React + Vite + TypeScript estricto + Tailwind CSS + Shadcn UI + Vitest + Zustand).
  - Configuración de skills locales en `.agents/skills/` (`sdd`, `frontend-design`, `web-design-guidelines`, `modern-web-guidance`, `design-mobile-apps`, `systematic-debugging`).
  - Definición de arquitectura y gobernanza en `AGENTS.md` y `constitution.md`.
- **Hoja de ruta SDD (`specs/`):**
  - `001-core-catalog-mock` (Fase 1a: Contratos, stores, plantillas, CRUD manual/mock y vistas).
  - `002-external-providers` (Fase 1b: Adaptadores RAWG, Open Library y BGG).
  - `003-reviews-filters-sorting` (Fase 2: Notas, reseñas, búsqueda, filtros y ordenación).
  - `004-gamification-engine` (Fase 3a: Motor puro de XP idempotente, niveles y rachas + tests).
  - `005-achievements-challenges` (Fase 3b: Logros declarativos, retos personales y toasts).
  - `006-supabase-auth-sync` (Fase 4: Auth, base de datos en Supabase y perfil público).
  - `007-wrapped-stats-deploy` (Fase 5: Estadísticas anuales tipo Wrapped y despliegue).
- **Siguiente paso:** Redactar y aprobar la spec `001-core-catalog-mock` (`sdd-spec`).

## Decisiones de arquitectura (y su porqué)
- **Modelo genérico (`Collection` + `Item`) en lugar de tipos por categoría:** Evita duplicar lógica, tablas o componentes para juegos, libros o figuras; lo específico de cada medio vive dentro de `item.meta`.
- **Estructura relacional plana (`item.collectionId`):** Evita anidamientos profundos en Zustand, facilita actualizaciones inmutables y simplifica la futura migración a tablas relacionales en Supabase (Fase 4).
- **Patrón `SearchProvider`:** Desacopla la UI de las APIs externas (RAWG, Open Library, BGG), garantizando un formato normalizado (`SearchResult`) y tolerancia a datos incompletos.
- **XP idempotente y niveles derivados:** Guardar un flag de XP otorgado por ítem evita farming al alternar estados; derivar el nivel desde el XP total elimina estados sincronizados redundantes.
- **Lógica pura en `core/` sin reloj del sistema:** Pasar la fecha actual por parámetro permite testear rachas y retos con Vitest de forma determinista.

## Errores a evitar
- **No acoplar componentes a categorías:** Prohibido crear `<GameCard />` o `<BookForm />`; el renderizado dinámico debe depender de la configuración de la colección (icono, color vía variables CSS, proveedor).
- **No instalar dependencias de fases futuras aún:** Mantener el bundle limpio en Fase 1 (sin Supabase, TanStack Query ni Framer Motion hasta llegar a sus fases correspondientes).
- **No mutar estado en Zustand:** Usar siempre copias inmutables y asegurar que la persistencia en `localStorage` (`hoardex-storage`) no rompa ante datos parciales.