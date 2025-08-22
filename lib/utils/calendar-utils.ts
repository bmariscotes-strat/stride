// lib/utils/calendar-utils.ts

import { Card, Label } from "@/types/forms/tasks";

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  action: string;
  description: string;
}

export const CALENDAR_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: "a",
    ctrlKey: true,
    action: "select_all",
    description: "Select all visible cards",
  },
  {
    key: "r",
    ctrlKey: true,
    action: "refresh",
    description: "Refresh calendar data",
  },
  {
    key: "Escape",
    action: "clear_selection",
    description: "Clear current selection",
  },
  {
    key: "Delete",
    action: "delete_selected",
    description: "Delete selected cards",
  },
  {
    key: "Backspace",
    action: "delete_selected",
    description: "Delete selected cards",
  },
];

export interface BulkOperation {
  id: string;
  label: string;
  icon: string;
  action: (cardIds: string[]) => Promise<void>;
  confirmationMessage?: (count: number) => string;
  variant?: "default" | "danger" | "warning";
}

export const createBulkOperations = (
  projectSlug: string,
  onComplete: () => void
): BulkOperation[] => [
  {
    id: "archive",
    label: "Archive",
    icon: "Archive",
    variant: "warning",
    confirmationMessage: (count: number) =>
      `Are you sure you want to archive ${count} card${count !== 1 ? "s" : ""}?`,
    action: async (cardIds: string[]) => {
      const results = await Promise.allSettled(
        cardIds.map(async (cardId) => {
          const response = await fetch(`/api/cards/${cardId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ isArchived: true }),
          });
          if (!response.ok) {
            throw new Error(`Failed to archive card ${cardId}`);
          }
          return response.json();
        })
      );

      const failed = results.filter(
        (result) => result.status === "rejected"
      ).length;

      if (failed > 0) {
        console.error(`Failed to archive ${failed} cards`);
      }

      onComplete();
    },
  },
  {
    id: "delete",
    label: "Delete",
    icon: "Trash2",
    variant: "danger",
    confirmationMessage: (count: number) =>
      `Are you sure you want to permanently delete ${count} card${count !== 1 ? "s" : ""}? This action cannot be undone.`,
    action: async (cardIds: string[]) => {
      const results = await Promise.allSettled(
        cardIds.map(async (cardId) => {
          const response = await fetch(`/api/cards/${cardId}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            throw new Error(`Failed to delete card ${cardId}`);
          }
        })
      );

      const failed = results.filter(
        (result) => result.status === "rejected"
      ).length;

      if (failed > 0) {
        console.error(`Failed to delete ${failed} cards`);
      }

      onComplete();
    },
  },
];

// Utility function to get priority color classes
export const getPriorityColorClasses = (priority: Card["priority"]) => {
  switch (priority) {
    case "high":
      return {
        bg: "bg-red-100",
        border: "border-red-400",
        text: "text-red-800",
        solid: "#dc2626",
      };
    case "medium":
      return {
        bg: "bg-yellow-100",
        border: "border-yellow-400",
        text: "text-yellow-800",
        solid: "#d97706",
      };
    case "low":
      return {
        bg: "bg-green-100",
        border: "border-green-400",
        text: "text-green-800",
        solid: "#16a34a",
      };
    default:
      return {
        bg: "bg-gray-100",
        border: "border-gray-400",
        text: "text-gray-800",
        solid: "#6b7280",
      };
  }
};

// Utility function to format dates
export const formatCalendarDate = (date: Date | string | null) => {
  if (!date) return null;

  const dateObj = typeof date === "string" ? new Date(date) : date;

  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Utility function to check if a date is today
export const isToday = (date: Date) => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// Utility function to check if a date is overdue
export const isOverdue = (date: Date | null) => {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
};

// Utility function to group cards by date
export const groupCardsByDate = (cards: Card[]) => {
  const groups = new Map<string, Card[]>();

  cards.forEach((card) => {
    if (card.dueDate) {
      const dateKey = formatCalendarDate(card.dueDate) || "No date";
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(card);
    }
  });

  return groups;
};
