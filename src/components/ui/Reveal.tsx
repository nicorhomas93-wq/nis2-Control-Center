"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li";
  direction?: "up" | "left" | "right";
}

const directionClass = {
  up: "animate-fade-in-up",
  left: "animate-slide-in-left",
  right: "animate-slide-in-right",
} as const;

/**
 * Fades + slides content in once when it enters the viewport.
 *
 * A single fast/instant scroll (Page Down, an anchor jump, or this test
 * environment's non-smooth scrolling) can move an element from fully below
 * the viewport to fully above it between two intersection checks, so a plain
 * IntersectionObserver can miss it entirely and leave it permanently
 * invisible. On a compliance product that's not acceptable, so a scroll/
 * resize fallback double-checks the element's bounding box any time the
 * viewport has moved past it, in either direction.
 */
export function Reveal({ children, className, delay = 0, as = "div", direction = "up" }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setVisible(true);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reveal();
      },
      { threshold: 0, rootMargin: "200px 0px -10% 0px" }
    );
    observer.observe(node);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (node.getBoundingClientRect().top < window.innerHeight) reveal();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const Tag = as;

  return (
    <Tag
      ref={ref as never}
      className={cn(visible ? directionClass[direction] : "opacity-0", className)}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
