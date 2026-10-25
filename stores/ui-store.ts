import { create } from "zustand";
import { persist } from "zustand/middleware";

/** What the Discover graph draws, besides the topics and their co-occurrence. */
export type GraphOptions = { tags: boolean; tagEdges: boolean; hierarchy: boolean; minimap: boolean };

/** Client-only UI state: the chat panel's visibility, the filter rail's, the
 *  Discover graph's options, and the control set the user picked. Everything
 *  the pages show comes from the URL (lib/url/filters.ts) or the server. */
type UiState = {
  chatOpen: boolean;
  /** Whether the summaries page shows its filter rail; kept across reloads. */
  filtersOpen: boolean;
  /** The Discover graph's options; kept across reloads. */
  graph: GraphOptions;
  /** The control set every request carries (X-Control-Set), one of the
   *  user's own; null until the user picks one, and kept across reloads. */
  controlset: string | null;
  toggleChat: () => void;
  toggleFilters: () => void;
  setGraph: (patch: Partial<GraphOptions>) => void;
  setControlset: (id: string) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      chatOpen: false,
      filtersOpen: true,
      graph: { tags: true, tagEdges: true, hierarchy: true, minimap: true },
      controlset: null,
      toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
      toggleFilters: () => set((s) => ({ filtersOpen: !s.filtersOpen })),
      setGraph: (patch) => set((s) => ({ graph: { ...s.graph, ...patch } })),
      setControlset: (id) => set({ controlset: id }),
    }),
    {
      name: "summary-ui.ui",
      // The control set, the rail and the graph options are durable preferences; the chat panel is not.
      partialize: (s) => ({ controlset: s.controlset, filtersOpen: s.filtersOpen, graph: s.graph }),


    },
  ),
);

/** The picked control set, read outside React by the fetch client. */
export function currentControlset() {
  return useUiStore.getState().controlset;
}
