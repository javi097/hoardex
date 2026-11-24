import type {
  Collection,
  CollectionStatus,
  CollectionTemplate,
  CreateCollectionParams,
} from '@/interfaces/collection.interface';

export type { CreateCollectionParams };

export function validateStatuses(statuses: CollectionStatus[]): void {
  const completed = statuses.filter((status) => status.isCompleted);
  if (completed.length !== 1) {
    throw new Error(
      `La colección debe tener exactamente un estado marcado como completado. Recibidos: ${completed.length}.`
    );
  }
}

export function createCollection(
  params: CreateCollectionParams,
  now: string
): Collection {
  validateStatuses(params.statuses);

  return {
    id: crypto.randomUUID(),
    name: params.name,
    description: params.description,
    icon: params.icon,
    accentColor: params.accentColor,
    provider: params.provider,
    statuses: params.statuses,
    isPublic: params.isPublic ?? true,
    createdAt: now,
  };
}

export const COLLECTION_TEMPLATES: readonly CollectionTemplate[] = Object.freeze([
  {
    id: 'videogames',
    name: 'Videojuegos',
    description: 'Catálogo de videojuegos por plataforma y estado de juego.',
    icon: 'Gamepad2',
    accentColor: '#6366f1',
    provider: 'rawg',
    defaultStatuses: [
      { id: 'vg-pending', label: 'Pendiente', isCompleted: false, order: 0 },
      { id: 'vg-playing', label: 'En curso', isCompleted: false, order: 1 },
      { id: 'vg-completed', label: 'Completado', isCompleted: true, order: 2 },
      { id: 'vg-dropped', label: 'Abandonado', isCompleted: false, order: 3 },
    ],
  },
  {
    id: 'books',
    name: 'Libros',
    description: 'Biblioteca de lecturas, autores y libros pendientes.',
    icon: 'BookOpen',
    accentColor: '#10b981',
    provider: 'openLibrary',
    defaultStatuses: [
      { id: 'bk-pending', label: 'Pendiente', isCompleted: false, order: 0 },
      { id: 'bk-reading', label: 'Leyendo', isCompleted: false, order: 1 },
      { id: 'bk-completed', label: 'Leído', isCompleted: true, order: 2 },
      { id: 'bk-dropped', label: 'Abandonado', isCompleted: false, order: 3 },
    ],
  },
  {
    id: 'boardgames',
    name: 'Juegos de mesa',
    description: 'Ludoteca personal y seguimiento de partidas.',
    icon: 'Dice5',
    accentColor: '#f59e0b',
    provider: 'bgg',
    defaultStatuses: [
      { id: 'bg-want', label: 'Quiero jugarlo', isCompleted: false, order: 0 },
      { id: 'bg-played', label: 'Jugado', isCompleted: true, order: 1 },
    ],
  },
  {
    id: 'figures',
    name: 'Figuras',
    description: 'Colección de figuras, dioramas y piezas exclusivas.',
    icon: 'Trophy',
    accentColor: '#ec4899',
    provider: 'manual',
    defaultStatuses: [
      { id: 'fg-wish', label: 'Deseada', isCompleted: false, order: 0 },
      { id: 'fg-acquired', label: 'Adquirida', isCompleted: true, order: 1 },
      { id: 'fg-display', label: 'En exhibición', isCompleted: false, order: 2 },
      { id: 'fg-sold', label: 'Vendida', isCompleted: false, order: 3 },
    ],
  },
  {
    id: 'music',
    name: 'Discos',
    description: 'Discografía en vinilo, CD o formato digital.',
    icon: 'Disc3',
    accentColor: '#14b8a6',
    provider: 'manual',
    defaultStatuses: [
      { id: 'mu-pending', label: 'Pendiente', isCompleted: false, order: 0 },
      { id: 'mu-listening', label: 'Escuchando', isCompleted: false, order: 1 },
      { id: 'mu-completed', label: 'Escuchado', isCompleted: true, order: 2 },
    ],
  },
  {
    id: 'custom',
    name: 'Personalizada',
    description: 'Crea una colección a tu medida con tus propios estados.',
    icon: 'LayoutGrid',
    accentColor: '#8b5cf6',
    provider: 'manual',
    defaultStatuses: [
      { id: 'cs-pending', label: 'Pendiente', isCompleted: false, order: 0 },
      { id: 'cs-completed', label: 'Hecho', isCompleted: true, order: 1 },
    ],
  },
]);
