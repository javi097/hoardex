import type { Collection } from '@/interfaces/collection.interface';
import type { Item } from '@/interfaces/item.interface';
import { toast } from 'sonner';

/**
 * Escapa y formatea un valor individual siguiendo la especificación estándar RFC 4180:
 * Si el texto contiene comas, comillas dobles o saltos de línea (\n o \r),
 * se envuelve entre comillas dobles y las comillas internas se duplican (" -> "").
 */
export function escapeCsvValue(
  value: string | number | boolean | null | undefined
): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Comprueba si contiene delimitadores, comillas o saltos de línea
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Columnas normalizadas en la cabecera CSV.
 */
export const CSV_HEADERS = [
  'collection_id',
  'collection_name',
  'item_id',
  'title',
  'subtitle',
  'release_year',
  'status_id',
  'status_label',
  'is_completed',
  'rating',
  'notes',
  'created_at',
  'updated_at',
] as const;

/**
 * Serializa de forma pura y determinista el catálogo completo de colecciones e ítems
 * a una cadena CSV estándar (RFC 4180) con el marcador UTF-8 BOM (\uFEFF) para
 * garantizar apertura perfecta en Microsoft Excel, Google Sheets y Notion.
 */
export function exportToCsv(collections: Collection[], items: Item[]): string {
  const collectionMap = new Map<string, Collection>();
  for (const col of collections) {
    collectionMap.set(col.id, col);
  }

  const headerLine = CSV_HEADERS.join(',');

  const rows = items.map((item) => {
    const col = collectionMap.get(item.collectionId);
    const colName = col?.name ?? '';
    const status = col?.statuses.find((s) => s.id === item.statusId);
    const statusLabel = status?.label ?? item.statusId;
    const isCompleted = status?.isCompleted ? 'true' : 'false';

    const values = [
      escapeCsvValue(item.collectionId),
      escapeCsvValue(colName),
      escapeCsvValue(item.id),
      escapeCsvValue(item.title),
      escapeCsvValue(item.subtitle ?? ''),
      escapeCsvValue(item.releaseYear ?? ''),
      escapeCsvValue(item.statusId),
      escapeCsvValue(statusLabel),
      escapeCsvValue(isCompleted),
      escapeCsvValue(item.rating ?? ''),
      escapeCsvValue(item.notes ?? ''),
      escapeCsvValue(item.createdAt),
      escapeCsvValue(item.updatedAt ?? item.createdAt),
    ];

    return values.join(',');
  });

  const lines = [headerLine, ...rows];
  // Prefijo UTF-8 Byte Order Mark (\uFEFF) + líneas unidas con CRLF (estándar RFC 4180)
  return `\uFEFF${lines.join('\r\n')}`;
}

/**
 * Helper reutilizable de cliente para exportar y descargar el catálogo en formato CSV (RFC 4180 con BOM UTF-8).
 * Genera el archivo 'hoardex-catalog-{YYYY-MM-DD}.csv' y emite una notificación toast accesible.
 */
export function downloadCatalogCsv(
  collections: Collection[],
  items: Item[],
  dateStr?: string
): void {
  try {
    const csvContent = exportToCsv(collections, items);
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const formattedDate = dateStr ?? new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hoardex-catalog-${formattedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Catálogo exportado a CSV correctamente');
  } catch (err: unknown) {
    console.error('Error al exportar catálogo a CSV:', err);
    toast.error('Error al exportar el catálogo a CSV');
  }
}

