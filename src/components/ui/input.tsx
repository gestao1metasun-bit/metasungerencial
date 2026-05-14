import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & { noUppercase?: boolean };

const NO_UPPERCASE_TYPES = new Set([
  "email", "password", "number", "date", "time", "datetime-local",
  "month", "week", "tel", "url", "file", "color", "range",
]);

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, noUppercase, style, ...props }, ref) => {
    const shouldUpper = !noUppercase && !NO_UPPERCASE_TYPES.has(type ?? "text");

    const handleChange = shouldUpper
      ? (e: React.ChangeEvent<HTMLInputElement>) => {
          const upper = e.target.value.toUpperCase();
          if (upper !== e.target.value) {
            const el = e.target;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            el.value = upper;
            try { el.setSelectionRange(start, end); } catch {}
          }
          onChange?.(e);
        }
      : onChange;

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        style={shouldUpper ? { textTransform: "uppercase", ...style } : style}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
