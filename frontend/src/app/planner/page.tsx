"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type SelectedEl =
  | { type: "tile"; x: number; y: number; patternKey: string; rotation: number; flip: boolean }
  | { type: "wall"; wallKey: string; x: number; y: number; side: string; patternKey: string; removed: boolean }
  | { type: "fixture"; index: number; fixtureType: string; label: string }
  | null;

const SIDE_LABELS: Record<string, string> = { top: "บน", bottom: "ล่าง", left: "ซ้าย", right: "ขวา" };
const ROT_LABELS = ["0°", "90°", "180°", "270°"];

export default function PlannerPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [paintMode, setPaintMode] = useState<"cell" | "footprint">("footprint");
  const [cellSelect, setCellSelect] = useState(false);
  const [cellSelectScope, setCellSelectScope] = useState<"single" | "footprint">("footprint");
  const [selectedEl, setSelectedEl] = useState<SelectedEl>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;

    // Remove only the Three.js <canvas> appended by the previous floor.js instance.
    // Do NOT clear innerHTML — that would wipe React-rendered children (draft-toolbar, etc.)
    const container = document.getElementById("canvas-container");
    if (container) container.querySelectorAll("canvas").forEach((c) => c.remove());

    // ถ้ามาจาก dashboard พร้อม ?slot=N ให้ auto-load slot นั้น
    const params = new URLSearchParams(window.location.search);
    const slot = params.get("slot");
    if (slot) (window as any).__autoLoadSlot = slot;

    // Cache-bust the URL so the browser re-executes the ES module on every
    // user change (browsers cache modules by URL and skip re-execution otherwise).
    const script = document.createElement("script");
    script.type = "module";
    script.src = `/scripts/floor.js?v=${Date.now()}`;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [user]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as SelectedEl;
      setSelectedEl(detail);
    };
    document.addEventListener("pmElementSelected", handler);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedEl(null); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pmElementSelected", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (isLoading || !user) return null;

  return (
    <>
      {/* ═══════════════════════════════════════ LEFT PANEL ═══════════════════════════════════════ */}
      <div id="left-panel">

        {/* Brand */}
        <div className="brand">
          <div className="brand-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor"/>
              <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5"/>
              <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5"/>
              <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <div className="brand-name">Studio PM</div>
            <div className="brand-sub">Floor Planner</div>
          </div>
        </div>

        {/* Section: Room Size */}
        <div className="panel-section">
          <div className="section-header">
            <span className="section-tag">01</span>
            <h3 className="section-title">ขนาดพื้นที่</h3>
          </div>
          <div className="two-col">
            <div className="field">
              <label>กว้าง (X) (เมตร)</label>
              <input type="number" id="gridW" defaultValue={4} min={2} max={10} step={0.01} />
            </div>
            <div className="field">
              <label>ลึก (Y) (เมตร)</label>
              <input type="number" id="gridH" defaultValue={4} min={2} max={10} step={0.01} />
            </div>
          </div>
          <button className="btn-ghost" onClick={() => (window as any).resetGrid?.()}>รีเซ็ตตาราง</button>
          <p className="hint">คลิกช่องตารางเพื่อสร้าง/ลบพื้น รองรับรูปทรง L</p>
          <div id="grid-wrapper">
            <div id="grid-editor"></div>
          </div>
        </div>

        {/* Section: Wall */}
        <div className="panel-section">
          <div className="section-header">
            <span className="section-tag">02</span>
            <h3 className="section-title">กำแพง</h3>
          </div>
          <div className="slider-field">
            <div className="slider-label-row">
              <label>ความสูงกำแพง</label>
              <span className="slider-value"><span id="wallHeightVal">2.5</span> m</span>
            </div>
            <input
              type="range"
              id="wallHeightInfo"
              min={1}
              max={5}
              step={0.1}
              defaultValue={2.5}
              onInput={(e) => (window as any).updateWallHeight?.((e.target as HTMLInputElement).value)}
            />
          </div>
          <label className="field-label">รูปแบบการแสดงกำแพง</label>
          <div className="segmented-control" role="group" aria-label="รูปแบบการแสดงกำแพง">
            <button type="button" id="wallLayoutOpenBtn" className="segmented-btn active" aria-pressed="true">2 ด้าน</button>
            <button type="button" id="wallLayoutFullBtn" className="segmented-btn" aria-pressed="false">4 ด้าน</button>
          </div>
          <p className="hint">2 ด้านช่วยให้เห็นพื้นง่ายขึ้น | 4 ด้านแสดงห้องครบทุกผนัง</p>
          <label className="field-label">พื้นผิวกำแพง</label>
          <div id="wallSwatches" className="swatch-grid"></div>
          <select
            id="wallTextureSelect"
            className="hidden-select"
            onChange={() => (window as any).updateWallTexture?.()}
          ></select>
          <div className="toggle-row">
            <span className="toggle-label">ทาทีละผนัง</span>
            <label className="switch">
              <input
                type="checkbox"
                id="wallPerPieceToggle"
                onChange={(e) => (window as any).toggleWallSinglePaintMode?.((e.target as HTMLInputElement).checked)}
              />
              <span className="switch-track"></span>
            </label>
          </div>
          <div className="toggle-row">
            <span className="toggle-label">โหมดแก้ไขกำแพง</span>
            <label className="switch">
              <input
                type="checkbox"
                id="wallDeleteToggle"
                onChange={(e) => (window as any).toggleWallDeleteMode?.((e.target as HTMLInputElement).checked)}
              />
              <span className="switch-track"></span>
            </label>
          </div>
          <p className="hint">คลิกกำแพงที่มีอยู่ = ลบ | คลิกกำแพงโปร่งใส = เพิ่มคืน</p>
        </div>

        {/* Section: Tile */}
        <div className="panel-section">
          <div className="section-header">
            <span className="section-tag">03</span>
            <h3 className="section-title">กระเบื้อง</h3>
          </div>
          <p className="hint">คลิกกระเบื้องใน 3D เพื่อหมุนทีละแผ่น</p>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button className="btn-outline" style={{ flex: 1, justifyContent: "center", padding: "8px 4px" }} onClick={() => (window as any).rotateAllTiles?.()}>
              หมุนทั้งหมด
            </button>
            <button className="btn-outline" style={{ flex: 1, justifyContent: "center", padding: "8px 4px" }} onClick={() => (window as any).flipAllTiles?.()}>
              พลิกทั้งหมด
            </button>
          </div>
          <div style={{ marginTop: "12px" }}>
            <span className="toggle-label" style={{ fontSize: "12px", display: "block", marginBottom: "6px" }}>โหมดวางกระเบื้อง</span>
            <div className="segmented-control" role="group" aria-label="โหมดวางกระเบื้อง" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className={`segmented-btn ${paintMode === "cell" ? "active" : ""}`}
                aria-pressed={paintMode === "cell"}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                onClick={() => {
                  setPaintMode("cell");
                  (window as any).setTilePaintMode?.("cell");
                }}
              >
                <span>เฉพาะ Cell</span>
              </button>
              <button
                type="button"
                className={`segmented-btn ${paintMode === "footprint" ? "active" : ""}`}
                aria-pressed={paintMode === "footprint"}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                onClick={() => {
                  setPaintMode("footprint");
                  (window as any).setTilePaintMode?.("footprint");
                }}
              >
                <span>ตามขนาดกระเบื้อง</span>
              </button>
            </div>
          </div>
          {/* Cell select mode */}
          <div className="toggle-row" style={{ marginTop: "8px", border: "none", padding: 0 }}>
            <span className="toggle-label" style={{ fontSize: "12px" }}>โหมดเลือก Cell</span>
            <label className="switch">
              <input type="checkbox" checked={cellSelect} onChange={(e) => {
                const v = (e.target as HTMLInputElement).checked;
                setCellSelect(v);
                (window as any).setCellSelectMode?.(v);
                if (v) (window as any).setCellSelectionScope?.(cellSelectScope);
              }} />
              <span className="switch-track"></span>
            </label>
          </div>
          {cellSelect && (
            <>
              <div className="segmented-control" role="group" aria-label="รูปแบบการเลือก Cell" style={{ marginTop: "6px", marginBottom: "0" }}>
                <button
                  type="button"
                  className={`segmented-btn ${cellSelectScope === "footprint" ? "active" : ""}`}
                  aria-pressed={cellSelectScope === "footprint"}
                  onClick={() => {
                    setCellSelectScope("footprint");
                    (window as any).setCellSelectionScope?.("footprint");
                  }}
                >
                  ตามขนาดกระเบื้อง
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${cellSelectScope === "single" ? "active" : ""}`}
                  aria-pressed={cellSelectScope === "single"}
                  onClick={() => {
                    setCellSelectScope("single");
                    (window as any).setCellSelectionScope?.("single");
                  }}
                >
                  ทีละ Cell
                </button>
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                <button className="btn-outline" style={{ flex: 1, justifyContent: "center", fontSize: "11px" }}
                  onClick={() => (window as any).paintSelectedCells?.()}>
                  ทาสี cell ที่เลือก
                </button>
                <button className="btn-outline" style={{ flex: 1, justifyContent: "center", fontSize: "11px" }}
                  onClick={() => (window as any).clearCellSelection?.()}>
                  ล้างการเลือก
                </button>
              </div>
            </>
          )}
          <p className="hint" style={{ marginTop: "2px" }}>เลือกโหมดได้ทั้งแบบตามขนาดกระเบื้องหรือทีละ Cell และจะมี preview พื้นที่ก่อนคลิก</p>

          <div className="toggle-row" style={{ marginTop: "12px", border: "none", padding: 0 }}>
            <span className="toggle-label" style={{ fontSize: "12px" }}>โหมดกระจก (คลิกเพื่อพลิก)</span>
            <label className="switch">
              <input
                type="checkbox"
                onChange={(e) => (window as any).toggleTileFlipMode?.((e.target as HTMLInputElement).checked)}
              />
              <span className="switch-track"></span>
            </label>
          </div>
          <div className="toggle-row" style={{ marginTop: "8px", border: "none", padding: 0 }}>
            <span className="toggle-label" style={{ fontSize: "12px" }}>โหมดลากขยับตำแหน่งกระเบื้อง</span>
            <label className="switch">
              <input
                type="checkbox"
                onChange={(e) => (window as any).setTileOffsetMode?.((e.target as HTMLInputElement).checked)}
              />
              <span className="switch-track"></span>
            </label>
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
            <button className="btn-outline" style={{ flex: 1, justifyContent: "center", fontSize: "11px" }} onClick={() => (window as any).snapTileToRoom?.()}>
              ปรับให้พอดีห้อง
            </button>
            <button className="btn-outline" style={{ flex: 1, justifyContent: "center", fontSize: "11px" }} onClick={() => (window as any).resetTileOffset?.()}>
              รีเซ็ต offset
            </button>
          </div>
          <p className="hint" style={{ marginTop: "4px" }}>เปิดโหมดแล้วลากบนพื้นเพื่อขยับตำแหน่ง joint (ถ้าเปิดโหมดเลือก Cell จะลากเฉพาะที่เลือก และ snap ทุก 25% ของด้านยาวกระเบื้อง)</p>
          <label className="field-label" style={{ marginTop: "12px" }}>ลายกระเบื้อง</label>
          <div id="tileSwatches" className="swatch-grid"></div>
          <div className="toggle-row" style={{ marginTop: "12px" }}>
            <span className="toggle-label">ทาทีละแผ่น</span>
            <label className="switch">
              <input
                type="checkbox"
                id="tilePerPieceToggle"
                onChange={(e) => (window as any).toggleTileSinglePaintMode?.((e.target as HTMLInputElement).checked)}
              />
              <span className="switch-track"></span>
            </label>
          </div>
          <p className="hint" style={{ marginTop: "4px" }}>เมื่อเปิดโหมดนี้ สามารถคลิกซ้ายค้างแล้วลากเพื่อทากระเบื้องตามเมาส์ได้ทันที</p>
          <button
            id="tileCellModeBtn"
            className="btn-outline"
            style={{ marginTop: "8px", width: "100%", justifyContent: "center" }}
            onClick={() => (window as any).toggleTileCellMode?.()}
          >
            1 Cell = 1 แผ่น
          </button>
          <p className="hint" style={{ marginTop: "4px" }}>เปิดเพื่อให้แต่ละช่องตารางแสดงกระเบื้อง 1 แผ่นพอดี</p>
          <button
            id="runningBondBtn"
            className="btn-outline"
            style={{ marginTop: "8px", width: "100%", justifyContent: "center" }}
            onClick={() => (window as any).toggleRunningBond?.()}
          >
            วางสลับ (Running Bond)
          </button>
          <p className="hint" style={{ marginTop: "4px" }}>วางสลับครึ่งแผ่น (Brick Bond) — เหมาะกับกระเบื้องไม้สี่เหลี่ยมผืนผ้า</p>

          {/* ── Free Tile Mode ─────────────────────── */}
          <div style={{ marginTop: "12px", padding: "10px", border: "1px solid var(--border)", borderRadius: "8px" }}>
            <button
              id="freeTileModeBtn"
              className="btn-outline"
              style={{ width: "100%", justifyContent: "center", fontWeight: 600 }}
              onClick={() => (window as any).toggleFreeTileMode?.()}
            >
              วางอิสระ
            </button>
            <p className="hint" style={{ marginTop: "4px", marginBottom: "8px" }}>
              เปิดโหมดนี้เพื่อวางกระเบื้องแต่ละแผ่นได้อย่างอิสระ ขนาดตามจริง
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              <button className="btn-outline" style={{ flex: 1, fontSize: "11px", justifyContent: "center" }}
                onClick={() => (window as any).fillFreeTiles?.('straight')}>
                เติมห้อง (ตรง)
              </button>
              <button className="btn-outline" style={{ flex: 1, fontSize: "11px", justifyContent: "center" }}
                onClick={() => (window as any).fillFreeTilesRunningBond?.()}>
                เติมห้อง (สลับ)
              </button>
            </div>
            <button className="btn-outline danger" style={{ marginTop: "6px", width: "100%", justifyContent: "center", fontSize: "11px" }}
              onClick={() => (window as any).clearFreeTiles?.()}>
              ล้างทั้งหมด
            </button>
            <p className="hint" style={{ marginTop: "6px" }}>
              คลิกพื้น → วางแผ่น &nbsp;|&nbsp; คลิกแผ่น → เลือก &nbsp;|&nbsp; ลาก → เลื่อน &nbsp;|&nbsp; R → หมุน &nbsp;|&nbsp; Del → ลบ
            </p>
          </div>
        </div>

        {/* Section: Fixtures */}
        <div className="panel-section">
          <div className="section-header">
            <span className="section-tag">04</span>
            <h3 className="section-title">หน้าต่าง &amp; ประตู</h3>
          </div>
          <p className="hint">เลือกชนิดแล้วคลิก/ลากบนกำแพง | คลิกขวาที่ชิ้นงานเพื่อลบ</p>
          <div id="fixtureSwatches" className="swatch-grid"></div>
          <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px" }}
            onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <span className="field-label" style={{ marginBottom: "8px", display: "block" }}>เพิ่มชนิดใหม่</span>
            <input type="text" id="customFixtureName" placeholder="ชื่อ เช่น ประตูกระจกบาน" style={{ width: "100%", marginBottom: "6px", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text)", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
              <select id="customFixtureStyle" style={{ flex: 1, padding: "4px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text)" }}>
                <option value="door">ประตู</option>
                <option value="window">หน้าต่าง</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>กว้าง (ม.)</label>
                <input type="number" id="customFixtureW" defaultValue={0.9} min={0.3} max={5} step={0.05} style={{ width: "100%", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text)", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>สูง (ม.)</label>
                <input type="number" id="customFixtureH" defaultValue={2.0} min={0.3} max={5} step={0.05} style={{ width: "100%", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text)", boxSizing: "border-box" }} />
              </div>
            </div>
            <button className="draft-btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => (window as any).addCustomFixtureType?.()}>
              เพิ่มชนิดนี้
            </button>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════ MIDDLE (3D VIEWER) ═══════════════════════════════ */}
      <div id="canvas-container">

        {/* Save/Load Toolbar */}
        <div id="draft-toolbar">
          <div className="draft-slot-group">
            <span className="draft-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
            </span>
            <select id="draftSlotSelect" className="draft-select"></select>
          </div>
          <input type="text" id="draftNameInput" className="draft-name-input" placeholder="ชื่อแบบร่าง…" />
          <button className="draft-btn primary" id="draftSaveBtn">บันทึก</button>
          <button className="draft-btn" id="undoBtn" title="Undo (⌘/Ctrl+Z)">Undo</button>
          <button className="draft-btn" id="redoBtn" title="Redo (⌘/Ctrl+Shift+Z, Ctrl+Y)">Redo</button>
          <button className="draft-btn" id="draftLoadBtn">โหลด</button>
          <button className="draft-btn danger" id="draftDeleteBtn">ลบ</button>
          <span className="draft-meta" id="draftMetaNote"></span>
          <button className="draft-btn" id="topBarToggleBtn" title="ซ่อน/แสดงแถบด้านบน">ซ่อนแถบ</button>
        </div>

        {/* Viewport hint */}
        <div id="tooltip">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          คลิกซ้าย: หมุนกระเบื้อง &nbsp;|&nbsp; ลากบนกำแพง: วางหน้าต่าง/ประตู &nbsp;|&nbsp; คลิกขวา: หมุนกล้อง
        </div>

        {/* Element Inspector Panel */}
        {selectedEl && (
          <div style={{
            position: "absolute", bottom: "16px", left: "16px",
            background: "var(--surface-1, #1e1e2e)", border: "1px solid var(--border, #333)",
            borderRadius: "10px", padding: "14px 16px", minWidth: "220px", maxWidth: "280px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)", zIndex: 50, color: "var(--text, #e0e0e0)", fontSize: "13px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontWeight: 600, fontSize: "13px" }}>
                {selectedEl.type === "tile" && "กระเบื้อง"}
                {selectedEl.type === "wall" && "กำแพง"}
                {selectedEl.type === "fixture" && "หน้าต่าง/ประตู"}
              </span>
              <button onClick={() => setSelectedEl(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted, #888)", fontSize: "16px", lineHeight: 1, padding: "0 2px" }}>✕</button>
            </div>

            {selectedEl.type === "tile" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted, #888)" }}>ตำแหน่ง</span>
                  <span>({selectedEl.x}, {selectedEl.y})</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted, #888)" }}>ลาย</span>
                  <span style={{ textAlign: "right", maxWidth: "140px", wordBreak: "break-word" }}>{selectedEl.patternKey}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted, #888)" }}>หมุน</span>
                  <span>{ROT_LABELS[selectedEl.rotation] || "0°"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted, #888)" }}>กระจก</span>
                  <span>{selectedEl.flip ? "เปิด" : "ปิด"}</span>
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  <button className="btn-outline" style={{ flex: 1, justifyContent: "center", fontSize: "11px", padding: "4px" }}
                    onClick={() => { (window as any).setTileCellRotation?.(selectedEl.x, selectedEl.y, (selectedEl.rotation + 1) % 4); setSelectedEl({ ...selectedEl, rotation: (selectedEl.rotation + 1) % 4 }); }}>
                    หมุน +90°
                  </button>
                  <button className="btn-outline" style={{ flex: 1, justifyContent: "center", fontSize: "11px", padding: "4px" }}
                    onClick={() => { (window as any).setTileCellFlip?.(selectedEl.x, selectedEl.y, !selectedEl.flip); setSelectedEl({ ...selectedEl, flip: !selectedEl.flip }); }}>
                    {selectedEl.flip ? "ยกเลิกกระจก" : "กระจก"}
                  </button>
                </div>
              </div>
            )}

            {selectedEl.type === "wall" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted, #888)" }}>ตำแหน่ง</span>
                  <span>({selectedEl.x}, {selectedEl.y}) ด้าน{SIDE_LABELS[selectedEl.side] || selectedEl.side}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted, #888)" }}>ลาย</span>
                  <span style={{ textAlign: "right", maxWidth: "140px", wordBreak: "break-word" }}>{selectedEl.patternKey}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted, #888)" }}>สถานะ</span>
                  <span style={{ color: selectedEl.removed ? "#f87171" : "#4ade80" }}>{selectedEl.removed ? "ลบแล้ว" : "ปกติ"}</span>
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  {!selectedEl.removed ? (
                    <button className="btn-outline" style={{ flex: 1, justifyContent: "center", fontSize: "11px", padding: "4px", borderColor: "#f87171", color: "#f87171" }}
                      onClick={() => { (window as any).removeWallByKey?.(selectedEl.wallKey); setSelectedEl({ ...selectedEl, removed: true }); }}>
                      ลบกำแพง
                    </button>
                  ) : (
                    <button className="btn-outline" style={{ flex: 1, justifyContent: "center", fontSize: "11px", padding: "4px", borderColor: "#4ade80", color: "#4ade80" }}
                      onClick={() => { (window as any).restoreWallByKey?.(selectedEl.wallKey); setSelectedEl({ ...selectedEl, removed: false }); }}>
                      คืนกำแพง
                    </button>
                  )}
                </div>
              </div>
            )}

            {selectedEl.type === "fixture" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted, #888)" }}>ชนิด</span>
                  <span>{selectedEl.label}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted, #888)" }}>หมายเหตุ</span>
                  <span style={{ color: "#f87171" }}>ถูกลบแล้ว (คลิกขวา)</span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════ RIGHT PANEL ═══════════════════════════════════════ */}
      <div id="right-panel">

        {/* Section: Price Calculation */}
        <div className="panel-section">
          <div className="section-header">
            <span className="section-tag accent-gold">฿</span>
            <h3 className="section-title">คำนวณราคา</h3>
          </div>

          <div className="stat-card">
            <div className="stat-row">
              <span className="stat-label">พื้นที่ปูจริง</span>
              <span className="stat-value"><span id="totalAreaVal">0</span> ตร.ม.</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-row">
              <span className="stat-label">จำนวนกระเบื้อง <br /><small>(เผื่อเศษ 5%)</small></span>
              <span className="stat-value"><span id="tileTotalCountVal">0</span> แผ่น</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-row">
              <span className="stat-label">จำนวนที่ต้องซื้อ</span>
              <span className="stat-value"><span id="boxCountVal">0</span> กล่อง</span>
            </div>
          </div>

          <div className="total-card">
            <div className="total-label">ราคารวมทั้งหมด</div>
            <div className="total-value" id="tileTotalPriceVal">฿ 0</div>
          </div>
        </div>

        {/* Divider */}
        <div className="right-divider"></div>

        {/* Section: Export Quotation */}
        <div className="panel-section">
          <div className="section-header">
            <span className="section-tag accent-green">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 00-2 2v16c0 1.1.9 2 2 2h12a2 2 0 002-2V8l-6-6z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </span>
            <h3 className="section-title">ใบเสนอราคา</h3>
          </div>
          <p className="hint">สร้างใบเสนอราคา PDF พร้อมรูปห้อง 3D</p>

          <div className="field">
            <label>ชื่อลูกค้า</label>
            <input type="text" id="quotationCustomer" placeholder="เช่น คุณสมชาย" />
          </div>

          <div className="field">
            <label>ชื่อโปรเจค</label>
            <input type="text" id="quotationProject" placeholder="เช่น บ้านคุณสมชาย ห้องนอน" />
          </div>

          <div className="field">
            <label>จำนวนแผ่น / กล่อง (อัตโนมัติตามสินค้า)</label>
            <input type="number" id="quotationTilesPerBox" defaultValue={4} min={1} max={100} readOnly />
          </div>

          <button id="quotationExportBtn" className="btn-export">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export PDF
          </button>
          <p className="hint status-note" id="quotationStatus"></p>
        </div>

        <div className="panel-section">
          <div className="section-header">
            <span className="section-tag accent-green">AI</span>
            <h3 className="section-title">ทดสอบกับรูปจริง</h3>
          </div>
          <p className="hint">เลือกรูป</p>
          <button id="realImageOpenBtn" className="btn-export">ทดสอบกับรูปจริง</button>
        </div>

        {/* Bottom brand */}
        <div className="right-footer">
          <span>Studio PM &copy; 2026</span>
        </div>

      </div>

      {/* Real Image Modal */}
      <div id="realImageModal" className="real-image-modal" aria-hidden="true">
        <div className="real-image-modal-card" role="dialog" aria-modal={true} aria-labelledby="realImageModalTitle">
          <button id="realImageModalCloseBtn" className="real-image-close-btn" type="button" aria-label="ปิดหน้าต่าง">✕</button>
          <h3 id="realImageModalTitle" className="section-title">ทดสอบกับรูปจริง</h3>
          <p className="hint">เลือกรูปห้องของลูกค้า</p>

          <div className="field">
            <label>เลือกรูปห้อง</label>
            <input type="file" id="realModalImageInput" accept="image/*,.heic,.heif" />
          </div>
          <p className="hint status-note" id="realModalStatus"></p>

          <div id="realModalPreviewWrap" className="real-compare">
            <div id="realModalPreviewPlaceholder" className="real-modal-preview-placeholder">กรุณาเลือกรูปภาพ</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img id="realModalPreviewImage" alt="" className="real-modal-preview-image" hidden />
          </div>
          <button id="realModalDownloadBtn" className="btn-ghost" type="button" hidden>ดาวน์โหลดรูปภาพ</button>
        </div>
      </div>
    </>
  );
}
