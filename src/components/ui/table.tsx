import * as React from "react";

import { cn } from "@/lib/utils";
import { EnhancedTable } from "@/components/app/EnhancedTable";

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  /** ID estável para persistir prefs. Se omitido, deriva de rota + posição. */
  tableId?: string;
  /** Desativa o painel de colunas (⚙) para esta tabela. */
  disableColumnSettings?: boolean;
};

function useAutoTableId(explicit?: string) {
  const [id, setId] = React.useState<string>(explicit ?? "");
  React.useEffect(() => {
    if (explicit) {
      setId(explicit);
      return;
    }
    if (typeof window === "undefined") return;
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    const existing = document.querySelectorAll(`[data-et-auto-path="${path}"]`).length;
    setId(`${path}::t${existing}`);
  }, [explicit]);
  return id;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, tableId, disableColumnSettings, ...props }, ref) => {
    const autoId = useAutoTableId(tableId);
    const inner = (
      <div className="relative w-full overflow-auto">
        <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
      </div>
    );
    if (disableColumnSettings || !autoId) return inner;
    return (
      <div data-et-auto-path={typeof window !== "undefined" ? window.location.pathname : ""}>
        <EnhancedTable tableId={autoId}>{inner}</EnhancedTable>
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
