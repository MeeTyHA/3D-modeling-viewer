import * as THREE from "three";
import type { Hotspot } from "@/types";

export interface HotspotInput {
  id: string;
  label: string;
  description: string;
  relativePosition: [number, number, number];
  productId: string;
  installationNotes: string;
  labelOffset?: [number, number];
}

const SURFACE_OFFSET = 0.025;

function getMeshes(scene: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry) {
      meshes.push(child as THREE.Mesh);
    }
  });
  return meshes;
}

/** Bbox point from normalized 0–1 coordinates. */
function bboxPoint(
  box: THREE.Box3,
  relative: [number, number, number]
): THREE.Vector3 {
  const size = box.getSize(new THREE.Vector3());
  return new THREE.Vector3(
    box.min.x + relative[0] * size.x,
    box.min.y + relative[1] * size.y,
    box.min.z + relative[2] * size.z
  );
}

/**
 * Raycast from outside the model inward to snap a hotspot onto the actual mesh surface.
 * This prevents hotspots from floating in empty bounding-box space.
 */
export function snapToMeshSurface(
  scene: THREE.Object3D,
  relative: [number, number, number],
  surfaceOffset = SURFACE_OFFSET
): THREE.Vector3 {
  return snapToMeshSurfaceWithMeshes(scene, relative, getMeshes(scene), surfaceOffset);
}

/** Same as snapToMeshSurface but reuses a pre-collected mesh list (faster in editors). */
export function snapToMeshSurfaceWithMeshes(
  scene: THREE.Object3D,
  relative: [number, number, number],
  meshes: THREE.Mesh[],
  surfaceOffset = SURFACE_OFFSET
): THREE.Vector3 {
  scene.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const shell = bboxPoint(box, relative);

  if (meshes.length === 0) return shell;

  const outward = shell.clone().sub(center);
  if (outward.lengthSq() < 1e-8) outward.set(0, 1, 0);
  outward.normalize();

  const raycaster = new THREE.Raycaster();
  const hits: THREE.Intersection[] = [];

  const originOutside = center.clone().add(outward.clone().multiplyScalar(maxDim * 1.5));
  raycaster.set(originOutside, outward.clone().negate());
  hits.push(...raycaster.intersectObjects(meshes, false));

  const originShell = shell.clone().add(outward.clone().multiplyScalar(maxDim * 0.25));
  raycaster.set(originShell, outward.clone().negate());
  hits.push(...raycaster.intersectObjects(meshes, false));

  raycaster.set(center, outward);
  hits.push(...raycaster.intersectObjects(meshes, false));

  if (hits.length === 0) {
    return shell;
  }

  hits.sort((a, b) => {
    const da = a.point.distanceToSquared(shell);
    const db = b.point.distanceToSquared(shell);
    return da - db;
  });

  const hit = hits[0];
  const pos = hit.point.clone();

  if (hit.face) {
    const normal = hit.face.normal.clone();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
    normal.applyMatrix3(normalMatrix).normalize();
    pos.add(normal.multiplyScalar(surfaceOffset));
  }

  return pos;
}

export function getModelExtent(scene: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(scene);
  return Math.max(...box.getSize(new THREE.Vector3()).toArray(), 0.001);
}

/** Convert a world-space point into normalized 0–1 bbox coordinates. */
export function worldToRelativePosition(
  scene: THREE.Object3D,
  world: THREE.Vector3
): [number, number, number] {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const clamp = (value: number) => Math.min(1, Math.max(0, value));

  return [
    size.x > 0 ? clamp((world.x - box.min.x) / size.x) : 0.5,
    size.y > 0 ? clamp((world.y - box.min.y) / size.y) : 0.5,
    size.z > 0 ? clamp((world.z - box.min.z) / size.z) : 0.5,
  ];
}

/** Raycast onto model meshes and return normalized bbox coordinates. */
export function pickRelativeOnSurface(
  scene: THREE.Object3D,
  raycaster: THREE.Raycaster,
  meshes: THREE.Mesh[]
): [number, number, number] | null {
  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return null;
  return worldToRelativePosition(scene, hits[0].point);
}

export function resolveHotspotPositions(
  scene: THREE.Object3D,
  hotspots: HotspotInput[]
): Hotspot[] {
  return hotspots.map((h) => {
    const world = snapToMeshSurface(scene, h.relativePosition);
    return {
      id: h.id,
      label: h.label,
      description: h.description,
      productId: h.productId,
      installationNotes: h.installationNotes,
      relativePosition: h.relativePosition,
      labelOffset: h.labelOffset,
      position: [world.x, world.y, world.z] as [number, number, number],
    };
  });
}
