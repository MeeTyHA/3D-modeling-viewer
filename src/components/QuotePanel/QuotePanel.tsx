"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FaShoppingCart, FaFileAlt, FaDownload, FaTimes } from "react-icons/fa";
import { useAppStore } from "@/store/useAppStore";
import { useCMSProducts, useCMSQuoteConfig } from "@/hooks/useCMS";
import { useQuoteTotals, formatPrice } from "@/hooks/useProducts";
import QuoteEmailModal from "@/components/QuotePanel/QuoteEmailModal";

interface QuotePanelProps {
  vehicleTitle?: string;
}

export default function QuotePanel({ vehicleTitle }: QuotePanelProps) {
  const quoteItems = useAppStore((s) => s.quoteItems);
  const selectedProduct = useAppStore((s) => s.selectedProduct);
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  const removeFromQuote = useAppStore((s) => s.removeFromQuote);
  const setSelectedProduct = useAppStore((s) => s.setSelectedProduct);
  const { getProduct } = useCMSProducts();
  const { config } = useCMSQuoteConfig();
  const { subtotal, iva, total, itemCount } = useQuoteTotals();

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  const buildLineItems = () =>
    quoteItems
      .map((item) => {
        const product = getProduct(item.productId);
        if (!product) return null;
        return { product, quantity: item.quantity };
      })
      .filter((item): item is { product: NonNullable<ReturnType<typeof getProduct>>; quantity: number } =>
        item !== null
      );

  const handleRequestQuote = () => {
    if (quoteItems.length === 0) return;
    setEmailError(null);
    setEmailSuccess(null);
    setEmailModalOpen(true);
  };

  const handleSendEmail = async ({
    email,
    clientName,
  }: {
    email: string;
    clientName: string;
  }) => {
    setSending(true);
    setEmailError(null);
    setEmailSuccess(null);
    try {
      const res = await fetch("/api/quote/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          clientName: clientName || undefined,
          vehicleTitle,
          quoteItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error ?? "Error al enviar la cotización");
        return;
      }
      setEmailSuccess(data.message ?? "Cotización enviada correctamente");
      setTimeout(() => setEmailModalOpen(false), 2000);
    } catch {
      setEmailError("Error de conexión al enviar la cotización");
    } finally {
      setSending(false);
    }
  };

  const handleDownloadQuotePDF = async () => {
    const items = buildLineItems();
    if (!items.length) return;
    const { downloadQuotePdf } = await import("@/utils/quotePdf");
    downloadQuotePdf({
      items,
      config,
      vehicleTitle,
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <FaShoppingCart className="text-[#1e88e5]" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#1a3a5c]">
              Tu cotización
            </h2>
            {itemCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1e88e5] text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          <AnimatePresence mode="popLayout">
            {quoteItems.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-8 text-center text-sm text-gray-400"
              >
                No hay productos en tu cotización.
                <br />
                Selecciona un punto en el modelo 3D.
              </motion.p>
            ) : (
              quoteItems.map((item) => {
                const product = getProduct(item.productId);
                if (!product) return null;
                return (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedProduct(product)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedProduct(product);
                      }
                    }}
                    className={`mb-3 flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                      selectedProduct?.id === product.id
                        ? "border-[#1e88e5] bg-blue-50/60"
                        : "border-gray-50 bg-gray-50/50 hover:border-blue-100"
                    }`}
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain p-1"
                        sizes="48px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <p className="truncate text-sm font-semibold text-[#1a3a5c]">
                          {product.name}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQuote(item.productId);
                          }}
                          className="shrink-0 text-gray-400 hover:text-red-500"
                          aria-label={`Eliminar ${product.name}`}
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {product.description}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-bold text-[#1e88e5]">
                          {formatPrice(product.price)}
                        </span>
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(item.productId, item.quantity - 1);
                            }}
                            className="px-2 py-0.5 text-gray-500 hover:text-[#1e88e5]"
                            aria-label="Disminuir cantidad"
                          >
                            −
                          </button>
                          <span className="min-w-[20px] text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(item.productId, item.quantity + 1);
                            }}
                            className="px-2 py-0.5 text-gray-500 hover:text-[#1e88e5]"
                            aria-label="Aumentar cantidad"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {quoteItems.length > 0 && (
          <div className="shrink-0 border-t border-gray-100 px-5 py-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA (16%)</span>
                <span>{formatPrice(iva)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
                <span className="text-[#1a3a5c]">Total</span>
                <span className="text-[#1e88e5]">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="shrink-0 space-y-2 border-t border-gray-100 p-4">
          <motion.button
            type="button"
            onClick={handleRequestQuote}
            disabled={quoteItems.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e88e5] py-3 text-sm font-semibold text-white shadow-md hover:bg-[#1565c0] disabled:cursor-not-allowed disabled:opacity-40"
            whileHover={{ scale: quoteItems.length > 0 ? 1.02 : 1 }}
            whileTap={{ scale: quoteItems.length > 0 ? 0.98 : 1 }}
          >
            <FaFileAlt />
            Solicitar cotización
          </motion.button>
          <motion.button
            type="button"
            onClick={handleDownloadQuotePDF}
            disabled={quoteItems.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1e88e5] py-3 text-sm font-semibold text-[#1e88e5] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            whileHover={{ scale: quoteItems.length > 0 ? 1.02 : 1 }}
            whileTap={{ scale: quoteItems.length > 0 ? 0.98 : 1 }}
          >
            <FaDownload />
            Descargar cotización PDF
          </motion.button>
        </div>
      </motion.div>

      <QuoteEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleSendEmail}
        sending={sending}
        error={emailError}
        success={emailSuccess}
      />
    </>
  );
}
