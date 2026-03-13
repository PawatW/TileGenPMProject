"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCatalog,
  addCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  type CatalogItem,
} from "@/lib/storage";

const EMPTY_FORM = {
  name: "",
  widthCm: 60,
  heightCm: 60,
  pricePerBox: 150,
  tilesPerBox: 4,
  color: "#cccccc",
  note: "",
};

type FormData = typeof EMPTY_FORM;

export default function CatalogPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) setItems(getCatalog(user.id));
  }, [user]);

  if (isLoading || !user) return null;

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      widthCm: item.widthCm,
      heightCm: item.heightCm,
      pricePerBox: item.pricePerBox,
      tilesPerBox: item.tilesPerBox,
      color: item.color,
      note: item.note,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updateCatalogItem(user.id, editId, form);
    } else {
      addCatalogItem(user.id, form);
    }
    setItems(getCatalog(user.id));
    closeModal();
  };

  const handleDelete = (id: string) => {
    deleteCatalogItem(user.id, id);
    setItems(getCatalog(user.id));
    setConfirmDelete(null);
  };

  const pricePerTile = (item: CatalogItem) =>
    item.tilesPerBox > 0 ? (item.pricePerBox / item.tilesPerBox).toFixed(2) : "—";

  return (
    <div className="page-body">
      <div className="catalog-page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">คลัง Tile ของฉัน</h1>
            <p className="page-subtitle">จัดการรายการกระเบื้องส่วนตัว — ใช้งานร่วมกับเครื่องคำนวณได้</p>
          </div>
          <button className="btn-add" onClick={openAdd}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            เพิ่ม Tile ใหม่
          </button>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="catalog-empty">
            <div className="catalog-empty-icon">📦</div>
            <div className="catalog-empty-title">ยังไม่มีกระเบื้องในคลัง</div>
            <p className="catalog-empty-desc">
              กดปุ่ม &ldquo;เพิ่ม Tile ใหม่&rdquo; เพื่อเพิ่มกระเบื้องของคุณ<br />
              แต่ละรายการเก็บขนาด ราคา และสีเป็น reference
            </p>
            <button className="btn-add" style={{ marginTop: 16 }} onClick={openAdd}>
              เพิ่ม Tile แรกของฉัน
            </button>
          </div>
        )}

        {/* Catalog grid */}
        {items.length > 0 && (
          <div className="catalog-grid">
            {items.map((item) => (
              <div key={item.id} className="catalog-card">
                {/* Color swatch */}
                <div
                  className="catalog-card-swatch"
                  style={{
                    background: item.color,
                    backgroundImage: `repeating-linear-gradient(
                      45deg,
                      transparent,
                      transparent 8px,
                      rgba(255,255,255,0.08) 8px,
                      rgba(255,255,255,0.08) 9px
                    )`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 5,
                        letterSpacing: 0.5,
                      }}
                    >
                      {item.widthCm} × {item.heightCm} cm
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="catalog-card-body">
                  <div className="catalog-card-name">{item.name}</div>
                  <div className="catalog-card-size">
                    {item.widthCm} × {item.heightCm} cm — {item.tilesPerBox} แผ่น/กล่อง
                  </div>
                  <div className="catalog-card-price">
                    ฿{item.pricePerBox.toLocaleString()}/กล่อง
                    <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 12, marginLeft: 4 }}>
                      (฿{pricePerTile(item)}/แผ่น)
                    </span>
                  </div>
                  {item.note && <div className="catalog-card-note">{item.note}</div>}
                </div>

                {/* Actions */}
                <div className="catalog-card-actions">
                  <button className="catalog-card-btn" onClick={() => openEdit(item)}>แก้ไข</button>
                  {confirmDelete === item.id ? (
                    <>
                      <button className="catalog-card-btn danger" onClick={() => handleDelete(item.id)}>
                        ยืนยันลบ
                      </button>
                      <button className="catalog-card-btn" onClick={() => setConfirmDelete(null)}>
                        ยกเลิก
                      </button>
                    </>
                  ) : (
                    <button className="catalog-card-btn danger" onClick={() => setConfirmDelete(item.id)}>
                      ลบ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
            <div className="modal-card">
              <div className="modal-header">
                <span className="modal-title">{editId ? "แก้ไข Tile" : "เพิ่ม Tile ใหม่"}</span>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>

              <form className="modal-form" onSubmit={handleSave}>
                <div className="form-field full">
                  <label className="form-label">ชื่อกระเบื้อง *</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="เช่น Carrara White 60x60"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">กว้าง (cm)</label>
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      max={200}
                      step={0.1}
                      value={form.widthCm}
                      onChange={(e) => setForm({ ...form, widthCm: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">สูง (cm)</label>
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      max={200}
                      step={0.1}
                      value={form.heightCm}
                      onChange={(e) => setForm({ ...form, heightCm: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">แผ่น/กล่อง</label>
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      max={500}
                      value={form.tilesPerBox}
                      onChange={(e) => setForm({ ...form, tilesPerBox: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">ราคา/กล่อง (฿)</label>
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.pricePerBox}
                      onChange={(e) => setForm({ ...form, pricePerBox: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="form-field full">
                  <label className="form-label">สี (อ้างอิง)</label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                    />
                    <input
                      className="form-input"
                      type="text"
                      placeholder="#cccccc"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="form-field full">
                  <label className="form-label">หมายเหตุ</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="เช่น เหมาะสำหรับห้องน้ำ"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>

                {/* Preview price */}
                {form.tilesPerBox > 0 && form.pricePerBox > 0 && (
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "var(--surface-1)",
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: "var(--text-sec)",
                    }}
                  >
                    ราคาต่อแผ่น: <strong style={{ color: "var(--text)" }}>฿{(form.pricePerBox / form.tilesPerBox).toFixed(2)}</strong>
                  </div>
                )}

                <div className="modal-actions">
                  <button className="btn-modal-cancel" type="button" onClick={closeModal}>
                    ยกเลิก
                  </button>
                  <button className="btn-modal-save" type="submit">
                    {editId ? "บันทึกการแก้ไข" : "เพิ่มกระเบื้อง"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
