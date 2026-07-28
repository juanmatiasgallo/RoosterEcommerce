import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      accent: "bg-accent/10 text-accent",
      neutral: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
      success: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
      info: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
      warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
