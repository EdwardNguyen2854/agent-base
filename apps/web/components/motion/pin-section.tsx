"use client";

import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

let gsapRegistered = false;
function ensureGsap() {
  if (gsapRegistered) return;
  gsap.registerPlugin(useGSAP, ScrollTrigger);
  gsapRegistered = true;
}

export function PinnedHorizontalScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const mq = window.matchMedia("(min-width: 768px) and (pointer: fine)");
    setEnabled(mq.matches);
    const onChange = () => setEnabled(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [reduced]);

  useGSAP(
    () => {
      if (!enabled || !container.current || !track.current) return;
      ensureGsap();
      const trackEl = track.current;
      const distance = () => trackEl.scrollWidth - window.innerWidth + 48;
      const tween = gsap.to(track.current, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: container, dependencies: [enabled] },
  );

  return (
    <div
      ref={container}
      className={cn("relative w-full overflow-hidden", className)}
    >
      <div ref={track} className="flex w-max gap-6 px-6 will-change-transform">
        {children}
      </div>
    </div>
  );
}
