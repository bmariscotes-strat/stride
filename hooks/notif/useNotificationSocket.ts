// hooks/useNotificationSocket.ts
import { useState, useEffect, useCallback, useRef } from "react";
import io from "socket.io-client";
import { NotificationWithRelations } from "@/types";

interface ServerToClientEvents {
  "notification:new": (notification: NotificationWithRelations) => void;
  "notification:updated": (
    notificationId: number,
    updates: { isRead: boolean }
  ) => void;
  "notification:deleted": (notificationId: number) => void;
  "notification:bulk_read": (userId: string) => void;
  "notification:count_updated": (count: number) => void;
  "connection:established": (data: {
    userId: string;
    socketId: string;
  }) => void;
  error: (error: string) => void;
}

interface ClientToServerEvents {
  "auth:join_user_room": (userId: string) => void;
  "auth:leave_user_room": (userId: string) => void;
  "notification:mark_read": (notificationId: number) => void;
  "notification:mark_all_read": (userId: string) => void;
  "notification:delete": (notificationId: number) => void;
  "notification:get_initial": (userId: string, limit?: number) => void;
  "notification:get_more": (
    userId: string,
    offset: number,
    limit?: number
  ) => void;
}

interface UseNotificationSocketProps {
  userId: string | null;
  enabled?: boolean;
  autoConnect?: boolean;
}

// Define socket type that uses our event interfaces
type SocketType = SocketIOClient.Socket;

// Type-safe socket helpers that use our event interfaces
type TypedSocket = {
  emit<T extends keyof ClientToServerEvents>(
    event: T,
    ...args: Parameters<ClientToServerEvents[T]>
  ): boolean;
  on<T extends keyof ServerToClientEvents>(
    event: T,
    listener: ServerToClientEvents[T]
  ): TypedSocket;
  off<T extends keyof ServerToClientEvents>(
    event: T,
    listener?: ServerToClientEvents[T]
  ): TypedSocket;
} & SocketIOClient.Socket;

interface UseNotificationSocketReturn {
  socket: TypedSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // Connection methods
  connect: () => void;
  disconnect: () => void;

  // Notification methods
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: number) => void;

  // Event listeners
  onNotificationReceived: (
    callback: (notification: NotificationWithRelations) => void
  ) => () => void;
  onNotificationUpdated: (
    callback: (notificationId: number, updates: { isRead: boolean }) => void
  ) => () => void;
  onNotificationDeleted: (
    callback: (notificationId: number) => void
  ) => () => void;
  onBulkRead: (callback: (userId: string) => void) => () => void;
  onUnreadCountUpdated: (callback: (count: number) => void) => () => void;
}

export function useNotificationSocket({
  userId,
  enabled = true,
  autoConnect = true,
}: UseNotificationSocketProps): UseNotificationSocketReturn {
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<TypedSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Connection function
  const connect = useCallback(() => {
    if (!userId || !enabled || socketRef.current?.connected) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const socketInstance = io(
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        {
          transports: ["websocket", "polling"],
          timeout: 10000,
          forceNew: false,
          reconnection: true,
          reconnectionAttempts: maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        }
      ) as TypedSocket;

      socketRef.current = socketInstance;
      setSocket(socketInstance);

      // Connection event handlers
      socketInstance.on("connect", () => {
        console.log("[Socket.IO Client] Connected to server");
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttempts.current = 0;

        // Join user room immediately after connection
        if (userId) {
          socketInstance.emit("auth:join_user_room", userId);
        }
      });

      socketInstance.on("disconnect", (reason: any) => {
        console.log("[Socket.IO Client] Disconnected:", reason);
        setIsConnected(false);
        setIsConnecting(false);

        // Only attempt to reconnect for certain disconnect reasons
        if (reason === "io server disconnect") {
          setError("Server disconnected the connection");
        } else if (
          reason === "transport close" ||
          reason === "transport error"
        ) {
          setError("Connection lost. Attempting to reconnect...");
        }
      });

      socketInstance.on("connect_error", (err: any) => {
        console.error("[Socket.IO Client] Connection error:", err);
        setIsConnecting(false);
        reconnectAttempts.current++;

        if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError("Failed to connect to notification service");
        } else {
          setError(
            `Connection attempt ${reconnectAttempts.current}/${maxReconnectAttempts} failed`
          );
        }
      });

      socketInstance.on("reconnect", (attemptNumber: any) => {
        console.log(
          "[Socket.IO Client] Reconnected after",
          attemptNumber,
          "attempts"
        );
        setError(null);
        reconnectAttempts.current = 0;
      });

      socketInstance.on("reconnect_error", (err: any) => {
        console.error("[Socket.IO Client] Reconnection error:", err);
        reconnectAttempts.current++;

        if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError("Unable to reconnect to notification service");
        }
      });

      // Server event handlers
      socketInstance.on("connection:established", (data) => {
        console.log("[Socket.IO Client] Connection established:", data);
      });

      socketInstance.on("error", (errorMessage) => {
        console.error("[Socket.IO Client] Server error:", errorMessage);
        setError(errorMessage);
      });
    } catch (err) {
      console.error("[Socket.IO Client] Failed to create socket:", err);
      setError("Failed to initialize connection");
      setIsConnecting(false);
    }
  }, [userId, enabled]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log("[Socket.IO Client] Disconnecting...");

      if (userId && socketRef.current.connected) {
        socketRef.current.emit("auth:leave_user_room", userId);
      }

      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
      setError(null);
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [userId]);

  // Notification action methods
  const markAsRead = useCallback((notificationId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("notification:mark_read", notificationId);
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    if (socketRef.current?.connected && userId) {
      socketRef.current.emit("notification:mark_all_read", userId);
    }
  }, [userId]);

  const removeNotification = useCallback((notificationId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("notification:delete", notificationId);
    }
  }, []);

  // Event listener helpers
  const onNotificationReceived = useCallback(
    (callback: (notification: NotificationWithRelations) => void) => {
      if (socketRef.current) {
        socketRef.current.on("notification:new", callback);
        return () => {
          socketRef.current?.off("notification:new", callback);
        };
      }
      return () => {};
    },
    []
  );

  const onNotificationUpdated = useCallback(
    (
      callback: (notificationId: number, updates: { isRead: boolean }) => void
    ) => {
      if (socketRef.current) {
        socketRef.current.on("notification:updated", callback);
        return () => {
          socketRef.current?.off("notification:updated", callback);
        };
      }
      return () => {};
    },
    []
  );

  const onNotificationDeleted = useCallback(
    (callback: (notificationId: number) => void) => {
      if (socketRef.current) {
        socketRef.current.on("notification:deleted", callback);
        return () => {
          socketRef.current?.off("notification:deleted", callback);
        };
      }
      return () => {};
    },
    []
  );

  const onBulkRead = useCallback((callback: (userId: string) => void) => {
    if (socketRef.current) {
      socketRef.current.on("notification:bulk_read", callback);
      return () => {
        socketRef.current?.off("notification:bulk_read", callback);
      };
    }
    return () => {};
  }, []);

  const onUnreadCountUpdated = useCallback(
    (callback: (count: number) => void) => {
      if (socketRef.current) {
        socketRef.current.on("notification:count_updated", callback);
        return () => {
          socketRef.current?.off("notification:count_updated", callback);
        };
      }
      return () => {};
    },
    []
  );

  // Auto-connect/disconnect based on userId and enabled state
  useEffect(() => {
    if (autoConnect && userId && enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [userId, enabled, autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    removeNotification,
    onNotificationReceived,
    onNotificationUpdated,
    onNotificationDeleted,
    onBulkRead,
    onUnreadCountUpdated,
  };
}
