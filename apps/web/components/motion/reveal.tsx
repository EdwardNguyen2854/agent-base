"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <As className={className}>{children}</As>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -80px 0px" }}
      transition={{
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
        delay,
      }}
      className={className}
    >
      <As className="contents">{children}</As>
    </motion.div>
  );
}

export function Stagger({
  children,
  gap = 0.06,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  gap?: number;
  className?: string;
  as?: "div" | "ul" | "section" | "ol";
}) {
  const reduced = useReducedMotion();
  const variants: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduced ? 0 : gap,
        delayChildren: reduced ? 0 : 0.05,
      },
    },
  };
  const MotionAs = motion[As] as any;
  return (
    <MotionAs
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </MotionAs>
  );
}

export function StaggerItem({
  children,
  y = 14,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  y?: number;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const reduced = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : y },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
    },
  };
  const MotionAs = motion[As] as any;
  return (
    <MotionAs className={className} variants={variants}>
      {children}
    </MotionAs>
  );
}
