// store/kanbanStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Card } from "@/types/forms/tasks";
interface Column {
  id: string;
  name: string;
  position: number;
  color: string | null;
  projectId: string;
  cards: Card[];
}

interface KanbanState {
  columns: Record<string, Column[]>; // keyed by projectSlug
  isLoading: Record<string, boolean>;
  lastFetch: Record<string, number>;

  // Actions
  setColumns: (projectSlug: string, columns: Column[]) => void;
  setLoading: (projectSlug: string, loading: boolean) => void;
  updateCard: (
    projectSlug: string,
    cardId: string,
    updates: Partial<Card>
  ) => void;
  moveCard: (
    projectSlug: string,
    cardId: string,
    newColumnId: string,
    newPosition: number
  ) => void;
  addColumn: (projectSlug: string, column: Column) => void;
  updateColumn: (
    projectSlug: string,
    columnId: string,
    updates: Partial<Column>
  ) => void;
  removeColumn: (projectSlug: string, columnId: string) => void;
  clearProject: (projectSlug: string) => void;

  // Added missing reorderCardsInColumn method
  reorderCardsInColumn: (
    projectSlug: string,
    columnId: string,
    cardOrders: Array<{ id: string; position: number }>
  ) => void;

  // Getters
  getColumns: (projectSlug: string) => Column[];
  getIsLoading: (projectSlug: string) => boolean;
  shouldRefetch: (projectSlug: string, interval: number) => boolean;
}

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set, get) => ({
      columns: {},
      isLoading: {},
      lastFetch: {},

      setColumns: (projectSlug, columns) =>
        set((state) => ({
          columns: {
            ...state.columns,
            [projectSlug]: columns,
          },
          lastFetch: {
            ...state.lastFetch,
            [projectSlug]: Date.now(),
          },
        })),

      setLoading: (projectSlug, loading) =>
        set((state) => ({
          isLoading: {
            ...state.isLoading,
            [projectSlug]: loading,
          },
        })),

      updateCard: (projectSlug, cardId, updates) =>
        set((state) => ({
          columns: {
            ...state.columns,
            [projectSlug]:
              state.columns[projectSlug]?.map((column) => ({
                ...column,
                cards: column.cards.map((card) =>
                  card.id === cardId ? { ...card, ...updates } : card
                ),
              })) || [],
          },
        })),

      moveCard: (projectSlug, cardId, newColumnId, newPosition) =>
        set((state) => {
          const columns = state.columns[projectSlug] || [];
          const sourceColumn = columns.find((col) =>
            col.cards.some((card) => card.id === cardId)
          );
          const targetColumn = columns.find((col) => col.id === newColumnId);

          if (!sourceColumn || !targetColumn) return state;

          const card = sourceColumn.cards.find((c) => c.id === cardId);
          if (!card) return state;

          // Remove card from source
          const sourceCards = sourceColumn.cards.filter((c) => c.id !== cardId);

          // Add card to target
          const targetCards = [...targetColumn.cards];
          const updatedCard = {
            ...card,
            columnId: newColumnId,
            position: newPosition,
          };
          targetCards.splice(newPosition, 0, updatedCard);

          // Update positions
          sourceCards.forEach((card, index) => {
            card.position = index;
          });
          targetCards.forEach((card, index) => {
            card.position = index;
          });

          return {
            columns: {
              ...state.columns,
              [projectSlug]: columns.map((col) => {
                if (col.id === sourceColumn.id) {
                  return { ...col, cards: sourceCards };
                }
                if (col.id === targetColumn.id) {
                  return { ...col, cards: targetCards };
                }
                return col;
              }),
            },
          };
        }),

      addColumn: (projectSlug, column) =>
        set((state) => ({
          columns: {
            ...state.columns,
            [projectSlug]: [...(state.columns[projectSlug] || []), column],
          },
        })),

      updateColumn: (projectSlug, columnId, updates) =>
        set((state) => ({
          columns: {
            ...state.columns,
            [projectSlug]:
              state.columns[projectSlug]?.map((col) =>
                col.id === columnId ? { ...col, ...updates } : col
              ) || [],
          },
        })),

      removeColumn: (projectSlug, columnId) =>
        set((state) => ({
          columns: {
            ...state.columns,
            [projectSlug]:
              state.columns[projectSlug]?.filter(
                (col) => col.id !== columnId
              ) || [],
          },
        })),

      clearProject: (projectSlug) =>
        set((state) => {
          const { [projectSlug]: removed, ...remainingColumns } = state.columns;
          const { [projectSlug]: removedLoading, ...remainingLoading } =
            state.isLoading;
          const { [projectSlug]: removedFetch, ...remainingFetch } =
            state.lastFetch;

          return {
            columns: remainingColumns,
            isLoading: remainingLoading,
            lastFetch: remainingFetch,
          };
        }),

      // Added missing reorderCardsInColumn implementation
      reorderCardsInColumn: (projectSlug, columnId, cardOrders) =>
        set((state) => {
          const columns = state.columns[projectSlug] || [];
          const columnToUpdate = columns.find((col) => col.id === columnId);

          if (!columnToUpdate) return state;

          // Create a map for quick lookup of new positions
          const positionMap = new Map(
            cardOrders.map((order) => [order.id, order.position])
          );

          // Update card positions and sort them
          const updatedCards = columnToUpdate.cards
            .map((card) => ({
              ...card,
              position: positionMap.get(card.id) ?? card.position,
            }))
            .sort((a, b) => a.position - b.position);

          return {
            columns: {
              ...state.columns,
              [projectSlug]: columns.map((col) =>
                col.id === columnId ? { ...col, cards: updatedCards } : col
              ),
            },
          };
        }),

      // Getters
      getColumns: (projectSlug) => get().columns[projectSlug] || [],
      getIsLoading: (projectSlug) => get().isLoading[projectSlug] || false,
      shouldRefetch: (projectSlug, interval) => {
        const lastFetch = get().lastFetch[projectSlug] || 0;
        return Date.now() - lastFetch > interval;
      },
    }),
    {
      name: "kanban-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        columns: state.columns,
        lastFetch: state.lastFetch,
      }),
    }
  )
);
