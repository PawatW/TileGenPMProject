"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function PlannerPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/scripts/floor.js";
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [user]);

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
          <button className="btn-outline" style={{ width: "100%", justifyContent: "center", marginBottom: "16px" }} onClick={() => (window as any).fillAllWalls?.()}>
            เทลายนี้ทุกกำแพง
          </button>
          <div className="toggle-row">
            <span className="toggle-label">โหมดลบกำแพง</span>
            <label className="switch">
              <input
                type="checkbox"
                id="wallDeleteToggle"
                onChange={(e) => (window as any).toggleWallDeleteMode?.((e.target as HTMLInputElement).checked)}
              />
              <span className="switch-track"></span>
            </label>
          </div>
          <p className="hint">เปิดโหมดแล้วคลิกกำแพงเพื่อ ลบ/คืน</p>
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
          <button className="btn-outline" style={{ marginTop: "6px", width: "100%", justifyContent: "center", fontSize: "12px" }} onClick={() => (window as any).resetTileOffset?.()}>
            รีเซ็ตตำแหน่งกระเบื้องที่เลือก
          </button>
          <p className="hint" style={{ marginTop: "4px" }}>เปิดโหมดแล้วลากบนพื้นเพื่อขยับตำแหน่ง joint</p>
          <label className="field-label" style={{ marginTop: "12px" }}>ลายกระเบื้อง</label>
          <div id="tileSwatches" className="swatch-grid"></div>
          <button className="btn-outline" style={{ marginTop: "12px", width: "100%", justifyContent: "center" }} onClick={() => (window as any).fillAllTiles?.()}>
            เทลายนี้ทั้งห้อง (Fill Room)
          </button>
          
          <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px" }}>
            <span className="field-label" style={{ marginBottom: "8px", display: "block" }}>เพิ่มลายกระเบื้องของคุณเอง</span>
            <div 
              style={{ display: "flex", gap: "8px", marginBottom: "8px", position: "relative", zIndex: 100 }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <input type="number" id="customTileW" defaultValue={60} min={1} style={{ flex: 1, minWidth: 0, padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text)" }} placeholder="กว้าง" />
              <input type="number" id="customTileL" defaultValue={60} min={1} style={{ flex: 1, minWidth: 0, padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text)" }} placeholder="ยาว" />
              <select id="customTileUnit" style={{ padding: "4px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text)", width: "auto", flexShrink: 0 }}>
                <option value="cm">cm</option>
                <option value="inch">inch</option>
                <option value="m">m</option>
              </select>
            </div>
            <input type="file" id="customTileFile" accept="image/*" style={{ display: "none" }} onChange={(e) => (window as any).handleCustomTileUpload?.(e)} />
            <button className="draft-btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => document.getElementById('customTileFile')?.click()}>
              อัปโหลดรูปลายกระเบื้อง
            </button>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "8px", textAlign: "center" }}>*รูปจะถูกย่อไม่เกิน 512px อัตโนมัติ</span>
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
