import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Collection } from '@/interfaces/collection.interface';
import { useItemsStore } from '@/features/items/store/items.store';

export interface CollectionsState {
  collections: Collection[];
  addCollection: (collection: Collection) => void;
  removeCollection: (id: string) => void;
  updateCollection: (
    id: string,
    patch: Partial<Omit<Collection, 'id' | 'createdAt'>>
  ) => void;
}

export const useCollectionsStore = create<CollectionsState>()(
  persist(
    (set) => ({
      collections: [],

      addCollection: (collection) =>
        set((state) => ({
          collections: [...state.collections, collection],
        })),

      removeCollection: (id) => {
        // Cascada: elimina todos los ítems huérfanos asociados a la colección
        useItemsStore.getState().removeItemsByCollection(id);

        set((state) => ({
          collections: state.collections.filter((col) => col.id !== id),
        }));
      },

      updateCollection: (id, patch) =>
        set((state) => ({
          collections: state.collections.map((col) =>
            col.id === id ? { ...col, ...patch } : col
          ),
        })),
    }),
    {
      name: 'hoardex-collections',
      partialize: (state) => ({ collections: state.collections }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<CollectionsState> | undefined;
        return {
          ...currentState,
          collections: Array.isArray(persisted?.collections)
            ? persisted.collections
            : [],
        };
      },
    }
  )
);
