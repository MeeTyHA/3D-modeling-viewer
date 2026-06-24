"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProductAddModal from "@/components/Admin/ProductAddModal";
import { invalidateCmsCache } from "@/hooks/useCMS";
import type { Product, QuoteConfig, Vehicle } from "@/types";
import type { HotspotInputData } from "@/types";

const HotspotEditor3D = dynamic(() => import("@/components/Admin/HotspotEditor3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1e88e5] border-t-transparent" />
    </div>
  ),
});

type Tab = "products" | "hotspots" | "vehicles" | "quote";

const VEHICLE_IDS = [
  "transporte-carga",
  "transporte-pasajeros",
  "vehiculos-ligeros",
  "maquinaria-pesada",
  "equipos-manejo",
  "motocicletas",
  "unidades-especializadas",
  "activos-sin-motor",
  "soluciones-especiales",
];

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [quoteConfig, setQuoteConfig] = useState<QuoteConfig | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLE_IDS[0]);
  const [hotspots, setHotspots] = useState<HotspotInputData[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      try {
        const [pRes, vRes, qRes, hRes] = await Promise.all([
          fetch("/api/cms/products"),
          fetch("/api/cms/vehicles"),
          fetch("/api/cms/quote-config"),
          fetch(`/api/cms/hotspots?vehicleId=${selectedVehicle}`),
        ]);
        if (!active) return;
        if (pRes.ok) setProducts(await pRes.json());
        if (vRes.ok) setVehicles(await vRes.json());
        if (qRes.ok) setQuoteConfig(await qRes.json());
        if (hRes.ok) {
          const data = await hRes.json();
          setHotspots(data.hotspots ?? []);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedVehicle]);

  const save = async (url: string, data: unknown, label: string) => {
    setStatus(null);
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setStatus(`${label} guardado correctamente`);
      if (url.includes("/api/cms/products")) {
        invalidateCmsCache("products");
      }
      if (url.includes("/api/cms/hotspots")) {
        invalidateCmsCache(`hotspots:${selectedVehicle}`);
      }
    } else {
      const err = await res.json();
      setStatus(err.error ?? `Error al guardar ${label}`);
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  const updateHotspotPosition = useCallback(
    (id: string, relativePosition: [number, number, number]) => {
      setHotspots((current) =>
        current.map((hs) => (hs.id === id ? { ...hs, relativePosition } : hs))
      );
    },
    []
  );

  const renameHotspot = useCallback((id: string, label: string) => {
    setHotspots((current) =>
      current.map((hs) => (hs.id === id ? { ...hs, label } : hs))
    );
  }, []);

  const deleteHotspot = useCallback((id: string) => {
    setHotspots((current) => current.filter((hs) => hs.id !== id));
    setSelectedHotspotId((current) => (current === id ? null : current));
  }, []);

  const selectedVehicleData = vehicles.find((v) => v.id === selectedVehicle);

  const tabs: { id: Tab; label: string }[] = [
    { id: "products", label: "Equipos" },
    { id: "hotspots", label: "Puntos 3D" },
    { id: "vehicles", label: "Unidades" },
    { id: "quote", label: "Cotización" },
  ];

  if (loading && !products.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1e88e5] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#1a3a5c]">Panel de administración</h1>
            <p className="text-xs text-gray-500">Gestión de contenido DirectTrack</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-[#1e88e5] hover:underline">
              Ver sitio
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <nav className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-[#1e88e5] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {status && (
          <p className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-[#1a3a5c]">{status}</p>
        )}

        {tab === "products" && (
          <section className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setProductModalOpen(true)}
                className="rounded-xl border border-[#1e88e5] px-4 py-2 text-sm font-semibold text-[#1e88e5] hover:bg-blue-50"
              >
                + Agregar equipo
              </button>
            </div>

            {products.map((product, idx) => (
              <div key={product.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-[#1a3a5c]">{product.name}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`¿Eliminar "${product.name}"?`)) return;
                      setProducts(products.filter((_, i) => i !== idx));
                    }}
                    className="shrink-0 text-sm text-red-500 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nombre" value={product.name} onChange={(v) => {
                    const next = [...products];
                    next[idx] = { ...product, name: v };
                    setProducts(next);
                  }} />
                  <Field label="Precio (MXN)" type="number" value={String(product.price)} onChange={(v) => {
                    const next = [...products];
                    next[idx] = { ...product, price: Number(v) };
                    setProducts(next);
                  }} />
                  <Field label="Imagen (ruta)" value={product.image} onChange={(v) => {
                    const next = [...products];
                    next[idx] = { ...product, image: v };
                    setProducts(next);
                  }} />
                  <Field label="PDF manual" value={product.pdf} onChange={(v) => {
                    const next = [...products];
                    next[idx] = { ...product, pdf: v };
                    setProducts(next);
                  }} />
                  <Field label="Video (ruta)" value={product.video ?? ""} onChange={(v) => {
                    const next = [...products];
                    next[idx] = { ...product, video: v };
                    setProducts(next);
                  }} />
                </div>
                <label className="mt-3 block text-xs font-medium text-gray-600">Descripción</label>
                <textarea
                  value={product.description}
                  onChange={(e) => {
                    const next = [...products];
                    next[idx] = { ...product, description: e.target.value };
                    setProducts(next);
                  }}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => save("/api/cms/products", products, "Equipos")}
              className="rounded-xl bg-[#1e88e5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1565c0]"
            >
              Guardar equipos
            </button>

            <ProductAddModal
              open={productModalOpen}
              onClose={() => setProductModalOpen(false)}
              existingIds={products.map((p) => p.id)}
              onAdd={(product) => setProducts((current) => [...current, product])}
            />
          </section>
        )}

        {tab === "hotspots" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-gray-600">Unidad:</label>
              <select
                value={selectedVehicle}
                onChange={async (e) => {
                  const vid = e.target.value;
                  setSelectedVehicle(vid);
                  setSelectedHotspotId(null);
                  const res = await fetch(`/api/cms/hotspots?vehicleId=${vid}`);
                  if (res.ok) {
                    const data = await res.json();
                    setHotspots(data.hotspots ?? []);
                  }
                }}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
              >
                {VEHICLE_IDS.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const newId = `punto-${Date.now()}`;
                  setHotspots([
                    ...hotspots,
                    {
                      id: newId,
                      label: "Nuevo punto",
                      description: "",
                      relativePosition: [0.5, 0.5, 0.5],
                      labelOffset: [0, -30],
                      productId: products[0]?.id ?? "gps-pro",
                      installationNotes: "",
                    },
                  ]);
                  setSelectedHotspotId(newId);
                }}
                className="rounded-xl border border-[#1e88e5] px-4 py-2 text-sm text-[#1e88e5] hover:bg-blue-50"
              >
                + Agregar punto
              </button>
            </div>

            {selectedVehicleData && (
              <HotspotEditor3D
                vehicle={selectedVehicleData}
                hotspots={hotspots}
                selectedId={selectedHotspotId}
                onSelect={setSelectedHotspotId}
                onUpdatePosition={updateHotspotPosition}
                onRename={renameHotspot}
                onDelete={deleteHotspot}
              />
            )}

            {hotspots.map((hs, idx) => (
              <div
                key={hs.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  selectedHotspotId === hs.id
                    ? "border-[#1e88e5] ring-2 ring-[#1e88e5]/20"
                    : "border-gray-100"
                }`}
                onClick={() => setSelectedHotspotId(hs.id)}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-[#1a3a5c]">{hs.label}</h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!window.confirm(`¿Eliminar "${hs.label}"?`)) return;
                      deleteHotspot(hs.id);
                    }}
                    className="shrink-0 text-sm text-red-500 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="ID" value={hs.id} onChange={(v) => {
                    const next = [...hotspots];
                    next[idx] = { ...hs, id: v };
                    setHotspots(next);
                  }} />
                  <Field label="Etiqueta" value={hs.label} onChange={(v) => {
                    const next = [...hotspots];
                    next[idx] = { ...hs, label: v };
                    setHotspots(next);
                  }} />
                  <div>
                    <label className="text-xs font-medium text-gray-600">Producto</label>
                    <select
                      value={hs.productId}
                      onChange={(e) => {
                        const next = [...hotspots];
                        next[idx] = { ...hs, productId: e.target.value };
                        setHotspots(next);
                      }}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="mt-3 block text-xs font-medium text-gray-600">Descripción</label>
                <textarea
                  value={hs.description}
                  onChange={(e) => {
                    const next = [...hotspots];
                    next[idx] = { ...hs, description: e.target.value };
                    setHotspots(next);
                  }}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                save(
                  `/api/cms/hotspots?vehicleId=${selectedVehicle}`,
                  { hotspots },
                  "Puntos 3D"
                )
              }
              className="rounded-xl bg-[#1e88e5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1565c0]"
            >
              Guardar puntos 3D
            </button>
          </section>
        )}

        {tab === "vehicles" && (
          <section className="space-y-4">
            {vehicles.map((vehicle, idx) => (
              <div key={vehicle.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-semibold text-[#1a3a5c]">{vehicle.title}</h3>
                <div className="grid gap-3">
                  <Field label="Título" value={vehicle.title} onChange={(v) => {
                    const next = [...vehicles];
                    next[idx] = { ...vehicle, title: v };
                    setVehicles(next);
                  }} />
                  <Field label="Subtítulo" value={vehicle.subtitle} onChange={(v) => {
                    const next = [...vehicles];
                    next[idx] = { ...vehicle, subtitle: v };
                    setVehicles(next);
                  }} />
                  <label className="text-xs font-medium text-gray-600">Descripción</label>
                  <textarea
                    value={vehicle.description}
                    onChange={(e) => {
                      const next = [...vehicles];
                      next[idx] = { ...vehicle, description: e.target.value };
                      setVehicles(next);
                    }}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => save("/api/cms/vehicles", vehicles, "Unidades")}
              className="rounded-xl bg-[#1e88e5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1565c0]"
            >
              Guardar unidades
            </button>
          </section>
        )}

        {tab === "quote" && quoteConfig && (
          <section className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <QuoteDocField
                    label="Nombre empresa"
                    value={quoteConfig.companyName}
                    onChange={(v) => setQuoteConfig({ ...quoteConfig, companyName: v })}
                  />
                  <QuoteDocField
                    label="Eslogan"
                    value={quoteConfig.companyTagline}
                    onChange={(v) => setQuoteConfig({ ...quoteConfig, companyTagline: v })}
                  />
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-3xl font-bold tracking-tight text-[#1a3a5c]">COTIZACIÓN</p>
                </div>
              </div>

              <QuoteSectionHeader title="Datos del proveedor" />
              <div className="grid gap-1 px-2 py-3 sm:grid-cols-2">
                <QuoteDocField
                  label="Proveedor"
                  value={quoteConfig.providerName}
                  onChange={(v) => setQuoteConfig({ ...quoteConfig, providerName: v })}
                />
                <QuoteDocField
                  label="RFC"
                  value={quoteConfig.providerRfc}
                  onChange={(v) => setQuoteConfig({ ...quoteConfig, providerRfc: v })}
                />
                <QuoteDocField
                  label="Dirección"
                  value={quoteConfig.providerAddress}
                  onChange={(v) => setQuoteConfig({ ...quoteConfig, providerAddress: v })}
                  className="sm:col-span-2"
                />
                <QuoteDocField
                  label="Teléfono"
                  value={quoteConfig.providerPhone}
                  onChange={(v) => setQuoteConfig({ ...quoteConfig, providerPhone: v })}
                />
                <QuoteDocField
                  label="Email proveedor"
                  value={quoteConfig.providerEmail}
                  onChange={(v) => setQuoteConfig({ ...quoteConfig, providerEmail: v })}
                />
              </div>

              <div className="grid border-t border-gray-100 sm:grid-cols-2">
                <div className="border-gray-100 sm:border-r">
                  <QuoteSectionHeader title="Forma de pago" />
                  <div className="px-4 py-3">
                    <textarea
                      value={quoteConfig.paymentTerms}
                      onChange={(e) =>
                        setQuoteConfig({ ...quoteConfig, paymentTerms: e.target.value })
                      }
                      rows={4}
                      className="w-full resize-y border-0 bg-transparent px-0 py-1 text-sm leading-relaxed text-gray-900 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <QuoteSectionHeader title="I.V.A." />
                  <div className="px-4 py-3">
                    <QuoteDocField
                      label="IVA (decimal)"
                      type="number"
                      value={String(quoteConfig.ivaRate)}
                      onChange={(v) =>
                        setQuoteConfig({ ...quoteConfig, ivaRate: Number(v) })
                      }
                    />
                  </div>
                </div>
              </div>

              <QuoteSectionHeader title="Pie de cotización" />
              <div className="px-4 py-3">
                <textarea
                  value={quoteConfig.quoteFooter}
                  onChange={(e) =>
                    setQuoteConfig({ ...quoteConfig, quoteFooter: e.target.value })
                  }
                  rows={2}
                  className="w-full resize-y border-0 bg-transparent px-0 py-1 text-sm leading-relaxed text-gray-900 focus:outline-none"
                />
              </div>

              <div className="bg-[#1a3a5c] px-4 py-3 text-center text-xs leading-relaxed text-white">
                {quoteConfig.quoteFooter}
              </div>
            </div>
            <button
              type="button"
              onClick={() => save("/api/cms/quote-config", quoteConfig, "Cotización")}
              className="rounded-xl bg-[#1e88e5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1565c0]"
            >
              Guardar cotización
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function QuoteSectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-[#1a3a5c] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
      {title}
    </div>
  );
}

function QuoteDocField({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`px-4 py-2 ${className}`}>
      <label className="text-xs font-semibold text-[#1a3a5c]">{label}:</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full border-0 border-b border-gray-200 bg-transparent px-0 py-1 text-sm text-gray-900 focus:border-[#1e88e5] focus:outline-none"
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      />
    </div>
  );
}
