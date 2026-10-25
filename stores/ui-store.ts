import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Client-only UI state: the chat panel's visibility, the filter rail's, and
 *  the control set the user picked. Everything the pages show comes from the
 *  URL (lib/url/filters.ts) or the server. */
type UiState = {
  chatOpen: boolean;
  /** Whether the summaries page shows its filter rail; kept across reloads. */
  filtersOpen: boolean;
  /** The control set every request carries (X-Control-Set), one of the
   *  user's own; null until the user picks one, and kept across reloads. */
  controlset: string | null;
  toggleChat: () => void;
  toggleFilters: () => void;
  setControlset: (id: string) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      chatOpen: false,
      filtersOpen: true,
      controlset: null,
      toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
      toggleFilters: () => set((s) => ({ filtersOpen: !s.filtersOpen })),
      setControlset: (id) => set({ controlset: id }),
    }),
    {
      name: "summary-ui.ui",
      // The control set and the rail are durable preferences; the chat panel is not.
      partialize: (s) => ({ controlset: s.controlset, filtersOpen: s.filtersOpen }),

    },
  ),
);

/** The picked control set, read outside React by the fetch client. */
export function currentControlset() {
  return useUiStore.getState().controlset;
}
