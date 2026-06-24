import { NextResponse } from "next/server";
import { readProducts, readQuoteConfig } from "@/lib/cms/store";
import { sendQuoteEmail } from "@/lib/email/sendQuoteEmail";
import type { Product, QuoteConfig } from "@/types";
import { generateQuotePdf } from "@/utils/quotePdf";

export const runtime = "nodejs";

interface SendQuoteBody {
  email: string;
  clientName?: string;
  vehicleTitle?: string;
  quoteItems: { productId: string; quantity: number }[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendQuoteBody;
    const { email, clientName, vehicleTitle, quoteItems } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Correo electrónico inválido" }, { status: 400 });
    }

    if (!quoteItems?.length) {
      return NextResponse.json({ error: "La cotización está vacía" }, { status: 400 });
    }

    const [products, configRaw] = await Promise.all([readProducts(), readQuoteConfig()]);
    const config = configRaw as unknown as QuoteConfig;

    const items = quoteItems
      .map((item) => {
        const product = (products as Product[]).find((p) => p.id === item.productId);
        if (!product) return null;
        return { product, quantity: item.quantity };
      })
      .filter((item): item is { product: Product; quantity: number } => item !== null);

    if (!items.length) {
      return NextResponse.json({ error: "No se encontraron productos válidos" }, { status: 400 });
    }

    const pdfDoc = generateQuotePdf({
      items,
      config,
      clientEmail: email,
      clientName,
      vehicleTitle,
    });
    const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));
    const pdfFilename = `cotizacion-${config.companyName.toLowerCase().replace(/\s+/g, "-")}.pdf`;

    const greeting = clientName?.trim() ? `Estimado/a ${clientName.trim()}` : "Estimado/a cliente";
    const subject = `Cotización ${config.companyName}${vehicleTitle ? ` — ${vehicleTitle}` : ""}`;
    const text = `${greeting},

Adjunto encontrará su cotización de ${config.companyName}.

${config.quoteFooter}

${config.providerName}
${config.providerPhone}
${config.providerEmail}`;

    const html = `
      <p>${greeting},</p>
      <p>Adjunto encontrará su cotización de <strong>${config.companyName}</strong>.</p>
      <p>${config.quoteFooter}</p>
      <p>
        ${config.providerName}<br/>
        ${config.providerPhone}<br/>
        <a href="mailto:${config.providerEmail}">${config.providerEmail}</a>
      </p>
    `.trim();

    await sendQuoteEmail({
      to: email,
      subject,
      text,
      html,
      fromName: config.companyName,
      pdfBuffer,
      pdfFilename,
    });

    return NextResponse.json({ ok: true, message: "Cotización enviada correctamente" });
  } catch (error) {
    console.error("Error sending quote email:", error);
    const message =
      error instanceof Error ? error.message : "Error al enviar la cotización";
    const status = message.includes("no está configurado") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
