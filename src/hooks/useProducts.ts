import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useCMSProducts, useCMSQuoteConfig } from "@/hooks/useCMS";

export function useProducts() {
  const { products, getProduct } = useCMSProducts();
  return { products, getProduct };
}

export function useQuoteTotals() {
  const quoteItems = useAppStore((s) => s.quoteItems);
  const { getProduct } = useCMSProducts();
  const { config } = useCMSQuoteConfig();
  const ivaRate = config.ivaRate ?? 0.16;

  return useMemo(() => {
    const subtotal = quoteItems.reduce((sum, item) => {
      const product = getProduct(item.productId);
      return sum + (product?.price ?? 0) * item.quantity;
    }, 0);
    const iva = subtotal * ivaRate;
    const total = subtotal + iva;
    return { subtotal, iva, total, itemCount: quoteItems.reduce((s, i) => s + i.quantity, 0) };
  }, [quoteItems, getProduct, ivaRate]);
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
