import type { ReactNode } from "react";

// Planner layout: adds Three.js importmap required by floor.js ES module
export default function PlannerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="importmap"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            imports: {
              three: "https://unpkg.com/three@0.160.0/build/three.module.js",
              "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
            },
          }),
        }}
      />
      {children}
    </>
  );
}
