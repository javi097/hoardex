# Spec 008 — Autenticación OAuth (Google, Apple, GitHub), Perfiles de Usuario y Privacidad de Colecciones
Estado: implementada

---

## Contexto y objetivo

Con la finalización de la Fase 5 (Hoardex Wrapped, exportación tabular y preparación para producción), Hoardex cuenta con un catálogo relacional robusto, proveedores de metadatos, gamificación completa (XP, niveles, rachas, logros y retos), arquitectura *Local-First* con sincronización cloud en Supabase y respaldo local.

Esta especificación inicia la **Etapa 2: Identidad, OAuth y Red Social estilo Letterboxd**. Su objetivo es transformar Hoardex de una aplicación puramente personal de inventario en una plataforma social de coleccionismo donde los usuarios puedan identificarse de forma ágil, gestionar su identidad pública (`@username`, biografía, avatar), controlar la privacidad de sus aficiones (colecciones públicas vs. privadas) y compartir su estantería de aficiones con el mundo a través de una URL pública (`/u/:username`).

Todo ello manteniendo intactos los principios fundamentales de la constitución:
1. **Local-First innegociable:** La aplicación debe seguir funcionando al 100% en modo invitado sin conexión ni credenciales.
2. **Privacidad por diseño:** El usuario decide explícitamente qué colecciones son públicas y cuáles son estrictamente privadas. El *Hoardex Wrapped* anual y las colecciones privadas nunca son accesibles por terceros.
3. **Pureza matemática y tipado estricto:** Cero `any`, funciones puras en `core/` con tests en Vitest y contratos explícitos en `interfaces/`.

---

## Usuarios

- **Usuario invitado:** Utiliza Hoardex en local sin cuenta. Al decidir crear una cuenta, puede autenticarse con un solo clic mediante Google, Apple o GitHub sin fricción de contraseñas, fusionando automáticamente su catálogo local con la nube.
- **Coleccionista social:** Desea compartir su perfil (`/u/javi`) con amigos o en su biografía de redes sociales, mostrando sus colecciones públicas (videojuegos, libros favoritos, figuras), sus valoraciones en estrellas, reseñas y su nivel de coleccionista.
- **Coleccionista privado:** Desea registrar aficiones personales que prefiere no compartir (p. ej. diarios, lecturas íntimas o compras pendientes), marcando colecciones específicas o su perfil completo como privados.
- **Visitante público:** Accede a la URL `/u/:username` sin necesidad de tener cuenta ni iniciar sesión, visualizando de forma limpia y atractiva las aficiones públicas del usuario, sus títulos top y sus logros.

---

## Historias de usuario

- **HU-01.** Como usuario, quiero registrarme o iniciar sesión usando mi cuenta de Google, Apple o GitHub para acceder a mi catálogo cloud sin necesidad de recordar contraseñas.
- **HU-02.** Como usuario que tenía datos catalogados en modo invitado, quiero que al iniciar sesión con OAuth mis datos locales se sincronicen y concilien automáticamente con mi cuenta en la nube sin pérdida de información.
- **HU-03.** Como usuario autenticado, quiero tener un identificador único `@username`, nombre visible, avatar y biografía corta para personalizar mi identidad en Hoardex.
- **HU-04.** Como usuario autenticado, quiero editar mi perfil desde el menú de cuenta mediante un diálogo accesible, validando en tiempo real que mi `@username` cumpla con el formato permitido.
- **HU-05.** Como usuario, quiero poder marcar cada una de mis colecciones como **Pública** o **Privada** tanto al crearla como al editarla, asegurando que las colecciones privadas solo sean visibles por mí.
- **HU-06.** Como usuario, quiero poder alternar la visibilidad global de mi perfil entre público y privado, ocultando toda mi actividad a visitantes si decido mantener un perfil discreto.
- **HU-07.** Como visitante público, quiero acceder a `/u/:username` para explorar la estantería de aficiones de otro coleccionista, viendo sus colecciones públicas, ítems completados, estrellas y medallas de logros.
- **HU-08.** Como usuario, quiero que mis colecciones privadas, retos personales no reclamados, historial detallado de eventos de XP y mi *Hoardex Wrapped* anual permanezcan estrictamente inaccesibles para cualquier visitante o usuario externo.

---

## Definiciones

| Término | Significado en Hoardex |
|---|---|
| **OAuth Multi-proveedor** | Mecanismo de autenticación federada delegado en proveedores de identidad de confianza (`google`, `apple`, `github`) mediante el flujo estándar de Supabase Auth (`signInWithOAuth`). |
| **Identificador de Usuario (`username`)** | Cadena de texto única, alfanumérica en minúsculas y guiones bajos (longitud entre 3 y 20 caracteres), que sirve como slug de la URL pública `/u/:username`. |
| **Perfil de Usuario (`Profile`)** | Entidad pública vinculada 1:1 con un usuario autenticado (`auth.users`), compuesta por `id` (UUID), `username`, `displayName`, `avatarUrl`, `bio`, `isPublic` y marcas temporales. |
| **Colección Pública (`is_public = true`)** | Colección cuyos metadatos e ítems contenidos pueden ser leídos por cualquier usuario o visitante a través de la interfaz web o la API pública. |
| **Colección Privada (`is_public = false`)** | Colección cuyos datos y elementos asociados están protegidos por políticas RLS y solo pueden ser consultados o mutados por su propietario autenticado (`auth.uid() = user_id`). |
| **Vista Pública (`/u/:username`)** | Ruta accesible en modo solo lectura para cualquier visitante, que renderiza la ficha del coleccionista y sus estanterías públicas sin requerir autenticación. |

---

## Requisitos funcionales (Sintaxis EARS)

### RF-01 — Autenticación OAuth Multi-proveedor y Conciliación Automática

- **RF-01.1** El sistema debe mantener plenamente operativa la autenticación clásica por correo electrónico y contraseña (`signInWithPassword` y `signUp`) en `AuthDialog`.
- **RF-01.2** Donde Supabase esté configurado (`isSupabaseConfigured === true`), el sistema debe mostrar en `AuthDialog` botones accesibles y diferenciados para los proveedores OAuth:
  - **Google** (icono oficial SVG de Google y texto *"Continuar con Google"*).
  - **Apple** (icono oficial SVG de Apple y texto *"Continuar con Apple"*).
  - **GitHub** (icono oficial SVG de GitHub y texto *"Continuar con GitHub"*).
- **RF-01.3** Cuando el usuario pulse cualquiera de los botones de proveedor OAuth, el sistema debe invocar `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })`.
- **RF-01.4** Mientras se procesa la redirección hacia el proveedor OAuth, el sistema debe mostrar un estado de carga deshabilitando temporalmente los demás controles del diálogo.
- **RF-01.5** Si la inicialización del flujo OAuth devuelve un error o es cancelada por el proveedor, el sistema debe capturar el error y mostrar una notificación accesible (`toast.error`) indicando el fallo sin alterar el estado local.
- **RF-01.6** Cuando el usuario regrese a la aplicación con una sesión activa generada por el callback de OAuth, el sistema (`useAuth`) debe detectar el cambio de estado de sesión (`onAuthStateChange`) e iniciar inmediatamente el ciclo de sincronización y conciliación bidireccional (`useSyncEngine.syncNow`), combinando datos locales previos y remotos bajo la regla Last-Write-Wins (LWW).

### RF-02 — Esquema SQL de Perfiles, Privacidad y Políticas RLS (`supabase/schema.sql`)

- **RF-02.1** El sistema debe definir en `supabase/schema.sql` la tabla relacional `profiles`:
  - `id` UUID PRIMARY KEY REFERENCES `auth.users(id)` ON DELETE CASCADE.
  - `username` text UNIQUE NOT NULL (con constraint de validación `CHECK (username ~ '^[a-z0-9_]{3,20}$')`).
  - `display_name` text NOT NULL (longitud entre 1 y 50 caracteres).
  - `avatar_url` text NULL.
  - `bio` text NULL (longitud máxima de 280 caracteres).
  - `is_public` boolean NOT NULL DEFAULT true.
  - `created_at` timestamptz NOT NULL DEFAULT now().
  - `updated_at` timestamptz NOT NULL DEFAULT now().
- **RF-02.2** El sistema debe definir la función y trigger PostgreSQL `handle_new_user()` ejecutado `AFTER INSERT ON auth.users`:
  - Extrae el nombre mostrado desde `raw_user_meta_data->>'full_name'`, `raw_user_meta_data->>'name'` o la parte local del correo electrónico si no existen metadatos.
  - Extrae el avatar desde `raw_user_meta_data->>'avatar_url'` o `raw_user_meta_data->>'picture'` (provisto por Google o GitHub).
  - Genera un `username` inicial único sanitizado en minúsculas a partir del email o nombre, agregando sufijos numéricos aleatorios deterministas si existe colisión.
  - Inserta el registro inicial en `profiles` con `SECURITY DEFINER`.
- **RF-02.3** El sistema debe incorporar la columna `is_public` (boolean NOT NULL DEFAULT true) a la tabla `collections`.
- **RF-02.4** El sistema debe configurar Row Level Security (RLS) en `profiles`:
  - `SELECT`: Permitido a cualquier usuario (incluso anónimos) si `is_public = true` O si `auth.uid() = id`.
  - `INSERT`: Restringido exclusivamente al usuario autenticado propietario (`auth.uid() = id`).
  - `UPDATE`: Restringido exclusivamente al usuario autenticado propietario (`auth.uid() = id`).
- **RF-02.5** El sistema debe actualizar las políticas de RLS en `collections`:
  - `SELECT`: Permitido a cualquier visitante o usuario si `is_public = true` Y el perfil del propietario tiene `is_public = true`, O si `auth.uid() = user_id`.
  - `INSERT`, `UPDATE`, `DELETE`: Restringido estrictamente al propietario autenticado (`auth.uid() = user_id`).
- **RF-02.6** El sistema debe actualizar las políticas de RLS en `items`:
  - `SELECT`: Permitido si el ítem pertenece a una colección que sea legible según las políticas de colección (`EXISTS (SELECT 1 FROM collections WHERE collections.id = items.collection_id AND (collections.user_id = auth.uid() OR collections.is_public = true))`).
  - `INSERT`, `UPDATE`, `DELETE`: Restringido estrictamente al propietario autenticado (`auth.uid() = user_id`).
- **RF-02.7** El sistema debe configurar las políticas de RLS en `gamification_state`:
  - `SELECT`: Permitido consultar métricas públicas (`total_xp`, `streak`, `unlocked_achievements`) si el perfil del usuario tiene `is_public = true` O si `auth.uid() = user_id`.
  - Los datos sensibles de gamificación (`claimed_challenge_ids`, `xp_history`, notas de retos) y el *Hoardex Wrapped* quedan restringidos exclusivamente al propietario (`auth.uid() = user_id`).
  - `INSERT`, `UPDATE`: Restringido estrictamente a `auth.uid() = user_id`.

### RF-03 — Gestión de Perfil de Usuario (`ProfileSettingsDialog`)

- **RF-03.1** Cuando un usuario autenticado abra el menú de cuenta (`AccountMenu`), el sistema debe ofrecer una opción accesible *"Editar perfil"* con icono representativo (`UserCog` o `User`).
- **RF-03.2** Al pulsar *"Editar perfil"*, el sistema debe desplegar el diálogo modal accesible `ProfileSettingsDialog` (`role="dialog"`, `aria-modal="true"`, foco atrapado y cierre con `Escape`).
- **RF-03.3** El diálogo debe contener un formulario reactivo con los siguientes campos:
  - **Identificador (`@username`):** Entrada de texto con prefijo visual `@`. Se debe validar en cliente mediante la función pura `validateUsername(username: string)`. Si el formato no cumple con `^[a-z0-9_]{3,20}$`, el sistema debe mostrar un mensaje de error explicativo y bloquear el guardado.
  - **Nombre para mostrar (`displayName`):** Entrada de texto (1-50 caracteres).
  - **Biografía (`bio`):** Área de texto multilínea (máximo 280 caracteres) con contador dinámico visible de caracteres restantes.
  - **Visibilidad del perfil (`isPublic`):** Interruptor (*Switch*) accesible que permita alternar entre *"Perfil público"* (visible para cualquiera en `/u/:username`) y *"Perfil privado"* (oculto para visitantes externos).
  - **Previsualización de avatar:** Muestra la imagen actual de perfil o el avatar por defecto basado en iniciales.
- **RF-03.4** Si el usuario intenta guardar un `username` que ya está en uso por otra cuenta, el sistema debe capturar el error de unicidad devuelto por la base de datos y mostrarlo claramente bajo el campo correspondiente.
- **RF-03.5** Al guardar con éxito, el sistema debe actualizar el store local del perfil, persistir el cambio en Supabase y emitir una notificación toast (*"Perfil actualizado correctamente"*).

### RF-04 — Configuración de Privacidad en Colecciones

- **RF-04.1** El sistema debe añadir el control de visibilidad (`isPublic`) en `CollectionForm`, `NewCollectionSheet` y `EditCollectionSheet`.
- **RF-04.2** El control debe consistir en un selector o interruptor accesible:
  - **Pública (por defecto):** La colección y sus ítems serán visibles en el perfil público del usuario (`/u/:username`).
  - **Privada:** La colección y sus ítems solo serán visibles para el usuario propietario cuando haya iniciado sesión.
- **RF-04.3** En las tarjetas de colección (`CollectionCard`) y en la vista de cabecera de la colección, el sistema debe renderizar un icono de candado accesible (`Lock` con `aria-label="Colección privada"`) cuando `isPublic === false` para que el usuario identifique de un vistazo qué colecciones son privadas.

### RF-05 — Página de Perfil Público (`/u/:username`)

- **RF-05.1** El sistema debe registrar la ruta dinámica `/u/:username` accesible de forma pública sin requerir inicio de sesión ni token de autenticación.
- **RF-05.2** Al acceder a `/u/:username`, el sistema debe consultar el perfil público del usuario en Supabase:
  - Mientras se obtienen los datos, debe mostrar un esqueleto de carga (*skeleton*) accesible.
- **RF-05.3** Si el perfil no existe (`username` no registrado), el sistema debe renderizar un estado de error amigable (*EmptyState* con icono y botón de regreso a la página principal): *"Coleccionista no encontrado"*.
- **RF-05.4** Si el perfil existe pero tiene `is_public === false` (y el visitante no es el propio usuario autenticado dueño del perfil), el sistema debe mostrar: *"Este perfil es privado. El coleccionista ha decidido mantener su biblioteca oculta"*.
- **RF-05.5** Cuando el perfil es público, la página debe renderizar:
  - **Cabecera de identidad:** Avatar del usuario, `displayName`, `@username`, biografía, año de registro y botón accesible para copiar el enlace al perfil (`navigator.clipboard.writeText`) con confirmación toast.
  - **Insignias de Gamificación Pública:** Nivel alcanzado (`level`), título de coleccionista (`levelTitle`), XP acumulada y racha récord (`longestStreak`).
  - **Estantería de Colecciones Públicas:** Cuadrícula de colecciones que tengan `is_public === true`. Al hacer clic en una colección, se visualizan sus ítems públicos, estados de completado, valoraciones con estrellas y notas del usuario.
  - **Vitrina de Logros Públicos:** Cuadrícula con los logros desbloqueados por el usuario, mostrando icono, título y fecha de desbloqueo.
- **RF-05.6** El sistema debe garantizar que **en ningún caso** se rendericen en `/u/:username`:
  - Colecciones con `is_public === false`.
  - Ítems pertenecientes a colecciones privadas.
  - El diálogo o tarjetas de *Hoardex Wrapped*.
  - Retos personales no reclamados o historial de eventos privados.

---

## Requisitos no funcionales

- **RNF-01 (Arquitectura Local-First & Resiliencia):** En caso de corte de conexión, modo invitado o falta de configuración de Supabase (`isSupabaseConfigured === false`), toda la operativa del usuario continúa funcionando en local. La ruta `/u/:username` muestra un mensaje explicativo si no hay conectividad para consultar la base de datos remota.
- **RNF-02 (Cero `any` y Tipado Estricto):** Todas las entidades (`Profile`, `ProfileRow`, `PublicProfileData`, parámetros de actualización) deben contar con contratos explícitos en `src/interfaces/` sin usar `any` ni `as any`.
- **RNF-03 (Funciones Puras y Determinismo en `core/`):** La validación de `@username` (`validateUsername`), la sanitización de nombres y los transformadores de filas de perfil (`mappers`) deben ser funciones puras alojadas en `src/features/sync/core/` o `src/features/users/core/` con cobertura del 100% en Vitest.
- **RNF-04 (Accesibilidad WCAG 2.1 AA):** Los botones OAuth, modales de edición de perfil y la página `/u/:username` deben disponer de contraste adecuado (modo claro y oscuro), atributos ARIA (`aria-label`, `aria-describedby`), etiquetas semánticas y soporte de navegación completa por teclado.
- **RNF-05 (Puerta de Calidad):** `npx tsc --noEmit`, `npm run lint`, `npm run test` y `npm run build` deben mantenerse en verde sin advertencias ni errores durante y tras la implementación.

---

## Casos límite

- **CL-01 (Usuario con caracteres inválidos en el `@username`):** Si el usuario introduce espacios, mayúsculas, tildes o caracteres especiales (ej. `@Javi Gómez!`), el validador puro `validateUsername` rechaza la entrada indicando: *"El nombre de usuario solo puede contener letras minúsculas (a-z), números (0-9) y guiones bajos (_), con una longitud de 3 a 20 caracteres"*.
- **CL-02 (Colisión de `username` en el registro OAuth):** Si un usuario se registra con un email cuyo prefijo ya existe en la tabla `profiles` (ej. `alex@gmail.com` y `alex@hotmail.com`), el trigger PostgreSQL `handle_new_user` añade de forma determinista un sufijo numérico aleatorio (ej. `alex_4829`) garantizando que la inserción nunca falle por violación de unicidad.
- **CL-03 (Usuario autenticado visitando su propio perfil en `/u/:username`):** Si el usuario que ha iniciado sesión visita su propia URL `/u/:su_usuario`, el sistema le permite ver su perfil incluso si está marcado como `is_public = false`, mostrando un banner discreto informativo: *"Vista previa de tu perfil (Privado para el resto del público)"* y un acceso directo para *"Editar perfil"*.
- **CL-04 (Colección privada con perfil público):** Si un usuario tiene su perfil configurado como público (`is_public = true`) pero una colección marcada como privada (`is_public = false`), la página `/u/:username` muestra únicamente las colecciones públicas, sin revelar en ningún contador ni lista la existencia de la colección privada.
- **CL-05 (Cancelación o cierre de ventana emergente en OAuth):** Si el usuario cierra el popup de Google/Apple/GitHub o cancela el consentimiento en el proveedor, la aplicación captura el evento de error sin congelar la interfaz ni desincronizar la sesión local.
- **CL-06 (Usuario sin avatar en proveedor OAuth):** Si el proveedor OAuth no envía una URL de avatar (o en registros clásicos por correo), el sistema renderiza un avatar fallback con las iniciales del usuario sobre un fondo con gradiente temático de Hoardex.

---

## Fuera de alcance

- Subida directa de archivos de imagen binarios (PNG/JPG) a Supabase Storage para el avatar en esta fase (se admiten URLs externas provistas por OAuth o introducidas en el perfil; la subida directa a bucket S3/Storage se abordará si se requiere en etapas posteriores).
- Sistema de seguimiento mutuo (*Followers / Following*), sistema de amigos o muro de actividad global (objeto de la Spec 009: Interacción social y comentarios estilo Letterboxd).
- Sistema de mensajería privada entre usuarios.
- Restablecimiento de contraseña por correo electrónico con enlace mágico fuera del flujo estándar de Supabase.

---

## Criterios de finalización

- [x] Contratos TypeScript definidos en `src/interfaces/`: `Profile`, `ProfileRow`, `UpdateProfileParams`, `PublicProfileData` y campo `isPublic` en `Collection`.
- [x] Función pura `validateUsername` implementada en `src/features/users/core/profiles.ts` con tests unitarios al 100% en `profiles.test.ts`.
- [x] Mappers puros entre tipos de base de datos (`ProfileRow`) y del dominio (`Profile`) testeados en Vitest.
- [x] Esquema SQL en `supabase/schema.sql` actualizado con tabla `profiles`, trigger `handle_new_user`, columna `is_public` en `collections` y políticas RLS completas.
- [x] Botones OAuth (Google, Apple, GitHub) integrados en `AuthDialog.tsx` con iconos SVG, estados de carga y gestión de errores.
- [x] Detección del callback OAuth en `useAuth` y sincronización bidireccional automática en `useSyncEngine`.
- [x] Componente modal accesible `ProfileSettingsDialog.tsx` implementado para editar `@username`, nombre, biografía, avatar URL y visibilidad global.
- [x] Selector de visibilidad (`isPublic`) añadido en `CollectionForm.tsx` con icono de candado en colecciones privadas.
- [x] Página de perfil público `/u/:username` implementada en `src/pages/PublicProfilePage.tsx` con soporte de estados de carga, no encontrado (404), perfil privado y estanterías públicas.
- [x] Acceso directo a *"Editar perfil"* y *"Ver mi perfil público"* integrado en `AccountMenu.tsx`.
- [x] Cobertura completa de tests en Vitest para validadores, componentes y rutas.
- [x] `npx tsc --noEmit` completado con 0 errores (cero `any`).
- [x] `npm run lint` completado con 0 errores y 0 warnings.
- [x] `npm run test` con el 100% de tests en verde.
- [x] `npm run build` ejecutado con éxito.

---

## Decisiones de diseño acordadas

1. **Avatar (Duda 1):** Usa automáticamente el `avatarUrl` provisto por OAuth (Google/GitHub) al crear el perfil; renderiza un fallback accesible con iniciales si es `null` o falla la carga, y permite editar opcionalmente una URL externa (`http`/`https`) en `ProfileSettingsDialog`.
2. **Cambio de `@username` (Duda 2):** Permite editar el `@username` libremente (validado con la función pura `validateUsername`), mostrando una nota informativa discreta advirtiendo que los enlaces `/u/:antiguo_username` anteriores dejarán de funcionar.
3. **Acceso desde `AccountMenu` (Duda 3):** Añade el enlace *"Ver mi perfil público"* en `AccountMenu.tsx` navegando mediante React Router a `/u/${profile.username}`.
4. **Privacidad en `Collection` (Duda 4):** Añade `isPublic?: boolean` (por defecto `true`) exclusivamente en `Collection`; los ítems no duplican este campo ya que su visibilidad queda gobernada por la colección a la que pertenecen.
