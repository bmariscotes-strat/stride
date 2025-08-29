// hooks/useProjectRealtime.ts
"use client";
import { useEffect, useRef } from "react";
import { pusherClient } from "@/lib/websocket/pusher";
import type { CardWithRelations } from "@/types";

interface CardCreatedEvent {
  card: CardWithRelations;
  columnId: string;
  userId: string;
  timestamp: string;
}

interface CardUpdatedEvent {
  card: CardWithRelations;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  userId: string;
  timestamp: string;
}

interface CardMovedEvent {
  card: CardWithRelations;
  fromColumnId: string;
  toColumnId: string;
  fromPosition: number;
  toPosition: number;
  userId: string;
  timestamp: string;
}

interface CardArchivedEvent {
  cardId: string;
  columnId: string;
  userId: string;
  timestamp: string;
}

interface CardDeletedEvent {
  cardId: string;
  columnId: string;
  title: string;
  userId: string;
  timestamp: string;
}

interface ProjectRealtimeCallbacks {
  onCardCreated?: (event: CardCreatedEvent) => void;
  onCardUpdated?: (event: CardUpdatedEvent) => void;
  onCardMoved?: (event: CardMovedEvent) => void;
  onCardArchived?: (event: CardArchivedEvent) => void;
  onCardDeleted?: (event: CardDeletedEvent) => void;
  onError?: (error: any) => void;
}

export function useProjectRealtime(
  projectId: string,
  callbacks: ProjectRealtimeCallbacks,
  currentUserId?: string // Optional: to filter out own events
) {
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!projectId) return;

    const channelName = `project-${projectId}`;
    const channel = pusherClient.subscribe(channelName);

    // Card created handler
    const handleCardCreated = (data: CardCreatedEvent) => {
      // Optionally filter out events from current user
      if (currentUserId && data.userId === currentUserId) {
        return; // Skip own events
      }

      console.log("Card created:", data);
      callbacksRef.current.onCardCreated?.(data);
    };

    // Card updated handler
    const handleCardUpdated = (data: CardUpdatedEvent) => {
      if (currentUserId && data.userId === currentUserId) {
        return;
      }

      console.log("Card updated:", data);
      callbacksRef.current.onCardUpdated?.(data);
    };

    // Card moved handler
    const handleCardMoved = (data: CardMovedEvent) => {
      if (currentUserId && data.userId === currentUserId) {
        return;
      }

      console.log("Card moved:", data);
      callbacksRef.current.onCardMoved?.(data);
    };

    // Card archived handler
    const handleCardArchived = (data: CardArchivedEvent) => {
      if (currentUserId && data.userId === currentUserId) {
        return;
      }

      console.log("Card archived:", data);
      callbacksRef.current.onCardArchived?.(data);
    };

    // Card deleted handler
    const handleCardDeleted = (data: CardDeletedEvent) => {
      if (currentUserId && data.userId === currentUserId) {
        return;
      }

      console.log("Card deleted:", data);
      callbacksRef.current.onCardDeleted?.(data);
    };

    // Error handler
    const handleError = (error: any) => {
      console.error("Pusher error:", error);
      callbacksRef.current.onError?.(error);
    };

    // Bind event listeners
    channel.bind("card-created", handleCardCreated);
    channel.bind("card-updated", handleCardUpdated);
    channel.bind("card-moved", handleCardMoved);
    channel.bind("card-archived", handleCardArchived);
    channel.bind("card-deleted", handleCardDeleted);
    channel.bind("pusher:error", handleError);

    // Cleanup
    return () => {
      channel.unbind("card-created", handleCardCreated);
      channel.unbind("card-updated", handleCardUpdated);
      channel.unbind("card-moved", handleCardMoved);
      channel.unbind("card-archived", handleCardArchived);
      channel.unbind("card-deleted", handleCardDeleted);
      channel.unbind("pusher:error", handleError);
      pusherClient.unsubscribe(channelName);
    };
  }, [projectId, currentUserId]);
}
