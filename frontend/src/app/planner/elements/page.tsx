"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────
interface TileElement {
  x: number; y: number;
  patternKey: string; label: string;
  rotation: number; flip: boolean;
  widthM: number; lengthM: number;
}

interface WallElement {
  wallKey: string; x: number; y: number; side: string;
  patternKey: string; label: string;
  removed: boolean;
}

interface FixtureElement {
  index: number; type: string; label: string;
  attachedWallKey: string | null;
  position: { x: number; y: number; z: number };
  rotationY: number;
}

interface DesignData {
  tiles: TileElement[];
  walls: WallElement[];
  fixtures: FixtureElement[];
  gridWidth: number;
  gridHeight: number;
  wallHeight: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SIDE_TH: Record<string, string> = { top: "บน", bottom: "ล่าง", left: "ซ้าย", right: "ขวา" };
const ROT_TH = ["0°", "90°", "180°", "270°"];

function parseAutosave(): DesignData | null {
  try {
    const raw = typeof window !== "undefined" && localStorage.getItem("pm69-floorplanner:autosave:v1");
    if (!raw) return null;
    const state = JSON.parse(raw);

    const gridW: number = state.gridWidth ?? 4;
    const gridH: number = state.gridHeight ?? 4;
    const wallH: number = state.wallHeight ?? 2.5;
    const cw = Math.ceil(gridW);
    const ch = Math.ceil(gridH);

    const gridData: number[][] = state.gridData ?? [];
    const rotationData: number[][] = state.rotationData ?? [];
    const flipData: number[][] = state.flipData ?? [];
    const floorTextureData: Record<string, string> = state.floorTextureData ?? {};
    const wallTextureData: Record<string, string> = state.wallTextureData ?? {};
    const removedWallsArr: string[] = state.removedWalls ?? [];
    const removedWallsSet = new Set(removedWallsArr);
    const tilePattern: string = state.tilePattern ?? "";
    const wallPattern: string = state.wallPattern ?? "";

    // Tiles
    const tiles: TileElement[] = [];
    for (let x = 0; x < cw; x++) {
      for (let y = 0; y < ch; y++) {
        if (!gridData[x]?.[y]) continue;
        const patternKey = floorTextureData[`${x},${y}`] || tilePattern;
        tiles.push({
          x, y, patternKey,
          label: patternKey,
          rotation: rotationData[x]?.[y] ?? 0,
          flip: !!(flipData[x]?.[y]),
          widthM: 0.6, lengthM: 0.6,
        });
      }
    }

    // Walls
    const walls: WallElement[] = [];
    const sides = ["top", "bottom", "left", "right"];
    for (let x = 0; x < cw; x++) {
      for (let y = 0; y < ch; y++) {
        if (!gridData[x]?.[y]) continue;
        for (const side of sides) {
          let isBoundary = false;
          if (side === "top"    && (y === 0    || !gridData[x]?.[y - 1])) isBoundary = true;
          if (side === "bottom" && (y === ch-1 || !gridData[x]?.[y + 1])) isBoundary = true;
          if (side === "left"   && (x === 0    || !gridData[x - 1]?.[y])) isBoundary = true;
          if (side === "right"  && (x === cw-1 || !gridData[x + 1]?.[y])) isBoundary = true;
          if (!isBoundary) continue;
          const wallKey = `${x},${y},${side}`;
          const patternKey = wallTextureData[wallKey] || wallPattern;
          walls.push({ wallKey, x, y, side, patternKey, label: patternKey, removed: removedWallsSet.has(wallKey) });
        }
      }
    }

    // Fixtures
    const fixtures: FixtureElement[] = (state.fixtures ?? []).map((f: { type?: string; position?: { x?: number; y?: number; z?: number }; rotation?: { y?: number }; attachedWallKey?: string }, idx: number) => ({
      index: idx,
      type: f.type ?? "unknown",
      label: f.type === "window" ? "หน้าต่าง" : f.type === "door" ? "ประตู" : f.type ?? "Unknown",
      attachedWallKey: f.attachedWallKey ?? null,
      position: { x: f.position?.x ?? 0, y: f.position?.y ?? 0, z: f.position?.z ?? 0 },
      rotationY: f.rotation?.y ?? 0,
    }));

    return { tiles, walls, fixtures, gridWidth: gridW, gridHeight: gridH, wallHeight: wallH };
  } catch {
    return null;
  }
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "13px" };
const thStyle: React.CSSProperties = { padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--border, #333)", color: "var(--text-muted, #888)", fontWeight: 500, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" };
const tdStyle: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--border, #2a2a3a)", verticalAlign: "middle" };

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ElementsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"tiles" | "walls" | "fixtures">("tiles");
  const [data, setData] = useState<DesignData | null>(null);
  const [tileFilter, setTileFilter] = useState("");
  const [wallFilter, setWallFilter] = useState<"all" | "active" | "removed">("all");

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  const reload = useCallback(() => setData(parseAutosave()), []);

  useEffect(() => { reload(); }, [reload]);

  // Listen for storage changes from planner tab
  useEffect(() => {
    const handler = () => reload();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [reload]);

  if (isLoading || !user) return null;
  if (!data) return (
    <div style={{ padding: "32px", color: "var(--text, #e0e0e0)", fontFamily: "inherit" }}>
      <p>ไม่พบข้อมูลแบบร่าง — กรุณาเปิดหน้า <Link href="/planner" style={{ color: "var(--accent, #7c3aed)" }}>Floor Planner</Link> ก่อน</p>
    </div>
  );

  const filteredTiles = data.tiles.filter(t =>
    !tileFilter || t.patternKey.toLowerCase().includes(tileFilter.toLowerCase())
  );
  const filteredWalls = data.walls.filter(w =>
    wallFilter === "all" ? true : wallFilter === "removed" ? w.removed : !w.removed
  );

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 18px", border: "none", borderRadius: "6px 6px 0 0", cursor: "pointer", fontSize: "13px", fontWeight: 500,
    background: active ? "var(--surface-1, #1e1e2e)" : "transparent",
    color: active ? "var(--text, #e0e0e0)" : "var(--text-muted, #888)",
    borderBottom: active ? "2px solid var(--accent, #7c3aed)" : "2px solid transparent",
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #13131f)", color: "var(--text, #e0e0e0)", fontFamily: "inherit", padding: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <Link href="/planner" style={{ color: "var(--text-muted, #888)", textDecoration: "none", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6"/></svg>
          กลับ
        </Link>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>จัดการองค์ประกอบ</h1>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted, #888)" }}>
            ห้อง {data.gridWidth}×{data.gridHeight} ม. | ผนังสูง {data.wallHeight} ม.
          </p>
        </div>
        <button onClick={reload} style={{ marginLeft: "auto", background: "none", border: "1px solid var(--border, #333)", borderRadius: "6px", padding: "6px 12px", color: "var(--text-muted, #888)", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
          รีเฟรช
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { label: "กระเบื้อง (cell)", value: data.tiles.length, color: "#818cf8" },
          { label: "กำแพง (ทั้งหมด)", value: data.walls.length, color: "#34d399" },
          { label: "กำแพงที่ถูกลบ", value: data.walls.filter(w => w.removed).length, color: "#f87171" },
          { label: "หน้าต่าง/ประตู", value: data.fixtures.length, color: "#fbbf24" },
        ].map(card => (
          <div key={card.label} style={{ background: "var(--surface-1, #1e1e2e)", border: "1px solid var(--border, #333)", borderRadius: "10px", padding: "14px 18px", minWidth: "140px" }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted, #888)", marginTop: "2px" }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border, #333)", marginBottom: "0" }}>
        <button style={tabStyle(tab === "tiles")} onClick={() => setTab("tiles")}>กระเบื้อง ({data.tiles.length})</button>
        <button style={tabStyle(tab === "walls")} onClick={() => setTab("walls")}>กำแพง ({data.walls.length})</button>
        <button style={tabStyle(tab === "fixtures")} onClick={() => setTab("fixtures")}>หน้าต่าง/ประตู ({data.fixtures.length})</button>
      </div>

      {/* Tab Content */}
      <div style={{ background: "var(--surface-1, #1e1e2e)", border: "1px solid var(--border, #333)", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>

        {/* ── Tiles Tab ─────────────────────────────────────────────────────── */}
        {tab === "tiles" && (
          <>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border, #333)" }}>
              <input
                type="text"
                placeholder="ค้นหาลาย..."
                value={tileFilter}
                onChange={e => setTileFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border, #333)", background: "var(--bg, #13131f)", color: "var(--text, #e0e0e0)", fontSize: "13px", width: "240px" }}
              />
              <span style={{ marginLeft: "12px", fontSize: "12px", color: "var(--text-muted, #888)" }}>{filteredTiles.length} รายการ</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>ตำแหน่ง (x, y)</th>
                    <th style={thStyle}>ลาย (pattern key)</th>
                    <th style={thStyle}>หมุน</th>
                    <th style={thStyle}>กระจก</th>
                    <th style={thStyle}>ขนาด (ม.)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTiles.length === 0 && (
                    <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "var(--text-muted, #888)", padding: "24px" }}>ไม่พบรายการ</td></tr>
                  )}
                  {filteredTiles.map(t => (
                    <tr key={`${t.x},${t.y}`} style={{ transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={tdStyle}><code style={{ fontSize: "12px" }}>({t.x}, {t.y})</code></td>
                      <td style={{ ...tdStyle, maxWidth: "220px", wordBreak: "break-word" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted, #888)" }}>{t.patternKey}</span>
                      </td>
                      <td style={tdStyle}>{ROT_TH[t.rotation] ?? `${t.rotation * 90}°`}</td>
                      <td style={tdStyle}>
                        <span style={{ color: t.flip ? "#818cf8" : "var(--text-muted, #888)" }}>{t.flip ? "✓ เปิด" : "ปิด"}</span>
                      </td>
                      <td style={tdStyle}>{t.widthM.toFixed(2)} × {t.lengthM.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Walls Tab ─────────────────────────────────────────────────────── */}
        {tab === "walls" && (
          <>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border, #333)", display: "flex", gap: "8px", alignItems: "center" }}>
              {(["all", "active", "removed"] as const).map(f => (
                <button key={f} onClick={() => setWallFilter(f)} style={{ padding: "4px 12px", borderRadius: "20px", border: "1px solid var(--border, #333)", background: wallFilter === f ? "var(--accent, #7c3aed)" : "transparent", color: wallFilter === f ? "#fff" : "var(--text-muted, #888)", cursor: "pointer", fontSize: "12px" }}>
                  {f === "all" ? "ทั้งหมด" : f === "active" ? "ปกติ" : "ลบแล้ว"}
                </button>
              ))}
              <span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--text-muted, #888)" }}>{filteredWalls.length} รายการ</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>ตำแหน่ง (x, y)</th>
                    <th style={thStyle}>ด้าน</th>
                    <th style={thStyle}>ลาย</th>
                    <th style={thStyle}>สถานะ</th>
                    <th style={thStyle}>Wall Key</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWalls.length === 0 && (
                    <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "var(--text-muted, #888)", padding: "24px" }}>ไม่พบรายการ</td></tr>
                  )}
                  {filteredWalls.map(w => (
                    <tr key={w.wallKey} style={{ transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={tdStyle}><code style={{ fontSize: "12px" }}>({w.x}, {w.y})</code></td>
                      <td style={tdStyle}>{SIDE_TH[w.side] ?? w.side}</td>
                      <td style={{ ...tdStyle, maxWidth: "200px", wordBreak: "break-word" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted, #888)" }}>{w.patternKey}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "11px", background: w.removed ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)", color: w.removed ? "#f87171" : "#4ade80" }}>
                          {w.removed ? "ลบแล้ว" : "ปกติ"}
                        </span>
                      </td>
                      <td style={tdStyle}><code style={{ fontSize: "11px", color: "var(--text-muted, #888)" }}>{w.wallKey}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Fixtures Tab ──────────────────────────────────────────────────── */}
        {tab === "fixtures" && (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>ชนิด</th>
                  <th style={thStyle}>กำแพงที่ติด</th>
                  <th style={thStyle}>ตำแหน่งโลก (x, z)</th>
                  <th style={thStyle}>มุมหมุน Y</th>
                </tr>
              </thead>
              <tbody>
                {data.fixtures.length === 0 && (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "var(--text-muted, #888)", padding: "24px" }}>ยังไม่มีหน้าต่าง/ประตู</td></tr>
                )}
                {data.fixtures.map(f => (
                  <tr key={f.index} style={{ transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={tdStyle}>{f.index + 1}</td>
                    <td style={tdStyle}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {f.type === "window" ? (
                          <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#93c5fd", display: "inline-block" }} />
                        ) : (
                          <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#b08968", display: "inline-block" }} />
                        )}
                        {f.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {f.attachedWallKey
                        ? <code style={{ fontSize: "11px", color: "var(--text-muted, #888)" }}>{f.attachedWallKey}</code>
                        : <span style={{ color: "var(--text-muted, #888)" }}>—</span>
                      }
                    </td>
                    <td style={tdStyle}>{f.position.x.toFixed(2)}, {f.position.z.toFixed(2)}</td>
                    <td style={tdStyle}>{(f.rotationY * 180 / Math.PI).toFixed(1)}°</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: "24px", fontSize: "12px", color: "var(--text-muted, #888)", textAlign: "center" }}>
        ข้อมูลจาก localStorage autosave — เปิดหน้า{" "}
        <Link href="/planner" style={{ color: "var(--accent, #7c3aed)" }}>Floor Planner</Link>{" "}
        แล้วกดรีเฟรชเพื่ออัปเดต
      </div>
    </div>
  );
}
