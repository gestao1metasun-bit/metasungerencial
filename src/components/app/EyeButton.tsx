import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EyeButton({ onClick, label = "Ver detalhes" }: { onClick?: () => void; label?: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="h-7 w-7 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
    >
      <Eye className="h-4 w-4" />
    </Button>
  );
}
