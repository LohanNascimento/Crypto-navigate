import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const linkVariants = cva(
  "inline-flex items-center gap-1 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "text-primary hover:text-primary/80",
        subtle: "text-muted-foreground hover:text-foreground",
        underline: "underline-offset-4 hover:underline text-foreground",
        ghost: "hover:text-foreground hover:underline",
      },
      size: {
        default: "text-base",
        sm: "text-sm",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  asChild?: boolean;
  external?: boolean;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant, size, asChild = false, external = false, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : "a";
    const externalProps = external
      ? {
          target: "_blank",
          rel: "noopener noreferrer",
        }
      : {};

    return (
      <Comp
        className={cn(linkVariants({ variant, size, className }))}
        ref={ref}
        {...externalProps}
        {...props}
      />
    );
  }
);
Link.displayName = "Link";

export { Link, linkVariants }; 