# Tareas de Implementación — Spec 006
**Fase 4: Autenticación, Sincronización Cloud con Supabase y Backup Local**

---

- [x] **T1. Infraestructura, contratos ampliados, cliente seguro y esquema SQL.** RF-01.1, RF-01.2, RF-01.3, RF-02.1, RF-02.2, RF-02.3, RF-02.4, RNF-01, RNF-02, RNF-05
  - Instalar `@supabase/supabase-js` como dependencia de producción en `package.json`.
  - En `src/interfaces/collection.interface.ts`:
    - Añadir la propiedad opcional `updatedAt?: string` a la interfaz `Collection`.
  - Crear `src/interfaces/sync.interface.ts`:
    - Definir `SyncStatus` (`'local' | 'syncing' | 'synced' | 'error'`).
    - Definir tipos de filas de PostgreSQL en `snake_case`: `CollectionRow`, `ItemRow`, `GamificationStateRow`.
    - Definir `PersistedGamificationData` y el contrato oficial versionado `HoardexBackup` (`version: 1`).
  - Crear `src/lib/supabase.ts`:
    - Lectura defensiva de `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
    - Exportar `isSupabaseConfigured: boolean` y la instancia `supabase` tipada o un cliente fallback inocuo sin arrojar excepciones si las variables no están definidas.
  - Crear `supabase/schema.sql`:
    - DDL de tablas `collections`, `items` y `gamification_state` con referencias a `auth.users(id) ON DELETE CASCADE`.
    - Habilitación de RLS (`ENABLE ROW LEVEL SECURITY`) y políticas de aislamiento para `SELECT`, `INSERT`, `UPDATE` y `DELETE` (`auth.uid() = user_id`).
    - Índices de rendimiento (`idx_collections_user_id`, `idx_items_user_id`, `idx_items_collection_id`, `idx_items_updated_at`).
  - Hecho cuando: `npx tsc --noEmit` y `npm run build` compilen sin errores con cero `any`.

- [x] **T2. Capa Core: Mappers, conciliación LWW y generador/validador de backups.** RF-04.1, RF-05.1, RF-05.2, RF-05.3, RNF-03
  - Crear `src/features/sync/core/mappers.ts`:
    - Funciones puras de transformación `mapCollectionRowToCollection`, `mapCollectionToRow`, `mapItemRowToItem`, `mapItemToRow`, `mapGamificationRowToState` y `mapGamificationStateToRow`.
    - Usar `updatedAt ?? createdAt` como fallback defensivo en `Collection`.
    - Crear `mappers.test.ts` con cobertura del 100% en transformaciones bidireccionales.
  - Crear `src/features/sync/core/reconciliation.ts`:
    - Función pura `reconcileEntitiesLWW` resolviendo colisiones por `updatedAt` (*Last-Write-Wins*), conservando elementos presentes solo en local o solo en remoto.
    - Función pura `reconcileGamification` uniendo XP (máximo), rachas (más activa), logros y retos (unión idempotente) e historial (orden cronológico, tope de 50).
    - Crear `reconciliation.test.ts` con pruebas de colisiones LWW y fusiones de progreso.
  - Crear `src/features/sync/core/backup.ts`:
    - Función pura `generateBackup(collections, items, gamification, exportedAt): HoardexBackup`.
    - Función pura `validateBackup(data: unknown): { isValid: true; backup: HoardexBackup } | { isValid: false; error: string }` con validación defensiva TypeScript pura (sin librerías externas).
    - Crear `backup.test.ts` probando archivos legítimos, rechazo de versiones inválidas y payloads corruptos.
  - Hecho cuando: `npm run test src/features/sync/core/` pase al 100%.

- [x] **T3. Store de sincronización e hidratación atómica en stores de dominio.** RF-01.3, RF-04.2, RF-05.3, RNF-02
  - Crear `src/features/sync/store/sync.store.ts`:
    - Estado: `user: User | null`, `syncStatus: SyncStatus`, `lastSyncedAt: string | null`, `pendingDeletionIds: { collectionIds: string[]; itemIds: string[] }`.
    - Acciones: `setUser(user)`, `setSyncStatus(status)`, `setLastSyncedAt(timestamp)`, `trackDeletedCollection(id)`, `trackDeletedItem(id)`, `clearPendingDeletions()`, `resetSyncState()`.
    - Crear `sync.store.test.ts` verificando transiciones de estado y tracking de borrados.
  - En los stores existentes:
    - En `collections.store.ts`: añadir acción atómica `hydrateCollections(collections: Collection[])`.
    - En `items.store.ts`: añadir acción atómica `hydrateItems(items: Item[])`.
    - En `gamification.store.ts`: añadir acción atómica `hydrateGamification(data: PersistedGamificationData)`.
    - Actualizar los tests de `collections.store.test.ts`, `items.store.test.ts` y `gamification.store.test.ts` para verificar la hidratación limpia sin mutaciones corruptas ni loops.
  - Hecho cuando: `npm run test` pase al 100% en todas las suites de stores.

- [x] **T4. Capa de integración y ciclo de vida: Hooks `useAuth` y `useSyncEngine`.** RF-03.1, RF-03.4, RF-04.2, RF-04.3, RF-04.4, RNF-02
  - Crear `src/features/sync/hooks/useAuth.ts`:
    - Métodos para login (`signInWithPassword`), registro (`signUp`) y cierre de sesión (`signOut`).
    - Suscripción limpia a `supabase.auth.onAuthStateChange` sincronizando la sesión con `sync.store.ts`.
    - Al cerrar sesión: revocar token, fijar `syncStatus = 'local'`, preservar datos locales y notificar con toast.
  - Crear `src/features/sync/hooks/useSyncEngine.ts`:
    - Conciliación bidireccional automática al autenticarse (fusión LWW, persistencia en local y subida a Supabase).
    - Procesamiento de `pendingDeletionIds` eliminando las filas remotas correspondientes en Supabase (`DELETE FROM ... WHERE id IN (...)`).
    - Suscripción con *debounce* de 1500 ms ante cambios en los stores locales para subir novedades.
    - Sincronización no bloqueante ante el evento `focus` de la ventana (`window.addEventListener('focus', ...)`).
    - Gestión de errores de red marcando `syncStatus = 'error'` de forma resiliente.
  - Hecho cuando: `npx tsc --noEmit` y `npm run lint` pasen limpios.

- [x] **T5. Componentes UI accesibles e integración en `Header.tsx`.** RF-03.1, RF-03.2, RF-03.3, RF-05.1, RF-05.3, RNF-04
  - Crear `src/features/sync/components/AuthDialog.tsx`:
    - Diálogo accesible (`role="dialog"`, foco atrapado, escape) con tabs para Iniciar sesión y Crear cuenta.
    - Campos de email y contraseña (mínimo 6 caracteres), estados de carga y feedback de Sonner.
    - Crear `AuthDialog.test.tsx`.
  - Crear `src/features/sync/components/ImportBackupDialog.tsx`:
    - Selector de archivo `.json` o drag-and-drop, validación previa con `validateBackup`, visualización de resumen a restaurar y botón de confirmación.
    - Crear `ImportBackupDialog.test.tsx`.
  - Crear `src/features/sync/components/AccountMenu.tsx`:
    - Menú desplegable con avatar/email, badge de estado de sincronización (`Local`, `Sincronizando`, `Sincronizado`, `Error`), botón *"Sincronizar ahora"*, exportación e importación de backup JSON y botón *"Cerrar sesión"*.
    - Crear `AccountMenu.test.tsx`.
  - Actualizar `src/components/custom/Header.tsx`:
    - Mostrar botón *"Iniciar sesión"* en modo invitado o `<AccountMenu />` para usuario autenticado.
    - En modo sin Supabase (`isSupabaseConfigured === false`), ofrecer acceso directo al diálogo de backup local.
    - Actualizar `Header.test.tsx` (o tests existentes de Header).
  - Hecho cuando: `npm run test` pase al 100% incluyendo todas las suites de componentes de sync.

- [ ] **T6. Puerta de calidad, verificación visual en Chrome DevTools MCP y memoria.** RNF-01, RNF-02, RNF-03, RNF-04, RNF-05
  - Ejecutar verificación estática completa: `npx tsc --noEmit`, `npm run lint`, `npm run test` (suite completa) y `npm run build`. Confirmar 0 errores, 0 warnings y 0 `any`.
  - Levantar `npm run dev` y validar con Chrome DevTools MCP en `http://localhost:5173/`:
    - Modo invitado / local: verificar que la app opera al 100% sin credenciales y permite exportar/importar backups JSON.
    - Exportar un backup `.json`, modificar datos y restaurarlo mediante `ImportBackupDialog`, verificando la actualización de colecciones, ítems y XP.
    - Apertura accesible de `AuthDialog` (navegación por teclado, validación de inputs, conmutación login/registro).
    - Menú de cuenta `AccountMenu` (indicador de sincronización, opciones de backup y cierre de sesión).
  - Marcar todos los criterios en `specs/006-supabase-auth-sync/spec.md` (estado `implementada`) y `tasks.md`.
  - Actualizar `MEMORY.md` (< 50 líneas) cerrando la Fase 4 y preparando la Fase 5 (`007-wrapped-stats-deploy`).
