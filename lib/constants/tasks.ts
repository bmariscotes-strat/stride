import type { Priority } from "@/types/enums/notif";

export const PRIORITY_OPTIONS: {
  value: Priority;
  label: string;
  color: string;
}[] = [
  { value: "high", label: "High", color: "bg-red-100 text-red-800" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "low", label: "Low", color: "bg-green-100 text-green-800" },
];

export const LABEL_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export const CARD_STATUS_COLORS = {
  "To Do": "bg-gray-100 text-gray-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Done: "bg-green-100 text-green-800",
  Backlog: "bg-purple-100 text-purple-800",
  Review: "bg-yellow-100 text-yellow-800",
  Blocked: "bg-red-100 text-red-800",
} as const;
