import { create } from "zustand";
import type { Hotspot, Product } from "@/types";

interface AppState {
  selectedHotspot: Hotspot | null;
  selectedProduct: Product | null;
  quoteItems: { productId: string; quantity: number }[];
  panelsOpen: boolean;
  loadingProgress: number;
  isModelLoaded: boolean;

  setSelectedHotspot: (hotspot: Hotspot | null) => void;
  setSelectedProduct: (product: Product | null) => void;
  setPanelsOpen: (open: boolean) => void;
  togglePanels: () => void;
  openPanelsWithCatalog: () => void;
  setLoadingProgress: (progress: number) => void;
  setIsModelLoaded: (loaded: boolean) => void;
  addToQuote: (productId: string) => void;
  removeFromQuote: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearQuote: () => void;
  syncQuoteWithProductCatalog: (productIds: string[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedHotspot: null,
  selectedProduct: null,
  quoteItems: [],
  panelsOpen: false,
  loadingProgress: 0,
  isModelLoaded: false,

  setSelectedHotspot: (hotspot) => set({ selectedHotspot: hotspot }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setPanelsOpen: (open) => set({ panelsOpen: open }),
  togglePanels: () => {
    const next = !get().panelsOpen;
    if (next) get().openPanelsWithCatalog();
    else set({ panelsOpen: false });
  },
  openPanelsWithCatalog: () => {
    set({ panelsOpen: true });
  },
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),
  setIsModelLoaded: (loaded) => set({ isModelLoaded: loaded }),

  syncQuoteWithProductCatalog: (productIds) => {
    if (!productIds.length) return;

    const validIds = new Set(productIds);
    const items = get().quoteItems;

    if (items.length === 0) {
      set({
        quoteItems: productIds.map((productId) => ({ productId, quantity: 1 })),
      });
      return;
    }

    const existingIds = new Set(items.map((item) => item.productId));
    const kept = items.filter((item) => validIds.has(item.productId));
    const added = productIds
      .filter((id) => !existingIds.has(id))
      .map((productId) => ({ productId, quantity: 1 }));

    if (added.length > 0 || kept.length !== items.length) {
      set({ quoteItems: [...kept, ...added] });
    }
  },

  addToQuote: (productId) => {
    const items = get().quoteItems;
    const existing = items.find((i) => i.productId === productId);
    if (existing) {
      set({
        quoteItems: items.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      set({ quoteItems: [...items, { productId, quantity: 1 }] });
    }
  },

  removeFromQuote: (productId) => {
    set({
      quoteItems: get().quoteItems.filter((i) => i.productId !== productId),
    });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromQuote(productId);
      return;
    }
    set({
      quoteItems: get().quoteItems.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      ),
    });
  },

  clearQuote: () => set({ quoteItems: [] }),
}));
