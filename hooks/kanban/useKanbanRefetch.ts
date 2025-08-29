import { useState, useEffect, useCallback, useRef } from "react";
import { useKanbanStore } from "@/stores/views/board-store";
import { useProjectColumns } from "@/hooks/useColumns";
import { Card } from "@/types/forms/tasks";

export function useKanbanRefetch(
  projectSlug: string,
  onDataChange?: () => void
) {
  const { setColumns, getColumns, getIsLoading, setLoading } = useKanbanStore();

  // Use the useProjectColumns hook
  const {
    data: columnsData,
    isLoading: queryLoading,
    error: queryError,
    refetch,
    isRefetching,
  } = useProjectColumns(projectSlug);

  const [error, setError] = useState<string | null>(null);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get columns with cards from Zustand store
  const columns = getColumns(projectSlug);

  const fetchCardsForColumns = useCallback(
    async (columns: any[]) => {
      setIsLoadingCards(true);
      try {
        const columnsWithCards = await Promise.all(
          columns.map(async (column: any) => {
            const cardsResponse = await fetch(
              `/api/columns/${column.id}/cards`,
              {
                headers: {
                  "Cache-Control": "no-cache",
                },
              }
            );
            const cardsData = cardsResponse.ok
              ? await cardsResponse.json()
              : [];

            return {
              ...column,
              cards: cardsData.sort(
                (a: Card, b: Card) => a.position - b.position
              ),
            };
          })
        );

        const sortedColumns = columnsWithCards.sort(
          (a, b) => a.position - b.position
        );

        setColumns(projectSlug, sortedColumns);
        onDataChange?.();
        setError(null);
      } catch (err) {
        console.error("Error fetching cards:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch cards");
      } finally {
        setIsLoadingCards(false);
      }
    },
    [projectSlug, onDataChange, setColumns]
  );

  // Update columns when data changes
  useEffect(() => {
    if (columnsData) {
      fetchCardsForColumns(columnsData);
    }
  }, [columnsData, fetchCardsForColumns]);

  // Handle query error
  useEffect(() => {
    if (queryError) {
      setError(
        queryError instanceof Error ? queryError.message : "An error occurred"
      );
    }
  }, [queryError]);

  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      refetch();
    }, 500);
  }, [refetch]);

  const manualRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    columns,
    loading: queryLoading || isLoadingCards,
    error,
    isRefetching: isRefetching || isLoadingCards,
    fetchKanbanData: manualRefresh,
    debouncedRefresh,
    manualRefresh,
  };
}
