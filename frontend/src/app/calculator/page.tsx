"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getCatalog, type CatalogItem } from "@/lib/storage";

interface CalcInputs {
  roomWidthM: number;
  roomLengthM: number;
  tileWidthCm: number;
  tileLengthCm: number;
  tilesPerBox: number;
  pricePerBox: number;
  wastePercent: number;
}

interface CalcResult {
  tilesPerRow: number;
  tilesPerCol: number;
  totalTiles: number;
  tilesWithWaste: number;
  boxesNeeded: number;
  totalAreaSqm: number;
  tileSizeSqm: number;
  pricePerTile: number;
  totalPrice: number;
  hasRowCut: boolean;
  hasColCut: boolean;
}

// Visual grid: cap at MAX_VIS tiles per axis
const MAX_VIS = 28;

const BUILTIN_CALCULATOR_TILES: CatalogItem[] = [
  {
    id: "builtin:devonoir_graphite",
    name: "เดโวนัวร์ กราไฟต์ PM",
    widthCm: 45.72,
    heightCm: 45.72,
    pricePerBox: 275,
    tilesPerBox: 6,
    color: "",
    note: "builtin",
    createdAt: "1970-01-01T00:00:00.000Z",
  },
  {
    id: "builtin:mosaic_hideaway_alpine",
    name: "MT4SR1ไฮด์อเวย์อัลไพน์ เทาอ่อน",
    widthCm: 30.48,
    heightCm: 30.48,
    pricePerBox: 1230,
    tilesPerBox: 10,
    color: "",
    note: "builtin",
    createdAt: "1970-01-01T00:00:00.000Z",
  },
  {
    id: "builtin:real3",
    name: "ภาพจริง 3",
    widthCm: 60,
    heightCm: 60,
    pricePerBox: 150,
    tilesPerBox: 4,
    color: "",
    note: "builtin",
    createdAt: "1970-01-01T00:00:00.000Z",
  },
  {
    id: "builtin:8852406563861",
    name: "FT 45x45 เชฟรอน มาร์เบิล (ซาติน) PM",
    widthCm: 45.72,
    heightCm: 45.72,
    pricePerBox: 250,
    tilesPerBox: 5,
    color: "",
    note: "builtin",
    createdAt: "1970-01-01T00:00:00.000Z",
  },
  {
    id: "builtin:quarter",
    name: "ลายโค้ง",
    widthCm: 101.6,
    heightCm: 101.6,
    pricePerBox: 150,
    tilesPerBox: 4,
    color: "",
    note: "builtin",
    createdAt: "1970-01-01T00:00:00.000Z",
  },
  {
    id: "builtin:checker",
    name: "ตารางสลับ",
    widthCm: 60,
    heightCm: 60,
    pricePerBox: 150,
    tilesPerBox: 4,
    color: "",
    note: "builtin",
    createdAt: "1970-01-01T00:00:00.000Z",
  },
  {
    id: "builtin:diagonal",
    name: "เส้นเฉียง",
    widthCm: 60,
    heightCm: 60,
    pricePerBox: 150,
    tilesPerBox: 4,
    color: "",
    note: "builtin",
    createdAt: "1970-01-01T00:00:00.000Z",
  },
  {
    id: "builtin:terrazzo",
    name: "เทอราซโซ",
    widthCm: 60,
    heightCm: 60,
    pricePerBox: 150,
    tilesPerBox: 4,
    color: "",
    note: "builtin",
    createdAt: "1970-01-01T00:00:00.000Z",
  },
];

function calcResult(inputs: CalcInputs): CalcResult {
  const { roomWidthM, roomLengthM, tileWidthCm, tileLengthCm, tilesPerBox, pricePerBox, wastePercent } = inputs;

  const roomWidthCm = roomWidthM * 100;
  const roomLengthCm = roomLengthM * 100;

  // Number of tiles needed per axis (ceiling — cuts count as full tile)
  const tilesPerRow = Math.ceil(roomWidthCm / tileWidthCm);
  const tilesPerCol = Math.ceil(roomLengthCm / tileLengthCm);

  // Whether the last tile in each axis is a cut tile
  const hasRowCut = roomWidthCm % tileWidthCm > 0;
  const hasColCut = roomLengthCm % tileLengthCm > 0;

  const totalTiles = tilesPerRow * tilesPerCol;
  const tilesWithWaste = Math.ceil(totalTiles * (1 + wastePercent / 100));
  const boxesNeeded = tilesPerBox > 0 ? Math.ceil(tilesWithWaste / tilesPerBox) : 0;

  const totalAreaSqm = roomWidthM * roomLengthM;
  const tileSizeSqm = (tileWidthCm * tileLengthCm) / 10000;
  const pricePerTile = tilesPerBox > 0 ? pricePerBox / tilesPerBox : 0;
  const totalPrice = boxesNeeded * pricePerBox;

  return {
    tilesPerRow,
    tilesPerCol,
    totalTiles,
    tilesWithWaste,
    boxesNeeded,
    totalAreaSqm,
    tileSizeSqm,
    pricePerTile,
    totalPrice,
    hasRowCut,
    hasColCut,
  };
}

function TileGridVis({
  tilesPerRow,
  tilesPerCol,
  hasRowCut,
  hasColCut,
}: {
  tilesPerRow: number;
  tilesPerCol: number;
  hasRowCut: boolean;
  hasColCut: boolean;
}) {
  // Scale down if too large for visual
  const scaleRow = tilesPerRow > MAX_VIS ? MAX_VIS / tilesPerRow : 1;
  const scaleCol = tilesPerCol > MAX_VIS ? MAX_VIS / tilesPerCol : 1;
  const scale = Math.min(scaleRow, scaleCol);

  const visRows = Math.min(tilesPerRow, MAX_VIS);
  const visCols = Math.min(tilesPerCol, MAX_VIS);
  const isScaled = scale < 1;

  // Cell size: fill container width ~= 480px, height proportional
  const cellSize = Math.max(8, Math.min(20, Math.floor(460 / Math.max(visRows, visCols))));

  const cells = [];
  for (let c = 0; c < visCols; c++) {
    for (let r = 0; r < visRows; r++) {
      const isCutRow = hasRowCut && r === visRows - 1;
      const isCutCol = hasColCut && c === visCols - 1;
      const isCut = isCutRow || isCutCol;
      cells.push(
        <div
          key={`${r}-${c}`}
          className={`tile-cell ${isCut ? "cut" : "full"}`}
          style={{ width: cellSize, height: cellSize }}
          title={isCut ? "กระเบื้องที่ต้องตัด" : "กระเบื้องเต็มแผ่น"}
        />
      );
    }
  }

  return (
    <div className="calc-vis-wrap">
      <div className="calc-vis-title">
        <span>แผนผังการปู ({tilesPerRow} × {tilesPerCol} แผ่น)</span>
        <div className="calc-vis-legend">
          <span><span className="legend-dot full" />เต็มแผ่น</span>
          <span><span className="legend-dot cut" />ตัด</span>
        </div>
      </div>
      <div className="calc-vis-grid-outer">
        <div
          className="calc-vis-grid"
          style={{
            gridTemplateColumns: `repeat(${visRows}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${visCols}, ${cellSize}px)`,
            width: "fit-content",
          }}
        >
          {cells}
        </div>
      </div>
      {isScaled && (
        <p className="calc-vis-info">
          * แสดงเฉพาะ {visRows} × {visCols} แผ่น (จากทั้งหมด {tilesPerRow} × {tilesPerCol}) เพื่อความเหมาะสมของหน้าจอ
        </p>
      )}
    </div>
  );
}

export default function CalculatorPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState("manual");

  const [inputs, setInputs] = useState<CalcInputs>({
    roomWidthM: 4,
    roomLengthM: 4,
    tileWidthCm: 60,
    tileLengthCm: 60,
    tilesPerBox: 4,
    pricePerBox: 150,
    wastePercent: 5,
  });

  const [calculated, setCalculated] = useState(false);
  const [result, setResult] = useState<CalcResult | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) getCatalog().then(setCatalog);
  }, [user]);

  const catalogOptions = useMemo(
    () => [...BUILTIN_CALCULATOR_TILES, ...catalog],
    [catalog]
  );

  const handleCatalogSelect = (id: string) => {
    setSelectedCatalogId(id);
    if (id === "manual") return;
    const item = catalogOptions.find((c) => c.id === id);
    if (item) {
      setInputs((prev) => ({
        ...prev,
        tileWidthCm: item.widthCm,
        tileLengthCm: item.heightCm,
        tilesPerBox: item.tilesPerBox,
        pricePerBox: item.pricePerBox,
      }));
    }
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const valid =
      inputs.roomWidthM > 0 &&
      inputs.roomLengthM > 0 &&
      inputs.tileWidthCm > 0 &&
      inputs.tileLengthCm > 0;
    if (!valid) return;
    setResult(calcResult(inputs));
    setCalculated(true);
  };

  const set = (key: keyof CalcInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }));
  };

  const fmt = (n: number) => n.toLocaleString("th-TH");

  if (isLoading || !user) return null;

  return (
    <div className="page-body">
      <div className="calculator-page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">คำนวณกระเบื้อง</h1>
            <p className="page-subtitle">
              กำหนดขนาดห้องและกระเบื้อง — คำนวณจำนวน กล่อง และราคา พร้อมแผนผังการปู
            </p>
          </div>
        </div>

        <div className="calc-layout">
          {/* ─── LEFT: Input Panel ─── */}
          <div>
            <form className="calc-panel" onSubmit={handleCalculate}>
              {/* Room size */}
              <div>
                <div className="calc-section-title">ขนาดห้อง</div>
                <div className="calc-inputs-group">
                  <div className="calc-input-row">
                    <div className="calc-field">
                      <label className="calc-label">ความกว้าง (เมตร)</label>
                      <input
                        className="calc-input"
                        type="number"
                        min={0.1}
                        max={100}
                        step={0.1}
                        value={inputs.roomWidthM}
                        onChange={set("roomWidthM")}
                        required
                      />
                    </div>
                    <div className="calc-field">
                      <label className="calc-label">ความยาว (เมตร)</label>
                      <input
                        className="calc-input"
                        type="number"
                        min={0.1}
                        max={100}
                        step={0.1}
                        value={inputs.roomLengthM}
                        onChange={set("roomLengthM")}
                        required
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "var(--surface-1)",
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: "var(--text-sec)",
                    }}
                  >
                    พื้นที่รวม:{" "}
                    <strong style={{ color: "var(--text)" }}>
                      {(inputs.roomWidthM * inputs.roomLengthM).toFixed(2)} ตร.ม.
                    </strong>
                  </div>
                </div>
              </div>

              <div className="calc-divider" />

              {/* Tile selection from catalog */}
              <div>
                <div className="calc-section-title">เลือกจากคลัง Tile</div>
                <select
                  className="calc-catalog-select"
                  value={selectedCatalogId}
                  onChange={(e) => handleCatalogSelect(e.target.value)}
                >
                  <option value="manual">— กำหนดเอง —</option>
                  {BUILTIN_CALCULATOR_TILES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.widthCm}×{item.heightCm} cm · ฿{item.pricePerBox}/กล่อง)
                    </option>
                  ))}
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.widthCm}×{item.heightCm} cm · ฿{item.pricePerBox}/กล่อง)
                    </option>
                  ))}
                </select>
                {catalog.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                    แสดงรายการ Built-in เท่านั้น —{" "}
                    <Link href="/planner/catalog" style={{ color: "var(--text)", textDecoration: "underline" }}>
                      เพิ่มที่นี่
                    </Link>
                  </p>
                )}
              </div>

              {/* Tile size */}
              <div>
                <div className="calc-section-title">ขนาดกระเบื้อง</div>
                <div className="calc-inputs-group">
                  <div className="calc-input-row">
                    <div className="calc-field">
                      <label className="calc-label">กว้าง (cm)</label>
                      <input
                        className="calc-input"
                        type="number"
                        min={1}
                        max={300}
                        step={0.1}
                        value={inputs.tileWidthCm}
                        onChange={set("tileWidthCm")}
                        required
                      />
                    </div>
                    <div className="calc-field">
                      <label className="calc-label">ยาว (cm)</label>
                      <input
                        className="calc-input"
                        type="number"
                        min={1}
                        max={300}
                        step={0.1}
                        value={inputs.tileLengthCm}
                        onChange={set("tileLengthCm")}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="calc-divider" />

              {/* Price */}
              <div>
                <div className="calc-section-title">ราคาและจำนวน</div>
                <div className="calc-inputs-group">
                  <div className="calc-input-row">
                    <div className="calc-field">
                      <label className="calc-label">แผ่น / กล่อง</label>
                      <input
                        className="calc-input"
                        type="number"
                        min={1}
                        max={500}
                        value={inputs.tilesPerBox}
                        onChange={set("tilesPerBox")}
                        required
                      />
                    </div>
                    <div className="calc-field">
                      <label className="calc-label">ราคา / กล่อง (฿)</label>
                      <input
                        className="calc-input"
                        type="number"
                        min={0}
                        step={0.01}
                        value={inputs.pricePerBox}
                        onChange={set("pricePerBox")}
                        required
                      />
                    </div>
                  </div>
                  <div className="calc-field">
                    <label className="calc-label">เผื่อเศษ (%)</label>
                    <input
                      className="calc-input"
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      value={inputs.wastePercent}
                      onChange={set("wastePercent")}
                    />
                  </div>
                </div>
              </div>

              <button className="btn-calc" type="submit">
                คำนวณ
              </button>
            </form>
          </div>

          {/* ─── RIGHT: Results ─── */}
          <div className="calc-results-panel">
            {!calculated && (
              <div className="calc-empty-state">
                <div className="calc-empty-icon">🧮</div>
                <p className="calc-empty-text">
                  กรอกขนาดห้องและกระเบื้อง<br />
                  แล้วกดปุ่ม &ldquo;คำนวณ&rdquo; เพื่อดูผลลัพธ์
                </p>
              </div>
            )}

            {calculated && result && (
              <>
                {/* Summary cards */}
                <div className="calc-result-cards">
                  <div className="calc-result-card">
                    <div className="calc-result-label">จำนวนแผ่น (ก่อนเผื่อ)</div>
                    <div className="calc-result-value">
                      {fmt(result.totalTiles)}
                      <span className="calc-result-unit">แผ่น</span>
                    </div>
                  </div>
                  <div className="calc-result-card">
                    <div className="calc-result-label">จำนวนแผ่น (+{inputs.wastePercent}% เผื่อ)</div>
                    <div className="calc-result-value">
                      {fmt(result.tilesWithWaste)}
                      <span className="calc-result-unit">แผ่น</span>
                    </div>
                  </div>
                  <div className="calc-result-card">
                    <div className="calc-result-label">กล่องที่ต้องซื้อ</div>
                    <div className="calc-result-value">
                      {fmt(result.boxesNeeded)}
                      <span className="calc-result-unit">กล่อง</span>
                    </div>
                  </div>
                  <div className="calc-result-card highlight">
                    <div className="calc-result-label">ราคารวมสุทธิ</div>
                    <div className="calc-result-value">
                      ฿{fmt(result.totalPrice)}
                    </div>
                  </div>
                </div>

                {/* Detail breakdown */}
                <div className="calc-detail-box">
                  <div className="calc-detail-row">
                    <span className="label">พื้นที่ห้อง</span>
                    <span className="value">{result.totalAreaSqm.toFixed(2)} ตร.ม.</span>
                  </div>
                  <div className="calc-detail-row">
                    <span className="label">แถว × คอลัมน์</span>
                    <span className="value">{result.tilesPerRow} × {result.tilesPerCol} แผ่น</span>
                  </div>
                  <div className="calc-detail-row">
                    <span className="label">แผ่นที่ต้องตัด</span>
                    <span className="value">
                      {result.hasRowCut || result.hasColCut
                        ? [result.hasRowCut && "แนวกว้าง", result.hasColCut && "แนวยาว"].filter(Boolean).join(" + ")
                        : "ไม่มี (พอดี)"}
                    </span>
                  </div>
                  <div className="calc-detail-divider" />
                  <div className="calc-detail-row">
                    <span className="label">ราคาต่อแผ่น</span>
                    <span className="value">฿{result.pricePerTile.toFixed(2)}</span>
                  </div>
                  <div className="calc-detail-row">
                    <span className="label">{result.boxesNeeded} กล่อง × ฿{fmt(inputs.pricePerBox)}</span>
                    <span className="value">฿{fmt(result.totalPrice)}</span>
                  </div>
                  <div className="calc-detail-divider" />
                  <div className="calc-total-row">
                    <span>ราคารวมทั้งหมด</span>
                    <span>฿{fmt(result.totalPrice)}</span>
                  </div>
                </div>

                {/* Visual tile grid */}
                <TileGridVis
                  tilesPerRow={result.tilesPerRow}
                  tilesPerCol={result.tilesPerCol}
                  hasRowCut={result.hasRowCut}
                  hasColCut={result.hasColCut}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
