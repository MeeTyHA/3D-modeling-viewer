"use client";

<<<<<<< HEAD
import { useEffect, useState, type CSSProperties } from "react";
=======
import { useEffect, useState } from "react";
>>>>>>> parent of 5abf3d3 (get add)
import { motion, AnimatePresence } from "framer-motion";
import EquipmentCard from "@/components/EquipmentCard/EquipmentCard";
import QuotePanel from "@/components/QuotePanel/QuotePanel";
import VideoPlayer from "@/components/VideoPlayer/VideoPlayer";
import { useAppStore } from "@/store/useAppStore";
import { useCMSProducts } from "@/hooks/useCMS";
import { useModalZoomLock } from "@/hooks/useModalZoomLock";
import { useQuoteTotals, formatPrice } from "@/hooks/useProducts";

interface PanelsOverlayProps {
  vehicleTitle?: string;
}

type MobilePanel = "equipment" | "quote";

<<<<<<< HEAD
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

=======
>>>>>>> parent of 5abf3d3 (get add)
export default function PanelsOverlay({ vehicleTitle }: PanelsOverlayProps) {
  const panelsOpen = useAppStore((s) => s.panelsOpen);
  const selectedProduct = useAppStore((s) => s.selectedProduct);
  const selectedHotspot = useAppStore((s) => s.selectedHotspot);
  const quoteItems = useAppStore((s) => s.quoteItems);
  const setPanelsOpen = useAppStore((s) => s.setPanelsOpen);
  const addToQuote = useAppStore((s) => s.addToQuote);
  const syncQuoteWithProductCatalog = useAppStore((s) => s.syncQuoteWithProductCatalog);
  const { products } = useCMSProducts();
<<<<<<< HEAD
  const modalZoom = useModalZoomLock();
  const isMobile = useIsMobile();
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("equipment");
  const { total, itemCount } = useQuoteTotals();
=======
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("equipment");

  const quoteCount = quoteItems.reduce((sum, item) => sum + item.quantity, 0);
>>>>>>> parent of 5abf3d3 (get add)

  useEffect(() => {
    if (!products.length) return;
    syncQuoteWithProductCatalog(products.map((p) => p.id));
  }, [products, syncQuoteWithProductCatalog]);

  const product = selectedProduct ?? products[0] ?? null;

  useEffect(() => {
    if (panelsOpen) setMobilePanel("equipment");
  }, [panelsOpen, product?.id]);

<<<<<<< HEAD
  useEffect(() => {
    if (!panelsOpen || !isMobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [panelsOpen, isMobile]);

  const zoomStyle = {
    "--modal-zoom": isMobile ? 1 : modalZoom,
  } as CSSProperties;

  const sheetMotion = isMobile
    ? {
        initial: { opacity: 0, y: "100%" },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: "100%" },
      }
    : {
        initial: { opacity: 0, x: 48 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 48 },
      };

  return (
    <AnimatePresence>
      {panelsOpen && product && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setPanelsOpen(false)}
            aria-label="Cerrar paneles"
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-x-0 bottom-0 top-[4.5rem] z-40 flex flex-col justify-end overflow-hidden lg:inset-x-auto lg:bottom-16 lg:left-auto lg:right-6 lg:top-[10.5rem] lg:items-start lg:justify-end"
            aria-hidden={!panelsOpen}
          >
            <motion.div
              {...sheetMotion}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-[#f5f7fa] shadow-2xl lg:h-full lg:max-w-[920px] lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none"
            >
              <div className="shrink-0 border-b border-gray-200 bg-white lg:hidden">
                <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1e88e5]">
                      Punto: {selectedHotspot?.label ?? "Cabina"}
                    </p>
                    <p className="truncate text-base font-bold leading-tight text-[#1a3a5c]">
                      {product.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {formatPrice(product.price)}
                      {itemCount > 0 && (
                        <span className="font-semibold text-[#1e88e5]">
                          {" "}
                          · {itemCount} en cotización · {formatPrice(total)}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanelsOpen(false)}
                    className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100"
                    aria-label="Cerrar paneles"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 px-4 pb-3">
                  <button
                    type="button"
                    onClick={() => setMobilePanel("equipment")}
                    className={`rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition ${
                      mobilePanel === "equipment"
                        ? "bg-[#1e88e5] text-white shadow-sm"
                        : "bg-gray-50 text-[#1a3a5c] ring-1 ring-gray-200"
                    }`}
                  >
                    Equipo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobilePanel("quote")}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition ${
                      mobilePanel === "quote"
                        ? "bg-[#1e88e5] text-white shadow-sm"
                        : "bg-gray-50 text-[#1a3a5c] ring-1 ring-gray-200"
                    }`}
                  >
                    Cotización
                    {itemCount > 0 && (
                      <span
                        className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                          mobilePanel === "quote"
                            ? "bg-white text-[#1e88e5]"
                            : "bg-[#1e88e5] text-white"
                        }`}
                      >
                        {itemCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div
                className="modal-zoom-lock flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 lg:flex-row lg:gap-4 lg:p-0"
                style={zoomStyle}
              >
                <div
                  className={`min-h-0 flex-col gap-3 overflow-hidden lg:flex lg:flex-1 lg:w-[48%] ${
                    mobilePanel === "equipment" ? "flex flex-1" : "hidden"
                  }`}
                >
                  <div className="min-h-0 flex-1 overflow-hidden max-lg:[&>div>div:first-child]:hidden">
                    <EquipmentCard
                      key={product.id}
                      product={product}
                      hotspotLabel={selectedHotspot?.label ?? "Cabina"}
                      onAddToQuote={() => {
                        addToQuote(product.id);
                        setMobilePanel("quote");
                      }}
                      onClose={() => setPanelsOpen(false)}
                    />
                  </div>
                  <div className="hidden shrink-0 lg:block [&_.aspect-video]:max-h-[6.5rem]">
                    <VideoPlayer
                      key={product.video || product.id}
                      src={product.video || "/assets/videos/video.mp4"}
                      title="¿CÓMO FUNCIONA DIRECTRACK GPS PRO?"
                    />
                  </div>
                </div>

                <div
                  className={`min-h-0 flex-col overflow-hidden lg:flex lg:flex-1 lg:w-[52%] ${
                    mobilePanel === "quote" ? "flex flex-1" : "hidden"
                  }`}
                >
                  <QuotePanel vehicleTitle={vehicleTitle} />
                </div>
              </div>
            </motion.div>
=======
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
>>>>>>> parent of 5abf3d3 (get add)
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}