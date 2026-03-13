"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "login" | "register";

export default function LoginPage() {
  const { user, isLoading, login, register } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Login form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [regUsername, setRegUsername] = useState("");
  const [regName, setRegName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await login(loginUsername, loginPassword);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "เกิดข้อผิดพลาด");
    } else {
      router.push("/dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (regPassword !== regConfirm) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setSubmitting(true);
    const res = await register(regUsername, regName, regPassword);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "เกิดข้อผิดพลาด");
    } else {
      router.push("/dashboard");
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setError("");
  };

  return (
    <div className="auth-root">
      {/* Left brand panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-logo">
          <svg width="36" height="36" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
            <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5" />
            <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5" />
            <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" />
          </svg>
        </div>
        <div className="auth-brand-title">Studio PM<br />Floor Planner</div>
        <p className="auth-brand-sub">
          เครื่องมือออกแบบพื้นและผนัง สำหรับผู้เชี่ยวชาญด้านกระเบื้อง
        </p>
        <div className="auth-brand-features">
          {["3D Floor Planner แบบ real-time", "คำนวณกระเบื้องและราคา", "คลัง Tile ส่วนตัว", "บันทึกแบบร่าง 5 slot", "Export ใบเสนอราคา PDF", "ทดสอบกับรูปห้องจริงด้วย AI"].map((f) => (
            <div key={f} className="auth-feature-item">
              <span className="auth-feature-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-card-title">
              {tab === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชีใหม่"}
            </h1>
            <p className="auth-card-sub">
              {tab === "login"
                ? "ยินดีต้อนรับกลับ กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ"
                : "สร้างบัญชีเพื่อเริ่มใช้งาน Studio PM"}
            </p>
          </div>

          {/* Tabs */}
          <div className="auth-tabs">
            <button className={`auth-tab${tab === "login" ? " active" : ""}`} onClick={() => switchTab("login")}>
              เข้าสู่ระบบ
            </button>
            <button className={`auth-tab${tab === "register" ? " active" : ""}`} onClick={() => switchTab("register")}>
              สมัครสมาชิก
            </button>
          </div>

          {/* Error */}
          {error && <div className="auth-error">{error}</div>}

          {/* Login Form */}
          {tab === "login" && (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="auth-field">
                <label className="auth-label">ชื่อผู้ใช้</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">รหัสผ่าน</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <button className="auth-submit" type="submit" disabled={submitting}>
                {submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
              </button>
            </form>
          )}

          {/* Register Form */}
          {tab === "register" && (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="auth-field">
                <label className="auth-label">ชื่อ-นามสกุล</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="เช่น สมชาย ใจดี"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">ชื่อผู้ใช้</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="ตัวอักษรภาษาอังกฤษและตัวเลข"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">รหัสผ่าน</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="อย่างน้อย 4 ตัวอักษร"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">ยืนยันรหัสผ่าน</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="••••••••"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button className="auth-submit" type="submit" disabled={submitting}>
                {submitting ? "กำลังสร้างบัญชี…" : "สร้างบัญชี"}
              </button>
            </form>
          )}

          <div className="auth-demo">
            <strong>บัญชีทดลอง:</strong> username <code>demo</code> / password <code>demo123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
