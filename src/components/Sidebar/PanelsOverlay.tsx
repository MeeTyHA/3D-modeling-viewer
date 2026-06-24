"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EquipmentCard from "@/components/EquipmentCard/EquipmentCard";
import QuotePanel from "@/components/QuotePanel/QuotePanel";
import VideoPlayer from "@/components/VideoPlayer/VideoPlayer";
import { useAppStore } from "@/store/useAppStore";
import { useCMSProducts } from "@/hooks/useCMS";

interface PanelsOverlayProps {
  vehicleTitle?: string;
}

type MobilePanel = "equipment" | "quote";

export default function PanelsOverlay({ vehicleTitle }: PanelsOverlayProps) {
  const panelsOpen = useAppStore((s) => s.panelsOpen);
  const selectedProduct = useAppStore((s) => s.selectedProduct);
  const selectedHotspot = useAppStore((s) => s.selectedHotspot);
  const quoteItems = useAppStore((s) => s.quoteItems);
  const setPanelsOpen = useAppStore((s) => s.setPanelsOpen);
  const addToQuote = useAppStore((s) => s.addToQuote);
  const syncQuoteWithProductCatalog = useAppStore((s) => s.syncQuoteWithProductCatalog);
  const { products } = useCMSProducts();
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("equipment");

  const quoteCount = quoteItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (!products.length) return;
    syncQuoteWithProductCatalog(products.map((p) => p.id));
  }, [products, syncQuoteWithProductCatalog]);

  const product = selectedProduct ?? products[0] ?? null;

  useEffect(() => {
    if (panelsOpen) setMobilePanel("equipment");
  }, [panelsOpen, product?.id]);

  return (
    <AnimatePresence>
      {panelsOpen && product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-30 flex items-stretch justify-end p-2 pt-4 sm:p-4 lg:items-start lg:p-6"
          aria-hidden={!panelsOpen}
        >
          <motion.div
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 48 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="pointer-events-auto flex h-full min-h-0 w-full max-w-[920px] flex-col gap-3 overflow-hidden lg:max-h-[calc(100vh-10rem)] lg:flex-row lg:gap-4"
          >
            <div className="flex shrink-0 gap-2 rounded-xl border border-gray-200 bg-white p-1 shadow-sm lg:hidden">
              <button
                type="button"
                onClick={() => setMobilePanel("equipment")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  mobilePanel === "equipment"
                    ? "bg-[#1e88e5] text-white"
                    : "text-[#1a3a5c] hover:bg-gray-50"
                }`}
              >
                Equipo
              </button>
              <button
                type="button"
                onClick={() => setMobilePanel("quote")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  mobilePanel === "quote"
                    ? "bg-[#1e88e5] text-white"
                    : "text-[#1a3a5c] hover:bg-gray-50"
                }`}
              >
                Tu cotización
                {quoteCount > 0 && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      mobilePanel === "quote"
                        ? "bg-white text-[#1e88e5]"
                        : "bg-[#1e88e5] text-white"
                    }`}
                  >
                    {quoteCount}
                  </span>
                )}
              </button>
            </div>

            <div
              className={`min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex lg:w-[48%] ${
                mobilePanel === "equipment" ? "flex" : "hidden"
              }`}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <EquipmentCard
                  key={product.id}
                  product={product}
                  hotspotLabel={selectedHotspot?.label ?? "Cabina"}
                  onAddToQuote={() => addToQuote(product.id)}
                  onClose={() => setPanelsOpen(false)}
                />
              </div>
              <div className="shrink-0">
                <VideoPlayer
                  key={product.video || product.id}
                  src={product.video || "/assets/videos/video.mp4"}
                  title="¿CÓMO FUNCIONA DIRECTRACK GPS PRO?"
                />
              </div>
            </div>

            <div
              className={`min-h-0 flex-1 flex-col overflow-hidden lg:flex lg:w-[52%] ${
                mobilePanel === "quote" ? "flex" : "hidden"
              }`}
            >
              <QuotePanel vehicleTitle={vehicleTitle} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}