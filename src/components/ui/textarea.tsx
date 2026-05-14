import * as React from "react";

import { cn } from "@/lib/utils";

type TextareaProps = React.ComponentProps<"textarea"> & { noUppercase?: boolean };

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, noUppercase, style, ...props }, ref) => {
    const handleChange = noUppercase
      ? onChange
      : (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          const upper = e.target.value.toUpperCase();
          if (upper !== e.target.value) {
            const el = e.target;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            el.value = upper;
            try { el.setSelectionRange(start, end); } catch {}
          }
          onChange?.(e);
        };

    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        style={noUppercase ? style : { textTransform: "uppercase", ...style }}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
