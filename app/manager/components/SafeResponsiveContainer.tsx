"use client";

import React from "react";
import { ResponsiveContainer } from "recharts";

export default function SafeResponsiveContainer({ children }: { children: React.ReactElement }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      setIsReady(false);
      return;
    }

    const updateReadyState = () => {
      const rect = container.getBoundingClientRect();
      setIsReady(rect.width > 0 && rect.height > 0);
    };

    updateReadyState();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateReadyState();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full min-w-0 min-h-px" style={{ minWidth: 1, minHeight: 1 }}>
      {isReady ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
