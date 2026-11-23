# Spec 006 — Supabase Auth, Cloud Sync & Local Backup
Estado: implementada

---

## Contexto y objetivo

Hasta la Fase 3b (`005-achievements-challenges`), Hoardex opera como una aplicación web puramente orientada al cliente: los catálogos, estados de colecciones, valoraciones, notas, curvas de nivel, rachas, logros y retos se persisten exclusivamente en el almacenamiento local del navegador (`localStorage` bajo las claves `hoardex-storage` y `hoardex-gamification`).

Esta especificación corresponde a la **Fase 4: Autenticación, Sincronización Cloud con Supabase y Backup Local**. Su objetivo principal es dotar a Hoardex de persistencia multi-dispositivo y salvaguarda en la nube, garantizando una arquitectura **Local-First**:
1. **Modo Invitado / Desconectado por diseño:** La aplicación debe seguir funcionando al 100% de sus capacidades sin necesidad de crear cuenta, sin conexión a Internet y en ausencia de credenciales de Supabase en el entorno.
2. **Autenticación opcional y segura:** Permitir a los usuarios registrarse e iniciar sesión (mediante correo y contraseña o enlace mágico) para vincular sus datos a una cuenta protegida por políticas de *Row Level Security* (RLS).
3. **Motor de sincronización y resolución de conflictos:** Capa pura de conciliación bidireccional (*last-write-wins* por marcas de tiempo `updatedAt` para ítems y colecciones; unión matemática e idempotente para el historial de XP, rachas, logros desbloqueados y retos reclamados).
4. **Respaldo y portabilidad (Backup JSON):** Capacidad de exportar e importar en cualquier momento la totalidad de los datos locales en un archivo `.json` estandarizado, versionado y validado defensivamente.

---

## Usuarios

- **Coleccionista sin cuenta (Invitado / Local-First):** Desea catalogar sus aficiones y disfrutar de la gamificación sin ceder datos personales ni depender de servidores externos.
- **Coleccionista multidispositivo:** Desea acceder a su colección desde el móvil, portátil o tablet manteniendo su inventario, niveles y logros siempre actualizados y sincronizados.
- **Usuario prudente (Backup personal):** Desea descargar periódicamente copias de seguridad de su catálogo en formato abierto (`.json`) para conservarlas en frío o restaurarlas en otro navegador.
- **Usuario que da el salto (Migración de invitado a registrado):** Desea crear una cuenta tras semanas usando la app en local y conservar intactos todos sus ítems, colecciones, progreso y rachas acumuladas.

---

## Historias de usuario

- **HU-01.** Como usuario invitado, quiero usar la aplicación con normalidad sin que se me obligue a iniciar sesión ni se bloquee ninguna funcionalidad de catalogación o gamificación.
- **HU-02.** Como usuario, quiero registrarme e iniciar sesión con mi correo electrónico para respaldar mis colecciones y mi progreso en la nube.
- **HU-03.** Como usuario con datos previos en local, quiero que al registrarme o iniciar sesión por primera vez mis colecciones y logros locales se fusionen automáticamente con mi cuenta cloud sin pérdida de datos.
- **HU-04.** Como usuario autenticado, quiero ver en la cabecera un indicador claro del estado de sincronización (Local, Sincronizando, Sincronizado, Error/Offline) para tener certeza sobre la persistencia de mis datos.
- **HU-05.** Como usuario, quiero exportar todo mi catálogo y progreso en un archivo JSON descargable con un solo clic.
- **HU-06.** Como usuario, quiero importar un archivo JSON de respaldo previo, validando que su contenido sea legítimo e informándome de cuántos elementos han sido recuperados.

---

## Definiciones

| Término | Significado en Hoardex |
|---|---|
| **Local-First** | Paradigma de arquitectura donde el almacenamiento local del navegador (`localStorage` / Zustand) es la fuente de verdad primaria e inmediata de la interfaz; la nube es una capa de replicación y backup asíncrona. |
| **Modo Invitado (`guest`)** | Estado en el que la app opera sin sesión de usuario autenticado. Todas las operaciones de lectura, escritura y gamificación se completan localmente. |
| **Estado de Sincronización (`SyncStatus`)** | Indicador de cuatro estados: `'local'` (modo invitado o sin credenciales de backend), `'syncing'` (subiendo/descargando cambios), `'synced'` (en sincronía con la nube) y `'error'` (fallo de red o conflicto irresoluble). |
| **Row Level Security (RLS)** | Políticas de seguridad en PostgreSQL/Supabase que impiden que cualquier usuario lea, inserte, modifique o borre registros cuyo `user_id` no coincida con el UID de su token JWT autenticado (`auth.uid() = user_id`). |
| **Last-Write-Wins (LWW)** | Estrategia determinista de resolución de conflictos en registros con el mismo identificador: prevalece la versión cuya marca temporal ISO `updatedAt` sea más reciente. |
| **Fusión Idempotente de Gamificación** | Algoritmo que combina estados de progreso: toma el máximo de XP (`Math.max(local.totalXp, remote.totalXp)`), la unión única de logros desbloqueados y retos reclamados, y la racha con fecha de actividad más reciente o mayor récord. |
| **Esquema de Backup JSON (`HoardexBackup`)** | Archivo estructurado con versión (`version: 1`), fecha de exportación (`exportedAt`), array de colecciones, array de ítems y estado completo de gamificación. |

---

## Requisitos funcionales (Sintaxis EARS)

### RF-01 — Modo Local-First y Detección de Configuración (`supabase.ts`)

- **RF-01.1** El sistema debe instanciar el cliente de Supabase de forma segura y condicionada, leyendo las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- **RF-01.2** Si alguna de las variables de entorno de Supabase está ausente, vacía o es inválida, el cliente debe entrar en modo *deshabilitado* (`isSupabaseConfigured === false`), permitiendo la ejecución normal de la app en modo local sin lanzar excepciones no controladas ni advertencias en consola.
- **RF-01.3** Mientras la aplicación se ejecute en modo sin Supabase o el usuario no haya iniciado sesión, el sistema debe mantener el indicador de sincronización en estado `'local'`, ocultando u omitiendo los botones de sincronización cloud y manteniendo activos los de backup en archivo JSON.

### RF-02 — Esquema Relacional de Base de Datos y Seguridad RLS (`schema.sql`)

- **RF-02.1** El sistema debe proveer el archivo `supabase/schema.sql` definiendo la estructura completa de tablas relacionales en PostgreSQL:
  - **Tabla `collections`:** `id` (UUID o text PK), `user_id` (UUID references `auth.users(id)` ON DELETE CASCADE), `name` (text), `description` (text nullable), `icon` (text), `accent_color` (text), `provider` (text), `statuses` (JSONB con array de estados), `created_at` (timestamptz) y `updated_at` (timestamptz).
  - **Tabla `items`:** `id` (UUID o text PK), `user_id` (UUID references `auth.users(id)` ON DELETE CASCADE), `collection_id` (references `collections(id)` ON DELETE CASCADE), `title` (text), `subtitle` (text nullable), `release_year` (int nullable), `cover_url` (text nullable), `status_id` (text), `rating` (int nullable), `notes` (text nullable), `meta` (JSONB default `{}`), `xp_awarded` (boolean default false), `review_xp_awarded` (boolean default false), `created_at` (timestamptz) y `updated_at` (timestamptz).
  - **Tabla `gamification_state`:** `user_id` (UUID PK references `auth.users(id)` ON DELETE CASCADE), `total_xp` (int default 0), `streak` (JSONB con `currentStreak`, `longestStreak`, `lastActivityDate`, `isActiveToday`), `unlocked_achievements` (JSONB default `[]`), `claimed_challenge_ids` (JSONB default `[]`), `rewarded_collection_ids` (JSONB default `[]`), `xp_history` (JSONB default `[]`, limitado a los 50 más recientes) y `updated_at` (timestamptz).
- **RF-02.2** El sistema debe habilitar Row Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) en todas las tablas del esquema (`collections`, `items`, `gamification_state`).
- **RF-02.3** El sistema debe implementar políticas estrictas de RLS para `SELECT`, `INSERT`, `UPDATE` y `DELETE` asegurando que los usuarios solo puedan acceder y mutar sus propias filas mediante `auth.uid() = user_id`.
- **RF-02.4** El sistema debe incluir índices en PostgreSQL para optimizar consultas de sincronización: `idx_collections_user_id`, `idx_items_user_id`, `idx_items_collection_id` e `idx_items_updated_at`.

### RF-03 — Autenticación y UI (`AuthDialog` y `AccountMenu`)

- **RF-03.1** Donde Supabase esté configurado, el sistema debe mostrar en el `Header` un botón de inicio de sesión (*"Iniciar sesión"*) para usuarios invitados o un menú de usuario (*"Mi cuenta"*) para usuarios autenticados.
- **RF-03.2** Cuando el usuario pulse *"Iniciar sesión"*, el sistema debe desplegar el diálogo modal accesible `AuthDialog.tsx` (`role="dialog"` con foco atrapado y soporte de tecla Escape):
  - Formulario conmutativo entre *"Iniciar sesión"* y *"Crear cuenta"*.
  - Campos de entrada: Correo electrónico (`type="email"`) y Contraseña (`type="password"` con mínimo 6 caracteres).
  - Validación de campos en tiempo real con mensajes de error accesibles.
  - Soporte de estado de carga en el botón de envío y gestión clara de errores devueltos por Supabase (credenciales incorrectas, usuario ya registrado, tasa límite).
- **RF-03.3** Cuando un usuario autenticado pulse en su menú de cuenta, el sistema debe desplegar un menú desplegable accesible mostrando:
  - Correo electrónico del usuario activo.
  - Indicador del estado de sincronización (`Sincronizado`, `Sincronizando`, `Error`).
  - Botón *"Sincronizar ahora"* para forzar un ciclo de replicación bajo demanda.
  - Botón *"Exportar backup JSON"* y botón *"Restaurar backup JSON"*.
  - Botón de cierre de sesión (*"Cerrar sesión"*).
- **RF-03.4** Cuando el usuario cierre sesión, el sistema debe destruir la sesión en Supabase y mantener los datos locales sin eliminarlos abruptamente, notificando mediante toast: *"Sesión cerrada. Ahora estás en modo local."*

### RF-04 — Motor de Sincronización Cloud y Resolución de Conflictos (`src/features/sync/`)

- **RF-04.1** El sistema debe contar con un módulo puro `reconciliation.ts` en `src/features/sync/core/` que implemente la resolución determinista de conflictos:
  - **Colecciones e Ítems:** Aplica la estrategia *Last-Write-Wins* evaluando la marca ISO `updatedAt`. Si un elemento existe solo en local o solo en remoto, se preserva en la colección combinada.
  - **Gamificación:** Se genera un estado consolidado tomando:
    - `totalXp`: `Math.max(local.totalXp, remote.totalXp)`.
    - `unlockedAchievements`: Unión única de logros por `achievementId`, conservando la fecha `unlockedAt` más antigua.
    - `claimedChallengeIds`: Unión única de claves de retos cobrados.
    - `rewardedCollectionIds`: Unión única de colecciones premiadas.
    - `streak`: Se evalúa la racha más actualizada o con mayor `longestStreak`.
    - `xpHistory`: Unión de eventos deduplicados por `id` y ordenados cronológicamente descendente (limitado a los 50 más recientes).
- **RF-04.2** Cuando el usuario inicie sesión por primera vez con datos locales existentes, el sistema debe ejecutar la migración inicial fusionando el catálogo local con la nube y guardando el resultado consolidado en ambas partes.
- **RF-04.3** Mientras el usuario esté autenticado, el sistema debe sincronizar automáticamente los cambios locales hacia Supabase (con un *debounce* de seguridad de 1500 ms tras mutaciones en los stores) y al reenfocar la ventana del navegador.
- **RF-04.4** Si la sincronización falla debido a desconexión de red o fallo transitorio del servidor, el sistema debe marcar el estado como `'error'`, mantener los datos íntegros en local y reintentar de forma no bloqueante en la siguiente interacción del usuario.

### RF-05 — Backup Local: Exportación e Importación Segura en JSON

- **RF-05.1** El sistema debe permitir a cualquier usuario (invitado o autenticado) exportar la totalidad de su estado pulsando *"Exportar copia de seguridad"*.
- **RF-05.2** La exportación debe generar un archivo con nombre determinista `hoardex-backup-YYYY-MM-DD.json` conteniendo:
  ```json
  {
    "version": 1,
    "exportedAt": "2026-11-21T16:00:00.000Z",
    "collections": [...],
    "items": [...],
    "gamification": {
      "totalXp": 120,
      "streak": {...},
      "unlockedAchievements": [...],
      "claimedChallengeIds": [...],
      "rewardedCollectionIds": [...],
      "xpHistory": [...]
    }
  }
  ```
- **RF-05.3** El sistema debe permitir importar un archivo `.json` de respaldo mediante un diálogo accesible de confirmación (`ImportBackupDialog`):
  - Validador puro defensivo que comprueba que el archivo sea JSON válido, contenga `version: 1`, y que las colecciones e ítems cumplan la estructura obligatoria de datos.
  - Si el archivo contiene datos corruptos, le faltan campos esenciales o no es un JSON válido, el sistema debe rechazar la importación sin alterar los datos actuales y emitir un toast de error explicativo.
  - Si el archivo es válido, el sistema debe reemplazar o fusionar de forma segura el estado en los stores locales (`collections`, `items`, `gamification`), guardar en `localStorage`, disparar la sincronización cloud (si el usuario está autenticado) y emitir un toast de éxito: *"Copia de seguridad restaurada con éxito (X colecciones, Y ítems)"*.

---

## Requisitos no funcionales

- **RNF-01 Seguridad estricta (RLS & Privacidad):** Ningún usuario no autenticado o con UID distinto debe poder leer ni escribir datos ajenos en la base de datos de Supabase. Las claves de API en el cliente web son de tipo pública anónima (`anon key`).
- **RNF-02 Arquitectura Local-First:** La aplicación debe iniciar instantáneamente leyendo de `localStorage` sin esperar a que el servidor de Supabase responda. La sincronización es no bloqueante y tolerante a la pérdida de conexión.
- **RNF-03 Pureza algorítmica y determinismo:** Toda la lógica de resolución de conflictos (`reconciliation.ts`), validación de esquemas JSON y fusiones de datos debe residir en funciones puras sin dependencias directas del DOM ni del cliente de Supabase.
- **RNF-04 Accesibilidad (WCAG 2.1 AA):** Los diálogos modales (`AuthDialog`, `ImportBackupDialog`) y los menús desplegables deben ser navegables por teclado, con gestión de foco (`focus trap`) y soporte para lectores de pantalla.
- **RNF-05 Tipado estricto:** Cero `any`, cero `as any`. Todos los tipos de tablas de Supabase, respuestas de auth y estructuras de backup deben contar con interfaces estrictas en `src/interfaces/sync.interface.ts`.

---

## Casos límite

| CL | Escenario | Comportamiento esperado |
|---|---|---|
| CL-01 | Variables de entorno de Supabase ausentes (`.env.local` vacío) | La app se ejecuta al 100% en modo local. La UI oculta los botones de login y muestra el estado como local sin arrojar errores. |
| CL-02 | Usuario inicia sesión en dos pestañas o dispositivos simultáneamente | La sincronización por marcas temporales LWW fusiona las colecciones e ítems actualizados sin duplicar registros ni perder datos. |
| CL-03 | El usuario intenta importar un JSON malformado o de otra aplicación | El validador rechaza el archivo antes de tocar los stores locales y emite un mensaje de error claro (*"El archivo seleccionado no es una copia de seguridad válida de Hoardex"*). |
| CL-04 | Pérdida de conexión a Internet durante la sincronización | La app continúa operativa en local. El indicador muestra estado de error u offline; al recuperar la red o enfocar la app, se reanuda la sincronización. |
| CL-05 | Cierre de sesión en un dispositivo compartido | La sesión se invalida en el backend. Se ofrece al usuario la opción de conservar los datos locales o limpiar el almacenamiento de este navegador. |
| CL-06 | Usuario con 0 ítems inicia sesión en una cuenta con 100 ítems en la nube | Se descargan e hidratan los 100 ítems en los stores locales de forma instantánea. |

---

## Fuera de alcance

- Roles de administración o cuentas multi-inquilino (*organizations* / *teams*).
- Autenticación OAuth de terceros con proveedores sociales (Google, GitHub, Discord) — reservado para futuras iteraciones.
- Sincronización en tiempo real basada en WebSockets de alto consumo (Postgres CDC) — la sincronización por eventos y re-enfoque cubre el 100% de los casos de uso con mínimo consumo de cuota.
- Almacenamiento cloud de archivos binarios de imágenes (las portadas se referencian por URL externa).

---

## Criterios de finalización

La spec se considerará implementada cuando:

- [x] Contratos de TypeScript en `src/interfaces/sync.interface.ts` (`SyncStatus`, `HoardexBackup`, `CloudSyncState`, tipos de esquema Supabase) sin ningún `any`.
- [x] Cliente seguro `src/lib/supabase.ts` con detección defensiva de variables de entorno.
- [x] Archivo `supabase/schema.sql` completo con tablas `collections`, `items`, `gamification_state`, índices y políticas RLS verificadas.
- [x] Módulo puro `src/features/sync/core/reconciliation.ts` con resolución de conflictos LWW y fusión de gamificación, con 100% de tests unitarios en `reconciliation.test.ts`.
- [x] Módulo puro `src/features/sync/core/backup.ts` para validación y generación de backups JSON, con 100% de tests unitarios en `backup.test.ts`.
- [x] Store `sync.store.ts` para gestionar el estado de sesión y sincronización (`syncStatus`, `lastSyncedAt`).
- [x] Componente `AuthDialog.tsx` accesible (login/registro con correo y contraseña).
- [x] Componente `AccountMenu.tsx` integrado en `Header.tsx` con indicador de estado y acciones de backup y cierre de sesión.
- [x] Hook `useSyncEngine.ts` que orqueste la sincronización no bloqueante ante mutaciones y re-enfoque de ventana.
- [x] Puerta de calidad estática impecable: `npx tsc --noEmit`, `npm run lint`, `npm run test` y `npm run build` en verde.
- [x] Verificación visual interactiva en Chrome DevTools MCP.
- [x] `MEMORY.md` actualizado (< 50 líneas).

---

## Dudas resueltas

- **Duda 1 (Estrategia de primer inicio de sesión con datos locales — Opción A):** Confirmada la fusión inteligente bidireccional automática. Al autenticarse, `useSyncEngine` concilia de forma transparente datos locales y remotos mediante *Last-Write-Wins* (`updatedAt`) para colecciones e ítems y unión matemática e idempotente para el estado de gamificación, persistiendo el estado unificado tanto en los stores locales como en la base de datos de Supabase.
- **Duda 2 (Comportamiento del almacenamiento local al cerrar sesión — Opción A):** Confirmada la preservación de datos locales. Al cerrar sesión se revoca la sesión en Supabase, el indicador de sincronización regresa a `'local'` y los datos permanecen intactos en `localStorage`, notificando al usuario mediante toast (*"Sesión cerrada. Ahora estás en modo local."*).
- **Duda 3 (Validación de esquema del archivo JSON de Backup — Opción A):** Confirmada la validación nativa pura en TypeScript. Se implementa en `src/features/sync/core/backup.ts` una función validadora exhaustiva y defensiva que verifica recursivamente campos requeridos, tipos y versionado sin incorporar librerías externas.
- **Directriz técnica adicional (Mappers puros `snake_case` <-> `camelCase`):** Se crea el módulo puro `src/features/sync/core/mappers.ts` para transformar bidireccionalmente entre las filas de PostgreSQL en Supabase (`CollectionRow`, `ItemRow`, `GamificationStateRow`) y los contratos de dominio de Hoardex (`Collection`, `Item`, `GamificationState`), con tipado estricto y cero `any`.
