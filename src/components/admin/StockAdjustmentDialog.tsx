import React from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Package,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Box,
  Layers,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { type StockAdjustmentResult, parseOrderItems } from "@/lib/stockHelpers";
import { salesApi, type AdminOrder, type StockProduct } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Stock Lookup Helper ────────────────────────────────────────────────────────

function useStockLookup() {
  return useQuery({
    queryKey: ["admin-stock-lookup-dialog"],
    queryFn: () => salesApi.getStockOverview({ limit: 200 }),
    staleTime: 10000,
  });
}

function findStockQuantity(
  products: StockProduct[] | undefined,
  productId?: number,
  variantId?: number | null,
  productName?: string
): { currentStock: number | null; found: boolean } {
  if (!products || products.length === 0) return { currentStock: null, found: false };

  let product = productId ? products.find((p) => p.id === productId) : undefined;
  if (!product && productName) {
    const cleanName = productName.trim().toLowerCase();
    product = products.find(
      (p) =>
        p.name.trim().toLowerCase() === cleanName ||
        cleanName.includes(p.name.trim().toLowerCase()) ||
        p.name.trim().toLowerCase().includes(cleanName)
    );
  }

  if (!product) return { currentStock: null, found: false };

  if (variantId && product.variants && product.variants.length > 0) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) {
      return { currentStock: variant.stock_quantity ?? 0, found: true };
    }
  }

  const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock_quantity || 0), 0) ?? 0;
  return { currentStock: totalStock, found: true };
}

// ─── 1. Sale Update Confirmation Dialog ─────────────────────────────────────────

interface SaleUpdateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockResult: StockAdjustmentResult | null;
  onConfirm: () => void;
  isPending: boolean;
  orderNumber?: string;
  customerName?: string;
}

export const SaleUpdateConfirmDialog: React.FC<SaleUpdateConfirmDialogProps> = ({
  open,
  onOpenChange,
  stockResult,
  onConfirm,
  isPending,
  orderNumber,
  customerName,
}) => {
  const { data: stockData } = useStockLookup();
  const products = stockData?.products;

  if (!stockResult) return null;

  const { items, totalDeduct, totalAdd, statusStockChange } = stockResult;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] p-4 sm:p-6 overflow-hidden flex flex-col">
        <AlertDialogHeader className="shrink-0">
          <div className="flex items-center gap-2 text-primary">
            <Package className="w-5 h-5 shrink-0" />
            <AlertDialogTitle className="text-base font-semibold leading-tight">
              Confirm Sale Update & Stock Adjustments
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs text-muted-foreground mt-1">
            {orderNumber ? `Invoice #${orderNumber} ` : ""}
            {customerName ? `· Customer: ${customerName}` : ""}
            <br />
            Review current inventory and resulting stock counts after saving changes:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 my-2 pr-1">
          {/* Status Change Notice */}
          {statusStockChange && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-amber-700 dark:text-amber-300">
                  Status changing: <span className="capitalize">{statusStockChange.from}</span> →{" "}
                  <span className="capitalize font-bold">{statusStockChange.to}</span>
                </p>
                <p className="text-amber-600/90 dark:text-amber-400/90 mt-0.5 break-words">
                  {statusStockChange.description}
                </p>
              </div>
            </div>
          )}

          {/* Itemized Stock Changes */}
          <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Item & Sale Change</span>
              <span>Stock Before ➔ After</span>
            </div>

            {items.map((item, idx) => {
              const { currentStock, found } = findStockQuantity(
                products,
                item.product_id,
                item.variant_id,
                item.product_name
              );

              // Calculate resulting stock
              let resultStock: number | null = null;
              if (currentStock !== null) {
                if (item.stockImpact === "deduct") {
                  resultStock = currentStock - item.impactQuantity;
                } else if (item.stockImpact === "add") {
                  resultStock = currentStock + item.impactQuantity;
                } else {
                  resultStock = currentStock;
                }
              }

              return (
                <div key={idx} className="p-3 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{item.product_name}</p>
                      {item.variant_label && (
                        <p className="text-[11px] text-muted-foreground truncate">{item.variant_label}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {item.oldQty === 0 ? (
                          <span className="text-primary font-medium">New item added: {item.newQty} pcs</span>
                        ) : item.newQty === 0 ? (
                          <span className="text-destructive font-medium">Removed from sale (was {item.oldQty} pcs)</span>
                        ) : (
                          <span>
                            Sale Qty: {item.oldQty} → <strong className="text-foreground">{item.newQty} pcs</strong>
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      {item.stockImpact === "deduct" ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-medium text-[11px] whitespace-nowrap"
                        >
                          <ArrowDown className="w-3 h-3" />
                          Deduct {item.impactQuantity}
                        </Badge>
                      ) : item.stockImpact === "add" ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-medium text-[11px] whitespace-nowrap"
                        >
                          <ArrowUp className="w-3 h-3" />
                          Add {item.impactQuantity} back
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground text-[10px] whitespace-nowrap">
                          No stock change
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Stock Quantity Transition Meter */}
                  {found && currentStock !== null && resultStock !== null ? (
                    <div className="flex items-center justify-between bg-muted/40 dark:bg-muted/20 px-2.5 py-1.5 rounded border border-border/50 text-[11px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        <span>Current Stock:</span>
                        <strong className="text-foreground font-semibold">{currentStock} pcs</strong>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span>Result:</span>
                        <span
                          className={cn(
                            "font-bold px-1.5 py-0.5 rounded text-[11px]",
                            resultStock < 0
                              ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                              : resultStock <= 2
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          )}
                        >
                          {resultStock} pcs remaining
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Totals Summary Banner */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">Total Stock Net Impact:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {totalDeduct > 0 && (
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                  <ArrowDown className="w-3.5 h-3.5" /> -{totalDeduct} units (deducted)
                </span>
              )}
              {totalAdd > 0 && (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  <ArrowUp className="w-3.5 h-3.5" /> +{totalAdd} units (added back)
                </span>
              )}
              {totalDeduct === 0 && totalAdd === 0 && (
                <span className="text-muted-foreground">0 units change</span>
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter className="shrink-0 mt-2">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={isPending} className="gap-1.5">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirm & Update Sale
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ─── 2. Delete Invoice Confirmation Dialog ──────────────────────────────────────

interface DeleteInvoiceConfirmDialogProps {
  order: AdminOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export const DeleteInvoiceConfirmDialog: React.FC<DeleteInvoiceConfirmDialogProps> = ({
  order,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}) => {
  const { data: stockData } = useStockLookup();
  const products = stockData?.products;

  if (!order) return null;

  const items = parseOrderItems(order);
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const orderNumber = order.id.slice(0, 8).toUpperCase();
  const customerName = order.customer?.full_name || order.user?.full_name || "Walk-in Customer";
  const isPaid = order.status === "paid";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] p-4 sm:p-6 overflow-hidden flex flex-col">
        <AlertDialogHeader className="shrink-0">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <AlertDialogTitle className="text-base font-semibold leading-tight">
              Delete Invoice #{orderNumber}?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs text-muted-foreground mt-1">
            Customer: <strong className="text-foreground">{customerName}</strong> · Total:{" "}
            <strong className="text-foreground">${order.amount} {order.currency}</strong>
            <br />
            This will permanently remove the invoice and restore items back into stock:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 my-2 pr-1">
          {/* Inventory Stock Restoration Box */}
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs">
            <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">
              <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Inventory Stock Restoration</span>
            </div>
            <p className="text-muted-foreground text-[11px] mb-2.5">
              Deleting this invoice will {isPaid ? "return" : "restore"} all sold units back to inventory:
            </p>

            <div className="space-y-2 bg-background/70 dark:bg-background/50 p-2.5 rounded-md border border-emerald-500/20">
              {items.map((item, idx) => {
                const { currentStock, found } = findStockQuantity(
                  products,
                  item.product_id,
                  item.variant_id,
                  item.product_name
                );
                const resultStock = currentStock !== null ? currentStock + item.quantity : null;

                return (
                  <div key={idx} className="space-y-1 pb-1.5 border-b border-border/40 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <div className="flex items-start gap-1.5 min-w-0 flex-1">
                        <Box className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-foreground truncate block">{item.product_name}</span>
                          {item.variant_label && (
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {item.variant_label}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold shrink-0 text-[11px] px-1.5 py-0 whitespace-nowrap"
                      >
                        +{item.quantity} to stock
                      </Badge>
                    </div>

                    {/* Stock Transition */}
                    {found && currentStock !== null && resultStock !== null ? (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span>Current: <strong className="text-foreground">{currentStock}</strong></span>
                        <div className="flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span>Result:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {resultStock} in stock
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-emerald-500/20 text-[11px]">
              <span className="font-medium text-foreground">Total items to add back:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                +{totalUnits} units returned to inventory
              </span>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="shrink-0 mt-2">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Delete & Restore Stock
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ─── 3. Status Change Confirmation Dialog ───────────────────────────────────────

interface StatusChangeConfirmDialogProps {
  order: AdminOrder | null;
  newStatus: AdminOrder["status"] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export const StatusChangeConfirmDialog: React.FC<StatusChangeConfirmDialogProps> = ({
  order,
  newStatus,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}) => {
  const { data: stockData } = useStockLookup();
  const products = stockData?.products;

  if (!order || !newStatus) return null;

  const items = parseOrderItems(order);
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const orderNumber = order.id.slice(0, 8).toUpperCase();
  const willDeduct = newStatus === "paid" && order.status !== "paid";
  const willRestore = order.status === "paid" && newStatus !== "paid";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] p-4 sm:p-6 overflow-hidden flex flex-col">
        <AlertDialogHeader className="shrink-0">
          <div className="flex items-center gap-2 text-primary">
            <Package className="w-5 h-5 shrink-0" />
            <AlertDialogTitle className="text-base font-semibold leading-tight">
              Update Invoice #{orderNumber} Status?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs text-muted-foreground mt-1">
            Change status from <strong className="capitalize text-foreground">{order.status}</strong> to{" "}
            <strong className="capitalize text-primary font-bold">{newStatus}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 my-2 pr-1">
          {willDeduct && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300 mb-1">
                <ArrowDown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Inventory Stock Deduction</span>
              </div>
              <p className="text-muted-foreground text-[11px] mb-2.5">
                Marking this invoice as <strong className="text-foreground">Paid</strong> will deduct sold items from stock:
              </p>
              <div className="space-y-2 bg-background/70 dark:bg-background/50 p-2.5 rounded-md border border-amber-500/20">
                {items.map((item, idx) => {
                  const { currentStock, found } = findStockQuantity(
                    products,
                    item.product_id,
                    item.variant_id,
                    item.product_name
                  );
                  const resultStock = currentStock !== null ? currentStock - item.quantity : null;

                  return (
                    <div key={idx} className="space-y-1 pb-1.5 border-b border-border/40 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <span className="font-medium text-foreground truncate flex-1 pr-2">{item.product_name}</span>
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold shrink-0 text-[11px] px-1.5 py-0 whitespace-nowrap"
                        >
                          -{item.quantity} from stock
                        </Badge>
                      </div>

                      {found && currentStock !== null && resultStock !== null ? (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                          <span>Current: <strong className="text-foreground">{currentStock}</strong></span>
                          <div className="flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span>Result:</span>
                            <span
                              className={cn(
                                "font-bold",
                                resultStock < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : resultStock <= 2
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              )}
                            >
                              {resultStock} remaining
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-amber-500/20 text-[11px]">
                <span className="font-medium text-foreground">Total items to deduct:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">-{totalUnits} units from inventory</span>
              </div>
            </div>
          )}

          {willRestore && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs">
              <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Inventory Stock Restoration</span>
              </div>
              <p className="text-muted-foreground text-[11px] mb-2.5">
                Changing status from Paid to <strong className="text-foreground">{newStatus}</strong> will add items back into inventory:
              </p>
              <div className="space-y-2 bg-background/70 dark:bg-background/50 p-2.5 rounded-md border border-emerald-500/20">
                {items.map((item, idx) => {
                  const { currentStock, found } = findStockQuantity(
                    products,
                    item.product_id,
                    item.variant_id,
                    item.product_name
                  );
                  const resultStock = currentStock !== null ? currentStock + item.quantity : null;

                  return (
                    <div key={idx} className="space-y-1 pb-1.5 border-b border-border/40 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <span className="font-medium text-foreground truncate flex-1 pr-2">{item.product_name}</span>
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold shrink-0 text-[11px] px-1.5 py-0 whitespace-nowrap"
                        >
                          +{item.quantity} to stock
                        </Badge>
                      </div>

                      {found && currentStock !== null && resultStock !== null ? (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                          <span>Current: <strong className="text-foreground">{currentStock}</strong></span>
                          <div className="flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span>Result:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {resultStock} in stock
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-emerald-500/20 text-[11px]">
                <span className="font-medium text-foreground">Total items to restore:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+{totalUnits} units added back</span>
              </div>
            </div>
          )}

          {!willDeduct && !willRestore && (
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
              No stock quantity deduction or addition will be performed for this status transition.
            </div>
          )}
        </div>

        <AlertDialogFooter className="shrink-0 mt-2">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={isPending} className="gap-1.5">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirm Status Change
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
