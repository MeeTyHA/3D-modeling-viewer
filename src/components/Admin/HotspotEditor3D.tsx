"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { Vehicle, Hotspot } from "@/types";
import type { HotspotInputData } from "@/types";
import { initGLTFLoader, preloadGLB } from "@/hooks/useGLBLoader";
import LoadingSpinner from "@/components/LoadingSpinner";
import VehicleSceneLighting from "@/components/VehicleSceneLighting";
import {
  cloneModelScene,
  computeSceneFit,
  enhanceMeshQualityOnce,
} from "@/utils/gltfLoaderExtensions";
import {
  resolveHotspotPositions,
  snapToMeshSurfaceWithMeshes,
  worldToRelativePosition,
  type HotspotInput,
} from "@/utils/hotspotPositions";

initGLTFLoader();

interface HotspotEditor3DProps {
  vehicle: Vehicle;
  hotspots: HotspotInputData[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdatePosition: (id: string, relativePosition: [number, number, number]) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}

interface ContextMenuState {
  id: string;
  x: number;
  y: number;
}

const RAYCASTER = new THREE.Raycaster();
const NDC = new THREE.Vector2();
const HIT_POINT = new THREE.Vector3();
const DRAG_WORLD = new THREE.Vector3();
const WORLD_POS = new THREE.Vector3();
const DRAG_THRESHOLD_PX = 4;

interface PendingHotspotDrag {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
}

function setCanvasCursor(canvas: HTMLCanvasElement, cursor: string) {
  canvas.style.cursor = cursor;
}

function CameraController({ position }: { position: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(0, 0, 0);
  }, [camera, position]);
  return null;
}

function HotspotMarkers({
  resolved,
  selectedId,
  armedId,
  draggingIdRef,
  dragWorldRef,
  onSelect,
  onContextMenu,
  onPointerDownHotspot,
  onHoverChange,
}: {
  resolved: Hotspot[];
  selectedId: string | null;
  armedId: string | null;
  draggingIdRef: React.MutableRefObject<string | null>;
  dragWorldRef: React.MutableRefObject<THREE.Vector3>;
  onSelect: (id: string) => void;
  onContextMenu: (id: string, e: ThreeEvent<MouseEvent>) => void;
  onPointerDownHotspot: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onHoverChange: (hovered: boolean) => void;
}) {
  const visualsRef = useRef(
    new Map<string, { sphere: THREE.Mesh; ring: THREE.Mesh; group: THREE.Group }>()
  );

  useFrame(({ camera }) => {
    for (const hotspot of resolved) {
      const visual = visualsRef.current.get(hotspot.id);
      if (!visual) continue;

      if (draggingIdRef.current === hotspot.id) {
        visual.group.position.copy(dragWorldRef.current);
      } else {
        visual.group.position.set(...hotspot.position);
      }

      visual.sphere.getWorldPosition(WORLD_POS);
      const scale = camera.position.distanceTo(WORLD_POS) * 0.008;
      visual.sphere.scale.setScalar(scale);
      visual.ring.scale.setScalar(scale);
    }
  });

  const bindPointer = (id: string) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHoverChange(true);
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHoverChange(false);
    },
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      onSelect(id);
      onPointerDownHotspot(id, e);
    },
    onContextMenu: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onContextMenu(id, e);
    },
  });

  return (
    <>
      {resolved.map((hotspot) => {
        const selected = selectedId === hotspot.id;
        const armed = armedId === hotspot.id;
        const handlers = bindPointer(hotspot.id);

        return (
          <group
            key={hotspot.id}
            position={hotspot.position}
            ref={(group) => {
              if (!group) {
                visualsRef.current.delete(hotspot.id);
                return;
              }
              const sphere = group.children[1] as THREE.Mesh;
              const ring = group.children[2] as THREE.Mesh;
              visualsRef.current.set(hotspot.id, { group, sphere, ring });
            }}
          >
            <mesh visible={false} {...handlers}>
              <sphereGeometry args={[1.7, 8, 8]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            <mesh {...handlers}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial
                color={selected || armed ? "#1565c0" : "#1e88e5"}
                toneMapped={false}
              />
            </mesh>
            <mesh {...handlers}>
              <ringGeometry args={[1.18, 1.42, 24]} />
              <meshBasicMaterial color="white" side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function EditorScene({
  vehicle,
  hotspots,
  selectedId,
  repositionArmedId,
  onSelect,
  onUpdatePosition,
  onContextMenu,
  onModelReady,
  onDragEnd,
  controlsRef,
  draggingIdRef,
}: HotspotEditor3DProps & {
  repositionArmedId: string | null;
  onContextMenu: (id: string, e: ThreeEvent<MouseEvent>) => void;
  onModelReady: () => void;
  onDragEnd: () => void;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  draggingIdRef: React.MutableRefObject<string | null>;
}) {
  const modelRootRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const readySentRef = useRef(false);
  const dragWorldRef = useRef(DRAG_WORLD);
  const pendingRelativeRef = useRef<[number, number, number] | null>(null);
  const pendingDragRef = useRef<PendingHotspotDrag | null>(null);
  const hotspotHoverCountRef = useRef(0);
  const localHotspotsRef = useRef<HotspotInputData[]>(hotspots);
  const resolvedRef = useRef<Hotspot[]>([]);
  const dragRafRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [resolved, setResolved] = useState<Hotspot[]>([]);
  const { gl, camera } = useThree();

  const { scene: gltfScene } = useGLTF(vehicle.glbPath, true, false);
  const displayScene = useMemo(() => cloneModelScene(gltfScene), [gltfScene]);
  const fit = useMemo(() => computeSceneFit(displayScene), [displayScene]);

  const hotspotStructureKey = useMemo(
    () => `${vehicle.glbPath}|${hotspots.map((h) => h.id).join("\0")}`,
    [hotspots, vehicle.glbPath]
  );

  const resolveAll = useCallback(() => {
    const root = modelRootRef.current;
    if (!root) return;
    root.updateMatrixWorld(true);
    const next = resolveHotspotPositions(root, localHotspotsRef.current as HotspotInput[]);
    resolvedRef.current = next;
    setResolved(next);
  }, []);

  const patchHotspot = useCallback(
    (id: string, relative: [number, number, number]) => {
      const root = modelRootRef.current;
      if (!root) return;

      localHotspotsRef.current = localHotspotsRef.current.map((h) =>
        h.id === id ? { ...h, relativePosition: relative } : h
      );

      const source = localHotspotsRef.current.find((h) => h.id === id);
      if (!source) return;

      const world = snapToMeshSurfaceWithMeshes(
        root,
        relative,
        meshesRef.current
      );

      const nextHotspot: Hotspot = {
        id: source.id,
        label: source.label,
        description: source.description,
        productId: source.productId,
        installationNotes: source.installationNotes,
        relativePosition: relative,
        labelOffset: source.labelOffset,
        position: [world.x, world.y, world.z],
      };

      const next = resolvedRef.current.map((h) => (h.id === id ? nextHotspot : h));
      resolvedRef.current = next;
      setResolved(next);
    },
    []
  );

  useLayoutEffect(() => {
    enhanceMeshQualityOnce(displayScene, gl.capabilities.getMaxAnisotropy());
    const meshes: THREE.Mesh[] = [];
    displayScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
    });
    meshesRef.current = meshes;

    if (!readySentRef.current) {
      readySentRef.current = true;
      onModelReady();
    }
  }, [displayScene, gl, onModelReady]);

  useEffect(() => {
    localHotspotsRef.current = hotspots;
    const id = requestAnimationFrame(() => resolveAll());
    return () => cancelAnimationFrame(id);
    // Only re-resolve when vehicle or hotspot ids change — not on position-only updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hotspots read from latest render when structureKey changes
  }, [hotspotStructureKey, resolveAll]);

  const raycastFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const root = modelRootRef.current;
      if (!root) return null;

      const rect = gl.domElement.getBoundingClientRect();
      NDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      NDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      RAYCASTER.setFromCamera(NDC, camera);

      const hits = RAYCASTER.intersectObjects(meshesRef.current, false);
      if (!hits.length) return null;

      HIT_POINT.copy(hits[0].point);
      return {
        world: HIT_POINT,
        relative: worldToRelativePosition(root, hits[0].point),
      };
    },
    [camera, gl]
  );

  const applyDragVisual = useCallback(
    (clientX: number, clientY: number) => {
      const hit = raycastFromPointer(clientX, clientY);
      if (!hit) return;
      dragWorldRef.current.copy(hit.world);
      pendingRelativeRef.current = hit.relative;
    },
    [raycastFromPointer]
  );

  const scheduleDragVisual = useCallback(
    (clientX: number, clientY: number) => {
      pendingPointerRef.current = { x: clientX, y: clientY };
      if (dragRafRef.current !== null) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        const pending = pendingPointerRef.current;
        if (pending) applyDragVisual(pending.x, pending.y);
      });
    },
    [applyDragVisual]
  );

  const beginHotspotDrag = useCallback(
    (id: string, pointerId: number) => {
      draggingIdRef.current = id;
      pendingRelativeRef.current = null;
      pendingDragRef.current = null;

      if (controlsRef.current) controlsRef.current.enabled = false;
      setCanvasCursor(gl.domElement, "grabbing");
      gl.domElement.setPointerCapture(pointerId);
    },
    [controlsRef, draggingIdRef, gl.domElement]
  );

  const commitPosition = useCallback(
    (id: string, relative: [number, number, number]) => {
      patchHotspot(id, relative);
      onUpdatePosition(id, relative);
    },
    [onUpdatePosition, patchHotspot]
  );

  useEffect(() => {
    const canvas = gl.domElement;
    const controls = controlsRef.current;

    const onPointerMove = (e: PointerEvent) => {
      const pending = pendingDragRef.current;
      if (pending && !draggingIdRef.current) {
        const threshold =
          repositionArmedId === pending.id ? 1 : DRAG_THRESHOLD_PX;
        const dx = e.clientX - pending.startX;
        const dy = e.clientY - pending.startY;
        if (Math.hypot(dx, dy) >= threshold) {
          beginHotspotDrag(pending.id, pending.pointerId);
        }
      }

      if (draggingIdRef.current) {
        scheduleDragVisual(e.clientX, e.clientY);
      }
    };

    const clearPending = () => {
      pendingDragRef.current = null;
    };

    const endDrag = (e: PointerEvent) => {
      if (pendingDragRef.current?.pointerId === e.pointerId) {
        clearPending();
      }

      const id = draggingIdRef.current;
      if (!id) return;

      const relative = pendingRelativeRef.current;
      if (relative) commitPosition(id, relative);

      draggingIdRef.current = null;
      pendingRelativeRef.current = null;

      if (controlsRef.current) controlsRef.current.enabled = true;
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      setCanvasCursor(
        canvas,
        hotspotHoverCountRef.current > 0 ? "pointer" : ""
      );
      onDragEnd();
    };

    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    controls?.addEventListener("start", clearPending);

    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      controls?.removeEventListener("start", clearPending);
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
      }
    };
  }, [
    beginHotspotDrag,
    commitPosition,
    controlsRef,
    draggingIdRef,
    gl,
    onDragEnd,
    repositionArmedId,
    scheduleDragVisual,
  ]);

  const handleHotspotPointerDown = (id: string, e: ThreeEvent<PointerEvent>) => {
    if (repositionArmedId === id) {
      beginHotspotDrag(id, e.pointerId);
      return;
    }

    pendingDragRef.current = {
      id,
      pointerId: e.pointerId,
      startX: e.nativeEvent.clientX,
      startY: e.nativeEvent.clientY,
    };
  };

  const handleHotspotHover = useCallback(
    (hovered: boolean) => {
      hotspotHoverCountRef.current += hovered ? 1 : -1;
      if (draggingIdRef.current) return;
      setCanvasCursor(
        gl.domElement,
        hotspotHoverCountRef.current > 0 ? "pointer" : ""
      );
    },
    [draggingIdRef, gl.domElement]
  );

  const handleModelClick = (e: ThreeEvent<MouseEvent>) => {
    if (draggingIdRef.current || pendingDragRef.current) return;
    const root = modelRootRef.current;
    if (!root) return;

    const meshHit = e.intersections.find((hit) =>
      meshesRef.current.includes(hit.object as THREE.Mesh)
    );
    if (!meshHit) return;

    const relative = worldToRelativePosition(root, meshHit.point);
    const targetId =
      selectedId ?? localHotspotsRef.current[localHotspotsRef.current.length - 1]?.id ?? null;
    if (targetId) commitPosition(targetId, relative);
  };

  return (
    <>
      <CameraController position={vehicle.cameraPosition} />
      <VehicleSceneLighting shadows={false} />

      <group
        ref={modelRootRef}
        rotation={vehicle.modelRotation}
        scale={vehicle.modelScale * fit.fitScale}
        onClick={handleModelClick}
      >
        <group position={fit.center}>
          <primitive object={displayScene} />
        </group>
      </group>

      <HotspotMarkers
        resolved={resolved}
        selectedId={selectedId}
        armedId={repositionArmedId}
        draggingIdRef={draggingIdRef}
        dragWorldRef={dragWorldRef}
        onSelect={onSelect}
        onPointerDownHotspot={handleHotspotPointerDown}
        onContextMenu={onContextMenu}
        onHoverChange={handleHotspotHover}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={1}
        zoomSpeed={1.15}
        minDistance={2}
        maxDistance={36}
        enablePan={false}
        zoomToCursor
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />
    </>
  );
}

function HotspotContextMenu({
  menu,
  label,
  onClose,
  onMove,
  onRename,
  onDelete,
}: {
  menu: ContextMenuState;
  label: string;
  onClose: () => void;
  onMove: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [onClose]);

  return (
    <div
      className="fixed z-[100] min-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-[#1a3a5c]">
        {label}
      </p>
      <button
        type="button"
        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
        onClick={onMove}
      >
        Mover posición
      </button>
      <button
        type="button"
        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
        onClick={onRename}
      >
        Renombrar
      </button>
      <button
        type="button"
        className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        onClick={onDelete}
      >
        Eliminar
      </button>
    </div>
  );
}

export default function HotspotEditor3D(props: HotspotEditor3DProps) {
  return <HotspotEditor3DInner key={props.vehicle.glbPath} {...props} />;
}

function HotspotEditor3DInner({
  vehicle,
  hotspots,
  selectedId,
  onSelect,
  onUpdatePosition,
  onRename,
  onDelete,
}: HotspotEditor3DProps) {
  const { progress } = useProgress();
  const [modelReady, setModelReady] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [repositionArmedId, setRepositionArmedId] = useState<string | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const draggingIdRef = useRef<string | null>(null);

  useEffect(() => {
    preloadGLB(vehicle.glbPath);
  }, [vehicle.glbPath]);

  const handleModelReady = useCallback(() => setModelReady(true), []);
  const handleDragEnd = useCallback(() => setRepositionArmedId(null), []);

  const handleContextMenu = useCallback(
    (id: string, e: ThreeEvent<MouseEvent>) => {
      e.nativeEvent.preventDefault();
      onSelect(id);
      setContextMenu({
        id,
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
      });
    },
    [onSelect]
  );

  const closeMenu = useCallback(() => setContextMenu(null), []);

  const menuHotspot = contextMenu
    ? hotspots.find((h) => h.id === contextMenu.id)
    : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
        {repositionArmedId
          ? "Arrastra el punto sobre el modelo. Rueda del ratón para acercar o alejar."
          : "Arrastra para rotar · Rueda para zoom · Clic en el modelo para colocar el punto · Arrastra un punto para moverlo"}
      </div>
      <div className="relative h-[480px] w-full">
        {!modelReady && (
          <LoadingSpinner progress={modelReady ? 100 : progress} />
        )}
        <Canvas
          camera={{ fov: 45, near: 0.1, far: 1000 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          onCreated={({ gl }) => {
            gl.domElement.style.touchAction = "none";
          }}
          style={{
            background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
            width: "100%",
            height: "100%",
            opacity: modelReady ? 1 : 0.2,
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Suspense fallback={null}>
            <EditorScene
              vehicle={vehicle}
              hotspots={hotspots}
              selectedId={selectedId}
              repositionArmedId={repositionArmedId}
              onSelect={onSelect}
              onUpdatePosition={onUpdatePosition}
              onRename={onRename}
              onDelete={onDelete}
              onContextMenu={handleContextMenu}
              onModelReady={handleModelReady}
              onDragEnd={handleDragEnd}
              controlsRef={controlsRef}
              draggingIdRef={draggingIdRef}
            />
          </Suspense>
        </Canvas>
      </div>

      {contextMenu && menuHotspot && (
        <HotspotContextMenu
          menu={contextMenu}
          label={menuHotspot.label}
          onClose={closeMenu}
          onMove={() => {
            closeMenu();
            onSelect(contextMenu.id);
            setRepositionArmedId(contextMenu.id);
          }}
          onRename={() => {
            closeMenu();
            const next = window.prompt("Nuevo nombre del punto:", menuHotspot.label);
            if (next?.trim()) onRename(contextMenu.id, next.trim());
          }}
          onDelete={() => {
            closeMenu();
            if (window.confirm(`¿Eliminar "${menuHotspot.label}"?`)) {
              onDelete(contextMenu.id);
              if (selectedId === contextMenu.id) onSelect(null);
            }
          }}
        />
      )}
    </div>
  );
}
