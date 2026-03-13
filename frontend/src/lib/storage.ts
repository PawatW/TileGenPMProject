// ───────────────────────────────────────────────────────────────
// Catalog storage
// ───────────────────────────────────────────────────────────────

export interface CatalogItem {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  pricePerBox: number;
  tilesPerBox: number;
  color: string; // hex e.g. "#cccccc"
  note: string;
  createdAt: string;
}

const CATALOG_KEY = (userId: string) => `pm_catalog_v1_${userId}`;

export function getCatalog(userId: string): CatalogItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CATALOG_KEY(userId)) || "[]");
  } catch {
    return [];
  }
}

export function saveCatalog(userId: string, items: CatalogItem[]): void {
  localStorage.setItem(CATALOG_KEY(userId), JSON.stringify(items));
}

export function addCatalogItem(userId: string, item: Omit<CatalogItem, "id" | "createdAt">): CatalogItem {
  const newItem: CatalogItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const items = getCatalog(userId);
  saveCatalog(userId, [...items, newItem]);
  return newItem;
}

export function updateCatalogItem(userId: string, id: string, updates: Partial<Omit<CatalogItem, "id" | "createdAt">>): void {
  const items = getCatalog(userId).map((it) => (it.id === id ? { ...it, ...updates } : it));
  saveCatalog(userId, items);
}

export function deleteCatalogItem(userId: string, id: string): void {
  saveCatalog(userId, getCatalog(userId).filter((it) => it.id !== id));
}

// ───────────────────────────────────────────────────────────────
// Draft helpers (read-only, written by existing floor.js system)
// ───────────────────────────────────────────────────────────────

const DRAFT_KEY = "pm69-floorplanner:drafts:v1";

export interface DraftSlot {
  slot: string; // "1" .. "5"
  name: string;
  savedAt: string | null;
}

export function getDraftSlots(): DraftSlot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptySlots();
    const store = JSON.parse(raw) as { slots?: Record<string, { name?: string; savedAt?: string }> };
    const slots: DraftSlot[] = [];
    for (let i = 1; i <= 5; i++) {
      const id = String(i);
      const s = store.slots?.[id];
      slots.push({ slot: id, name: s?.name ?? `Slot ${id} (ว่าง)`, savedAt: s?.savedAt ?? null });
    }
    return slots;
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
