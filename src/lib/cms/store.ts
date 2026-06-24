import fs from "fs/promises";
import path from "path";
import { CMS_PATHS, SEED_PATHS } from "./paths";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function seedFile(cmsPath: string, seedPath: string) {
  await ensureDir(path.dirname(cmsPath));
  if (!(await fileExists(cmsPath))) {
    const content = await fs.readFile(seedPath, "utf-8");
    await fs.writeFile(cmsPath, content, "utf-8");
  }
}

async function seedHotspots() {
  await ensureDir(CMS_PATHS.hotspotsDir);
  const seedFiles = await fs.readdir(SEED_PATHS.hotspotsDir);
  for (const file of seedFiles) {
    if (!file.endsWith(".json")) continue;
    const cmsFile = path.join(CMS_PATHS.hotspotsDir, file);
    if (!(await fileExists(cmsFile))) {
      const content = await fs.readFile(
        path.join(SEED_PATHS.hotspotsDir, file),
        "utf-8"
      );
      await fs.writeFile(cmsFile, content, "utf-8");
    }
  }
}

export async function ensureCMS() {
  await seedFile(CMS_PATHS.products, SEED_PATHS.products);
  await seedFile(CMS_PATHS.vehicles, SEED_PATHS.vehicles);
  await seedFile(CMS_PATHS.quoteConfig, SEED_PATHS.quoteConfig);
  await seedHotspots();
}

export async function readCMS<T>(filePath: string): Promise<T> {
  await ensureCMS();
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}

export async function writeCMS(filePath: string, data: unknown) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function readProducts() {
  return readCMS<unknown[]>(CMS_PATHS.products);
}

export async function writeProducts(data: unknown[]) {
  await writeCMS(CMS_PATHS.products, data);
}

export async function readVehicles() {
  return readCMS<unknown[]>(CMS_PATHS.vehicles);
}

export async function writeVehicles(data: unknown[]) {
  await writeCMS(CMS_PATHS.vehicles, data);
}

export async function readQuoteConfig() {
  return readCMS<Record<string, unknown>>(CMS_PATHS.quoteConfig);
}

export async function writeQuoteConfig(data: Record<string, unknown>) {
  await writeCMS(CMS_PATHS.quoteConfig, data);
}

export async function readHotspots(vehicleId: string) {
  await ensureCMS();
  const filePath = path.join(CMS_PATHS.hotspotsDir, `${vehicleId}.json`);
  if (await fileExists(filePath)) {
    return readCMS<{ hotspots: unknown[] }>(filePath);
  }

  const seedPath = path.join(SEED_PATHS.hotspotsDir, `${vehicleId}.json`);
  if (await fileExists(seedPath)) {
    const content = await fs.readFile(seedPath, "utf-8");
    return JSON.parse(content) as { hotspots: unknown[] };
  }

  return { hotspots: [] };
}

export async function writeHotspots(vehicleId: string, data: { hotspots: unknown[] }) {
  await ensureDir(CMS_PATHS.hotspotsDir);
  await writeCMS(path.join(CMS_PATHS.hotspotsDir, `${vehicleId}.json`), data);
}

export async function listHotspotVehicles() {
  await ensureCMS();
  const files = await fs.readdir(CMS_PATHS.hotspotsDir);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}
