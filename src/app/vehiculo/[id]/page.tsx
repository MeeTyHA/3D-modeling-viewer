"use client";

import { use, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { FaBars, FaTimes } from "react-icons/fa";
import Header from "@/components/Sidebar/Header";
import FeatureBar from "@/components/Sidebar/FeatureBar";
import PanelsOverlay from "@/components/Sidebar/PanelsOverlay";
import { useCMSHotspots, useCMSVehicles } from "@/hooks/useCMS";
import { useAppStore } from "@/store/useAppStore";
import { initGLTFLoader, preloadGLB } from "@/hooks/useGLBLoader";

const VehicleViewer = dynamic(
  () => import("@/components/VehicleViewer/VehicleViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-12rem)] min-h-[520px] w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1e88e5] border-t-transparent" />
      </div>
    ),
  }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function VehiclePage({ params }: PageProps) {
  const { id } = use(params);
  const { vehicles } = useCMSVehicles();
  const { hotspots: hotspotInputs } = useCMSHotspots(id);
  const vehicle = vehicles.find((v) => v.id === id) ?? vehicles[0];

  const panelsOpen = useAppStore((s) => s.panelsOpen);
  const togglePanels = useAppStore((s) => s.togglePanels);
  const setPanelsOpen = useAppStore((s) => s.setPanelsOpen);
  const setSelectedHotspot = useAppStore((s) => s.setSelectedHotspot);
  const setSelectedProduct = useAppStore((s) => s.setSelectedProduct);

  useEffect(() => {
    if (!vehicle) return;
    initGLTFLoader();
    preloadGLB(vehicle.glbPath);
    return () => {
      setPanelsOpen(false);
      setSelectedHotspot(null);
      setSelectedProduct(null);
    };
  }, [id, vehicle, setPanelsOpen, setSelectedHotspot, setSelectedProduct]);

  if (!vehicle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1e88e5] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fa]">
      <Header />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-4 pt-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 max-w-2xl"
            >
              <h1 className="text-2xl font-extrabold text-[#1a3a5c] sm:text-3xl lg:text-4xl">
                {vehicle.title}
              </h1>
              <p className="mt-2 text-sm text-[#4a6a8a] sm:text-base">
                {vehicle.subtitle}
              </p>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                {vehicle.description}
              </p>
            </motion.div>
          </div>

          <div className="relative min-h-[calc(100vh-12rem)] w-full flex-1 px-2 pb-4 lg:min-h-[calc(100vh-10rem)] lg:px-6">
            <VehicleViewer
              vehicle={vehicle}
              hotspotInputs={hotspotInputs}
              interactive={!panelsOpen}
            />
            <PanelsOverlay vehicleTitle={vehicle.title} />
          </div>
        </div>

        <button
          type="button"
          onClick={togglePanels}
          className="fixed right-4 top-[4.25rem] z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#1e88e5] text-white shadow-lg transition hover:bg-[#1565c0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e88e5] focus-visible:ring-offset-2"
          aria-label={panelsOpen ? "Cerrar paneles" : "Abrir cotización y equipos"}
          aria-expanded={panelsOpen}
        >
          {panelsOpen ? <FaTimes className="text-lg" /> : <FaBars className="text-lg" />}
        </button>
      </div>

      <FeatureBar />
    </div>
  );
}
