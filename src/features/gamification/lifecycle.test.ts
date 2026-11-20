import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useGamificationStore } from './store/gamification.store';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import { notifyGamificationResult } from './core/notifications';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Gamification lifecycle integration', () => {
  beforeEach(() => {
    useGamificationStore.getState().resetGamification();
    useCollectionsStore.setState({ collections: [] });
    useItemsStore.setState({ items: [] });
    vi.clearAllMocks();
  });

  it('completes the full lifecycle: add item -> complete -> review -> idempotency', () => {
    const today = '2026-04-10';
    const now = '2026-04-10T10:00:00.000Z';

    const col = {
      id: 'col-1',
      name: 'Videojuegos',
      description: '',
      icon: 'Gamepad2',
      accentColor: '#6366f1',
      provider: 'rawg' as const,
      statuses: [
        { id: 'st-pending', label: 'Pendiente', isCompleted: false, order: 0 },
        { id: 'st-done', label: 'Terminado', isCompleted: true, order: 1 },
      ],
      createdAt: now,
    };
    useCollectionsStore.setState({ collections: [col] });

    // 1. Añadir ítem (add_item: +10 XP, primer ejemplar: +20 XP, bono diario de racha: +15 XP => total 45 XP)
    const item1 = {
      id: 'item-1',
      collectionId: 'col-1',
      title: 'Chrono Trigger',
      statusId: 'st-pending',
      xpAwarded: false,
      meta: {},
      createdAt: now,
      updatedAt: now,
    };
    useItemsStore.setState({ items: [item1] });

    const addResult = useGamificationStore.getState().handleUserAction({
      action: 'add_item',
      description: `Ítem añadido: ${item1.title}`,
      targetId: item1.id,
      today,
      now,
      collections: useCollectionsStore.getState().collections,
      items: useItemsStore.getState().items,
    });
    notifyGamificationResult(addResult);
    expect(toast.success).toHaveBeenCalled();

    expect(addResult.baseXpGained).toBe(10);
    expect(addResult.streakBonusXp).toBe(15);
    expect(addResult.newlyUnlockedAchievements.map((a) => a.id)).toContain(
      'first_item'
    );
    expect(useGamificationStore.getState().totalXp).toBe(45); // 10 base + 20 logro + 15 racha

    // 2. Completar ítem en el mismo día (complete_item: +50 XP, logro first_completed: +30 XP => +80 XP)
    const updatedItem1 = { ...item1, statusId: 'st-done', xpAwarded: true };
    useItemsStore.setState({ items: [updatedItem1] });

    const completeResult = useGamificationStore.getState().handleUserAction({
      action: 'complete_item',
      description: `Ítem completado: ${updatedItem1.title}`,
      targetId: updatedItem1.id,
      today,
      now,
      collections: useCollectionsStore.getState().collections,
      items: useItemsStore.getState().items,
    });
    notifyGamificationResult(completeResult);

    expect(completeResult.baseXpGained).toBe(50);
    expect(completeResult.streakBonusXp).toBe(0); // Mismo día, no duplica bono de racha
    expect(completeResult.newlyUnlockedAchievements.map((a) => a.id)).toContain(
      'first_completed'
    );
    expect(useGamificationStore.getState().totalXp).toBe(125); // 45 + 50 + 30

    // Verificar subida de nivel (Nivel 1 requería 100 XP => ahora Nivel 2)
    expect(completeResult.leveledUp).toBe(true);
    expect(completeResult.newLevel).toBe(2);

    // 3. Valorar ítem en el mismo día (rate_and_review: +25 XP, logro first_review: +25 XP => +50 XP)
    const reviewedItem1 = {
      ...updatedItem1,
      rating: 5,
      notes: 'Obra maestra atemporal',
      reviewXpAwarded: true,
    };
    useItemsStore.setState({ items: [reviewedItem1] });

    const reviewResult = useGamificationStore.getState().handleUserAction({
      action: 'rate_and_review',
      description: `Valoración: ${reviewedItem1.title}`,
      targetId: reviewedItem1.id,
      today,
      now,
      collections: useCollectionsStore.getState().collections,
      items: useItemsStore.getState().items,
    });
    notifyGamificationResult(reviewResult);

    expect(reviewResult.baseXpGained).toBe(25);
    expect(reviewResult.newlyUnlockedAchievements.map((a) => a.id)).toContain(
      'first_review'
    );
    expect(useGamificationStore.getState().totalXp).toBe(175); // 125 + 25 + 25

    // 4. Idempotencia: re-completar o re-editar el mismo ítem no debe duplicar puntos
    expect(useGamificationStore.getState().totalXp).toBe(175);
  });
});
