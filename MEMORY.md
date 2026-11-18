# MEMORY.md — Hoardex

## Estado actual
- **Fase actual:** Fase 1a completada (`001-core-catalog-mock` implementada).
- **Completado:**
  - `001-core-catalog-mock`: Biblioteca base y arquitectura limpia con datos mock.
  - Contratos globales en `src/interfaces/` sin `any`.
  - Lógica pura determinista y testeada (`templates.ts`, `items.ts`) con 42 tests en verde.
  - Proveedor `mockProvider` con dataset realista y simulación de latencia.
  - Stores en Zustand con persistencia defensiva (`hoardex-collections` e `hoardex-items`) y cascada de borrado.
  - Primitivas UI Shadcn y transversales (`Header`, `CoverImage`, `ConfirmDialog`, `EmptyState`, `Sheet`).
  - Páginas `HomePage` y `CollectionPage` con color temático `--collection-accent` y soporte responsive/dark mode verificado con Chrome DevTools MCP.
- **Hoja de ruta SDD (`specs/`):**
  - `001-core-catalog-mock` (Fase 1a: Implementada).
  - `002-external-providers` (Fase 1b: Adaptadores RAWG, Open Library y BGG).
  - `003-reviews-filters-sorting` (Fase 2: Notas, reseñas, búsqueda, filtros y ordenación).
  - `004-gamification-engine` (Fase 3a: Motor puro de XP idempotente, niveles y rachas + tests).
  - `005-achievements-challenges` (Fase 3b: Logros declarativos, retos personales y toasts).
  - `006-supabase-auth-sync` (Fase 4: Auth, base de datos en Supabase y perfil público).
  - `007-wrapped-stats-deploy` (Fase 5: Estadísticas anuales tipo Wrapped y despliegue).
- **Siguiente paso:** Iniciar la spec `002-external-providers` (`sdd-spec`).

## Decisiones de arquitectura (y su porqué)
- **Persistencia en Zustand con claves independientes (`hoardex-collections`, `hoardex-items`):** Evita colisiones entre stores modulares y simplifica el reseteo granular.
- **Renderizado de iconos con `<CollectionIcon />`:** Desacopla la resolución de nombres de iconos Lucide de la renderización sin generar componentes dinámicos durante el render (cumpliendo React Compiler / ESLint).
- **Suscripciones estables con `useMemo` en Zustand:** Evitar arrays derivados o `.filter()` dentro del selector para prevenir loops infinitos en `useSyncExternalStore`.
- **Script anti-FOUC en `<head>`:** Inyección síncrona de `.dark` en `index.html` según `localStorage` o `matchMedia` antes de la hidratación de React.
- **`crypto.randomUUID()` puro:** Identificadores únicos sin librerías externas adicionales.

## Errores a evitar
- **No instanciar componentes dentro del ciclo de render:** Usar referencias fijas o wrappers como `CollectionIcon`.
- **No devolver arrays nuevos en selectores de Zustand:** Seleccionar el array base y derivar con `useMemo`.
- **No duplicar XP ni alterar fechas históricas:** Mantener `item.xpAwarded || isCompleted` y conservar `completedAt` de la primera completación.
