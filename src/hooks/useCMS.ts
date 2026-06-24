"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product, QuoteConfig, Vehicle } from "@/types";
import type { HotspotInput } from "@/utils/hotspotPositions";
import { getHotspots } from "@/data/hotspots";
import productsSeed from "@/data/products/products.json";
import vehiclesSeed from "@/data/vehicles/vehicles.json";
import quoteConfigSeed from "@/data/quote-config.json";

interface HotspotResponse {
  hotspots: HotspotInput[];
}

const cmsCache = new Map<string, Promise<unknown>>();

function invalidateCmsCache(key?: string) {
  if (key) {
    cmsCache.delete(key);
    return;
  }
  cmsCache.clear();
}

async function fetchCmsOnce<T>(key: string, url: string, fallback: T): Promise<T> {
  if (!cmsCache.has(key)) {
    cmsCache.set(
      key,
      fetch(url, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : fallback))
        .catch(() => fallback)
    );
  }
  return cmsCache.get(key) as Promise<T>;
}

export function useCMSProducts() {
  const [products, setProducts] = useState<Product[]>(productsSeed as Product[]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchCmsOnce("products", "/api/cms/products", productsSeed as Product[]).then(
      (data) => {
        if (active) setProducts(data);
      }
    );

    return () => {
      active = false;
    };
  }, []);

  const getProduct = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      invalidateCmsCache("products");
      const data = await fetchCmsOnce(
        "products",
        "/api/cms/products",
        productsSeed as Product[]
      );
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { products, getProduct, loading, refresh };
}

export function useCMSVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(vehiclesSeed as Vehicle[]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchCmsOnce("vehicles", "/api/cms/vehicles", vehiclesSeed as Vehicle[]).then(
      (data) => {
        if (active) setVehicles(data);
      }
    );

    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      invalidateCmsCache("vehicles");
      const data = await fetchCmsOnce(
        "vehicles",
        "/api/cms/vehicles",
        vehiclesSeed as Vehicle[]
      );
      setVehicles(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { vehicles, loading, refresh };
}

export function useCMSQuoteConfig() {
  const [config, setConfig] = useState<QuoteConfig>(quoteConfigSeed as QuoteConfig);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchCmsOnce(
      "quote-config",
      "/api/cms/quote-config",
      quoteConfigSeed as QuoteConfig
    ).then((data) => {
      if (active) setConfig(data);
    });

    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      invalidateCmsCache("quote-config");
      const data = await fetchCmsOnce(
        "quote-config",
        "/api/cms/quote-config",
        quoteConfigSeed as QuoteConfig
      );
      setConfig(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { config, loading, refresh };
}

export function useCMSHotspots(vehicleId: string) {
  const seedHotspots = useMemo(() => getHotspots(vehicleId).hotspots, [vehicleId]);
  const [remoteHotspots, setRemoteHotspots] = useState<Record<string, HotspotInput[]>>({});
  const [loading, setLoading] = useState(false);

  const hotspots = remoteHotspots[vehicleId] ?? seedHotspots;

  useEffect(() => {
    let active = true;
    const cacheKey = `hotspots:${vehicleId}`;

    void fetchCmsOnce<HotspotResponse>(
      cacheKey,
      `/api/cms/hotspots?vehicleId=${encodeURIComponent(vehicleId)}`,
      { hotspots: seedHotspots }
    ).then((data) => {
      if (active && data.hotspots?.length) {
        setRemoteHotspots((current) => ({
          ...current,
          [vehicleId]: data.hotspots,
        }));
      }
    });

    return () => {
      active = false;
    };
  }, [vehicleId, seedHotspots]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const cacheKey = `hotspots:${vehicleId}`;
      invalidateCmsCache(cacheKey);
      const data = await fetchCmsOnce<HotspotResponse>(
        cacheKey,
        `/api/cms/hotspots?vehicleId=${encodeURIComponent(vehicleId)}`,
        { hotspots: seedHotspots }
      );
      if (data.hotspots?.length) {
        setRemoteHotspots((current) => ({
          ...current,
          [vehicleId]: data.hotspots,
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [vehicleId, seedHotspots]);

  return { hotspots, loading, refresh };
}

export { invalidateCmsCache };
