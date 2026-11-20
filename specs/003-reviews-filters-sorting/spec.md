# Spec 003 — Reviews, Filters, Sorting & Collection Editing
Estado: aprobada

---

## Contexto y objetivo

En las fases anteriores (`001-core-catalog-mock` y `002-external-providers`), Hoardex estableció su infraestructura base, contratos, stores de Zustand, componentes transversales y adaptadores de búsqueda en vivo (RAWG, Open Library, BoardGameGeek y entrada manual).

Esta especificación corresponde a la **Fase 2: Gestión avanzada del catálogo**. Su objetivo es transformar el catálogo en una experiencia completa de curación personal mediante cuatro pilares:
1. **Ficha y valoración de ítems:** Ampliar el contrato del ítem para permitir calificarlo (escala de 1 a 5 estrellas) y registrar notas o reseñas personales detalladas, visualizables y editables en un panel lateral dedicado.
2. **Búsqueda y filtrado dinámico:** Permitir al usuario encontrar rápidamente ítems dentro de una colección por coincidencia de texto (título, autor/subtítulo) o por estado específico del ciclo de vida.
3. **Ordenación multinivel:** Permitir ordenar la lista de ítems según múltiples criterios (fecha de incorporación, título alfabético, año de lanzamiento o valoración).
4. **Edición integral de la colección:** Permitir actualizar el nombre, descripción, icono representativo, color de acento y estados de una colección existente, garantizando que ningún ítem quede en un estado huérfano si se elimina o modifica un estado previo.

---

## Usuarios

- **Coleccionista activo:** Usuario que desea calificar sus ítems completados, escribir reflexiones o reseñas personales y organizar colecciones voluminosas mediante filtros y ordenación rápida.
- **Curador de colecciones:** Usuario que refina o reestructura periódicamente sus colecciones cambiando nombres, colores o estados del ciclo de vida a medida que evolucionan sus aficiones.

---

## Historias de usuario

- **HU-01.** Como coleccionista, cuando abro un ítem de mi colección, quiero ver su ficha detallada con su carátula ampliada, metadatos, estado actual, valoración y notas personales.
- **HU-02.** Como coleccionista, cuando termino de experimentar un ítem (jugar un juego, leer un libro), quiero asignarle una puntuación de 1 a 5 estrellas y redactar una reseña o notas privadas para recordar qué me pareció.
- **HU-03.** Como coleccionista, cuando consulto una colección con decenas de elementos, quiero filtrar por texto para localizar un título concreto en tiempo real.
- **HU-04.** Como coleccionista, cuando navego por mi colección, quiero filtrar por uno o varios estados (p. ej. solo los "Pendientes" o solo los "Completados") para saber en qué enfocarme.
- **HU-05.** Como coleccionista, quiero ordenar mis ítems por diferentes criterios (más recientes primero, alfabéticamente por título, por año de lanzamiento o de mayor a menor puntuación).
- **HU-06.** Como coleccionista, quiero ver en todo momento cuántos ítems coinciden con mis filtros activos respecto al total de la colección.
- **HU-07.** Como curador de colecciones, quiero poder editar el nombre, descripción, icono y color de una colección existente sin perder los ítems catalogados.
- **HU-08.** Como curador de colecciones, cuando modifico o elimino un estado de una colección en uso, quiero que el sistema reubique de forma segura los ítems vinculados para evitar inconsistencias o pérdidas de datos.

---

## Definiciones

| Término | Significado en Hoardex |
|---|---|
| **Valoración (`rating`)** | Puntuación numérica opcional del 1 al 5 asignada por el usuario al ítem (donde 1 es la mínima y 5 la máxima). |
| **Reseña / Notas (`notes`)** | Texto libre multilínea donde el usuario anota reflexiones, edición del ejemplar, fecha de compra, etc. |
| **Estado huérfano** | Condición inválida que ocurriría si un ítem mantuviera un identificador de estado que fue borrado de su colección. |
| **Reasignación segura** | Mecanismo que reasigna automáticamente los ítems afectados al primer estado disponible de la colección si su estado previo es suprimido. |
| **Filtro de estado** | Selector de visualización que muestra todos los ítems (`'all'`) o exclusivamente los que pertenecen a un estado específico. |
| **Criterio de ordenación** | Regla aplicada a la lista: fecha de adición (`'createdAt'`), título (`'title'`), año (`'releaseYear'`) o valoración (`'rating'`), con dirección ascendente o descendente. |

---

## Requisitos funcionales (Sintaxis EARS)

### RF-01 — Ampliación del contrato de ítem y compatibilidad hacia atrás

- **RF-01.1** El sistema debe extender el contrato de datos del ítem para incluir los campos opcionales `rating?: number` y `notes?: string`.
- **RF-01.2** Cuando el sistema cargue datos persistidos desde el almacenamiento local creados en fases anteriores donde `rating` o `notes` sean inexistentes (`undefined`), el sistema debe inicializarlos como ausentes sin provocar errores de hidratación ni valores corruptos.
- **RF-01.3** Mientras el usuario no haya asignado valoración a un ítem, el sistema debe tratar `rating` como no valorado (sin puntuar), mostrándolo visualmente diferenciado de un valor 0.

### RF-02 — Panel lateral de detalle de ítem (`ItemDetailSheet`)

- **RF-02.1** Cuando el usuario haga clic en la portada o cuerpo de una tarjeta de ítem en la cuadrícula (o presione `Enter`/`Space`), el sistema debe abrir el panel lateral de detalle del ítem, asegurando la no anidación de elementos `<button>` en el DOM y aislando con detención de propagación de eventos (`e.stopPropagation()`) los controles interactivos directos de eliminación y selector rápido de estado.
- **RF-02.2** El sistema debe mostrar en el panel de detalle:
  - Carátula en alta visibilidad con su placeholder correspondiente si no posee imagen.
  - Título principal, subtítulo y año de publicación.
  - Metadatos adicionales almacenados (plataformas, autores, páginas, etc.).
  - Selector del estado actual del ciclo de vida.
  - Selector interactivo de valoración (1 a 5 estrellas).
  - Área de texto para notas o reseña personal.
  - Fecha de registro en la colección y fecha de última actualización.
  - Botón destructivo para eliminar el ítem con confirmación previa.
- **RF-02.3** Cuando el usuario modifique la valoración, las notas o el estado desde el panel de detalle, el sistema debe guardar los cambios de forma inmutable, actualizando la marca de tiempo `updatedAt`.
- **RF-02.4** Si el usuario cambia el estado a completado desde el panel de detalle, el sistema debe activar la concesión idempotente de experiencia de la misma manera que en la vista de cuadrícula.

### RF-03 — Selector de valoración por estrellas

- **RF-03.1** El sistema debe proporcionar un componente accesible de valoración por estrellas que permita seleccionar de 1 a 5 estrellas con clic o teclado.
- **RF-03.2** Cuando el usuario haga clic en la estrella correspondiente a la puntuación actual, el sistema debe desmarcar la valoración (devolver a estado sin calificar).
- **RF-03.3** Cuando un ítem posea valoración, la tarjeta de la cuadrícula (`ItemCard`) debe mostrar un distintivo visual compacto con la puntuación (p. ej. `★ 4`).

### RF-04 — Búsqueda y filtrado en la colección

- **RF-04.1** El sistema debe incorporar una barra de herramientas en la vista de colección con un campo de búsqueda por texto.
- **RF-04.2** Mientras el usuario escribe en el buscador de la colección, el sistema debe filtrar en tiempo real los ítems cuyo título o subtítulo/autor contenga la cadena de búsqueda (coincidencia insensible a mayúsculas y acentos).
- **RF-04.3** El sistema debe incluir una botonera o selector de píldoras de estado:
  - Opción "Todos" que muestre el total de la colección.
  - Una píldora por cada estado definido en la colección, acompañada de un contador numérico de ítems en ese estado.
- **RF-04.4** Cuando el usuario seleccione una píldora de estado, el sistema debe mostrar exclusivamente los ítems asignados a dicho estado que cumplan además el filtro de texto activo.
- **RF-04.5** Si la combinación de filtros no arroja ningún resultado, el sistema debe renderizar un estado vacío informativo que permita limpiar los filtros con un solo clic.

### RF-05 — Criterios de ordenación

- **RF-05.1** El sistema debe proporcionar un selector desplegable de ordenación con las siguientes opciones:
  - *Más recientes* (fecha de creación descendente, predeterminada).
  - *Más antiguos* (fecha de creación ascendente).
  - *Título (A - Z)*.
  - *Título (Z - A)*.
  - *Año de lanzamiento (más reciente primero)*.
  - *Año de lanzamiento (más antiguo primero)*.
  - *Mejor valorados* (mayor calificación primero; los no puntuados al final).
- **RF-05.2** Toda la lógica de filtrado y ordenación debe ejecutarse mediante funciones puras desacopladas en la capa de negocio, garantizando determinismo absoluto ante cualquier volumen de ítems.
- **RF-05.3** El sistema debe reflejar de forma reactiva el contador de ítems visibles frente al total (p. ej. *"Mostrando 3 de 15 ítems"*).

### RF-06 — Edición de colección existente (`EditCollectionSheet`)

- **RF-06.1** El sistema debe incluir un botón "Editar colección" en la cabecera de la página de colección.
- **RF-06.2** Cuando el usuario abra la edición, el sistema debe pre-cargar en el formulario los valores actuales de la colección: nombre, descripción, icono, color de acento y lista completa de estados.
- **RF-06.3** El sistema no debe permitir alterar el tipo de proveedor de búsqueda (`provider`) de una colección ya creada, para preservar la integridad de los metadatos existentes.
- **RF-06.4** Cuando el usuario guarde la colección modificada, el sistema debe actualizar sus propiedades y reflejar inmediatamente los nuevos colores, iconos y nombres en la interfaz y en el almacenamiento local.
- **RF-06.5** Si durante la edición el usuario elimina uno o más estados de la colección que tenían ítems asignados, el sistema debe reasignar automáticamente dichos ítems al primer estado disponible de la colección (por orden) para evitar estados huérfanos.
- **RF-06.6** Si el nuevo estado al que se reasigna un ítem tiene configurado `isCompleted: true`, el sistema debe marcar `isCompleted` y registrar la fecha de completado si no contaba con ella previamente.

---

## Requisitos no funcionales

- **RNF-01 Pureza y determinismo:** Las funciones de filtrado, ordenación y reconciliación de estados huérfanos deben ser funciones puras sin efectos secundarios, sin dependencias de React ni del reloj del sistema.
- **RNF-02 Tipado estricto:** Cero `any` y contratos explícitos para opciones de ordenación (`SortOption`), filtros (`ItemFilters`) y parámetros de edición.
- **RNF-03 Rendimiento:** El filtrado y la ordenación de hasta 500 ítems en memoria debe responder en menos de 16 ms (60 fps) sin bloqueos del hilo principal.
- **RNF-04 Accesibilidad (A11y):** Los paneles laterales, estrellas de valoración, menús de ordenación y botones de filtro deben ser navegables por teclado y anunciar sus estados mediante atributos ARIA (`aria-pressed`, `aria-label`, etc.).
- **RNF-05 Persistencia defensiva:** La actualización de ítems y colecciones debe mantener la integridad estructural en el almacenamiento local ante recargas de página.

---

## Casos límite

| CL | Escenario | Comportamiento esperado |
|---|---|---|
| CL-01 | Ítems creados en fases anteriores sin `rating` ni `notes` | Se cargan con `rating: undefined` y `notes: undefined`; se muestran como "Sin calificar" y notas vacías sin error. |
| CL-02 | El usuario asigna valoración y luego desea borrarla | Al hacer clic en la misma estrella de su valoración actual, el rating pasa a `undefined`. |
| CL-03 | Ordenación por año o valoración en ítems que no poseen dicho dato | Los ítems sin año o sin valoración se sitúan siempre al final de la lista ordenada, con orden secundario por fecha de adición. |
| CL-04 | Filtrado por texto con caracteres especiales o tildes (p. ej. "pokemon" vs "Pokémon") | Coincidencia insensible a tildes y diacríticos mediante normalización NFD. |
| CL-05 | El usuario elimina un estado que poseen 5 ítems en la edición de colección | Los 5 ítems se reasignan automáticamente al primer estado válido de la colección. |
| CL-06 | El usuario intenta dejar la colección sin ningún estado completado o con más de uno | La validación del formulario bloquea el guardado e informa del error en línea. |
| CL-07 | Notas con texto extenso o saltos de línea múltiples | El área de texto y la visualización en la ficha manejan scroll interno sin desbordar el contenedor. |
| CL-08 | Filtrado de una colección con 0 ítems | Se muestra el estado vacío original de la colección, sin desplegar barra de filtros innecesaria. |

---

## Fuera de alcance

- Subida directa de imágenes de carátula desde el sistema de archivos del usuario a almacenamiento en la nube (se mantiene la URL de imagen o portadas de proveedor; la persistencia binaria/Supabase Storage corresponde a la Fase 4).
- Sistema de etiquetas (*tags*) libres o categorización taxonómica secundaria (se evaluará en fases posteriores).
- Exportación o compartición pública de la reseña en redes sociales.
- Historial de cambios o versiones de reseñas anteriores.

---

## Criterios de finalización

La spec se considera implementada cuando:

- [ ] El contrato `Item` en `src/interfaces/item.interface.ts` incluye opcionalmente `rating?: number` y `notes?: string`.
- [ ] La función pura `filterAndSortItems` en `src/features/items/core/` implementa búsqueda insensible a tildes, filtrado por estado y las 7 variantes de ordenación, pasando el 100% de sus tests en `items.test.ts`.
- [ ] La función pura de reconciliación de estados de colección reubica los ítems de estados eliminados al primer estado sin dejar huérfanos, con tests unitarios en `templates.test.ts` o `collections.test.ts`.
- [ ] `ItemDetailSheet` permite ver la ficha completa, modificar estado, puntuar con estrellas, editar notas y eliminar el ítem con confirmación.
- [ ] `ItemCard` muestra el distintivo de estrellas si el ítem tiene valoración y abre `ItemDetailSheet` al hacer clic en el cuerpo de la tarjeta.
- [ ] `CollectionPage` integra barra de búsqueda, píldoras de filtrado por estado con contadores y menú desplegable de ordenación.
- [ ] `EditCollectionSheet` permite editar nombre, descripción, icono, color y estados de la colección actual, actualizando stores e ítems asociados.
- [ ] `npx tsc --noEmit` pasa con 0 errores y 0 `any`.
- [ ] `npm run lint` pasa con 0 errores y 0 warnings.
- [ ] `npm run test` ejecuta toda la suite completa en verde.
- [ ] `npm run build` compila con éxito.
- [ ] Verificación con Chrome DevTools MCP en `http://localhost:5173/`:
  - [ ] Apertura de `ItemDetailSheet` desde la tarjeta y edición de valoración (estrellas) y notas.
  - [ ] Visualización del distintivo de estrellas en `ItemCard`.
  - [ ] Filtrado por texto y por estado en la colección en tiempo real.
  - [ ] Cambio de criterio de ordenación reflejado de inmediato.
  - [ ] Edición de colección (nombre, color, estados) y confirmación de que los ítems conservan estados válidos.

---

## Dudas resueltas

- **Duda 1 (Escala de valoración):** Resuelta. Confirmada la escala de **1 a 5 estrellas** (valores enteros 1–5; pulsar sobre la estrella activa desmarca la valoración devolviendo `undefined`).
- **Duda 2 (Apertura de `ItemDetailSheet`):** Resuelta. Hacer clic en la portada o cuerpo de `ItemCard` abre `ItemDetailSheet`, con soporte para activación por teclado (`Enter` / `Space`), estructura DOM válida sin anidación de `<button>` dentro de `<button>`, y detención de propagación (`e.stopPropagation()`) en el `<Select>` rápido de estado y en el botón de eliminación.
- **Duda 3 (Reasignación de estados eliminados):** Resuelta. Al guardar cambios en `EditCollectionSheet`, si se eliminaron estados que contenían ítems, se reasignan automáticamente al primer estado disponible de la colección (ordenado por `order`) y se emite un toast informativo indicando la cantidad de ítems reasignados.
