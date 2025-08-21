import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, momentLocalizer, Event, View } from "react-big-calendar";
import moment from "moment";
import {
  RefreshCw,
  Calendar as CalendarIcon,
  User,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Copy,
  Archive,
} from "lucide-react";
import { Card } from "@/types/forms/tasks";
import { MIN_FETCH_INTERVAL } from "@/lib/constants/limits";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  projectId: string;
  projectSlug: string;
  userId: string;
  canEditCards?: boolean;
  onDataChange?: () => void;
  refreshTrigger?: number;
}

interface CalendarEvent extends Event {
  id: string;
  card: Card;
}

interface BulkActions {
  selectedCards: Set<string>;
  isVisible: boolean;
}

// Custom hook for managing calendar data
function useCalendarData(projectSlug: string, onDataChange?: () => void) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  const lastFetchTime = React.useRef<number>(0);
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchCalendarData = useCallback(
    async (showLoader = true) => {
      try {
        const now = Date.now();
        if (now - lastFetchTime.current < MIN_FETCH_INTERVAL) {
          return;
        }

        if (showLoader) {
          setLoading(true);
        } else {
          setIsRefetching(true);
        }
        setError(null);
        lastFetchTime.current = now;

        // Fetch all cards for the project
        const response = await fetch(`/api/projects/${projectSlug}/cards`, {
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch cards");
        }

        const cardsData = await response.json();
        setCards(cardsData);
        onDataChange?.();
      } catch (err) {
        console.error("Error fetching calendar data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        setIsRefetching(false);
      }
    },
    [projectSlug, onDataChange]
  );

  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      fetchCalendarData(false);
    }, 500);
  }, [fetchCalendarData]);

  const manualRefresh = useCallback(() => {
    fetchCalendarData(false);
  }, [fetchCalendarData]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    cards,
    loading,
    error,
    isRefetching,
    fetchCalendarData,
    debouncedRefresh,
    manualRefresh,
  };
}

// Bulk Actions Toolbar Component
function BulkActionsToolbar({
  selectedCards,
  onAction,
  onClose,
}: {
  selectedCards: Set<string>;
  onAction: (action: string, cardIds: string[]) => void;
  onClose: () => void;
}) {
  const cardIds = Array.from(selectedCards);

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white shadow-lg rounded-lg border p-4 min-w-96">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900">
            {cardIds.length} card{cardIds.length !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAction("edit", cardIds)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            onClick={() => onAction("duplicate", cardIds)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
          >
            <Copy size={14} />
            Duplicate
          </button>
          <button
            onClick={() => onAction("archive", cardIds)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200"
          >
            <Archive size={14} />
            Archive
          </button>
          <button
            onClick={() => onAction("delete", cardIds)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Custom Event Component
function CustomEvent({ event }: { event: CalendarEvent }) {
  const { card } = event;

  const getPriorityColor = (priority: Card["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 border-red-400 text-red-800";
      case "medium":
        return "bg-yellow-100 border-yellow-400 text-yellow-800";
      case "low":
        return "bg-green-100 border-green-400 text-green-800";
      default:
        return "bg-gray-100 border-gray-400 text-gray-800";
    }
  };

  return (
    <div
      className={`p-1 rounded text-xs border-l-4 ${getPriorityColor(card.priority)}`}
    >
      <div className="font-medium truncate">{card.title}</div>

      {card.labels && card.labels.length > 0 && (
        <div className="flex gap-1 mt-1 overflow-hidden">
          {card.labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="px-1 py-0.5 text-xs rounded-full font-medium"
              style={{
                backgroundColor: label.color + "40",
                color: label.color,
              }}
            >
              {label.name}
            </span>
          ))}
          {card.labels.length > 2 && (
            <span className="text-xs text-gray-500">
              +{card.labels.length - 2}
            </span>
          )}
        </div>
      )}

      {card.assignee && (
        <div className="flex items-center mt-1">
          {card.assignee.avatarUrl ? (
            <img
              src={card.assignee.avatarUrl}
              alt={`${card.assignee.firstName} ${card.assignee.lastName}`}
              className="w-4 h-4 rounded-full mr-1"
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center mr-1">
              <User size={10} className="text-blue-600" />
            </div>
          )}
          <span className="text-xs text-gray-600 truncate">
            {card.assignee.firstName}
          </span>
        </div>
      )}
    </div>
  );
}

// Main Calendar View Component
export default function CalendarView({
  projectId,
  projectSlug,
  userId,
  canEditCards = true,
  onDataChange,
  refreshTrigger,
}: CalendarViewProps) {
  const router = useRouter();
  const {
    cards,
    loading,
    error,
    isRefetching,
    fetchCalendarData,
    debouncedRefresh,
    manualRefresh,
  } = useCalendarData(projectSlug, onDataChange);

  const [currentView, setCurrentView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bulkActions, setBulkActions] = useState<BulkActions>({
    selectedCards: new Set(),
    isVisible: false,
  });

  // Initial fetch
  useEffect(() => {
    if (projectSlug) {
      fetchCalendarData();
    }
  }, [projectSlug, fetchCalendarData]);

  // Handle external refresh triggers
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      debouncedRefresh();
    }
  }, [refreshTrigger, debouncedRefresh]);

  // Convert cards to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return cards
      .filter((card) => card.dueDate)
      .map((card) => ({
        id: card.id,
        title: card.title,
        start: new Date(card.dueDate!),
        end: new Date(card.dueDate!),
        card,
      }));
  }, [cards]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts if no input is focused
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "a":
            e.preventDefault();
            // Select all visible cards
            const visibleCardIds = new Set(events.map((event) => event.id));
            setBulkActions({
              selectedCards: visibleCardIds,
              isVisible: visibleCardIds.size > 0,
            });
            break;
          case "r":
            e.preventDefault();
            manualRefresh();
            break;
        }
      }

      switch (e.key) {
        case "Escape":
          setBulkActions({ selectedCards: new Set(), isVisible: false });
          break;
        case "Delete":
        case "Backspace":
          if (bulkActions.selectedCards.size > 0) {
            e.preventDefault();
            handleBulkAction("delete", Array.from(bulkActions.selectedCards));
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [events, bulkActions.selectedCards, manualRefresh]);

  const handleSelectEvent = useCallback(
    (event: CalendarEvent, e: React.SyntheticEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Multi-select
        setBulkActions((prev) => {
          const newSelected = new Set(prev.selectedCards);
          if (newSelected.has(event.id)) {
            newSelected.delete(event.id);
          } else {
            newSelected.add(event.id);
          }
          return {
            selectedCards: newSelected,
            isVisible: newSelected.size > 0,
          };
        });
      } else if (bulkActions.selectedCards.size > 0) {
        // Clear selection and navigate
        setBulkActions({ selectedCards: new Set(), isVisible: false });
        router.push(`/projects/${projectSlug}/cards/${event.id}`);
      } else {
        // Normal navigation
        router.push(`/projects/${projectSlug}/cards/${event.id}`);
      }
    },
    [projectSlug, router, bulkActions.selectedCards.size]
  );

  const handleEventDrop = useCallback(
    async ({ event, start }: { event: CalendarEvent; start: Date }) => {
      if (!canEditCards) return;

      const cardId = event.id;
      const newDueDate = start;

      try {
        const response = await fetch(`/api/cards/${cardId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dueDate: newDueDate.toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update due date");
        }

        // Refresh the calendar data
        debouncedRefresh();
      } catch (error) {
        console.error("Failed to update card due date:", error);
        // Could show a toast notification here
      }
    },
    [canEditCards, debouncedRefresh]
  );

  const handleBulkAction = useCallback(
    async (action: string, cardIds: string[]) => {
      // Implement bulk actions here
      console.log(`Bulk action: ${action}`, cardIds);

      try {
        switch (action) {
          case "delete":
            // Implement bulk delete
            await Promise.all(
              cardIds.map((cardId) =>
                fetch(`/api/cards/${cardId}`, { method: "DELETE" })
              )
            );
            break;
          case "archive":
            // Implement bulk archive
            await Promise.all(
              cardIds.map((cardId) =>
                fetch(`/api/cards/${cardId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ isArchived: true }),
                })
              )
            );
            break;
          case "duplicate":
            // Implement bulk duplicate
            await Promise.all(
              cardIds.map((cardId) =>
                fetch(`/api/cards/${cardId}/duplicate`, { method: "POST" })
              )
            );
            break;
          case "edit":
            // For edit, you might want to open a bulk edit modal
            console.log("Bulk edit not implemented yet");
            break;
        }

        // Clear selection and refresh
        setBulkActions({ selectedCards: new Set(), isVisible: false });
        debouncedRefresh();
      } catch (error) {
        console.error(`Bulk ${action} failed:`, error);
      }
    },
    [debouncedRefresh]
  );

  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const isSelected = bulkActions.selectedCards.has(event.id);

      let backgroundColor = "#3174ad";
      let borderColor = "#3174ad";

      switch (event.card.priority) {
        case "high":
          backgroundColor = "#dc2626";
          borderColor = "#dc2626";
          break;
        case "medium":
          backgroundColor = "#d97706";
          borderColor = "#d97706";
          break;
        case "low":
          backgroundColor = "#16a34a";
          borderColor = "#16a34a";
          break;
      }

      return {
        style: {
          backgroundColor: isSelected ? "#1e40af" : backgroundColor,
          borderColor: isSelected ? "#1e40af" : borderColor,
          opacity: isSelected ? 0.8 : 1,
          border: isSelected ? "2px solid #1e40af" : `1px solid ${borderColor}`,
        },
      };
    },
    [bulkActions.selectedCards]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 mb-2">Error loading calendar</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={manualRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Calendar View</h3>
          <span className="text-sm text-gray-500">
            ({events.length} card{events.length !== 1 ? "s" : ""} with due
            dates)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Keyboard shortcuts help */}
          <div className="text-xs text-gray-500">
            <span className="hidden sm:inline">
              Ctrl+A: Select all • Ctrl+R: Refresh • Esc: Clear selection
            </span>
          </div>

          {/* Refresh indicator */}
          {isRefetching && (
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              <RefreshCw size={14} className="animate-spin" />
              Syncing...
            </div>
          )}

          {/* Manual refresh button */}
          <button
            onClick={manualRefresh}
            disabled={isRefetching}
            className="p-2 bg-white shadow-sm rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh calendar (Ctrl+R)"
          >
            <RefreshCw
              size={16}
              className={isRefetching ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ height: "calc(100vh - 200px)" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          onSelectEvent={handleSelectEvent}
          onEventDrop={canEditCards ? handleEventDrop : undefined}
          eventPropGetter={eventStyleGetter}
          components={{
            event: CustomEvent,
          }}
          views={["month", "week", "day", "agenda"]}
          step={60}
          showMultiDayTimes
          culture="en-US"
          style={{ height: "100%" }}
          dayLayoutAlgorithm="no-overlap"
        />
      </div>

      {/* Bulk Actions Toolbar */}
      {bulkActions.isVisible && (
        <BulkActionsToolbar
          selectedCards={bulkActions.selectedCards}
          onAction={handleBulkAction}
          onClose={() =>
            setBulkActions({ selectedCards: new Set(), isVisible: false })
          }
        />
      )}

      {/* Empty state */}
      {events.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-lg font-medium mb-1">No cards with due dates</p>
            <p className="text-sm">
              Cards will appear on the calendar when you set due dates
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
