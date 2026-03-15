"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATALOG_KEY = "pm69-floorplanner:catalog:v1";

// ─── Built-in (read-only) catalog ─────────────────────────────────────────────
const BUILTIN_TILES = [
  { key: "devonoir_graphite", label: "เดโวนัวร์ กราไฟต์ PM", width: 18, length: 18, unit: "inch", pricePerBox: 275, tilesPerBox: 6 },
  { key: "mosaic_hideaway_alpine", label: "MT4SR1ไฮด์อเวย์อัลไพน์ เทาอ่อน", width: 12, length: 12, unit: "inch", pricePerBox: 1230, tilesPerBox: 10 },
  { key: "real3", label: "ภาพจริง 3", width: 60, length: 60, unit: "cm", pricePerBox: 150, tilesPerBox: 4 },
  { key: "8852406563861", label: "FT 45x45 เชฟรอน มาร์เบิล (ซาติน) PM", width: 18, length: 18, unit: "inch", pricePerBox: 250, tilesPerBox: 5 },
  { key: "quarter", label: "ลายโค้ง", width: 40, length: 40, unit: "inch", pricePerBox: 150, tilesPerBox: 4 },
  { key: "checker", label: "ตารางสลับ", width: 60, length: 60, unit: "cm", pricePerBox: 150, tilesPerBox: 4 },
  { key: "diagonal", label: "เส้นเฉียง", width: 60, length: 60, unit: "cm", pricePerBox: 150, tilesPerBox: 4 },
  { key: "terrazzo", label: "เทอราซโซ", width: 60, length: 60, unit: "cm", pricePerBox: 150, tilesPerBox: 4 },
];
const BUILTIN_WALLS = [
  { key: "8851740037922", label: "ทรูเนเจอร์ ไลท์ บริค สีส้ม" },
  { key: "8851740036185", label: "ทรูเนเจอร์ รัสติค บริค สีน้ำตาล" },
  { key: "wallreal3", label: "ไฮด์อเวย์ อัลไพน์ เทา" },
  { key: "paint", label: "สีเรียบ" },
  { key: "brick", label: "อิฐก่อ" },
  { key: "plaster", label: "ปูนฉาบ" },
  { key: "concrete", label: "คอนกรีต" },
  { key: "walltile", label: "กระเบื้องผนัง" },
];
const BUILTIN_FIXTURES = [
  { key: "window", label: "หน้าต่าง", renderAs: "window", width: 0.9, height: 0.8 },
  { key: "door",   label: "ประตู",    renderAs: "door",   width: 0.95, height: 2.0 },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface CustomTile   { key: string; label: string; url: string; width: number; length: number; unit: string; pricePerBox: number; tilesPerBox: number }
interface CustomWall   { key: string; label: string; url: string; repeatX?: number; repeatYPerMeter?: number }
interface CustomFixture{ key: string; label: string; renderAs: string; width: number; height: number; depth: number; preview: { base: string; accent: string } }
interface Catalog { tiles: CustomTile[]; walls: CustomWall[]; fixtures: CustomFixture[] }

function readCatalog(): Catalog {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(CATALOG_KEY) : null;
    if (!raw) return { tiles: [], walls: [], fixtures: [] };
    const parsed = JSON.parse(raw);
    return { tiles: parsed.tiles ?? [], walls: parsed.walls ?? [], fixtures: parsed.fixtures ?? [] };
  } catch { return { tiles: [], walls: [], fixtures: [] }; }
}

function writeCatalog(c: Catalog) {
  try { localStorage.setItem(CATALOG_KEY, JSON.stringify(c)); } catch {}
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--border,#333)", background: "var(--surface-1,#1e1e2e)", color: "var(--text,#e0e0e0)", fontSize: "13px", boxSizing: "border-box" };
const label14: React.CSSProperties = { fontSize: "12px", color: "var(--text-muted,#888)", display: "block", marginBottom: "4px" };
const halfRow: React.CSSProperties = { display: "flex", gap: "10px" };
const half: React.CSSProperties = { flex: 1 };

function Badge({ children, color = "#374151" }: { children: React.ReactNode; color?: string }) {
  return <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: color, color: "#fff", fontWeight: 600 }}>{children}</span>;
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="ลบ" style={{ background: "none", border: "1px solid #f87171", borderRadius: "6px", color: "#f87171", cursor: "pointer", padding: "3px 10px", fontSize: "12px" }}>ลบ</button>
  );
}

function Thumb({ url, size = 40 }: { url: string; size?: number }) {
  return <img src={url} alt="" style={{ width: size, height: size, objectFit: "cover", borderRadius: "4px", border: "1px solid var(--border,#333)" }} />;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface-1,#1e1e2e)", border: "1px solid var(--border,#333)", borderRadius: "10px", marginBottom: "16px", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border,#333)", fontWeight: 600, fontSize: "13px" }}>{title}</div>
      <div style={{ padding: "16px" }}>{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"tiles" | "walls" | "fixtures">("tiles");
  const [catalog, setCatalog] = useState<Catalog>({ tiles: [], walls: [], fixtures: [] });

  // Tile form
  const [tileName, setTileName] = useState("");
  const [tileW, setTileW] = useState(60);
  const [tileL, setTileL] = useState(60);
  const [tileUnit, setTileUnit] = useState("cm");
  const [tilePrice, setTilePrice] = useState(0);
  const [tilePerBox, setTilePerBox] = useState(4);
  const [tileImgUrl, setTileImgUrl] = useState<string | null>(null);
  const [tileImgName, setTileImgName] = useState("");
  const tileFileRef = useRef<HTMLInputElement>(null);

  // Wall form
  const [wallName, setWallName] = useState("");
  const [wallImgUrl, setWallImgUrl] = useState<string | null>(null);
  const [wallImgName, setWallImgName] = useState("");
  const wallFileRef = useRef<HTMLInputElement>(null);

  // Fixture form
  const [fixName, setFixName] = useState("");
  const [fixStyle, setFixStyle] = useState<"door" | "window">("door");
  const [fixW, setFixW] = useState(0.9);
  const [fixH, setFixH] = useState(2.0);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  // Override body styles set by planner layout (overflow:hidden, height:100vh)
  useEffect(() => {
    const prev = { overflow: document.body.style.overflow, height: document.body.style.height, display: document.body.style.display };
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    document.body.style.display = "block";
    return () => {
      document.body.style.overflow = prev.overflow;
      document.body.style.height = prev.height;
      document.body.style.display = prev.display;
    };
  }, []);

  const reload = useCallback(() => setCatalog(readCatalog()), []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    const h = () => reload();
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, [reload]);

  // Image compression helper
  const compressImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 512;
          let w = img.width, h = img.height;
          if (w > MAX) { h *= MAX / w; w = MAX; }
          if (h > MAX) { w *= MAX / h; h = MAX; }
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(w); canvas.height = Math.round(h);
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = reject;
        img.src = ev.target!.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const onTileFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setTileImgUrl(await compressImage(f));
    setTileImgName(f.name);
    e.target.value = "";
  }, [compressImage]);

  const onWallFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setWallImgUrl(await compressImage(f));
    setWallImgName(f.name);
    e.target.value = "";
  }, [compressImage]);

  const saveTile = useCallback(() => {
    if (!tileImgUrl) { alert("กรุณาเลือกรูป"); return; }
    if (!tileName.trim()) { alert("กรุณาใส่ชื่อ"); return; }
    const next = { ...catalog };
    next.tiles = [...next.tiles, { key: `custom_${Date.now()}`, label: tileName.trim(), url: tileImgUrl, width: tileW, length: tileL, unit: tileUnit, pricePerBox: tilePrice, tilesPerBox: tilePerBox }];
    writeCatalog(next); setCatalog(next);
    setTileName(""); setTileImgUrl(null); setTileImgName(""); setTilePrice(0); setTilePerBox(4);
  }, [catalog, tileName, tileImgUrl, tileW, tileL, tileUnit, tilePrice, tilePerBox]);

  const saveWall = useCallback(() => {
    if (!wallImgUrl) { alert("กรุณาเลือกรูป"); return; }
    if (!wallName.trim()) { alert("กรุณาใส่ชื่อ"); return; }
    const next = { ...catalog };
    next.walls = [...next.walls, { key: `custom_wall_${Date.now()}`, label: wallName.trim(), url: wallImgUrl, repeatX: 2, repeatYPerMeter: 1 }];
    writeCatalog(next); setCatalog(next);
    setWallName(""); setWallImgUrl(null); setWallImgName("");
  }, [catalog, wallName, wallImgUrl]);

  const saveFixture = useCallback(() => {
    if (!fixName.trim()) { alert("กรุณาใส่ชื่อ"); return; }
    const next = { ...catalog };
    next.fixtures = [...next.fixtures, {
      key: `custom_fixture_${Date.now()}`, label: fixName.trim(), renderAs: fixStyle,
      width: fixW, height: fixH, depth: fixStyle === "window" ? 0.08 : 0.1,
      preview: fixStyle === "window" ? { base: "#93c5fd", accent: "#e2e8f0" } : { base: "#b08968", accent: "#fef9c3" }
    }];
    writeCatalog(next); setCatalog(next);
    setFixName("");
  }, [catalog, fixName, fixStyle, fixW, fixH]);

  const deleteTile    = useCallback((key: string) => { const next = { ...catalog, tiles: catalog.tiles.filter(t => t.key !== key) }; writeCatalog(next); setCatalog(next); }, [catalog]);
  const deleteWall    = useCallback((key: string) => { const next = { ...catalog, walls: catalog.walls.filter(w => w.key !== key) }; writeCatalog(next); setCatalog(next); }, [catalog]);
  const deleteFixture = useCallback((key: string) => { const next = { ...catalog, fixtures: catalog.fixtures.filter(f => f.key !== key) }; writeCatalog(next); setCatalog(next); }, [catalog]);

  const tabBtn = (t: typeof tab, label: string, count: number) => (
    <button onClick={() => setTab(t)} style={{ padding: "9px 20px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500, background: tab === t ? "var(--accent,#7c3aed)" : "transparent", color: tab === t ? "#fff" : "var(--text-muted,#888)", borderRadius: "8px" }}>
      {label} <span style={{ opacity: 0.75 }}>({count})</span>
    </button>
  );

  if (isLoading || !user) return null;

  const thS: React.CSSProperties = { padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border,#333)", fontSize: "11px", color: "var(--text-muted,#888)", textTransform: "uppercase", letterSpacing: "0.04em" };
  const tdS: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid var(--border,#2a2a3a)", verticalAlign: "middle", fontSize: "13px" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg,#13131f)", color: "var(--text,#e0e0e0)", fontFamily: "inherit", padding: "28px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
        <Link href="/planner" style={{ color: "var(--text-muted,#888)", textDecoration: "none", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6"/></svg>
          กลับ Floor Planner
        </Link>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>จัดการ Catalog</h1>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted,#888)" }}>เพิ่ม / ลบ กระเบื้อง กำแพง หน้าต่าง-ประตู</p>
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { label: "กระเบื้อง built-in", val: BUILTIN_TILES.length, c: "#6366f1" },
          { label: "กระเบื้อง custom", val: catalog.tiles.length, c: "#818cf8" },
          { label: "กำแพง built-in", val: BUILTIN_WALLS.length, c: "#10b981" },
          { label: "กำแพง custom", val: catalog.walls.length, c: "#34d399" },
          { label: "Fixture built-in", val: BUILTIN_FIXTURES.length, c: "#f59e0b" },
          { label: "Fixture custom", val: catalog.fixtures.length, c: "#fbbf24" },
        ].map(x => (
          <div key={x.label} style={{ background: "var(--surface-1,#1e1e2e)", border: "1px solid var(--border,#333)", borderRadius: "8px", padding: "10px 14px", minWidth: "110px" }}>
            <div style={{ fontSize: "20px", fontWeight: 700, color: x.c }}>{x.val}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted,#888)", marginTop: "1px" }}>{x.label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "var(--surface-1,#1e1e2e)", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
        {tabBtn("tiles",    "กระเบื้อง", BUILTIN_TILES.length + catalog.tiles.length)}
        {tabBtn("walls",    "กำแพง",     BUILTIN_WALLS.length + catalog.walls.length)}
        {tabBtn("fixtures", "หน้าต่าง/ประตู", BUILTIN_FIXTURES.length + catalog.fixtures.length)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "20px", alignItems: "start" }}>

        {/* ── LEFT: List ────────────────────────────────────────────────────── */}
        <div>

          {/* ── TILES ── */}
          {tab === "tiles" && (
            <>
              <Card title={`Built-in (${BUILTIN_TILES.length})`}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead><tr>
                    <th style={thS}>ชื่อ</th><th style={thS}>ขนาด</th><th style={thS}>฿/กล่อง</th><th style={thS}>แผ่น/กล่อง</th>
                  </tr></thead>
                  <tbody>{BUILTIN_TILES.map(t => (
                    <tr key={t.key}>
                      <td style={tdS}>{t.label}<br/><code style={{ fontSize: "10px", color: "var(--text-muted,#888)" }}>{t.key}</code></td>
                      <td style={tdS}>{t.width}×{t.length} {t.unit}</td>
                      <td style={tdS}>{t.pricePerBox > 0 ? `฿${t.pricePerBox.toLocaleString()}` : "—"}</td>
                      <td style={tdS}>{t.tilesPerBox}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </Card>

              <Card title={`Custom ของคุณ (${catalog.tiles.length})`}>
                {catalog.tiles.length === 0
                  ? <p style={{ color: "var(--text-muted,#888)", margin: 0, fontSize: "13px" }}>ยังไม่มีลายกระเบื้อง custom</p>
                  : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead><tr>
                      <th style={thS}>รูป</th><th style={thS}>ชื่อ</th><th style={thS}>ขนาด</th><th style={thS}>฿/กล่อง</th><th style={thS}>แผ่น/กล่อง</th><th style={thS}></th>
                    </tr></thead>
                    <tbody>{catalog.tiles.map(t => (
                      <tr key={t.key}>
                        <td style={tdS}><Thumb url={t.url} /></td>
                        <td style={tdS}>{t.label}<br/><code style={{ fontSize: "10px", color: "var(--text-muted,#888)" }}>{t.key}</code></td>
                        <td style={tdS}>{t.width}×{t.length} {t.unit}</td>
                        <td style={tdS}>{t.pricePerBox > 0 ? `฿${t.pricePerBox.toLocaleString()}` : "—"}</td>
                        <td style={tdS}>{t.tilesPerBox}</td>
                        <td style={tdS}><DeleteBtn onClick={() => deleteTile(t.key)} /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                }
              </Card>
            </>
          )}

          {/* ── WALLS ── */}
          {tab === "walls" && (
            <>
              <Card title={`Built-in (${BUILTIN_WALLS.length})`}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead><tr><th style={thS}>ชื่อ</th><th style={thS}>Key</th></tr></thead>
                  <tbody>{BUILTIN_WALLS.map(w => (
                    <tr key={w.key}>
                      <td style={tdS}>{w.label}</td>
                      <td style={tdS}><code style={{ fontSize: "10px", color: "var(--text-muted,#888)" }}>{w.key}</code></td>
                    </tr>
                  ))}</tbody>
                </table>
              </Card>

              <Card title={`Custom ของคุณ (${catalog.walls.length})`}>
                {catalog.walls.length === 0
                  ? <p style={{ color: "var(--text-muted,#888)", margin: 0, fontSize: "13px" }}>ยังไม่มีลายกำแพง custom</p>
                  : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead><tr><th style={thS}>รูป</th><th style={thS}>ชื่อ</th><th style={thS}>Key</th><th style={thS}></th></tr></thead>
                    <tbody>{catalog.walls.map(w => (
                      <tr key={w.key}>
                        <td style={tdS}><Thumb url={w.url} /></td>
                        <td style={tdS}>{w.label}</td>
                        <td style={tdS}><code style={{ fontSize: "10px", color: "var(--text-muted,#888)" }}>{w.key}</code></td>
                        <td style={tdS}><DeleteBtn onClick={() => deleteWall(w.key)} /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                }
              </Card>
            </>
          )}

          {/* ── FIXTURES ── */}
          {tab === "fixtures" && (
            <>
              <Card title={`Built-in (${BUILTIN_FIXTURES.length})`}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead><tr><th style={thS}>ชื่อ</th><th style={thS}>สไตล์</th><th style={thS}>กว้าง (ม.)</th><th style={thS}>สูง (ม.)</th></tr></thead>
                  <tbody>{BUILTIN_FIXTURES.map(f => (
                    <tr key={f.key}>
                      <td style={tdS}>{f.label}</td>
                      <td style={tdS}><Badge color={f.renderAs === "window" ? "#3b82f6" : "#b08968"}>{f.renderAs === "window" ? "หน้าต่าง" : "ประตู"}</Badge></td>
                      <td style={tdS}>{f.width}</td>
                      <td style={tdS}>{f.height}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </Card>

              <Card title={`Custom ของคุณ (${catalog.fixtures.length})`}>
                {catalog.fixtures.length === 0
                  ? <p style={{ color: "var(--text-muted,#888)", margin: 0, fontSize: "13px" }}>ยังไม่มี fixture custom</p>
                  : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead><tr><th style={thS}>ชื่อ</th><th style={thS}>สไตล์</th><th style={thS}>กว้าง (ม.)</th><th style={thS}>สูง (ม.)</th><th style={thS}></th></tr></thead>
                    <tbody>{catalog.fixtures.map(f => (
                      <tr key={f.key}>
                        <td style={tdS}>
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: f.preview.base, display: "inline-block" }} />
                            {f.label}
                          </span>
                        </td>
                        <td style={tdS}><Badge color={f.renderAs === "window" ? "#3b82f6" : "#b08968"}>{f.renderAs === "window" ? "หน้าต่าง" : "ประตู"}</Badge></td>
                        <td style={tdS}>{f.width}</td>
                        <td style={tdS}>{f.height}</td>
                        <td style={tdS}><DeleteBtn onClick={() => deleteFixture(f.key)} /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                }
              </Card>
            </>
          )}
        </div>

        {/* ── RIGHT: Add form ───────────────────────────────────────────────── */}
        <div style={{ position: "sticky", top: "24px" }}>

          {/* ── Add Tile ── */}
          {tab === "tiles" && (
            <Card title="เพิ่มลายกระเบื้อง">
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={label14}>ชื่อลาย *</label>
                  <input style={inp} value={tileName} onChange={e => setTileName(e.target.value)} placeholder="เช่น โมเสคสีฟ้า" />
                </div>
                <div style={halfRow}>
                  <div style={half}>
                    <label style={label14}>กว้าง</label>
                    <input style={inp} type="number" value={tileW} min={1} onChange={e => setTileW(+e.target.value)} />
                  </div>
                  <div style={half}>
                    <label style={label14}>ยาว</label>
                    <input style={inp} type="number" value={tileL} min={1} onChange={e => setTileL(+e.target.value)} />
                  </div>
                  <div style={{ width: 64 }}>
                    <label style={label14}>หน่วย</label>
                    <select style={{ ...inp }} value={tileUnit} onChange={e => setTileUnit(e.target.value)}>
                      <option value="cm">cm</option>
                      <option value="inch">inch</option>
                      <option value="m">m</option>
                    </select>
                  </div>
                </div>
                <div style={halfRow}>
                  <div style={half}>
                    <label style={label14}>ราคา/กล่อง (฿)</label>
                    <input style={inp} type="number" value={tilePrice} min={0} onChange={e => setTilePrice(+e.target.value)} />
                  </div>
                  <div style={half}>
                    <label style={label14}>แผ่น/กล่อง</label>
                    <input style={inp} type="number" value={tilePerBox} min={1} onChange={e => setTilePerBox(+e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={label14}>รูปลาย * (ย่อ ≤ 512px)</label>
                  <input ref={tileFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onTileFile} />
                  <button style={{ ...inp, cursor: "pointer", textAlign: "left", background: tileImgUrl ? "var(--bg,#13131f)" : "var(--surface-1,#1e1e2e)" }} onClick={() => tileFileRef.current?.click()}>
                    {tileImgUrl ? `✓ ${tileImgName}` : "เลือกรูป..."}
                  </button>
                  {tileImgUrl && <Thumb url={tileImgUrl} size={60} />}
                </div>
                <button onClick={saveTile} style={{ padding: "9px", borderRadius: "8px", border: "none", background: "var(--accent,#7c3aed)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>
                  + เพิ่มลายกระเบื้อง
                </button>
              </div>
            </Card>
          )}

          {/* ── Add Wall ── */}
          {tab === "walls" && (
            <Card title="เพิ่มลายกำแพง">
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={label14}>ชื่อลาย *</label>
                  <input style={inp} value={wallName} onChange={e => setWallName(e.target.value)} placeholder="เช่น หินอ่อนขาว" />
                </div>
                <div>
                  <label style={label14}>รูปลาย * (ย่อ ≤ 512px)</label>
                  <input ref={wallFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onWallFile} />
                  <button style={{ ...inp, cursor: "pointer", textAlign: "left", background: wallImgUrl ? "var(--bg,#13131f)" : "var(--surface-1,#1e1e2e)" }} onClick={() => wallFileRef.current?.click()}>
                    {wallImgUrl ? `✓ ${wallImgName}` : "เลือกรูป..."}
                  </button>
                  {wallImgUrl && <Thumb url={wallImgUrl} size={60} />}
                </div>
                <button onClick={saveWall} style={{ padding: "9px", borderRadius: "8px", border: "none", background: "var(--accent,#7c3aed)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>
                  + เพิ่มลายกำแพง
                </button>
              </div>
            </Card>
          )}

          {/* ── Add Fixture ── */}
          {tab === "fixtures" && (
            <Card title="เพิ่มชนิดหน้าต่าง/ประตู">
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={label14}>ชื่อ *</label>
                  <input style={inp} value={fixName} onChange={e => setFixName(e.target.value)} placeholder="เช่น ประตูกระจกบาน" />
                </div>
                <div>
                  <label style={label14}>สไตล์ 3D</label>
                  <select style={{ ...inp }} value={fixStyle} onChange={e => setFixStyle(e.target.value as "door" | "window")}>
                    <option value="door">ประตู</option>
                    <option value="window">หน้าต่าง</option>
                  </select>
                </div>
                <div style={halfRow}>
                  <div style={half}>
                    <label style={label14}>กว้าง (ม.)</label>
                    <input style={inp} type="number" value={fixW} min={0.3} max={5} step={0.05} onChange={e => setFixW(+e.target.value)} />
                  </div>
                  <div style={half}>
                    <label style={label14}>สูง (ม.)</label>
                    <input style={inp} type="number" value={fixH} min={0.3} max={5} step={0.05} onChange={e => setFixH(+e.target.value)} />
                  </div>
                </div>
                <div style={{ padding: "10px", borderRadius: "6px", background: "var(--bg,#13131f)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: 36, height: 36, borderRadius: "4px", background: `linear-gradient(135deg, ${fixStyle === "window" ? "#93c5fd" : "#b08968"} 0%, ${fixStyle === "window" ? "#e2e8f0" : "#fef9c3"} 100%)`, display: "inline-block" }} />
                  <span style={{ fontSize: "12px", color: "var(--text-muted,#888)" }}>ตัวอย่างสี swatch</span>
                </div>
                <button onClick={saveFixture} style={{ padding: "9px", borderRadius: "8px", border: "none", background: "var(--accent,#7c3aed)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>
                  + เพิ่มชนิดนี้
                </button>
              </div>
            </Card>
          )}

        </div>
      </div>

      <div style={{ marginTop: "24px", fontSize: "12px", color: "var(--text-muted,#888)", textAlign: "center" }}>
        ข้อมูลบันทึกใน localStorage • เปิด <Link href="/planner" style={{ color: "var(--accent,#7c3aed)" }}>Floor Planner</Link> เพื่อใช้งาน
      </div>
    </div>
  );
}
