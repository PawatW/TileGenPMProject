import type { ReactNode } from "react";

// importmap is declared in root layout.tsx <head>
export default function PlannerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
