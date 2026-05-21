import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-600",
        success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/60",
        warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/60",
        danger: "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200/60",
        info: "bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-200/60",
        purple: "bg-purple-50 text-purple-600 ring-1 ring-inset ring-purple-200/60",
        orange: "bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-200/60",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
