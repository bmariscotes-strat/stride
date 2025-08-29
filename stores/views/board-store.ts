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
  addCard: (projectSlug: string, columnId: string, card: Card) => void;
  removeCard: (projectSlug: string, columnId: string, cardId: string) => void;
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

      // Add a new card to a column
      addCard: (projectSlug: string, columnId: string, card: Card) => {
        set((state) => {
          const projectColumns = state.columns[projectSlug] || [];

          const updatedColumns = projectColumns.map((column) => {
            if (column.id === columnId) {
              return {
                ...column,
                cards: [...column.cards, card].sort(
                  (a, b) => a.position - b.position
                ),
              };
            }
            return column;
          });

          return {
            columns: {
              ...state.columns,
              [projectSlug]: updatedColumns,
            },
          };
        });
      },

      // Remove a card from a column
      removeCard: (projectSlug: string, columnId: string, cardId: string) => {
        set((state) => {
          const projectColumns = state.columns[projectSlug] || [];

          const updatedColumns = projectColumns.map((column) => {
            if (column.id === columnId) {
              return {
                ...column,
                cards: column.cards.filter((card) => card.id !== cardId),
              };
            }
            return column;
          });

          return {
            columns: {
              ...state.columns,
              [projectSlug]: updatedColumns,
            },
          };
        });
      },

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

      moveCard: (
        projectSlug: string,
        cardId: string,
        newColumnId: string,
        newPosition: number
      ) => {
        set((state) => {
          const projectColumns = state.columns[projectSlug] || [];
          let cardToMove: Card | null = null;
          let sourceColumnId: string | null = null;

          // Find the card and its source column
          for (const column of projectColumns) {
            const cardIndex = column.cards.findIndex(
              (card) => card.id === cardId
            );
            if (cardIndex !== -1) {
              cardToMove = { ...column.cards[cardIndex] };
              sourceColumnId = column.id;
              break;
            }
          }

          if (!cardToMove || !sourceColumnId) return state;

          // Update the card's column and position
          cardToMove.columnId = newColumnId;
          cardToMove.position = newPosition;

          const updatedColumns = projectColumns.map((column) => {
            if (
              column.id === sourceColumnId &&
              sourceColumnId !== newColumnId
            ) {
              // Remove from source column if moving to different column
              return {
                ...column,
                cards: column.cards
                  .filter((card) => card.id !== cardId)
                  .map((card, index) => ({ ...card, position: index })),
              };
            } else if (column.id === newColumnId) {
              // Add to target column
              const otherCards = column.cards.filter(
                (card) => card.id !== cardId
              );
              const newCards = [...otherCards];
              newCards.splice(newPosition, 0, cardToMove);

              return {
                ...column,
                cards: newCards.map((card, index) => ({
                  ...card,
                  position: index,
                })),
              };
            }
            return column;
          });

          return {
            columns: {
              ...state.columns,
              [projectSlug]: updatedColumns,
            },
          };
        });
      },

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
