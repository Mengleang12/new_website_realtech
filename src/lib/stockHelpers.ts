import type { AdminOrder } from "./api";

export interface OrderItemSummary {
  product_id?: number;
  variant_id?: number | null;
  product_name: string;
  variant_label?: string | null;
  quantity: number;
  unit_price?: number;
}

export interface StockAdjustmentItem {
  product_id?: number;
  variant_id?: number | null;
  product_name: string;
  variant_label?: string | null;
  oldQty: number;
  newQty: number;
  deltaQty: number; // positive = increased sale qty (deduct from stock), negative = reduced sale qty (add back to stock)
  stockImpact: "deduct" | "add" | "none";
  impactQuantity: number;
}

export interface StockAdjustmentResult {
  items: StockAdjustmentItem[];
  hasChanges: boolean;
  totalDeduct: number;
  totalAdd: number;
  statusStockChange?: {
    from: string;
    to: string;
    description: string;
    action: "deduct_all" | "restore_all" | "none";
  };
}

/**
 * Parse an order to extract clean item summaries (handles structured items or legacy product_name strings).
 */
export function parseOrderItems(order: AdminOrder): OrderItemSummary[] {
  if (order.items && order.items.length > 0) {
    return order.items.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      product_name: item.product_name,
      variant_label: item.variant_label ?? null,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
    }));
  }

  if (!order.product_name) return [];

  const items: OrderItemSummary[] = [];
  const entries = order.product_name.split(",").map((s) => s.trim()).filter(Boolean);
  for (const entry of entries) {
    const match = entry.match(/^(.+?)\s*[×x]\s*(\d+)$/i);
    const name = match ? match[1].trim() : entry;
    const qty = match ? parseInt(match[2], 10) : 1;
    items.push({
      product_id: order.product_id,
      product_name: name,
      quantity: qty || 1,
      unit_price: typeof order.amount === "number" ? order.amount : parseFloat(String(order.amount)) || 0,
    });
  }
  return items;
}

/**
 * Compare original order items with edited cart items to determine exact stock deductions and additions.
 */
export function calculateStockAdjustments(
  originalOrder: AdminOrder,
  newCartItems: {
    product_id: number;
    product_name: string;
    variant_id?: number | null;
    variant_label?: string | null;
    quantity: number;
  }[],
  newStatus?: string
): StockAdjustmentResult {
  const originalItems = parseOrderItems(originalOrder);
  const itemMap = new Map<string, StockAdjustmentItem>();

  const makeKey = (productId: number | undefined, variantId: number | null | undefined, name: string) =>
    `${productId || 0}_${variantId ?? "none"}_${name.trim().toLowerCase()}`;

  // 1. Add all original items as baseline (defaulting to 0 new quantity if removed)
  for (const orig of originalItems) {
    const key = makeKey(orig.product_id, orig.variant_id, orig.product_name);
    itemMap.set(key, {
      product_id: orig.product_id,
      variant_id: orig.variant_id,
      product_name: orig.product_name,
      variant_label: orig.variant_label,
      oldQty: orig.quantity,
      newQty: 0,
      deltaQty: -orig.quantity,
      stockImpact: "add",
      impactQuantity: orig.quantity,
    });
  }

  // 2. Merge new cart items
  for (const item of newCartItems) {
    const key = makeKey(item.product_id, item.variant_id, item.product_name);
    const existing = itemMap.get(key);

    if (existing) {
      const oldQty = existing.oldQty;
      const newQty = item.quantity;
      const deltaQty = newQty - oldQty;
      let stockImpact: "deduct" | "add" | "none" = "none";
      let impactQuantity = 0;

      if (deltaQty > 0) {
        stockImpact = "deduct";
        impactQuantity = deltaQty;
      } else if (deltaQty < 0) {
        stockImpact = "add";
        impactQuantity = Math.abs(deltaQty);
      }

      itemMap.set(key, {
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        product_name: item.product_name,
        variant_label: item.variant_label || existing.variant_label,
        oldQty,
        newQty,
        deltaQty,
        stockImpact,
        impactQuantity,
      });
    } else {
      // Brand new item added
      itemMap.set(key, {
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        product_name: item.product_name,
        variant_label: item.variant_label,
        oldQty: 0,
        newQty: item.quantity,
        deltaQty: item.quantity,
        stockImpact: "deduct",
        impactQuantity: item.quantity,
      });
    }
  }

  const items = Array.from(itemMap.values());
  const hasChanges = items.some((i) => i.stockImpact !== "none");
  const totalDeduct = items.filter((i) => i.stockImpact === "deduct").reduce((acc, i) => acc + i.impactQuantity, 0);
  const totalAdd = items.filter((i) => i.stockImpact === "add").reduce((acc, i) => acc + i.impactQuantity, 0);

  let statusStockChange: StockAdjustmentResult["statusStockChange"] = undefined;
  if (newStatus && newStatus !== originalOrder.status) {
    const wasPaid = originalOrder.status === "paid";
    const isNowPaid = newStatus === "paid";

    if (!wasPaid && isNowPaid) {
      statusStockChange = {
        from: originalOrder.status,
        to: newStatus,
        description: "Marking as Paid will deduct sold units from stock inventory.",
        action: "deduct_all",
      };
    } else if (wasPaid && !isNowPaid) {
      statusStockChange = {
        from: originalOrder.status,
        to: newStatus,
        description: `Changing from Paid to ${newStatus} will add sold units back to stock inventory.`,
        action: "restore_all",
      };
    }
  }

  return { items, hasChanges, totalDeduct, totalAdd, statusStockChange };
}
