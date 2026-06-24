"use client";

import { useEffect, useRef, useState } from "react";

/** Target visual scale: modals should always look as they do at 75% browser zoom. */
const TARGET_MODAL_ZOOM = 0.75;

function readBrowserZoom(baselineDpr: number) {
  if (typeof window === "undefined") return 1;

  const viewportScale = window.visualViewport?.scale;
  if (viewportScale && Math.abs(viewportScale - 1) > 0.01) {
    return viewportScale;
  }

  const dprZoom = window.devicePixelRatio / baselineDpr;
  if (Math.abs(dprZoom - 1) > 0.02) {
    return dprZoom;
  }

  const outerVsInner = window.outerWidth / window.innerWidth;
  if (outerVsInner > 0.2 && outerVsInner < 5 && Math.abs(outerVsInner - 1) > 0.02) {
    return outerVsInner;
  }

  return 1;
}

export function useModalZoomLock() {
  const baselineDprRef = useRef<number | null>(null);
  const [modalZoom, setModalZoom] = useState(TARGET_MODAL_ZOOM);

  useEffect(() => {
    if (baselineDprRef.current === null) {
      baselineDprRef.current = window.devicePixelRatio;
    }

    const update = () => {
      setModalZoom(TARGET_MODAL_ZOOM / readBrowserZoom(baselineDprRef.current!));
    };

    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  return modalZoom;
}
