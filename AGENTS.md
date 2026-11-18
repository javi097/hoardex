# AGENTS.md — Hoardex
Aplicación web para catalogar y coleccionar tus aficiones (videojuegos, libros, juegos de mesa, figuras, discos o cualquier colección personalizada) con un sistema de gamificación: XP, niveles, rachas, logros y retos. Proyecto construido desde cero en React + TypeScript: modularidad por dominios (*feature-driven*), tipado estricto sin `any`, diseño accesible con Tailwind CSS y primitivas de Shadcn UI, lógica de negocio pura y testeada con Vitest, y estado predecible e inmutable con Zustand y persistencia local.

## Stack y estructura
- React (Vite, TypeScript en modo estricto) y Tailwind CSS.
- UI, iconografía y primitivas: Shadcn UI (Radix UI) y Lucide React.
- Gestión de estado: Zustand con persistencia en `localStorage` (clave `hoardex-storage`).
- Tests: Vitest (lógica pura y stores) y Testing Library (componentes críticos).
- Notificaciones: Sonner.
- Previstas en fases posteriores (**preguntar antes de instalarlas**): Supabase (auth y base de datos), Zod, React Hook Form, TanStack Query, Framer Motion.
- Arquitectura modular con alias `@/*` apuntando a `./src/*`:

```text
src/
├── assets/                 # Recursos gráficos, iconos y SVG
├── components/             # Componentes transversales compartidos
│   ├── custom/             # Componentes propios (Header, ConfirmDialog, EmptyState, CoverImage...)
│   └── ui/                 # Primitivas base de Shadcn (button, card, dialog, sheet, input, badge...)
├── interfaces/             # Contratos de datos globales (*.interface.ts)
├── lib/                    # Utilidades puras (utils.ts con cn)
├── providers/              # Adaptadores de búsqueda externa (rawg.ts, openLibrary.ts, bgg.ts, manual.ts)
├── features/               # Dominios de la aplicación
│   ├── collections/        # Colecciones (plantillas, creación, vista estantería y cuadrícula)
│   │   ├── components/
│   │   ├── core/           # Lógica pura (plantillas, validación, ordenación y filtrado)
│   │   ├── hooks/
│   │   └── store/          # collections.store.ts
│   ├── items/              # Ítems (alta manual o desde proveedor, ficha, estados, reseñas)
│   │   ├── components/
│   │   ├── core/
│   │   ├── hooks/
│   │   └── store/          # items.store.ts
│   ├── gamification/       # XP, niveles, rachas, logros y retos
│   │   ├── components/     # XpBar, LevelBadge, AchievementCard, StreakCounter
│   │   ├── core/           # xp.ts, levels.ts, streaks.ts, achievements.ts (lógica pura + tests)
│   │   └── store/          # gamification.store.ts
│   └── stats/              # Estadísticas anuales tipo "Wrapped"
│       ├── components/
│       └── core/
├── pages/                  # HomePage, CollectionPage, ProfilePage, StatsPage
├── index.css               # Estilos globales, directivas de Tailwind y variables CSS
├── App.tsx                 # Contenedor raíz con proveedores globales (Toaster, router)
└── main.tsx                # Punto de entrada de Vite
```

## Convenciones
- Nombres de archivos, interfaces, tipos, variables y componentes en inglés.
- Textos de interfaz en español, de forma consistente en toda la app.
- Tipado estricto innegociable: cero `any`, contratos explícitos con sufijo `.interface.ts` en `src/interfaces/`, y props de componentes tipadas con `interface Props`.
- Toda la lógica de negocio (`core/`) debe ser pura: no depende de React, del DOM, del store de Zustand ni de la fecha del sistema. Recibe datos (incluida la fecha actual como parámetro) y devuelve resultados predecibles e inmutables.
- Cada archivo de `core/` tiene su test `*.test.ts` junto a él. La lógica de gamificación (XP, niveles, rachas, logros) no se da por terminada sin tests.
- Estilos exclusivamente con utilidades de Tailwind CSS combinadas mediante `cn()` de `@/lib/utils`. Diseño responsivo (mobile first), con modo claro y oscuro.
- Cada colección tiene su color de acento, definido como dato de la colección y aplicado mediante variables CSS, no con clases hardcodeadas por tipo de colección.

## Dominio y reglas de negocio (fácil equivocarse)
- **Todo es un ítem genérico dentro de una colección:** nunca se crean tipos, tablas ni componentes específicos por categoría (por ejemplo `VideoGame` o `Book`). Una colección define sus estados, su icono, su color y su proveedor; un ítem guarda lo específico de su categoría en `meta`.
- **Identificadores estables:** colecciones e ítems tienen IDs únicos e inmutables (`collectionId`, `itemId`). Queda prohibido usar el índice del array como `key` de React o como identificador.
- **Estructura relacional plana:** los ítems referencian su colección mediante `collectionId`. No se anidan arrays de ítems dentro de las colecciones.
- **Estados por colección:** cada colección tiene su lista de estados (por ejemplo pendiente, en curso, terminado). Existe un único estado marcado como "completado" por colección; es el que dispara la ganancia de XP.
- **Patrón proveedor:** cada fuente externa implementa la misma interfaz `SearchProvider` (`search(query): Promise<SearchResult[]>`). Añadir un tipo nuevo de fuente es crear un adaptador en `src/providers/`, sin modificar el resto de la app. Los proveedores normalizan la respuesta externa a `SearchResult` y nunca filtran formatos de API al resto del código.
- **Datos externos no fiables:** las respuestas de APIs externas pueden venir incompletas (sin portada, sin año). La UI siempre debe tener un estado de carga, un estado de error y un placeholder de portada.
- **XP idempotente:** el XP se concede una sola vez por ítem completado. Reabrir un ítem y volver a completarlo no duplica el XP. La lógica de niveles se deriva del XP total, no se almacena por separado.
- **Rachas y fechas:** las rachas se calculan con funciones puras que reciben la fecha actual por parámetro y trabajan con días naturales en la zona horaria del usuario. Prohibido llamar a `Date.now()` o `new Date()` dentro de `core/`.
- **Logros declarativos:** cada logro es un objeto con `id`, condición pura `(state) => boolean` y recompensa. Añadir un logro no debe requerir tocar la lógica del store.
- **Estado de Zustand inmutable:** cualquier actualización devuelve nuevos objetos o arrays mediante desestructuración, sin mutar colecciones directamente. Cada store expone acciones con nombre claro y se mantiene pequeño y por dominio.
- **Secretos:** las claves de API van en variables de entorno (`.env.local`, fuera del repositorio) y se documentan en `.env.example`. Recordar que cualquier variable `VITE_*` es visible en el navegador.

## Forma de trabajar
- Haz solo lo que se pide: no instales librerías innecesarias ni agregues funcionalidades no contempladas.
- Desarrollo guiado por especificaciones (SDD): lee la spec activa antes de tocar código.
- Construcción incremental por capas: `interfaces` -> `core` (con tests) -> `store` -> `components` -> `pages`.
- Empieza cada funcionalidad nueva con datos mock para validar el diseño pronto y conecta las APIs reales después.
- Al terminar, resume qué has cambiado, qué archivos se han creado y las decisiones tomadas.
- Constitución del proyecto: lee constitution.md antes de redactar o implementar cualquier spec para garantizar el cumplimiento de los principios innegociables.

## Skills y Metodología (.agents/skills/)
El agente tiene a su disposición las siguientes skills locales:
- **`sdd`**: flujo de desarrollo guiado por especificaciones (`sdd-spec`, `sdd-plan`, `sdd-tasks`, `sdd-implement`).
- **`frontend-design` y `web-design-guidelines`**: directrices de composición visual, espaciado, contraste, tipografía y accesibilidad. Úsalas para la home tipo estantería, las cuadrículas de portadas y la ficha de ítem.
- **`modern-web-guidance`**: buenas prácticas actuales de desarrollo web.
- **`design-mobile-apps`**: criterios de diseño móvil. Úsala para la experiencia responsive y táctil.
- **`systematic-debugging`**: protocolo sistemático de diagnóstico de errores (aislamiento de fallos, trazas y reproducción) antes de alterar código funcional.

## Memoria
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas).
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md`.
- No guardes nunca datos sensibles (claves de API o tokens).

## Comandos
- Servidor local: `npm run dev`
- Tests: `npm run test` (Vitest)
- Comprobación de tipos: `npx tsc --noEmit`
- Linter: `npm run lint`
- Compilación: `npm run build`

## Reglas y Límites
- ✅ Siempre: mantener la modularidad por carpetas (`src/features/`, `src/providers/`, `src/interfaces/`, `src/components/ui/`) y los alias `@/*`.
- ✅ Siempre: escribir o actualizar los tests de Vitest cuando se toque lógica de `core/`.
- ✅ Siempre: actualizar `MEMORY.md` al terminar cada tarea.
- ✅ Siempre: respetar los 9 principios de constitution.md sin excepción.
- ⚠️ Pregunta antes: agregar dependencias no acordadas, cambiar el modelo de datos (`Collection`, `Item`) o modificar las reglas de XP, niveles y rachas.
- 🚫 Nunca: usar `any` en TypeScript, meter estilos CSS en línea, crear tipos o componentes específicos por categoría, subir claves de API al repositorio o dejar la compilación o los tests en rojo.

## Verificación
- **Estática:** comprueba tipos con `npx tsc --noEmit`, linter con `npm run lint` y tests con `npm run test`.
- **UI y Ejecución (Chrome DevTools MCP):** abre `http://localhost:5173/`, verifica que la home muestre las colecciones y sus portadas, que se pueda crear una colección y añadir un ítem, que al completarlo suba el XP y que el estado persista en recarga. Revisa también la vista en móvil y en modo oscuro.
- **Consulta de Documentación (Context7 MCP):** ante dudas sobre Zustand, Tailwind, Radix UI, Vitest o las APIs externas (RAWG, Open Library, BoardGameGeek), usa Context7 para consultar la documentación oficial.
- Para empezar de cero en pruebas: DevTools → Application → Local Storage → borrar la clave `hoardex-storage`.
