"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EquipmentCard from "@/components/EquipmentCard/EquipmentCard";
import QuotePanel from "@/components/QuotePanel/QuotePanel";
import VideoPlayer from "@/components/VideoPlayer/VideoPlayer";
import { useAppStore } from "@/store/useAppStore";
import { useCMSProducts } from "@/hooks/useCMS";

interface PanelsOverlayProps {
  vehicleTitle?: string;
}

export default function PanelsOverlay({ vehicleTitle }: PanelsOverlayProps) {
  const panelsOpen = useAppStore((s) => s.panelsOpen);
  const selectedProduct = useAppStore((s) => s.selectedProduct);
  const selectedHotspot = useAppStore((s) => s.selectedHotspot);
  const setPanelsOpen = useAppStore((s) => s.setPanelsOpen);
  const addToQuote = useAppStore((s) => s.addToQuote);
  const syncQuoteWithProductCatalog = useAppStore((s) => s.syncQuoteWithProductCatalog);
  const { products } = useCMSProducts();

  useEffect(() => {
    if (!products.length) return;
    syncQuoteWithProductCatalog(products.map((p) => p.id));
  }, [products, syncQuoteWithProductCatalog]);

  const product = selectedProduct ?? products[0] ?? null;

  return (
    <AnimatePresence>
      {panelsOpen && product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-30 flex items-start justify-end p-2 pt-4 sm:p-4 lg:p-6"
          aria-hidden={!panelsOpen}
        >
          <motion.div
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 48 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="pointer-events-auto flex h-full max-h-[calc(100vh-10rem)] w-full max-w-[920px] flex-col gap-3 overflow-hidden lg:flex-row lg:gap-4"
          >
            <div className="flex max-h-[55%] min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:max-h-full lg:w-[48%]">
              <EquipmentCard
                key={product.id}
                product={product}
                hotspotLabel={selectedHotspot?.label ?? "Cabina"}
                onAddToQuote={() => addToQuote(product.id)}
                onClose={() => setPanelsOpen(false)}
              />
              <VideoPlayer
                key={product.video || product.id}
                src={product.video || "/assets/videos/video.mp4"}
                title="¿CÓMO FUNCIONA DIRECTRACK GPS PRO?"
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col lg:w-[52%]">
              <QuotePanel vehicleTitle={vehicleTitle} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
