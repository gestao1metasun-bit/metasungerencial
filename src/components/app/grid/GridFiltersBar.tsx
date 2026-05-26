import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type GridFiltersBarProps = {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  onClear?: () => void;
  children?: ReactNode;
  className?: string;
};

export function GridFiltersBar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  onClear,
  children,
  className,
}: GridFiltersBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b bg-background px-2 py-1.5",
        className,
      )}
    >
      {onSearchChange && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-7 w-64 pl-7 text-xs"
          />
        </div>
      )}
      {children}
      {onClear && (
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-7 px-2 text-xs text-muted-foreground"
          onClick={onClear}
        >
          <X className="mr-1 h-3 w-3" /> Limpar
        </Button>
      )}
    </div>
  );
}
