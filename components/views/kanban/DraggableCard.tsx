import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/types/forms/tasks";

interface DraggableCardProps {
  card: Card;
  projectSlug: string;
  userId?: string; // Add userId prop
  canUserEditCards?: boolean; // Add general permission prop
}

export function DraggableCard({
  card,
  projectSlug,
  userId,
  canUserEditCards = true,
}: DraggableCardProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);

  // Check if current user can edit THIS specific card
  const canEditThisCard =
    canUserEditCards &&
    userId &&
    (card.assigneeId === userId || card.ownerId === userId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: dndIsDragging,
  } = useSortable({
    id: card.id,
    disabled: !canEditThisCard, // Disable dragging if no permission
  });

  React.useEffect(() => {
    setIsDragging(dndIsDragging);
  }, [dndIsDragging]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getPriorityColor = (priority: Card["priority"]) => {
    switch (priority) {
      case "high":
        return "border-l-red-400 bg-red-50";
      case "medium":
        return "border-l-yellow-400 bg-yellow-50";
      case "low":
        return "border-l-green-400 bg-green-50";
      default:
        return "border-l-gray-300 bg-white";
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isDragging) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    router.push(`/projects/${projectSlug}/cards/${card.id}`);
  };

  const handleDragAttempt = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canEditThisCard) {
      e.preventDefault();
      e.stopPropagation();

      // Show toast
      toast.error("Only task assignee or owner can move this card");

      // Trigger wiggle animation
      setIsWiggling(true);
      setTimeout(() => setIsWiggling(false), 500);

      return false;
    }
    return true;
  };

  // Only apply drag handlers if user can edit this card
  const dragHandlers = canEditThisCard
    ? {
        ...attributes,
        ...listeners,
        onMouseDown: (e: React.MouseEvent) => {
          if (handleDragAttempt(e) && listeners?.onMouseDown) {
            listeners.onMouseDown(e as any);
          }
        },
        onTouchStart: (e: React.TouchEvent) => {
          if (handleDragAttempt(e) && listeners?.onTouchStart) {
            listeners.onTouchStart(e as any);
          }
        },
      }
    : {
        onMouseDown: handleDragAttempt,
        onTouchStart: handleDragAttempt,
      };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragHandlers}
      onClick={handleCardClick}
      className={`p-3 mb-3 rounded-lg border-l-4 shadow-sm transition-all duration-200 ${getPriorityColor(card.priority)} ${
        isDragging
          ? "cursor-grabbing"
          : canEditThisCard
            ? "cursor-pointer hover:scale-[1.02] hover:shadow-md"
            : "cursor-pointer"
      } ${isWiggling ? "animate-wiggle" : ""}`}
    >
      <style jsx>{`
        @keyframes wiggle {
          0%,
          7%,
          14%,
          21% {
            transform: translateX(0px);
          }
          3.5% {
            transform: translateX(-2px);
          }
          10.5% {
            transform: translateX(2px);
          }
          17.5% {
            transform: translateX(-2px);
          }
        }

        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out;
        }
      `}</style>

      <div className="mb-3">
        <h4 className="font-medium text-gray-900 line-clamp-2 text-left">
          {card.title}
        </h4>

        {(card.labels ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(card.labels ?? []).map((label) => (
              <span
                key={label.id}
                className="px-2 py-0.5 text-xs rounded-full font-medium"
                style={{
                  backgroundColor: label.color + "20",
                  color: label.color,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {card.assignee && (
            <div className="flex items-center space-x-1">
              {card.assignee.avatarUrl ? (
                <img
                  src={card.assignee.avatarUrl}
                  alt={`${card.assignee.firstName} ${card.assignee.lastName}`}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <User size={14} className="text-blue-600" />
                </div>
              )}
              <span className="text-xs text-gray-600">
                {card.assignee.firstName} {card.assignee.lastName}
              </span>
            </div>
          )}
        </div>

        {card.dueDate && (
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Calendar size={12} />
            <span>{formatDate(card.dueDate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
