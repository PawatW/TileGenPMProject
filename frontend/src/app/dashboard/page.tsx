"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getDraftSlots, hydrateDraftSlotsFromApi, getCatalog, type DraftSlot } from "@/lib/storage";

const QUICK_ACTIONS = [
  {
    icon: "🏠",
    iconClass: "gold",
    title: "Floor Planner",
    desc: "ออกแบบห้องแบบ 3D",
    href: "/planner",
  },
  {
    icon: "🧮",
    iconClass: "blue",
    title: "คำนวณกระเบื้อง",
    desc: "คำนวณจำนวนและราคา",
    href: "/calculator",
  },
  {
    icon: "📦",
    iconClass: "green",
    title: "คลัง Tile",
    desc: "จัดการกระเบื้องของฉัน",
    href: "/planner/catalog",
  },
];

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftSlot[]>([]);
  const [catalogCount, setCatalogCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;

    // Show cached slots immediately, then refresh from API-backed slot metadata.
    setDrafts(getDraftSlots());

    let active = true;
    hydrateDraftSlotsFromApi().then((slots) => {
      if (active) setDrafts(slots);
    });

    getCatalog().then((items) => {
      if (active) setCatalogCount(items.length);
    });

    return () => {
      active = false;
    };
  }, [user]);

  if (isLoading || !user) return null;

  const savedDrafts = drafts.filter((d) => d.savedAt !== null);
  const greeting = getGreeting();

  return (
    <div className="page-body">
      <div className="dashboard-page">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-greeting">
            {greeting}, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="dashboard-sub">Studio PM Floor Planner — ยินดีต้อนรับกลับ</p>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          <div className="stat-tile">
            <div className="stat-tile-label">แบบร่างที่บันทึก</div>
            <div className="stat-tile-value">
              {savedDrafts.length}
              <span className="stat-tile-unit">/ 5</span>
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-label">กระเบื้องในคลัง</div>
            <div className="stat-tile-value">
              {catalogCount}
              <span className="stat-tile-unit">รายการ</span>
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-label">บันทึกล่าสุด</div>
            <div className="stat-tile-value" style={{ fontSize: savedDrafts.length ? 18 : 32 }}>
              {savedDrafts.length
                ? new Date(savedDrafts[savedDrafts.length - 1].savedAt!).toLocaleDateString("th-TH", { day: "numeric", month: "short" })
                : "—"}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-section">
          <h2 className="dashboard-section-title">เริ่มต้นใช้งาน</h2>
          <div className="quick-actions">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.href} href={a.href} className="quick-action-card">
                <div className={`quick-action-icon feature-icon ${a.iconClass}`}>{a.icon}</div>
                <div className="quick-action-text">
                  <strong>{a.title}</strong>
                  <span>{a.desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Saved Designs */}
        <div className="dashboard-section">
          <h2 className="dashboard-section-title">แบบร่างที่บันทึกไว้</h2>
          <div className="design-list">
            {drafts.map((draft) => (
              <div key={draft.slot} className="design-card">
                <div className="design-card-slot">{draft.slot}</div>
                <div className="design-card-info">
                  {draft.savedAt ? (
                    <>
                      <div className="design-card-name">{draft.name}</div>
                      <div className="design-card-meta">
                        บันทึกเมื่อ{" "}
                        {new Date(draft.savedAt).toLocaleString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="design-card-name design-card-empty">ยังไม่มีข้อมูล</div>
                  )}
                </div>
                <Link
                  href="/planner"
                  className="design-card-open"
                  style={draft.savedAt ? {} : { opacity: 0.4, pointerEvents: "none" }}
                >
                  เปิด Planner →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "สวัสดีตอนเช้า";
  if (h < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}
