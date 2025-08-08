import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface NotificationUIState {
  // UI state that can be shared across components
  isOpen: boolean;

  // Filter and sort state for future enhancements
  filterType: "all" | "unread" | "read";
  sortBy: "newest" | "oldest" | "type";

  // Global notification preferences
  globalNotificationsEnabled: boolean;
  soundEnabled: boolean;

  // Recent activity for badge animations
  hasNewNotifications: boolean;
  lastNotificationTime: number | null;
}

export interface NotificationUIActions {
  // UI actions
  setIsOpen: (isOpen: boolean) => void;
  toggleDropdown: () => void;
  closeDropdown: () => void;

  // Filter and sort actions
  setFilterType: (filterType: NotificationUIState["filterType"]) => void;
  setSortBy: (sortBy: NotificationUIState["sortBy"]) => void;

  // Preference actions
  setGlobalNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;

  // Activity tracking
  setHasNewNotifications: (hasNew: boolean) => void;
  setLastNotificationTime: (timestamp: number) => void;

  // Reset actions
  resetUIState: () => void;
}

type NotificationUIStore = NotificationUIState & NotificationUIActions;

const initialState: NotificationUIState = {
  isOpen: false,
  filterType: "all",
  sortBy: "newest",
  globalNotificationsEnabled: true,
  soundEnabled: false,
  hasNewNotifications: false,
  lastNotificationTime: null,
};

export const useNotificationStore = create<NotificationUIStore>()(
  devtools(
    (set) => ({
      ...initialState,

      // UI actions
      setIsOpen: (isOpen) => set({ isOpen }, false, "setIsOpen"),

      toggleDropdown: () =>
        set((state) => ({ isOpen: !state.isOpen }), false, "toggleDropdown"),

      closeDropdown: () => set({ isOpen: false }, false, "closeDropdown"),

      // Filter and sort actions
      setFilterType: (filterType) =>
        set({ filterType }, false, "setFilterType"),

      setSortBy: (sortBy) => set({ sortBy }, false, "setSortBy"),

      // Preference actions
      setGlobalNotificationsEnabled: (enabled) =>
        set(
          { globalNotificationsEnabled: enabled },
          false,
          "setGlobalNotificationsEnabled"
        ),

      setSoundEnabled: (enabled) =>
        set({ soundEnabled: enabled }, false, "setSoundEnabled"),

      // Activity tracking
      setHasNewNotifications: (hasNew) =>
        set({ hasNewNotifications: hasNew }, false, "setHasNewNotifications"),

      setLastNotificationTime: (timestamp) =>
        set(
          { lastNotificationTime: timestamp },
          false,
          "setLastNotificationTime"
        ),

      // Reset actions
      resetUIState: () => set(initialState, false, "resetUIState"),
    }),
    {
      name: "notification-ui-store",
      // Persist user preferences
      partialize: (state: any) => ({
        filterType: state.filterType,
        sortBy: state.sortBy,
        globalNotificationsEnabled: state.globalNotificationsEnabled,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);

// Optimized selectors
export const useNotificationUISelectors = () => {
  const isOpen = useNotificationStore((state) => state.isOpen);
  const filterType = useNotificationStore((state) => state.filterType);
  const sortBy = useNotificationStore((state) => state.sortBy);
  const hasNewNotifications = useNotificationStore(
    (state) => state.hasNewNotifications
  );
  const globalNotificationsEnabled = useNotificationStore(
    (state) => state.globalNotificationsEnabled
  );
  const soundEnabled = useNotificationStore((state) => state.soundEnabled);

  return {
    isOpen,
    filterType,
    sortBy,
    hasNewNotifications,
    globalNotificationsEnabled,
    soundEnabled,
  };
};
