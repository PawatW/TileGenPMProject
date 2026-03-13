"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/planner", label: "Floor Planner" },
  { href: "/catalog", label: "คลัง Tile" },
  { href: "/calculator", label: "คำนวณกระเบื้อง" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <nav className="app-navbar">
      <div className="app-navbar-inner">
        {/* Brand */}
        <Link href="/dashboard" className="navbar-brand">
          <span className="navbar-brand-icon">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5" />
              <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5" />
              <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" />
            </svg>
          </span>
          <span className="navbar-brand-name">Studio PM</span>
        </Link>

        {/* Nav links */}
        <div className="navbar-links">
          {NAV_LINKS.map((link) => {
            // Force hard reload when entering or leaving planner to avoid WebGL context leaks and native script conflicts.
            if (link.href === "/planner" || pathname === "/planner") {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`navbar-link${pathname.startsWith(link.href) ? " active" : ""}`}
                >
                  {link.label}
                </a>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`navbar-link${pathname.startsWith(link.href) ? " active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User */}
        <div className="navbar-user">
          <span className="navbar-username">{user.name}</span>
          <button className="navbar-logout" onClick={handleLogout}>
            ออกจากระบบ
          </button>
        </div>
      </div>
    </nav>
  );
}
