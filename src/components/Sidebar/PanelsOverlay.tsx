"use client";

import { useEffect, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EquipmentCard from "@/components/EquipmentCard/EquipmentCard";
import QuotePanel from "@/components/QuotePanel/QuotePanel";
import VideoPlayer from "@/components/VideoPlayer/VideoPlayer";
import { useAppStore } from "@/store/useAppStore";
import { useCMSProducts } from "@/hooks/useCMS";
import { useModalZoomLock } from "@/hooks/useModalZoomLock";

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
  const modalZoom = useModalZoomLock();

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
          className="pointer-events-none fixed bottom-16 right-2 top-36 z-40 flex items-start justify-end overflow-hidden sm:right-4 lg:right-6 lg:top-[10.5rem]"
          aria-hidden={!panelsOpen}
        >
          <motion.div
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 48 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="pointer-events-auto h-full w-full max-w-[920px] min-h-0"
          >
            <div
              className="modal-zoom-lock flex h-full min-h-0 flex-col gap-3 overflow-hidden lg:flex-row lg:gap-4"
              style={{ "--modal-zoom": modalZoom } as CSSProperties}
            >
            <div className="flex min-h-0 max-h-[58%] flex-col gap-3 overflow-hidden lg:max-h-none lg:flex-1 lg:w-[48%]">
              <div className="min-h-0 flex-1 overflow-hidden">
                <EquipmentCard
                  key={product.id}
                  product={product}
                  hotspotLabel={selectedHotspot?.label ?? "Cabina"}
                  onAddToQuote={() => addToQuote(product.id)}
                  onClose={() => setPanelsOpen(false)}
                />
              </div>
              <div className="shrink-0 [&_.aspect-video]:max-h-[6.5rem]">
                <VideoPlayer
                  key={product.video || product.id}
                  src={product.video || "/assets/videos/video.mp4"}
                  title="¿CÓMO FUNCIONA DIRECTRACK GPS PRO?"
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:w-[52%]">
              <QuotePanel vehicleTitle={vehicleTitle} />
            </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
