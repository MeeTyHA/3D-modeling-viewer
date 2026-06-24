"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useLayoutEffect,
  Suspense,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import type { Vehicle, Hotspot } from "@/types";
import Hotspots from "@/components/Hotspots/Hotspots";
import LoadingSpinner from "@/components/LoadingSpinner";
import VehicleSceneLighting from "@/components/VehicleSceneLighting";
import { useAppStore } from "@/store/useAppStore";
import { initGLTFLoader, preloadGLB } from "@/hooks/useGLBLoader";
import {
  cloneModelScene,
  computeSceneFit,
  enhanceMeshQualityOnce,
} from "@/utils/gltfLoaderExtensions";
import {
  resolveHotspotPositions,
  type HotspotInput,
} from "@/utils/hotspotPositions";
import { FaSync, FaPlus, FaMinus } from "react-icons/fa";

initGLTFLoader();

function VehicleModel({
  modelUrl,
  rotation,
  scale,
  hotspotInputs,
  onReady,
  onHotspotsResolved,
}: {
  modelUrl: string;
  rotation: [number, number, number];
  scale: number;
  hotspotInputs: HotspotInput[];
  onReady: () => void;
  onHotspotsResolved: (hotspots: Hotspot[]) => void;
}) {
  const { gl } = useThree();
  const modelRootRef = useRef<THREE.Group>(null);
  const readySentRef = useRef(false);

  // Optimized GLBs: Draco + WebP only (no KTX2 / meshopt).
  const { scene: gltfScene } = useGLTF(modelUrl, true, false);
  const displayScene = useMemo(() => cloneModelScene(gltfScene), [gltfScene]);
  const fit = useMemo(() => computeSceneFit(displayScene), [displayScene]);

  useLayoutEffect(() => {
    enhanceMeshQualityOnce(displayScene, gl.capabilities.getMaxAnisotropy());

    modelRootRef.current?.updateMatrixWorld(true);
    if (modelRootRef.current) {
      onHotspotsResolved(
        resolveHotspotPositions(modelRootRef.current, hotspotInputs)
      );
    }

    if (!readySentRef.current) {
      readySentRef.current = true;
      onReady();
    }
  }, [displayScene, gl, hotspotInputs, onReady, onHotspotsResolved]);

  return (
    <group ref={modelRootRef} rotation={rotation} scale={scale * fit.fitScale}>
      <group position={fit.center}>
        <primitive object={displayScene} />
      </group>
    </group>
  );
}

function CameraController({
  position,
}: {
  position: [number, number, number];
}) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(0, 0, 0);
  }, [camera, position]);
  return null;
}

interface SceneProps {
  vehicle: Vehicle;
  hotspotInputs: HotspotInput[];
  autoRotate: boolean;
  interactive: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onModelReady: () => void;
}

function SceneContent({
  vehicle,
  hotspotInputs,
  autoRotate,
  interactive,
  controlsRef,
  onModelReady,
}: SceneProps) {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);

  const handleHotspotsResolved = useMemo(
    () => (resolved: Hotspot[]) => setHotspots(resolved),
    []
  );

  return (
    <>
      <CameraController position={vehicle.cameraPosition} />
      <VehicleSceneLighting />
      <VehicleModel
        modelUrl={vehicle.glbPath}
        rotation={vehicle.modelRotation}
        scale={vehicle.modelScale}
        hotspotInputs={hotspotInputs}
        onReady={onModelReady}
        onHotspotsResolved={handleHotspotsResolved}
      />
      {hotspots.length > 0 && <Hotspots hotspots={hotspots} />}
      <OrbitControls
        ref={controlsRef}
        enabled={interactive}
        enablePan={false}
        enableRotate={interactive}
        enableZoom={interactive}
        minDistance={3}
        maxDistance={28}
        autoRotate={interactive && autoRotate}
        autoRotateSpeed={1.5}
        makeDefault
      />
    </>
  );
}

interface VehicleViewerProps {
  vehicle: Vehicle;
  hotspotInputs: HotspotInput[];
  interactive?: boolean;
}

function VehicleViewerContent({
  vehicle,
  hotspotInputs,
  interactive = true,
}: VehicleViewerProps) {
  const { progress } = useProgress();
  const [modelReady, setModelReady] = useState(false);

  const setLoadingProgress = useAppStore((s) => s.setLoadingProgress);
  const setIsModelLoaded = useAppStore((s) => s.setIsModelLoaded);
  const [autoRotate, setAutoRotate] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    preloadGLB(vehicle.glbPath);
  }, [vehicle.glbPath]);

  const handleModelReady = useMemo(
    () => () => {
      setModelReady(true);
    },
    []
  );

  useEffect(() => {
    setLoadingProgress(modelReady ? 100 : progress);
  }, [progress, modelReady, setLoadingProgress]);

  useEffect(() => {
    setIsModelLoaded(modelReady);
  }, [modelReady, setIsModelLoaded]);

  useEffect(() => {
    return () => {
      setIsModelLoaded(false);
      setLoadingProgress(0);
    };
  }, [vehicle.glbPath, setIsModelLoaded, setLoadingProgress]);

  const zoomBy = (delta: number) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object;
    const dir = camera.position.clone().normalize();
    camera.position.addScaledVector(dir, delta);
    controls.update();
  };

  const viewerControls = [
    { icon: FaSync, label: "Rotar 360°", action: "rotate" as const },
    { icon: FaPlus, label: "Acercar", action: "zoomIn" as const },
    { icon: FaMinus, label: "Alejar", action: "zoomOut" as const },
  ];

  const handleControlAction = (action: "rotate" | "zoomIn" | "zoomOut") => {
    if (action === "rotate") {
      setAutoRotate((v) => !v);
      return;
    }
    zoomBy(action === "zoomIn" ? -1 : 1);
  };

  return (
    <div className="relative h-full min-h-[calc(100vh-12rem)] w-full lg:min-h-[calc(100vh-10rem)]">
      <AnimatePresence>
        {!modelReady && (
          <LoadingSpinner progress={progress} />
        )}
      </AnimatePresence>

      <div
        className={`absolute left-2 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 transition-opacity sm:left-4 ${
          interactive ? "opacity-100" : "pointer-events-none opacity-30"
        }`}
      >
        {viewerControls.map((ctrl) => {
          const Icon = ctrl.icon;
          return (
            <button
              key={ctrl.label}
              type="button"
              onClick={() => handleControlAction(ctrl.action)}
              disabled={!interactive || !modelReady}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md hover:bg-blue-50 sm:h-12 sm:w-12"
              aria-label={ctrl.label}
              title={ctrl.label}
            >
              <Icon className="text-sm text-[#1e88e5] sm:text-base" />
            </button>
          );
        })}
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: modelReady ? 1 : 0.15 }}
        transition={{ duration: 0.4 }}
        className={`absolute inset-0 ${
          interactive ? "" : "pointer-events-none"
        }`}
      >
        <Canvas
          shadows
          className="!h-full !w-full"
          camera={{ fov: 45, near: 0.1, far: 1000 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          style={{
            background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
            width: "100%",
            height: "100%",
          }}
        >
          <Suspense fallback={null}>
            <SceneContent
              vehicle={vehicle}
              hotspotInputs={hotspotInputs}
              autoRotate={autoRotate}
              interactive={interactive}
              controlsRef={controlsRef}
              onModelReady={handleModelReady}
            />
          </Suspense>
        </Canvas>
      </motion.div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs text-gray-500 shadow-md backdrop-blur-sm">
          <FaSync className="text-[#1e88e5]" />
          360°
        </div>
      </div>
    </div>
  );
}

export default function VehicleViewer(props: VehicleViewerProps) {
  return <VehicleViewerContent key={props.vehicle.glbPath} {...props} />;
}
