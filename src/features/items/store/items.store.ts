import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Item } from '@/interfaces/item.interface';
import { changeItemStatus } from '@/features/items/core/items';

export interface ItemsState {
  items: Item[];
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
  removeItemsByCollection: (collectionId: string) => void;
  updateItemStatus: (
    itemId: string,
    newStatusId: string,
    isCompleted: boolean,
    now: string
  ) => void;
}

export const useItemsStore = create<ItemsState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, item],
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      removeItemsByCollection: (collectionId) =>
        set((state) => ({
          items: state.items.filter((item) => item.collectionId !== collectionId),
        })),

      updateItemStatus: (itemId, newStatusId, isCompleted, now) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? changeItemStatus(item, newStatusId, isCompleted, now)
              : item
          ),
        })),
    }),
    {
      name: 'hoardex-items',
      partialize: (state) => ({ items: state.items }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ItemsState> | undefined;
        return {
          ...currentState,
          items: Array.isArray(persisted?.items) ? persisted.items : [],
        };
      },
    }
  )
);
