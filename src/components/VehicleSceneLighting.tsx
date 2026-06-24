"use client";

import { Environment } from "@react-three/drei";

/** Bundled HDR — same map as drei's `preset="city"` (no external fetch). */
export const VEHICLE_ENV_HDR = "/assets/hdr/potsdamer_platz_1k.hdr";

export default function VehicleSceneLighting({ shadows = true }: { shadows?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow={shadows} />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />
      <hemisphereLight args={["#ffffff", "#444444", 0.5]} />
      <Environment
        files={VEHICLE_ENV_HDR}
        background={false}
        environmentIntensity={1}
      />
    </>
  );
}
