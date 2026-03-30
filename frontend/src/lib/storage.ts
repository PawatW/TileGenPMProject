/**
 * storage.ts — Calculator catalog helpers.
 *
 * Previously localStorage-based; now delegates to the REST API.
 * The CatalogItem type and function signatures are kept for compatibility.
 */

import {
  apiGetCatalog,
  apiCreateCatalogItem,
  apiUpdateCatalogItem,
  apiDeleteCatalogItem,
  apiGetPlannerCatalog,
  apiCreatePlannerCatalogItem,
  apiDeletePlannerCatalogItem,
  apiListDesignSlots,
  type CatalogItem,
  type PlannerCatalogEntry,
  type PlannerCatalogPayload,
  type PlannerCatalogType,
} from "./api";

export type { CatalogItem };
export type { PlannerCatalogEntry, PlannerCatalogPayload, PlannerCatalogType };

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toCm(value: number, unit: unknown): number {
  const normalizedUnit = typeof unit === "string" ? unit.toLowerCase() : "cm";
  if (normalizedUnit === "inch") return value * 2.54;
  if (normalizedUnit === "m") return value * 100;
  if (normalizedUnit === "mm") return value / 10;
  return value;
}

function normalizePlannerTile(entry: PlannerCatalogEntry): CatalogItem | null {
  const label = typeof entry.label === "string" ? entry.label.trim() : "";
  if (!label) return null;

  const widthRaw = toNumber(entry.width, 60);
  const lengthRaw = toNumber(entry.length, 60);
  const widthCm = Number(toCm(widthRaw, entry.unit).toFixed(2));
  const heightCm = Number(toCm(lengthRaw, entry.unit).toFixed(2));

  const dbId = typeof entry.dbId === "string" ? entry.dbId : undefined;
  const fallbackKey = typeof entry.key === "string" ? entry.key : label;

  return {
    id: dbId ?? `planner:${fallbackKey}`,
    name: label,
    widthCm,
    heightCm,
    pricePerBox: Math.max(0, toNumber(entry.pricePerBox, 0)),
    tilesPerBox: Math.max(1, Math.ceil(toNumber(entry.tilesPerBox, 1))),
    color: typeof entry.color === "string" ? entry.color : "",
    note: typeof entry.note === "string" ? entry.note : "planner",
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date(0).toISOString(),
  };
}

function catalogSignature(item: CatalogItem): string {
  return [
    item.name.trim().toLowerCase(),
    item.widthCm.toFixed(2),
    item.heightCm.toFixed(2),
  ].join("|");
}

function dedupeCatalogItems(items: CatalogItem[]): CatalogItem[] {
  const bySignature = new Map<string, CatalogItem>();
  items.forEach((item) => {
    bySignature.set(catalogSignature(item), item);
  });
  return Array.from(bySignature.values());
}

export async function getCatalog(): Promise<CatalogItem[]> {
  const [plannerResult, legacyResult] = await Promise.allSettled([
    apiGetPlannerCatalog(),
    apiGetCatalog(),
  ]);

  const plannerTiles = plannerResult.status === "fulfilled"
    ? plannerResult.value.tiles
      .map((entry) => normalizePlannerTile(entry))
      .filter((entry): entry is CatalogItem => entry !== null)
    : [];

  const legacyTiles = legacyResult.status === "fulfilled" ? legacyResult.value : [];

  // Keep legacy data as fallback while preferring planner catalog as source of truth.
  return dedupeCatalogItems([...legacyTiles, ...plannerTiles]);
}

export async function addCatalogItem(
  item: Omit<CatalogItem, "id" | "createdAt">
): Promise<CatalogItem> {
  return apiCreateCatalogItem(item);
}

export async function updateCatalogItem(
  id: string,
  updates: Partial<Omit<CatalogItem, "id" | "createdAt">>
): Promise<void> {
  await apiUpdateCatalogItem(id, updates);
}

export async function deleteCatalogItem(id: string): Promise<void> {
  await apiDeleteCatalogItem(id);
}

export async function getPlannerCatalog(): Promise<PlannerCatalogPayload> {
  return apiGetPlannerCatalog();
}

export async function addPlannerCatalogItem(
  type: PlannerCatalogType,
  item: PlannerCatalogEntry
): Promise<PlannerCatalogEntry> {
  return apiCreatePlannerCatalogItem(type, item);
}

export async function deletePlannerCatalogItem(id: string): Promise<void> {
  await apiDeletePlannerCatalogItem(id);
}

// ── Draft slot metadata ───────────────────────────────────────────────────────
// Slot metadata is written by drafts.js (vanilla JS) to localStorage as a
// mirror of what it saves to the API, so the dashboard can read it synchronously.

export interface DraftSlot {
  slot: string; // "1" .. "5"
  name: string;
  savedAt: string | null;
}

interface DraftStore {
  version: number;
  slots: Record<string, { name?: string; savedAt?: string | null; state?: unknown }>;
}

function getDraftKey(): string {
  try {
    const token = localStorage.getItem("pm_token_v1");
    if (!token) return "pm69-floorplanner:drafts:v1:anonymous";
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return `pm69-floorplanner:drafts:v1:${payload.sub || "anonymous"}`;
  } catch {
    return "pm69-floorplanner:drafts:v1:anonymous";
  }
}

function readDraftStore(): DraftStore {
  if (typeof window === "undefined") return { version: 1, slots: {} };
  try {
    const raw = localStorage.getItem(getDraftKey());
    if (!raw) return { version: 1, slots: {} };
    const parsed = JSON.parse(raw) as Partial<DraftStore>;
    return {
      version: 1,
      slots: parsed.slots && typeof parsed.slots === "object" ? parsed.slots : {},
    };
  } catch {
    return { version: 1, slots: {} };
  }
}

function writeDraftStore(store: DraftStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getDraftKey(), JSON.stringify({ version: 1, slots: store.slots }));
}

export async function hydrateDraftSlotsFromApi(): Promise<DraftSlot[]> {
  if (typeof window === "undefined") return emptySlots();
  try {
    const remoteSlots = await apiListDesignSlots();
    const store = readDraftStore();
    let changed = false;

    for (const [slotKey, meta] of Object.entries(remoteSlots)) {
      const slotId = slotKey.replace("slot_", "");
      if (!/^[1-5]$/.test(slotId)) continue;

      const existing = store.slots[slotId] || {};
      const next = {
        ...existing,
        name: meta.name,
        savedAt: meta.savedAt,
      };

      if (!store.slots[slotId] || store.slots[slotId].name !== next.name || store.slots[slotId].savedAt !== next.savedAt) {
        store.slots[slotId] = next;
        changed = true;
      }
    }

    if (changed) {
      writeDraftStore(store);
    }
  } catch {
    // Keep dashboard usable with local cache when API is temporarily unavailable.
  }

  return getDraftSlots();
}

export function getDraftSlots(): DraftSlot[] {
  if (typeof window === "undefined") return emptySlots();
  try {
    const store = readDraftStore();
    return Array.from({ length: 5 }, (_, i) => {
      const id = String(i + 1);
      const s = store.slots?.[id];
      return {
        slot: id,
        name: s?.name ?? `Slot ${id} (ว่าง)`,
        savedAt: s?.savedAt ?? null,
      };
    });
  } catch {
    return emptySlots();
  }
}

function emptySlots(): DraftSlot[] {
  return Array.from({ length: 5 }, (_, i) => ({
    slot: String(i + 1),
    name: `Slot ${i + 1} (ว่าง)`,
    savedAt: null,
  }));
}
