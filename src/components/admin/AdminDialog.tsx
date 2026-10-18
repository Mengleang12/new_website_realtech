import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Re-export primitives for complex/custom dialog layouts
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };

type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "full";

const sizeClasses: Record<DialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  "6xl": "sm:max-w-6xl sm:w-[95vw]",
  full: "sm:max-w-[95vw] sm:w-[95vw]",
};

interface AdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: DialogSize;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const AdminDialog = ({
  open,
  onOpenChange,
  title,
  description,
  size = "lg",
  footer,
  children,
  className,
}: AdminDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeClasses[size], "p-0 overflow-hidden flex flex-col", className)}>
        {title ? (
          <DialogHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 shrink-0 pr-12">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">{description}</DialogDescription>
            )}
          </DialogHeader>
        ) : null}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-4 sm:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-border/60 p-3 sm:p-4 bg-muted/20 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
