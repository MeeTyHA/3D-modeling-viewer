import { jsPDF } from "jspdf";
import type { Product, QuoteConfig } from "@/types";
import { formatPrice } from "@/hooks/useProducts";

interface QuoteLineItem {
  product: Product;
  quantity: number;
}

interface GenerateQuotePdfOptions {
  items: QuoteLineItem[];
  config: QuoteConfig;
  clientEmail?: string;
  clientName?: string;
  vehicleTitle?: string;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

export function generateQuotePdf({
  items,
  config,
  clientEmail,
  clientName,
  vehicleTitle,
}: GenerateQuotePdfOptions): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(26, 58, 92);
  doc.text(config.companyName, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  y += 7;
  doc.text(config.companyTagline, margin, y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 136, 229);
  doc.text("COTIZACIÓN", margin, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, margin, y);
  if (vehicleTitle) {
    doc.text(`Unidad: ${vehicleTitle}`, margin + 70, y);
  }

  if (clientName || clientEmail) {
    y += 6;
    if (clientName) doc.text(`Cliente: ${clientName}`, margin, y);
    if (clientEmail) doc.text(`Correo: ${clientEmail}`, margin + 70, y);
  }

  y += 10;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 58, 92);
  doc.text("Datos del proveedor", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const providerLines = [
    config.providerName,
    config.providerAddress,
    `Tel: ${config.providerPhone}`,
    `Email: ${config.providerEmail}`,
    `RFC: ${config.providerRfc}`,
  ];
  for (const line of providerLines) {
    doc.text(line, margin, y);
    y += 5;
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 58, 92);
  doc.text("Producto", margin, y);
  doc.text("Cant.", margin + 105, y);
  doc.text("Precio unit.", margin + 125, y);
  doc.text("Subtotal", margin + 155, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  let subtotal = 0;

  for (const { product, quantity } of items) {
    const lineSubtotal = product.price * quantity;
    subtotal += lineSubtotal;

    if (y > 250) {
      doc.addPage();
      y = margin;
    }

    const nameLines = wrapText(doc, product.name, 95);
    doc.text(nameLines, margin, y);
    doc.text(String(quantity), margin + 108, y);
    doc.text(formatPrice(product.price), margin + 125, y);
    doc.text(formatPrice(lineSubtotal), margin + 155, y);
    y += Math.max(nameLines.length * 5, 6) + 2;
  }

  const iva = subtotal * config.ivaRate;
  const total = subtotal + iva;

  y += 4;
  doc.line(margin + 100, y, pageWidth - margin, y);
  y += 8;

  doc.text("Subtotal:", margin + 125, y);
  doc.text(formatPrice(subtotal), margin + 155, y);
  y += 6;
  doc.text(`IVA (${Math.round(config.ivaRate * 100)}%):`, margin + 125, y);
  doc.text(formatPrice(iva), margin + 155, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Total:", margin + 125, y);
  doc.text(formatPrice(total), margin + 155, y);

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 58, 92);
  doc.text("Forma de pago", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const paymentLines = wrapText(doc, config.paymentTerms, contentWidth);
  doc.text(paymentLines, margin, y);
  y += paymentLines.length * 5 + 8;

  if (y > 260) {
    doc.addPage();
    y = margin;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  const footerLines = wrapText(doc, config.quoteFooter, contentWidth);
  doc.text(footerLines, margin, y);

  return doc;
}

export function downloadQuotePdf(options: GenerateQuotePdfOptions, filename?: string) {
  const doc = generateQuotePdf(options);
  doc.save(filename ?? `cotizacion-directtrack-${Date.now()}.pdf`);
}

export function getQuotePdfBase64(options: GenerateQuotePdfOptions): string {
  const doc = generateQuotePdf(options);
  return doc.output("datauristring").split(",")[1] ?? "";
}
