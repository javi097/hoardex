import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGamificationSync } from './useGamificationSync';
import { useGamificationStore } from '@/features/gamification/store/gamification.store';
import { useCollectionsStore } from '@/features/collections/store/collections.store';
import { useItemsStore } from '@/features/items/store/items.store';
import * as notificationsModule from '../core/notifications';

describe('useGamificationSync', () => {
  beforeEach(() => {
    useGamificationStore.getState().resetGamification();
    useCollectionsStore.setState({ collections: [] });
    useItemsStore.setState({ items: [] });
    vi.clearAllMocks();
  });

  it('runs syncAchievements once and notifies if achievements or level ups are triggered', () => {
    const notifySpy = vi.spyOn(notificationsModule, 'notifyGamificationResult');

    // Estado preexistente con 1 ítem completado
    useCollectionsStore.setState({
      collections: [
        {
          id: 'col-1',
          name: 'Colección Test',
          description: '',
          icon: 'Layers',
          accentColor: '#3b82f6',
          provider: 'manual',
          statuses: [
            { id: 'st-1', label: 'Pendiente', isCompleted: false, order: 0 },
            { id: 'st-2', label: 'Completado', isCompleted: true, order: 1 },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    useItemsStore.setState({
      items: [
        {
          id: 'item-1',
          collectionId: 'col-1',
          title: 'Ítem 1',
          statusId: 'st-2',
          xpAwarded: true,
          meta: {},
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    renderHook(() => useGamificationSync());

    // Se debe haber desbloqueado retroactivamente "first_item" y "first_completed"
    const unlocked = useGamificationStore.getState().unlockedAchievements;
    expect(unlocked.length).toBe(2);
    expect(unlocked.map((u) => u.achievementId)).toContain('first_item');
    expect(unlocked.map((u) => u.achievementId)).toContain('first_completed');

    // Debe haberse notificado el resultado
    expect(notifySpy).toHaveBeenCalledTimes(1);
  });
});
