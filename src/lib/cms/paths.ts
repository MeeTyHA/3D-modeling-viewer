import path from "path";

export const CMS_ROOT = path.join(process.cwd(), "data", "cms");

export const CMS_PATHS = {
  products: path.join(CMS_ROOT, "products.json"),
  vehicles: path.join(CMS_ROOT, "vehicles.json"),
  quoteConfig: path.join(CMS_ROOT, "quote-config.json"),
  hotspotsDir: path.join(CMS_ROOT, "hotspots"),
} as const;

export const SEED_PATHS = {
  products: path.join(process.cwd(), "src", "data", "products", "products.json"),
  vehicles: path.join(process.cwd(), "src", "data", "vehicles", "vehicles.json"),
  quoteConfig: path.join(process.cwd(), "src", "data", "quote-config.json"),
  hotspotsDir: path.join(process.cwd(), "src", "data", "hotspots"),
} as const;
