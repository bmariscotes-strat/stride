// =============================================================================
// ZUSTAND NOTIFICATION STORE - Client-side notification management
// =============================================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message?: string;
  cardId?: string;
  projectId?: string;
  isRead: boolean;
  createdAt: Date;
  card?: {
    id: string;
    title: string;
  };
  project?: {
    id: string;
    name: string;
  };
};

interface NotificationState {
  // State
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  lastFetchTime: number | null;

  // Actions
  setNotifications: (notifications: NotificationItem[]) => void;
  addNotification: (notification: NotificationItem) => void;
  markAsRead: (notificationIds: number[]) => void;
  markAllAsRead: () => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;

  // API Actions
  fetchNotifications: (userId: string) => Promise<void>;
  fetchUnreadCount: (userId: string) => Promise<void>;
  markNotificationsRead: (notificationIds: number[]) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;

  // Real-time actions
  handleNewNotification: (notification: NotificationItem) => void;

  // Utils
  shouldRefresh: () => boolean;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      // Initial State
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      lastFetchTime: null,

      // State Setters
      setNotifications: (notifications) =>
        set(
          {
            notifications,
            lastFetchTime: Date.now(),
          },
          false,
          "setNotifications"
        ),

      addNotification: (notification) =>
        set(
          (state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: notification.isRead
              ? state.unreadCount
              : state.unreadCount + 1,
          }),
          false,
          "addNotification"
        ),

      markAsRead: (notificationIds) =>
        set(
          (state) => {
            const updatedNotifications = state.notifications.map(
              (notification) =>
                notificationIds.includes(notification.id)
                  ? { ...notification, isRead: true }
                  : notification
            );

            const unmarkedCount = notificationIds.filter((id) => {
              const notification = state.notifications.find((n) => n.id === id);
              return notification && !notification.isRead;
            }).length;

            return {
              notifications: updatedNotifications,
              unreadCount: Math.max(0, state.unreadCount - unmarkedCount),
            };
          },
          false,
          "markAsRead"
        ),

      markAllAsRead: () =>
        set(
          (state) => ({
            notifications: state.notifications.map((notification) => ({
              ...notification,
              isRead: true,
            })),
            unreadCount: 0,
          }),
          false,
          "markAllAsRead"
        ),

      setUnreadCount: (count) =>
        set({ unreadCount: count }, false, "setUnreadCount"),

      setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),

      // API Actions
      fetchNotifications: async (userId: string) => {
        set({ isLoading: true });

        try {
          const response = await fetch(`/api/notifications/${userId}`);
          const data = await response.json();

          if (response.ok) {
            set({
              notifications: data.notifications,
              unreadCount: data.unreadCount || 0,
              lastFetchTime: Date.now(),
              isLoading: false,
            });
          } else {
            console.error("Failed to fetch notifications:", data.error);
            set({ isLoading: false });
          }
        } catch (error) {
          console.error("Error fetching notifications:", error);
          set({ isLoading: false });
        }
      },

      fetchUnreadCount: async (userId: string) => {
        try {
          const response = await fetch(
            `/api/notifications/${userId}/unread-count`
          );
          const data = await response.json();

          if (response.ok) {
            set({ unreadCount: data.count });
          }
        } catch (error) {
          console.error("Error fetching unread count:", error);
        }
      },

      markNotificationsRead: async (notificationIds: number[]) => {
        // Optimistically update the UI
        get().markAsRead(notificationIds);

        try {
          const response = await fetch("/api/notifications/mark-read", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ notificationIds }),
          });

          if (!response.ok) {
            // Revert optimistic update if failed
            // In a real app, you'd want to restore the previous state
            console.error("Failed to mark notifications as read");
          }
        } catch (error) {
          console.error("Error marking notifications as read:", error);
          // Revert optimistic update
        }
      },

      markAllNotificationsRead: async (userId: string) => {
        // Optimistically update the UI
        get().markAllAsRead();

        try {
          const response = await fetch(
            `/api/notifications/${userId}/mark-all-read`,
            {
              method: "POST",
            }
          );

          if (!response.ok) {
            console.error("Failed to mark all notifications as read");
          }
        } catch (error) {
          console.error("Error marking all notifications as read:", error);
        }
      },

      // Real-time handlers
      handleNewNotification: (notification) => {
        get().addNotification(notification);

        // Optional: Show toast notification
        // You can integrate with react-hot-toast or similar here
        if (typeof window !== "undefined") {
          // Show browser notification if permission granted
          if (Notification.permission === "granted") {
            new Notification(notification.title, {
              body: notification.message,
              icon: "/favicon.ico", // Your app icon
            });
          }
        }
      },

      // Utility methods
      shouldRefresh: () => {
        const { lastFetchTime } = get();
        if (!lastFetchTime) return true;

        // Refresh if data is older than 5 minutes
        const FIVE_MINUTES = 5 * 60 * 1000;
        return Date.now() - lastFetchTime > FIVE_MINUTES;
      },

      reset: () =>
        set(
          {
            notifications: [],
            unreadCount: 0,
            isLoading: false,
            lastFetchTime: null,
          },
          false,
          "reset"
        ),
    }),
    {
      name: "notification-store",
    }
  )
);

// =============================================================================
// HOOK HELPERS
// =============================================================================

// Hook to get unread notifications only
export const useUnreadNotifications = () => {
  return useNotificationStore((state) =>
    state.notifications.filter((notification) => !notification.isRead)
  );
};

// Hook to get notifications for a specific card
export const useCardNotifications = (cardId: string) => {
  return useNotificationStore((state) =>
    state.notifications.filter((notification) => notification.cardId === cardId)
  );
};

// Hook to get notifications for a specific project
export const useProjectNotifications = (projectId: string) => {
  return useNotificationStore((state) =>
    state.notifications.filter(
      (notification) => notification.projectId === projectId
    )
  );
};

// =============================================================================
// REAL-TIME INTEGRATION HELPERS
// =============================================================================

// WebSocket integration helper
export const setupNotificationWebSocket = (userId: string) => {
  if (typeof window === "undefined") return;

  const ws = new WebSocket(`ws://your-websocket-url/${userId}`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "notification") {
        useNotificationStore
          .getState()
          .handleNewNotification(data.notification);
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return ws;
};

// Server-Sent Events integration helper
export const setupNotificationSSE = (userId: string) => {
  if (typeof window === "undefined") return;

  const eventSource = new EventSource(`/api/notifications/${userId}/stream`);

  eventSource.onmessage = (event) => {
    try {
      const notification = JSON.parse(event.data);
      useNotificationStore.getState().handleNewNotification(notification);
    } catch (error) {
      console.error("Error parsing SSE message:", error);
    }
  };

  eventSource.onerror = (error) => {
    console.error("SSE error:", error);
  };

  return eventSource;
};

// =============================================================================
// COMPONENT USAGE EXAMPLES
// =============================================================================

/*
// In your React components:

// Basic notification bell component
function NotificationBell() {
  const { unreadCount, fetchUnreadCount } = useNotificationStore();
  const userId = useCurrentUser().id;
  
  useEffect(() => {
    fetchUnreadCount(userId);
    
    // Set up periodic refresh
    const interval = setInterval(() => {
      fetchUnreadCount(userId);
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [userId]);
  
  return (
    <button className="relative">
      <BellIcon />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs px-1">
          {unreadCount}
        </span>
      )}
    </button>
  );
}

// Notification dropdown component
function NotificationDropdown() {
  const { 
    notifications, 
    isLoading, 
    fetchNotifications, 
    markNotificationsRead 
  } = useNotificationStore();
  
  const unreadNotifications = useUnreadNotifications();
  const userId = useCurrentUser().id;
  
  useEffect(() => {
    if (useNotificationStore.getState().shouldRefresh()) {
      fetchNotifications(userId);
    }
  }, [userId]);
  
  const handleMarkAsRead = (notificationIds: number[]) => {
    markNotificationsRead(notificationIds);
  };
  
  return (
    <div className="notification-dropdown">
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => handleMarkAsRead([notification.id])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// In your app setup (e.g., _app.tsx or main layout):
function AppLayout() {
  const userId = useCurrentUser().id;
  
  useEffect(() => {
    // Set up real-time notifications
    const ws = setupNotificationWebSocket(userId);
    
    return () => {
      ws?.close();
    };
  }, [userId]);
  
  return <YourAppContent />;
}
*/
