"use client";

import { useRef, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import type { Hotspot } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { useProducts } from "@/hooks/useProducts";

/** 3D sphere pinned to model surface; scales to keep constant screen size. */
function HotspotDot({
  isActive,
  hovered,
  onPointerOver,
  onPointerOut,
  onClick,
}: {
  isActive: boolean;
  hovered: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useFrame(() => {
    const mesh = meshRef.current;
    const ring = ringRef.current;
    if (!mesh) return;

    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    const dist = camera.position.distanceTo(worldPos);
    const s = dist * 0.008;

    mesh.scale.setScalar(s);
    if (ring) ring.scale.setScalar(s);
  });

  const color = isActive ? "#1565c0" : hovered ? "#2196f3" : "#1e88e5";

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver();
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[1.18, 1.42, 32]} />
        <meshBasicMaterial color="white" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

interface HotspotMarkerProps {
  hotspot: Hotspot & { labelOffset?: [number, number] };
  isActive: boolean;
  onSelect: (hotspot: Hotspot) => void;
}

function HotspotMarker({ hotspot, isActive, onSelect }: HotspotMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const showLabel = hovered || isActive;
  const [ox, oy] = hotspot.labelOffset ?? [72, -48];

  // Convert screen-pixel label offset to a small 3D offset for the leader line end
  const label3D: [number, number, number] = [ox * 0.004, -oy * 0.004, 0];

  return (
    <group position={hotspot.position}>
      <HotspotDot
        isActive={isActive}
        hovered={hovered}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={() => onSelect(hotspot)}
      />

      {showLabel && (
        <Line
          points={[[0, 0, 0], label3D]}
          color="white"
          lineWidth={2}
          transparent
          opacity={0.95}
        />
      )}

      {showLabel && (
        <Html
          position={label3D}
          center
          distanceFactor={12}
          zIndexRange={[200, 0]}
          style={{ pointerEvents: "none" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="whitespace-nowrap rounded-lg bg-[#1a3a5c] px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg"
          >
            {hotspot.label}
          </motion.div>
        </Html>
      )}
    </group>
  );
}

interface HotspotsProps {
  hotspots: (Hotspot & { labelOffset?: [number, number] })[];
}

export default function Hotspots({ hotspots }: HotspotsProps) {
  const selectedHotspot = useAppStore((s) => s.selectedHotspot);
  const setSelectedHotspot = useAppStore((s) => s.setSelectedHotspot);
  const setSelectedProduct = useAppStore((s) => s.setSelectedProduct);
  const openPanelsWithCatalog = useAppStore((s) => s.openPanelsWithCatalog);
  const panelsOpen = useAppStore((s) => s.panelsOpen);
  const { getProduct } = useProducts();

  const handleSelect = useCallback(
    (hotspot: Hotspot) => {
      if (panelsOpen) return;
      setSelectedHotspot(hotspot);
      const product = getProduct(hotspot.productId);
      if (product) setSelectedProduct(product);
      openPanelsWithCatalog();
    },
    [panelsOpen, setSelectedHotspot, setSelectedProduct, openPanelsWithCatalog, getProduct]
  );

  return (
    <group name="vehicle-hotspots">
      {hotspots.map((hotspot) => (
        <HotspotMarker
          key={hotspot.id}
          hotspot={hotspot}
          isActive={selectedHotspot?.id === hotspot.id}
          onSelect={handleSelect}
        />
      ))}
    </group>
  );
}
