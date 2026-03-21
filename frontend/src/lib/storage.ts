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
  type CatalogItem,
} from "./api";

export type { CatalogItem };

export async function getCatalog(): Promise<CatalogItem[]> {
  return apiGetCatalog();
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

// ── Draft slot metadata ───────────────────────────────────────────────────────
// Slot metadata is written by drafts.js (vanilla JS) to localStorage as a
// mirror of what it saves to the API, so the dashboard can read it synchronously.

export interface DraftSlot {
  slot: string; // "1" .. "5"
  name: string;
  savedAt: string | null;
}

const DRAFT_KEY = "pm69-floorplanner:drafts:v1";

export function getDraftSlots(): DraftSlot[] {
  if (typeof window === "undefined") return emptySlots();
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptySlots();
    const store = JSON.parse(raw) as {
      slots?: Record<string, { name?: string; savedAt?: string }>;
    };
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
