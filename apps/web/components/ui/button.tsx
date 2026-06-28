"use client";

import { Slot } from "@radix-ui/react-slot";
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-text text-bg hover:bg-text shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_1px_2px_rgba(20,20,19,0.16)]",
  secondary:
    "bg-surface text-text border border-border hover:bg-surface-soft hover:border-text/20",
  ghost: "bg-transparent text-accent-hover hover:bg-accent-soft",
  danger: "bg-danger text-bg hover:bg-danger/90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[12px] gap-1.5",
  md: "h-10 px-4 text-[13px] gap-2",
  lg: "h-12 px-5 text-[14px] gap-2",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
  children?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      icon,
      trailing,
      fullWidth,
      asChild,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) => {
    const classes = cn(
      "inline-flex items-center justify-center rounded-xl font-semibold transition-[background,color,border,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
      variants[variant],
      sizes[size],
      fullWidth && "w-full",
      className,
    );

    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...rest}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        {...rest}
      >
        {icon ? <span className="-ml-0.5 inline-flex">{icon}</span> : null}
        {children}
        {trailing ? (
          <span className="-mr-0.5 inline-flex">{trailing}</span>
        ) : null}
      </button>
    );
  },
);
Button.displayName = "Button";
