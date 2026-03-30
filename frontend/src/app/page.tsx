"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const FEATURES = [
  {
    icon: "🏠",
    iconClass: "gold",
    title: "3D Floor Planner",
    desc: "ออกแบบห้องแบบ 3D แบบ real-time วางกระเบื้อง หน้าต่าง และประตูได้อิสระ",
    href: "/planner",
  },
  {
    icon: "🧮",
    iconClass: "blue",
    title: "คำนวณกระเบื้อง",
    desc: "คำนวณจำนวนกระเบื้องที่ต้องใช้ ราคารวม และแสดงแผนผังการปูแบบ visual",
    href: "/calculator",
  },
  {
    icon: "📦",
    iconClass: "green",
    title: "คลัง Tile ส่วนตัว",
    desc: "สร้างคลังกระเบื้องของคุณเอง กำหนดขนาด ราคา และนำมาใช้ในการคำนวณได้",
    href: "/planner/catalog",
  },
  {
    icon: "💾",
    iconClass: "purple",
    title: "บันทึกแบบร่าง",
    desc: "บันทึกแบบร่างได้สูงสุด 5 slot และโหลดกลับมาออกแบบต่อได้ทุกเวลา",
    href: "/dashboard",
  },
];

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || user) return null;

  return (
    <div className="landing-root">
      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-logo">
          <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
            <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5" />
            <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5" />
            <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" />
          </svg>
        </div>

        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
          Studio PM
        </p>

        <h1 className="landing-title">
          Floor Planner<br />
          <span>สำหรับมืออาชีพ</span>
        </h1>

        <p className="landing-subtitle">
          ออกแบบพื้นและผนังในรูปแบบ 3D พร้อมคำนวณราคากระเบื้องอัตโนมัติ
          สร้างใบเสนอราคา PDF และทดสอบกับรูปห้องจริงด้วย AI
        </p>

        <div className="landing-cta">
          <Link href="/login" className="btn-primary-lg">
            เริ่มใช้งาน →
          </Link>
          <Link href="/login" className="btn-outline-lg">
            เข้าสู่ระบบ
          </Link>
        </div>

        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>
          ทดลองใช้ฟรีด้วย <strong>demo</strong> / <strong>demo123</strong>
        </p>
      </section>

      {/* Features */}
      <section className="landing-features">
        <p className="landing-features-title">ฟีเจอร์หลัก</p>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <Link key={f.href} href="/login" className="feature-card">
              <div className={`feature-icon ${f.iconClass}`}>{f.icon}</div>
              <h3 className="feature-card-title">{f.title}</h3>
              <p className="feature-card-desc">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
