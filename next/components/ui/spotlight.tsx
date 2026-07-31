"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SpotlightProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * A component that applies a modern spotlight reveal effect on hover.
 * The effect follows the mouse cursor using CSS variables.
 */
export function Spotlight({ children, className, ...props }: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Cache the bounding rect for performance
    let rect = container.getBoundingClientRect();

    const updateRect = () => {
      rect = container.getBoundingClientRect();
    };

    const resizeObserver = new ResizeObserver(updateRect);
    resizeObserver.observe(container);

    const handlePointerMove = (e: PointerEvent) => {
      // Calculate position as a percentage of the container.
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      // Update the CSS variables for the spotlight position
      container.style.setProperty("--mouse-x", `${x}%`);
      container.style.setProperty("--mouse-y", `${y}%`);
    };

    container.addEventListener("pointermove", handlePointerMove);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("spotlight-reveal", className)}
      {...props}
    >
      {children}
    </div>
  );
}
