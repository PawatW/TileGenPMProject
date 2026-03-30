/**
 * API client for Studio PM backend.
 *
 * All requests go through Next.js rewrites (/api/* → backend) so no
 * absolute URL is needed in the browser.  The token is stored in
 * localStorage under TOKEN_KEY and sent as a Bearer header.
 */

export const TOKEN_KEY = "pm_token_v1";

// ── token helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── base fetch ────────────────────────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(path, { ...options, headers });
}

// ── auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  name: string;
}

export async function apiRegister(
  username: string,
  name: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, name, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
  return data;
}

export async function apiLogin(
  username: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
  return data;
}

export async function apiGetMe(): Promise<AuthUser | null> {
  const res = await apiFetch("/api/auth/me");
  if (!res.ok) return null;
  return res.json();
}

// ── calculator catalog ────────────────────────────────────────────────────────

export interface CatalogItem {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  pricePerBox: number;
  tilesPerBox: number;
  color: string;
  note: string;
  createdAt: string;
}

export type PlannerCatalogType = "tile" | "wall" | "fixture";

export interface PlannerCatalogEntry {
  key: string;
  label: string;
  dbId?: string;
  [key: string]: unknown;
}

export interface PlannerCatalogPayload {
  tiles: PlannerCatalogEntry[];
  walls: PlannerCatalogEntry[];
  fixtures: PlannerCatalogEntry[];
}

const EMPTY_PLANNER_CATALOG: PlannerCatalogPayload = {
  tiles: [],
  walls: [],
  fixtures: [],
};

export async function apiGetCatalog(): Promise<CatalogItem[]> {
  const res = await apiFetch("/api/catalog");
  if (!res.ok) return [];
  return res.json();
}

export async function apiCreateCatalogItem(
  item: Omit<CatalogItem, "id" | "createdAt">
): Promise<CatalogItem> {
  const res = await apiFetch("/api/catalog", {
    method: "POST",
    body: JSON.stringify(item),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
  return data;
}

export async function apiUpdateCatalogItem(
  id: string,
  updates: Partial<Omit<CatalogItem, "id" | "createdAt">>
): Promise<CatalogItem> {
  const res = await apiFetch(`/api/catalog/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "อัปเดตไม่สำเร็จ");
  return data;
}

export async function apiDeleteCatalogItem(id: string): Promise<void> {
  const res = await apiFetch(`/api/catalog/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "ลบไม่สำเร็จ");
  }
}

// ── planner catalog ──────────────────────────────────────────────────────────

export async function apiGetPlannerCatalog(): Promise<PlannerCatalogPayload> {
  const res = await apiFetch("/api/planner/catalog");
  if (!res.ok) return EMPTY_PLANNER_CATALOG;
  const data = (await res.json()) as Partial<PlannerCatalogPayload>;
  return {
    tiles: Array.isArray(data.tiles) ? data.tiles : [],
    walls: Array.isArray(data.walls) ? data.walls : [],
    fixtures: Array.isArray(data.fixtures) ? data.fixtures : [],
  };
}

export async function apiCreatePlannerCatalogItem(
  type: PlannerCatalogType,
  item: PlannerCatalogEntry
): Promise<PlannerCatalogEntry> {
  const res = await apiFetch("/api/planner/catalog", {
    method: "POST",
    body: JSON.stringify({ type, item }),
  });
  const data = (await res.json()) as { error?: string; item?: PlannerCatalogEntry };
  if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
  return data.item ?? item;
}

export async function apiDeletePlannerCatalogItem(id: string): Promise<void> {
  const res = await apiFetch(`/api/planner/catalog/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "ลบไม่สำเร็จ");
  }
}

// ── planner drafts ───────────────────────────────────────────────────────────

export interface DesignSlotMeta {
  slotKey: string;
  name: string;
  savedAt: string | null;
}

export async function apiListDesignSlots(): Promise<Record<string, DesignSlotMeta>> {
  const res = await apiFetch("/api/designs/slots");
  if (!res.ok) return {};
  return res.json();
}

// ── quotations ────────────────────────────────────────────────────────────────

export interface QuotationSummary {
  id: string;
  customerName: string | null;
  projectName: string | null;
  totalPrice: number | null;
  hasPdf: boolean;
  createdAt: string;
}

export async function apiGetQuotations(): Promise<QuotationSummary[]> {
  const res = await apiFetch("/api/quotations");
  if (!res.ok) return [];
  return res.json();
}

export async function apiSaveQuotation(payload: Record<string, unknown>): Promise<void> {
  await apiFetch("/api/quotations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
