import { useState, useMemo, useEffect, useCallback, useRef, type TouchEvent } from 'react';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  RotateCcw,
  Trophy,
  Flame,
  Star,
  CheckCircle2,
  Calendar,
  Frown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import { calculateWrappedStats } from '../core/wrapped';
import { generateWrappedShareText, generateWrappedSvg } from '../core/wrappedCard';
import { CollectionIcon } from '@/lib/icons';
import { CoverImage } from '@/components/custom/CoverImage';
import { StarRating } from '@/components/custom/StarRating';
import { cn } from '@/lib/utils';

export interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialYear?: number;
}

const TOTAL_SLIDES = 6;

const SLIDE_TITLES = [
  'Bienvenida',
  'Volumen de Colección',
  'Colección Reina',
  'Salón de la Fama',
  'Métricas y Hábitos',
  'The Recap Card',
] as const;

export function WrappedDialog({
  open,
  onOpenChange,
  initialYear = 2026,
}: Props) {
  const collections = useCollectionsStore((s) => s.collections);
  const items = useItemsStore((s) => s.items);
  const totalXp = useGamificationStore((s) => s.totalXp);
  const streak = useGamificationStore((s) => s.streak);

  // Años disponibles computados a partir de los ítems existentes
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(2026);
    for (const it of items) {
      const year = parseInt(it.createdAt.slice(0, 4), 10);
      if (!Number.isNaN(year) && year >= 2000 && year <= 2100) {
        yearsSet.add(year);
      }
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [items]);

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevYear, setPrevYear] = useState(selectedYear);
  const touchStartX = useRef<number | null>(null);

  // Reiniciar diapositiva al abrir el diálogo o cambiar de año según el patrón idiomático de React
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSlideIndex(0);
    }
  }

  if (selectedYear !== prevYear) {
    setPrevYear(selectedYear);
    setSlideIndex(0);
  }

  // Cálculo de estadísticas Wrapped memoizado
  const stats = useMemo(() => {
    return calculateWrappedStats(
      collections,
      items,
      { totalXp, streak },
      selectedYear
    );
  }, [collections, items, totalXp, streak, selectedYear]);

  const nextSlide = useCallback(() => {
    setSlideIndex((prev) => (prev < TOTAL_SLIDES - 1 ? prev + 1 : prev));
  }, []);

  const prevSlide = useCallback(() => {
    setSlideIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Navegación por teclado
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        nextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, nextSlide, prevSlide]);

  // Gestos táctiles de deslizamiento (swipe horizontal)
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX.current - touchEndX;

    if (deltaX > 50) {
      nextSlide();
    } else if (deltaX < -50) {
      prevSlide();
    }
    touchStartX.current = null;
  };

  // Copiado al portapapeles
  const handleCopySummary = async () => {
    const text = generateWrappedShareText(stats);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback básico para navegadores sin clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success('¡Resumen copiado al portapapeles!');
    } catch {
      toast.error('No se pudo copiar el resumen al portapapeles.');
    }
  };

  // Descarga de la tarjeta vectorial SVG
  const handleDownloadSvg = () => {
    try {
      const svgString = generateWrappedSvg(stats);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hoardex-wrapped-${stats.year}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Tarjeta Wrapped descargada con éxito.');
    } catch {
      toast.error('Ocurrió un error al generar la tarjeta SVG.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-2xl w-full p-0 overflow-hidden bg-slate-950 text-slate-100 border-slate-800 shadow-2xl',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
        )}
        aria-label="Hoardex Wrapped"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Hoardex Wrapped {selectedYear}</DialogTitle>
          <DialogDescription>
            Resumen interactivo de tus aficiones, completados y estadísticas del año {selectedYear}.
          </DialogDescription>
        </DialogHeader>

        {/* Región ARIA Live para anuncios de diapositiva */}
        <div className="sr-only" aria-live="polite">
          {stats.hasActivity
            ? `Diapositiva ${slideIndex + 1} de ${TOTAL_SLIDES}: ${SLIDE_TITLES[slideIndex]}`
            : 'Hoardex Wrapped sin actividad'}
        </div>

        {/* Barra superior: Selector de año y barras segmentadas estilo Stories */}
        <div className="p-4 sm:p-6 pb-2 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xs flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-linear-to-tr from-indigo-500 to-purple-500 text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                Hoardex Wrapped
              </span>
            </div>

            {/* Selector de año */}
            <div className="flex items-center gap-1.5 mr-6">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                aria-label="Seleccionar año de Wrapped"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Barras de progreso segmentadas estilo Stories (solo si hay actividad) */}
          {stats.hasActivity && (
            <div className="flex items-center gap-1.5 w-full pt-1">
              {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden"
                >
                  <div
                    className={cn(
                      'h-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-300 motion-reduce:transition-none',
                      idx <= slideIndex ? 'w-full' : 'w-0'
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contenido de la diapositiva */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="p-6 sm:p-8 min-h-[420px] flex flex-col justify-center select-none"
        >
          {!stats.hasActivity ? (
            /* Estado Empático sin actividad */
            <div className="flex flex-col items-center text-center max-w-md mx-auto py-8">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                <Frown className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">
                Aún no hay actividad en {selectedYear}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                No hemos encontrado ítems añadidos o terminados durante este año. ¡Empieza a
                catalogar tus colecciones para desbloquear tu retrospectiva anual personalizada!
              </p>
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
                onClick={() => onOpenChange(false)}
              >
                Entendido, ir a catalogar
              </Button>
            </div>
          ) : (
            /* Carrusel de Diapositivas (0 a 5) */
            <div className="flex-1 flex flex-col justify-center">
              {/* Diapositiva 0: Bienvenida / Portada */}
              {slideIndex === 0 && (
                <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6">
                    <Sparkles className="w-3.5 h-3.5" />
                    Edición Anual {stats.year}
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
                    Tu Año en Colección
                  </h2>
                  <p className="text-base sm:text-lg text-slate-300 max-w-lg mb-8 leading-relaxed">
                    Un viaje interactivo a través de tus aficiones, títulos terminados, notas y
                    logros alcanzados durante este año.
                  </p>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                      <span className="text-2xl sm:text-3xl font-extrabold text-indigo-400">
                        {stats.totalAdded}
                      </span>
                      <p className="text-xs font-medium text-slate-400 mt-1">Añadidos</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                      <span className="text-2xl sm:text-3xl font-extrabold text-purple-400">
                        {stats.totalCompleted}
                      </span>
                      <p className="text-xs font-medium text-slate-400 mt-1">Completados</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Diapositiva 1: El Volumen de tu Afición */}
              {slideIndex === 1 && (
                <div className="flex flex-col animate-in fade-in duration-200 motion-reduce:animate-none">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">
                    Volumen de Colección
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                    Sumaste {stats.totalAdded} nuevos tesoros
                  </h2>
                  <p className="text-sm text-slate-400 mb-6">
                    Así se distribuyó tu actividad entre tus distintas estanterías:
                  </p>

                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                    {stats.collectionsBreakdown.map((col) => (
                      <div
                        key={col.collectionId}
                        className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                              style={{ backgroundColor: col.accentColor }}
                            >
                              <CollectionIcon name={col.icon} className="w-4 h-4" />
                            </span>
                            <span className="font-semibold text-slate-200">
                              {col.collectionName}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">
                            {col.itemsCount} ítems ({col.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                            style={{
                              width: `${col.percentage}%`,
                              backgroundColor: col.accentColor,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diapositiva 2: La Colección Reina */}
              {slideIndex === 2 && (
                <div className="flex flex-col items-center text-center animate-in fade-in duration-200 motion-reduce:animate-none">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
                    Colección Reina
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6">
                    Tu gran pasión de {stats.year}
                  </h2>

                  {stats.favoriteCollection ? (
                    <div className="w-full max-w-md p-6 rounded-2xl bg-linear-to-b from-slate-900 to-slate-950 border border-slate-800 relative overflow-hidden shadow-xl">
                      <div
                        className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg ring-4 ring-white/10"
                        style={{ backgroundColor: stats.favoriteCollection.accentColor }}
                      >
                        <CollectionIcon
                          name={stats.favoriteCollection.icon}
                          className="w-10 h-10"
                        />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {stats.favoriteCollection.collectionName}
                      </h3>
                      <p className="text-sm font-semibold text-amber-400 mb-4">
                        👑 Protagonista indiscutible de tu año
                      </p>
                      <div className="flex items-center justify-center gap-6 py-3 px-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                        <div>
                          <span className="block text-lg font-bold text-slate-100">
                            {stats.favoriteCollection.itemsCount}
                          </span>
                          <span className="text-slate-400">Ítems gestionados</span>
                        </div>
                        <div className="w-px h-8 bg-slate-800" />
                        <div>
                          <span className="block text-lg font-bold text-slate-100">
                            {stats.favoriteCollection.percentage}%
                          </span>
                          <span className="text-slate-400">De tu catálogo</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">
                      No hay suficiente actividad en una colección específica este año.
                    </p>
                  )}
                </div>
              )}

              {/* Diapositiva 3: El Salón de la Fama */}
              {slideIndex === 3 && (
                <div className="flex flex-col animate-in fade-in duration-200 motion-reduce:animate-none">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-widest block">
                        Salón de la Fama
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                        Tus joyas mejor valoradas
                      </h2>
                    </div>
                    {stats.averageRating !== null && (
                      <div className="text-right">
                        <span className="text-xs font-medium text-slate-400 block">
                          Media global
                        </span>
                        <span className="text-lg font-extrabold text-amber-400">
                          ⭐ {stats.averageRating}
                        </span>
                      </div>
                    )}
                  </div>

                  {stats.topRatedItems.length > 0 ? (
                    <div className="space-y-2.5 max-h-[270px] overflow-y-auto pr-1">
                      {stats.topRatedItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 text-center text-sm font-bold text-slate-500">
                              #{idx + 1}
                            </span>
                            <div className="w-10 h-14 shrink-0 rounded overflow-hidden">
                              <CoverImage
                                src={item.coverUrl}
                                alt={item.title}
                                aspectRatio="portrait"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-200 truncate">
                                {item.title}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {item.collectionName}
                                {item.releaseYear ? ` (${item.releaseYear})` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5">
                            <StarRating value={item.rating} readonly size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
                      <Star className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">
                        No registraste valoraciones con estrellas este año. ¡Anímate a puntuar
                        tus títulos favoritos para verlos en el Salón de la Fama!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Diapositiva 4: Métricas y Hábitos */}
              {slideIndex === 4 && (
                <div className="flex flex-col animate-in fade-in duration-200 motion-reduce:animate-none">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-1">
                    Métricas y Hábitos
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6">
                    Tu constancia como coleccionista
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-3xl font-black text-white">
                          {stats.totalCompleted}
                        </span>
                        <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider mt-0.5">
                          Ítems completados
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Alcanzando un {stats.completionRate}% de tasa de finalización
                        </p>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <Flame className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-3xl font-black text-white">
                          {stats.longestStreak}
                        </span>
                        <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mt-0.5">
                          Días de racha récord
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Dedicación continua manteniendo vivo tu catálogo
                        </p>
                      </div>
                    </div>

                    <div className="sm:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-2xl font-black text-white">
                          Nivel {stats.level} · {stats.levelTitle}
                        </span>
                        <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mt-0.5">
                          Rango de Coleccionista ({stats.totalXp} XP acumulados)
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Consolidando tu progreso y maestría en Hoardex
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Diapositiva 5: The Recap Card */}
              {slideIndex === 5 && (
                <div className="flex flex-col animate-in fade-in duration-200 motion-reduce:animate-none">
                  <div className="text-center mb-4">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block">
                      The Recap Card
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                      Tu Resumen Consolidado {stats.year}
                    </h2>
                  </div>

                  {/* Tarjeta Visual Estilizada */}
                  <div className="p-5 rounded-2xl bg-linear-to-b from-slate-900/90 to-slate-950 border border-indigo-500/30 shadow-2xl relative mb-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span className="font-extrabold tracking-wide text-xs text-white">
                          HOARDEX WRAPPED
                        </span>
                      </div>
                      <span className="text-xs font-bold text-indigo-400">{stats.year}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                        <span className="text-slate-400 block">Total Añadidos</span>
                        <span className="text-base font-bold text-white">
                          {stats.totalAdded} ítems
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                        <span className="text-slate-400 block">Completados</span>
                        <span className="text-base font-bold text-sky-400">
                          {stats.totalCompleted} ({stats.completionRate}%)
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                        <span className="text-slate-400 block">Colección Estrella</span>
                        <span className="text-sm font-bold text-amber-400 truncate block">
                          {stats.favoriteCollection?.collectionName ?? 'Variada'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                        <span className="text-slate-400 block">Racha Récord</span>
                        <span className="text-sm font-bold text-orange-400 block">
                          🔥 {stats.longestStreak} días
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                      <span className="font-bold text-slate-300">
                        Nivel {stats.level} · {stats.levelTitle}
                      </span>
                      <span className="text-slate-500 font-mono">hoardex.app</span>
                    </div>
                  </div>

                  {/* Botones de acción social y descarga */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <Button
                      onClick={handleCopySummary}
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100 gap-1.5"
                    >
                      <Copy className="w-4 h-4 text-indigo-400" />
                      Copiar resumen
                    </Button>
                    <Button
                      onClick={handleDownloadSvg}
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100 gap-1.5"
                    >
                      <Download className="w-4 h-4 text-purple-400" />
                      Descargar tarjeta (.svg)
                    </Button>
                    <Button
                      onClick={() => setSlideIndex(0)}
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-slate-200 gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Volver a ver
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie de navegación accesible: Botones Anterior y Siguiente */}
        {stats.hasActivity && (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/80 backdrop-blur-xs flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={prevSlide}
              disabled={slideIndex === 0}
              className="border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 disabled:opacity-40 gap-1 min-w-[90px]"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <span className="text-xs font-semibold text-slate-400">
              {slideIndex + 1} de {TOTAL_SLIDES}
            </span>

            {slideIndex < TOTAL_SLIDES - 1 ? (
              <Button
                variant="default"
                size="sm"
                onClick={nextSlide}
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1 min-w-[90px]"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[90px]"
              >
                Finalizar Wrapped
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
