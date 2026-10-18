import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { salesApi, serialsApi, warrantyApi, type SaleCustomer, type SaleProduct, type CreateSalePayload } from "@/lib/api";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Trash2,
  UserPlus,
  Loader2,
  X,
  Minus,
  Users,
  Percent,
  CalendarIcon,
  ScanBarcode,
  Truck,
  ClipboardPaste,
  FileText,
  ShoppingCart,
  CheckCircle2,
  DollarSign,
  CreditCard,
  ShieldCheck,
  Tag,
  PackageX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PackageLabelA5Dialog, parseCustomerLocation, type PackageLabelPrintData } from "./PackageLabelA5Dialog";

interface CartItem {
  product: SaleProduct;
  variant_id?: number;
  quantity: number;
  unit_price: number;
  discount: number; // per-item discount amount
  discount_type: "amount" | "percent";
  serial_numbers: string[]; // one per unit
}

interface AddSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to extract warranty string from product (supports warranty_period, warranty.name, or warranty string)
const extractProductWarranty = (prod: any): string | null => {
  if (!prod) return null;
  if (typeof prod.warranty_period === "string" && prod.warranty_period.trim()) {
    return prod.warranty_period.trim();
  }
  if (prod.warranty) {
    if (typeof prod.warranty === "string" && prod.warranty.trim()) {
      return prod.warranty.trim();
    }
    if (typeof prod.warranty === "object" && typeof prod.warranty.name === "string" && prod.warranty.name.trim()) {
      return prod.warranty.name.trim();
    }
  }
  return null;
};

export const AddSaleDialog = ({ open, onOpenChange }: AddSaleDialogProps) => {
  const queryClient = useQueryClient();

  // Customer state
  const [customerType, setCustomerType] = useState<"walkin" | "existing" | "new">("walkin");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<SaleCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<SaleCustomer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);

  // Product state
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Sale-level discount
  const [saleDiscount, setSaleDiscount] = useState<number>(0);
  const [saleDiscountType, setSaleDiscountType] = useState<"amount" | "percent">("amount");

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending" | "partial" | "unpaid">("pending");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paidMethod, setPaidMethod] = useState<string>("cash");
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [warrantyPeriod, setWarrantyPeriod] = useState("");
  const [warrantyManuallyChanged, setWarrantyManuallyChanged] = useState(false);
  const [warrantySourceProduct, setWarrantySourceProduct] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // Scan loading state
  const [scanLoading, setScanLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // A5 Package Label
  const [pendingPackageData, setPendingPackageData] = useState<Partial<PackageLabelPrintData> | null>(null);
  const [showPackageLabel, setShowPackageLabel] = useState(false);

  // Search customers
  const handleSearchCustomers = useCallback(async (q: string) => {
    setCustomerSearch(q);
    if (q.length < 2) {
      setCustomers([]);
      return;
    }
    setCustomerLoading(true);
    try {
      const res = await salesApi.searchCustomers(q);
      setCustomers(res.customers || []);
    } catch {
      /* ignore */
    }
    setCustomerLoading(false);
  }, []);

  // Search products
  const handleSearchProducts = useCallback(async (q: string) => {
    setProductSearch(q);
    if (q.length < 1) {
      setProducts([]);
      return;
    }
    setProductLoading(true);
    try {
      const res = await salesApi.searchProducts(q);
      setProducts(res.products || []);
    } catch {
      /* ignore */
    }
    setProductLoading(false);
  }, []);

  // Get available stock for a product/variant
  const getAvailableStock = (product: SaleProduct, variantId?: number) => {
    const variant = variantId ? product.variants.find((v) => v.id === variantId) : null;
    return variant ? (variant.stock_quantity ?? 0) : product.variants.reduce((s, v) => s + v.stock_quantity, 0);
  };

  // Add product to cart
  const addToCart = (product: SaleProduct, variantId?: number) => {
    const stock = getAvailableStock(product, variantId);

    if (stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    const productWarranty = extractProductWarranty(product);
    if (productWarranty && !warrantyManuallyChanged) {
      setWarrantyPeriod(productWarranty);
      setWarrantySourceProduct(product.name);
    }

    setCart((prev) => {
      const exists = prev.find((c) => c.product.id === product.id && c.variant_id === variantId);
      const currentQty = exists ? exists.quantity : 0;

      if (currentQty >= stock) {
        toast.error(`Only ${stock} in stock for ${product.name}`);
        return prev;
      }

      if (exists) {
        return prev.map((c) =>
          c.product.id === product.id && c.variant_id === variantId ? { ...c, quantity: c.quantity + 1 } : c
        );
      } else {
        const variant = variantId ? product.variants.find((v) => v.id === variantId) : null;
        const price = variant
          ? Number(variant.price_adjustment || 0)
          : product.variants.length > 0
          ? Number(product.variants[0].price_adjustment || 0)
          : 0;
        return [
          ...prev,
          {
            product,
            variant_id: variantId,
            quantity: 1,
            unit_price: price,
            discount: 0,
            discount_type: "amount",
            serial_numbers: [],
          },
        ];
      }
    });
    setProductSearch("");
    setProducts([]);
  };

  // Handle Enter key on search input: try serial lookup first, then product search
  const handleQuickAdd = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      setScanLoading(true);
      try {
        // 1. Try serial/barcode lookup first
        const serialRes = await serialsApi.lookup(trimmed);
        if (serialRes.found && serialRes.product) {
          if (serialRes.status === "sold") {
            toast.error(`This item (S/N: ${serialRes.serial?.serial_number}) has already been sold`);
            setScanLoading(false);
            setProductSearch("");
            setTimeout(() => searchInputRef.current?.focus(), 100);
            return;
          }
          if (serialRes.status === "defective") {
            toast.error(`This item (S/N: ${serialRes.serial?.serial_number}) is marked as defective`);
            setScanLoading(false);
            setProductSearch("");
            setTimeout(() => searchInputRef.current?.focus(), 100);
            return;
          }
          // Available - add to cart with serial number
          const product = serialRes.product;
          const variantId =
            serialRes.serial?.variant_id || (product.variants.length > 0 ? product.variants[0].id : undefined);
          addToCart(product, variantId);
          // Auto-add the serial number to the cart item
          if (serialRes.serial) {
            setTimeout(() => {
              setCart((prev) =>
                prev.map((c) => {
                  if (c.product.id === product.id && c.variant_id === variantId) {
                    const sn = serialRes.serial!.serial_number;
                    if (!c.serial_numbers.includes(sn)) {
                      return { ...c, serial_numbers: [...c.serial_numbers, sn] };
                    }
                  }
                  return c;
                })
              );
            }, 50);
          }
          toast.success(`Scanned: ${product.name} (S/N: ${serialRes.serial?.serial_number})`);
          setScanLoading(false);
          setProductSearch("");
          setProducts([]);
          setTimeout(() => searchInputRef.current?.focus(), 100);
          return;
        }

        // 2. Fallback to product search
        const res = await salesApi.searchProducts(trimmed);
        const found = res.products || [];
        if (found.length === 0) {
          toast.error(`No product or serial found for "${trimmed}"`);
          setScanLoading(false);
          setProductSearch("");
          setTimeout(() => searchInputRef.current?.focus(), 100);
          return;
        }
        // Exact SKU match first
        const exactVariant = found
          .flatMap((p) => p.variants.map((v) => ({ product: p, variant: v })))
          .find((pv) => pv.variant.sku === trimmed);

        if (exactVariant) {
          addToCart(exactVariant.product, exactVariant.variant.id);
          toast.success(`Added: ${exactVariant.product.name}`);
        } else {
          const first = found[0];
          if (first.variants.length > 0) {
            addToCart(first, first.variants[0].id);
          } else {
            addToCart(first);
          }
          toast.success(`Added: ${first.name}`);
        }
      } catch {
        toast.error("Search failed");
      }
      setScanLoading(false);
      setProductSearch("");
      setProducts([]);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const stock = getAvailableStock(c.product, c.variant_id);
        const newQty = Math.max(1, c.quantity + delta);
        if (delta > 0 && newQty > stock) {
          toast.error(`Only ${stock} in stock for ${c.product.name}`);
          return c;
        }
        const newSerials = c.serial_numbers.filter((s) => s.trim()).slice(0, newQty);
        return { ...c, quantity: newQty, serial_numbers: newSerials };
      })
    );
  };

  const addSerialNumber = (cartIdx: number, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setCart((prev) => {
      // Check duplicate across ALL cart items
      const allSerials = prev.flatMap((c) => c.serial_numbers);
      if (allSerials.includes(trimmed)) {
        toast.error(`Serial number "${trimmed}" is already added`);
        return prev;
      }
      return prev.map((c, i) => {
        if (i !== cartIdx) return c;
        if (c.serial_numbers.length >= c.quantity) return c;
        return { ...c, serial_numbers: [...c.serial_numbers, trimmed] };
      });
    });
  };

  const removeSerialNumber = (cartIdx: number, serialIdx: number) => {
    setCart((prev) =>
      prev.map((c, i) => {
        if (i !== cartIdx) return c;
        return { ...c, serial_numbers: c.serial_numbers.filter((_, si) => si !== serialIdx) };
      })
    );
  };

  const updateItemDiscount = (idx: number, value: number, type: "amount" | "percent") => {
    setCart((prev) => prev.map((c, i) => (i === idx ? { ...c, discount: value, discount_type: type } : c)));
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0 && !warrantyManuallyChanged) {
        setWarrantyPeriod("");
        setWarrantySourceProduct(null);
      } else if (!warrantyManuallyChanged && next.length > 0) {
        const remainingWarranty = next.map((it) => extractProductWarranty(it.product)).find(Boolean);
        if (remainingWarranty) {
          setWarrantyPeriod(remainingWarranty);
          const source = next.find((it) => extractProductWarranty(it.product) === remainingWarranty);
          setWarrantySourceProduct(source?.product.name || null);
        } else {
          setWarrantyPeriod("");
          setWarrantySourceProduct(null);
        }
      }
      return next;
    });
  };

  // Calculate line total after per-item discount
  const getLineTotal = (item: CartItem) => {
    const gross = item.unit_price * item.quantity;
    if (item.discount_type === "percent") {
      return gross * (1 - Math.min(item.discount, 100) / 100);
    }
    return Math.max(0, gross - item.discount);
  };

  const subtotal = cart.reduce((s, c) => s + getLineTotal(c), 0);
  const totalItemCount = cart.reduce((s, c) => s + c.quantity, 0);

  // Sale-level discount
  const saleDiscountAmount =
    saleDiscountType === "percent" ? (subtotal * Math.min(saleDiscount, 100)) / 100 : Math.min(saleDiscount, subtotal);

  const grandTotal = Math.max(0, subtotal - saleDiscountAmount) + deliveryFee;

  // Auto-switch partial → paid when paid amount covers grand total
  useEffect(() => {
    if (paymentStatus === "partial" && paidAmount >= grandTotal && grandTotal > 0) {
      setPaymentStatus("paid");
      setPaidAmount(0);
    }
  }, [paidAmount, grandTotal, paymentStatus]);

  // Submit
  const createMutation = useMutation({
    mutationFn: (data: CreateSalePayload) => salesApi.createSale(data),
    onSuccess: (res: any) => {
      const createdId = res?.invoice_number || res?.order_id || res?.sale?.id || res?.order?.id;
      if (createdId) {
        const fmt = String(createdId).startsWith("#")
          ? String(createdId)
          : `#${String(createdId).slice(0, 8).toUpperCase()}`;
        setPendingPackageData((prev) => (prev ? { ...prev, orderId: fmt } : null));
      }

      toast.success(res.message || "Sale created successfully", {
        action: {
          label: "Print A5 Label",
          onClick: () => setShowPackageLabel(true),
        },
        duration: 8000,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create sale");
    },
  });

  const resetForm = () => {
    setCustomerType("walkin");
    setCustomerSearch("");
    setSelectedCustomer(null);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerEmail("");
    setNewCustomerAddress("");
    setCart([]);
    setSaleDiscount(0);
    setSaleDiscountType("amount");
    setPaymentStatus("pending");
    setPaidAmount(0);
    setSaleDate(new Date());
    setNotes("");
    setWarrantyPeriod("");
    setWarrantyManuallyChanged(false);
    setWarrantySourceProduct(null);
    setDeliveryFee(0);
    setCustomers([]);
    setProducts([]);
    setProductSearch("");
  };

  const handleSubmit = () => {
    if (customerType === "existing" && !selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    if (customerType === "new" && !newCustomerName.trim()) {
      toast.error("Please enter customer name");
      return;
    }
    if (cart.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    const receiverPhone = customerType === "existing" ? selectedCustomer?.phone || "" : newCustomerPhone;
    const customerName =
      customerType === "existing" ? selectedCustomer?.full_name || "" : newCustomerName || "Walk-in Customer";
    const rawAddress = customerType === "existing" ? selectedCustomer?.address || "" : newCustomerAddress;
    const itemsSummary = cart.map((c) => `${c.product.name} ×${c.quantity}`).join(", ");
    const remaining = Math.max(0, grandTotal - (paidAmount || 0));
    const codAmount = paymentStatus !== "paid" && remaining > 0 ? `$${remaining.toFixed(2)}` : "";

    const parsedLoc = parseCustomerLocation(rawAddress, notes);

    setPendingPackageData({
      customerName,
      receiverPhone,
      city: parsedLoc.city,
      branch: parsedLoc.branch,
      courier: parsedLoc.detectedCourier || "None",
      itemsSummary,
      codAmount,
    });

    const effectiveType = customerType === "walkin" ? ("new" as const) : customerType;

    const payload: CreateSalePayload = {
      customer_type: effectiveType,
      ...(customerType === "existing" && { customer_id: selectedCustomer!.id }),
      ...(customerType === "walkin" && {
        customer_name: "Walk-in Customer",
        customer_address: newCustomerAddress || undefined,
      }),
      ...(customerType === "new" && {
        customer_name: newCustomerName,
        customer_phone: newCustomerPhone || undefined,
        customer_email: newCustomerEmail || undefined,
        customer_address: newCustomerAddress || undefined,
      }),
      items: cart.map((c) => ({
        product_id: c.product.id,
        variant_id: c.variant_id,
        quantity: c.quantity,
        price: +(getLineTotal(c) / c.quantity).toFixed(2),
        discount: c.discount > 0 ? c.discount : undefined,
        discount_type: c.discount > 0 ? c.discount_type : undefined,
        serial_numbers: c.serial_numbers.some((s) => s.trim()) ? c.serial_numbers : undefined,
      })),
      payment_status: paymentStatus,
      paid_amount: paymentStatus === "partial" && paidAmount > 0 ? paidAmount : undefined,
      paid_method: paymentStatus === "partial" && paidAmount > 0 ? paidMethod : undefined,
      sale_discount: saleDiscount > 0 ? saleDiscount : undefined,
      sale_discount_type: saleDiscount > 0 ? saleDiscountType : undefined,
      notes: notes || undefined,
      warranty_period: warrantyPeriod || undefined,
      delivery_fee: deliveryFee > 0 ? deliveryFee : undefined,
      sale_date: format(saleDate, "yyyy-MM-dd"),
    };

    createMutation.mutate(payload);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) resetForm();
          onOpenChange(v);
        }}
      >
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl h-[100dvh] sm:h-[88vh] sm:max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden border border-border/80 shadow-2xl">
          <DialogTitle className="sr-only">New Sale & Invoice</DialogTitle>
          <DialogDescription className="sr-only">
            Create a new sale order, assign customer, search products, barcode scan, and generate invoice.
          </DialogDescription>

          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-muted/40 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-none">
                  New Sale & Invoice
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                  Quick sale entry, barcode lookup, and instant invoice creation
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5 border border-border/60">
                {totalItemCount} {totalItemCount === 1 ? "item" : "items"} · ${grandTotal.toFixed(2)}
              </Badge>
            )}
          </div>

          {/* Dialog Container */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* ─── Top Settings Card: Date, Payment, Warranty, Delivery Fee ─── */}
              <div className="rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Sale Date */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      Sale Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-9 w-full justify-start text-left text-xs font-normal border-input bg-background hover:bg-muted/50",
                            !saleDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          {saleDate ? format(saleDate, "MMM dd, yyyy") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={saleDate}
                          onSelect={(d) => d && setSaleDate(d)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Payment Status */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                      Payment Status
                    </Label>
                    <Select
                      value={paymentStatus}
                      onValueChange={(v) => setPaymentStatus(v as typeof paymentStatus)}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Paid
                          </span>
                        </SelectItem>
                        <SelectItem value="pending">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Pending
                          </span>
                        </SelectItem>
                        <SelectItem value="partial">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Partial Payment
                          </span>
                        </SelectItem>
                        <SelectItem value="unpaid">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Unpaid
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Warranty Period */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        Warranty
                      </Label>
                      {warrantySourceProduct && warrantyPeriod && (
                        <span
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate max-w-[100px]"
                          title={`Auto-applied from ${warrantySourceProduct}`}
                        >
                          ✓ Auto-detected
                        </span>
                      )}
                    </div>
                    <WarrantySelect
                      value={warrantyPeriod}
                      onChange={(v) => {
                        setWarrantyManuallyChanged(true);
                        setWarrantyPeriod(v);
                        if (!v) setWarrantySourceProduct(null);
                      }}
                      onAutoDefault={(v) => {
                        if (!warrantyManuallyChanged && !warrantySourceProduct && cart.length === 0) {
                          setWarrantyPeriod(v);
                        }
                      }}
                      hasProductWarranty={!!warrantySourceProduct}
                    />
                  </div>

                  {/* Delivery Fee */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-primary" />
                      Delivery Fee
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={deliveryFee || ""}
                        onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs pl-6 bg-background"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Partial Payment Expanded Card */}
                {paymentStatus === "partial" && (
                  <div className="mt-3 pt-3 border-t border-border/50 rounded-lg bg-amber-500/5 p-3 space-y-2 border border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        Partial Payment Breakdown
                      </span>
                      {grandTotal > 0 && (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          Remaining Due: ${Math.max(0, grandTotal - paidAmount).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="relative">
                        <Label className="text-[11px] font-medium text-muted-foreground block mb-1">
                          Amount Paid Today ($)
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={paidAmount || ""}
                            onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs pl-7 font-medium bg-background"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-muted-foreground block mb-1">
                          Payment Method
                        </Label>
                        <Select value={paidMethod} onValueChange={setPaidMethod}>
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="aba">ABA Pay / QR</SelectItem>
                            <SelectItem value="acleda">ACLEDA Pay</SelectItem>
                            <SelectItem value="wing">Wing Bank</SelectItem>
                            <SelectItem value="bakong">KHQR / Bakong</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {grandTotal > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, (paidAmount / grandTotal) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Paid: ${(paidAmount || 0).toFixed(2)}</span>
                          <span>{((Math.min(paidAmount, grandTotal) / grandTotal) * 100).toFixed(0)}% paid</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── Customer Section ─── */}
              <div className="rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      Customer Information
                    </Label>
                    {customerType === "walkin" && (
                      <Badge variant="secondary" className="text-[10px] h-5 font-normal px-2">
                        Walk-in
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                    <Button
                      type="button"
                      size="sm"
                      variant={customerType === "walkin" ? "default" : "ghost"}
                      onClick={() => setCustomerType("walkin")}
                      className="h-7 text-xs gap-1 px-2.5 rounded-md"
                    >
                      <Users className="w-3 h-3" /> Walk-in
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={customerType === "existing" ? "default" : "ghost"}
                      onClick={() => setCustomerType("existing")}
                      className="h-7 text-xs gap-1 px-2.5 rounded-md"
                    >
                      <Search className="w-3 h-3" /> Existing
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={customerType === "new" ? "default" : "ghost"}
                      onClick={() => setCustomerType("new")}
                      className="h-7 text-xs gap-1 px-2.5 rounded-md"
                    >
                      <UserPlus className="w-3 h-3" /> New
                    </Button>
                  </div>
                </div>

                {/* Walk-in Customer View */}
                {customerType === "walkin" && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 rounded-lg border border-border/50 bg-muted/20 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>
                        Walk-in customer — fast direct checkout. (Optional delivery address can be added below if needed).
                      </span>
                    </div>
                    <div className="w-full sm:w-72 relative">
                      <Input
                        placeholder="Optional delivery address / location..."
                        value={newCustomerAddress}
                        onChange={(e) => setNewCustomerAddress(e.target.value)}
                        className="h-8 text-xs pr-7 bg-background"
                      />
                      <button
                        type="button"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Paste address"
                        onClick={async () => {
                          try {
                            const t = await navigator.clipboard.readText();
                            if (t.trim()) setNewCustomerAddress(t.trim());
                          } catch {
                            toast.error("Cannot access clipboard");
                          }
                        }}
                      >
                        <ClipboardPaste className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing Customer View */}
                {customerType === "existing" && (
                  <>
                    {selectedCustomer ? (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-primary/5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                            {selectedCustomer.full_name?.charAt(0).toUpperCase() || "C"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{selectedCustomer.full_name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {selectedCustomer.email || "No email"}
                              {selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}
                              {selectedCustomer.address ? ` · ${selectedCustomer.address}` : ""}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedCustomer(null)}
                          title="Change customer"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search customer by name, email or phone number..."
                          value={customerSearch}
                          onChange={(e) => handleSearchCustomers(e.target.value)}
                          className="pl-9 h-9 text-xs bg-background"
                        />
                        {customerLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
                        )}
                        {!customerLoading && customers.length > 0 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-border/40">
                            {customers.map((c) => (
                              <button
                                key={c.id}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-muted text-xs transition-colors cursor-pointer flex items-center justify-between"
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setCustomers([]);
                                  setCustomerSearch("");
                                }}
                              >
                                <div>
                                  <p className="font-semibold text-foreground">{c.full_name}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {c.email}
                                    {c.phone ? ` · ${c.phone}` : ""}
                                    {c.address ? ` · ${c.address}` : ""}
                                  </p>
                                </div>
                                <span className="text-[10px] text-primary font-medium">Select →</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {!customerLoading && customers.length === 0 && customerSearch.length >= 2 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg p-3 text-center text-xs text-muted-foreground">
                            No customers found for &quot;{customerSearch}&quot;
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* New Customer Form */}
                {customerType === "new" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="relative">
                      <Input
                        placeholder="Customer Name *"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="h-8.5 text-xs pr-8 bg-background"
                      />
                      <button
                        type="button"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Paste Name"
                        onClick={async () => {
                          try {
                            const t = await navigator.clipboard.readText();
                            if (t.trim()) setNewCustomerName(t.trim());
                          } catch {
                            toast.error("Cannot access clipboard");
                          }
                        }}
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="relative">
                      <Input
                        placeholder="Phone Number (e.g. 012 345 678)"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        className="h-8.5 text-xs pr-8 bg-background"
                      />
                      <button
                        type="button"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Paste Phone"
                        onClick={async () => {
                          try {
                            const t = await navigator.clipboard.readText();
                            if (t.trim()) setNewCustomerPhone(t.trim());
                          } catch {
                            toast.error("Cannot access clipboard");
                          }
                        }}
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="relative">
                      <Input
                        placeholder="Email Address (optional)"
                        value={newCustomerEmail}
                        onChange={(e) => setNewCustomerEmail(e.target.value)}
                        className="h-8.5 text-xs pr-8 bg-background"
                      />
                      <button
                        type="button"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Paste Email"
                        onClick={async () => {
                          try {
                            const t = await navigator.clipboard.readText();
                            if (t.trim()) setNewCustomerEmail(t.trim());
                          } catch {
                            toast.error("Cannot access clipboard");
                          }
                        }}
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="relative">
                      <Input
                        placeholder="Delivery Address (e.g. Phnom Penh, Toul Kork)"
                        value={newCustomerAddress}
                        onChange={(e) => setNewCustomerAddress(e.target.value)}
                        className="h-8.5 text-xs pr-8 bg-background"
                      />
                      <button
                        type="button"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Paste Address"
                        onClick={async () => {
                          try {
                            const t = await navigator.clipboard.readText();
                            if (t.trim()) setNewCustomerAddress(t.trim());
                          } catch {
                            toast.error("Cannot access clipboard");
                          }
                        }}
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Products & Barcode Search Section ─── */}
              <div className="rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ScanBarcode className="w-3.5 h-3.5 text-primary" />
                    Product Search & Barcode Scanner
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Press Enter to quick add</span>
                </div>

                <div className="relative">
                  <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Scan serial barcode, or type product name / SKU (Press Enter to add)..."
                    value={productSearch}
                    onChange={(e) => handleSearchProducts(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleQuickAdd(productSearch);
                      }
                    }}
                    className="pl-9 pr-9 h-9.5 text-xs bg-background focus-visible:ring-1"
                  />
                  {(productLoading || scanLoading) && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                  )}
                </div>

                {/* Product Search Results Dropdown List */}
                {productLoading && productSearch.length >= 1 && (
                  <div className="p-4 bg-muted/40 rounded-xl border border-border/50 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Searching products...
                  </div>
                )}

                {!productLoading && products.length > 0 && (
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-border/80 bg-popover shadow-xl divide-y divide-border/40">
                    {products.map((p) => (
                      <div key={p.id}>
                        {p.variants.length > 0 ? (
                          p.variants.map((v) => {
                            const label = Object.values(v.combination || {}).join(" / ");
                            const price = Number(v.price_adjustment || 0);
                            const inStock = (v.stock_quantity ?? 0) > 0;
                            return (
                              <button
                                key={`${p.id}-${v.id}`}
                                className="w-full text-left px-3.5 py-2 hover:bg-muted/70 text-xs flex items-center gap-3 transition-colors cursor-pointer disabled:opacity-50"
                                onClick={() => addToCart(p, v.id)}
                              >
                                {v.variant_image ? (
                                  <img
                                    src={v.variant_image}
                                    className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border/40"
                                    alt=""
                                  />
                                ) : p.icon_url ? (
                                  <img
                                    src={p.icon_url}
                                    className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border/40"
                                    alt=""
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                    <ShoppingCart className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-foreground truncate">{p.name}</p>
                                    <span className="text-[10px] text-muted-foreground">#{p.id}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                    {v.display_color && (
                                      <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-border/40"
                                        style={{ backgroundColor: v.display_color }}
                                      />
                                    )}
                                    <span className="truncate">{label || "Default"}</span>
                                    {v.sku && <span className="font-mono text-[10px]">SKU: {v.sku}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span
                                    className={cn(
                                      "text-[10px] px-2 py-0.5 rounded-md font-medium",
                                      inStock
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "bg-destructive/10 text-destructive"
                                    )}
                                  >
                                    {inStock ? `Stock: ${v.stock_quantity}` : "Out of stock"}
                                  </span>
                                  <span className="text-xs font-bold text-foreground tabular-nums">
                                    ${price.toFixed(2)}
                                  </span>
                                  <span className="text-[11px] text-primary font-medium hover:underline">+ Add</span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <button
                            className="w-full text-left px-3.5 py-2.5 hover:bg-muted/70 text-xs flex items-center gap-3 transition-colors cursor-pointer"
                            onClick={() => addToCart(p, undefined)}
                          >
                            {p.icon_url ? (
                              <img
                                src={p.icon_url}
                                className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border/40"
                                alt=""
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                <ShoppingCart className="w-4 h-4" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{p.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                Total Stock: {p.variants.reduce((s, v) => s + v.stock_quantity, 0)}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-foreground tabular-nums">
                              ${p.variants.length > 0 ? Number(p.variants[0].price_adjustment).toFixed(2) : "0.00"}
                            </span>
                            <span className="text-[11px] text-primary font-medium hover:underline">+ Add</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ─── Cart Table ─── */}
                <div className="pt-2">
                  {cart.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 p-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                        <PackageX className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-medium text-foreground">Cart is empty</p>
                      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                        Scan a barcode or search products using the input above to begin adding items to this sale.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-border/80 rounded-xl overflow-hidden shadow-2xs bg-card">
                      {/* Cart Table Header */}
                      <div className="hidden sm:grid sm:grid-cols-[1fr_95px_120px_90px_36px] gap-2 px-3.5 py-2.5 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                        <span>Product ({totalItemCount} units)</span>
                        <span className="text-center">Quantity</span>
                        <span className="text-center">Item Discount</span>
                        <span className="text-right">Line Total</span>
                        <span />
                      </div>

                      {/* Cart Table Rows */}
                      <div className="divide-y divide-border/40">
                        {cart.map((item, idx) => {
                          const variant = item.variant_id
                            ? item.product.variants.find((v) => v.id === item.variant_id)
                            : null;
                          const variantLabel = variant ? Object.values(variant.combination || {}).join(" / ") : null;
                          const lineTotal = getLineTotal(item);

                          return (
                            <div key={idx} className="p-3 sm:px-3.5 sm:py-2.5 hover:bg-muted/10 transition-colors">
                              <div className="flex flex-col sm:grid sm:grid-cols-[1fr_95px_120px_90px_36px] sm:items-center gap-2">
                                {/* Product info */}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    {variant?.variant_image ? (
                                      <img
                                        src={variant.variant_image}
                                        alt=""
                                        className="w-7 h-7 rounded-md object-cover shrink-0 border border-border/40"
                                      />
                                    ) : item.product.icon_url ? (
                                      <img
                                        src={item.product.icon_url}
                                        alt=""
                                        className="w-7 h-7 rounded-md object-cover shrink-0 border border-border/40"
                                      />
                                    ) : null}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-foreground truncate">
                                        {item.product.name}
                                      </p>
                                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                        {variant?.display_color && (
                                          <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0 border border-border/40"
                                            style={{ backgroundColor: variant.display_color }}
                                          />
                                        )}
                                        {variantLabel && <span>{variantLabel}</span>}
                                        <span className="tabular-nums font-mono">${item.unit_price.toFixed(2)} ea</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Controls row for mobile / table columns for desktop */}
                                <div className="flex items-center justify-between sm:justify-center gap-2 mt-1 sm:mt-0">
                                  {/* Quantity Controls */}
                                  <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-background shadow-2xs">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 rounded-md hover:bg-muted"
                                      onClick={() => updateQty(idx, -1)}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="text-xs font-bold w-6 text-center tabular-nums">
                                      {item.quantity}
                                    </span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 rounded-md hover:bg-muted"
                                      onClick={() => updateQty(idx, 1)}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>

                                  {/* Item Discount Controls */}
                                  <div className="flex items-center gap-1">
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.discount || ""}
                                        onChange={(e) =>
                                          updateItemDiscount(idx, parseFloat(e.target.value) || 0, item.discount_type)
                                        }
                                        className="h-7 text-xs px-2 w-16 bg-background text-center tabular-nums"
                                        placeholder="0"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateItemDiscount(
                                          idx,
                                          item.discount,
                                          item.discount_type === "amount" ? "percent" : "amount"
                                        )
                                      }
                                      className="h-7 px-2 shrink-0 rounded-md border border-border bg-background flex items-center justify-center text-[10px] font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer shadow-2xs"
                                      title={item.discount_type === "amount" ? "Switch to % Discount" : "Switch to $ Discount"}
                                    >
                                      {item.discount_type === "percent" ? "%" : "$"}
                                    </button>
                                  </div>

                                  {/* Line Total */}
                                  <div className="text-right sm:text-right shrink-0">
                                    <span className="text-xs font-bold text-foreground tabular-nums">
                                      ${lineTotal.toFixed(2)}
                                    </span>
                                  </div>

                                  {/* Remove Item */}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => removeFromCart(idx)}
                                    title="Remove item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Serial numbers input pill bar */}
                              <div className="mt-2 pt-1.5 border-t border-border/30">
                                <div className="flex flex-wrap gap-1.5 items-center p-1.5 rounded-lg border border-border/60 bg-muted/20 min-h-[30px]">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1 pl-1">
                                    <ScanBarcode className="w-3 h-3" />
                                    Serials ({item.serial_numbers.length}/{item.quantity}):
                                  </span>
                                  {item.serial_numbers.map((sn, snIdx) => (
                                    <span
                                      key={snIdx}
                                      className="inline-flex items-center gap-1 bg-background border border-border text-foreground text-[10px] px-2 py-0.5 rounded-md font-mono shadow-2xs"
                                    >
                                      {sn}
                                      <button
                                        type="button"
                                        onClick={() => removeSerialNumber(idx, snIdx)}
                                        className="hover:text-destructive transition-colors cursor-pointer ml-0.5"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))}
                                  {item.serial_numbers.length < item.quantity && (
                                    <input
                                      className="flex-1 min-w-[130px] bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/70 font-mono px-1"
                                      placeholder={`Scan/type S/N (${item.serial_numbers.length}/${item.quantity}) & press Enter`}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          addSerialNumber(idx, e.currentTarget.value);
                                          e.currentTarget.value = "";
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Subtotal Bar */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-t border-border/50 text-xs">
                        <span className="text-muted-foreground font-medium">Subtotal ({totalItemCount} items)</span>
                        <span className="font-bold text-foreground tabular-nums">${subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Sale Discount & Summary Card (When Cart has items) ─── */}
              {cart.length > 0 && (
                <div className="rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-primary" />
                      Invoice-Level Discount
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={saleDiscount || ""}
                        onChange={(e) => setSaleDiscount(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs w-20 text-center bg-background tabular-nums"
                        placeholder="0"
                      />
                      <Select
                        value={saleDiscountType}
                        onValueChange={(v) => setSaleDiscountType(v as "amount" | "percent")}
                      >
                        <SelectTrigger className="h-8 text-xs w-24 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">$ Fixed</SelectItem>
                          <SelectItem value="percent">% Percent</SelectItem>
                        </SelectContent>
                      </Select>
                      {saleDiscountAmount > 0 && (
                        <span className="text-xs text-rose-500 font-bold tabular-nums">
                          -${saleDiscountAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Summary Breakdown */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Items Subtotal:</span>
                      <span className="tabular-nums">${subtotal.toFixed(2)}</span>
                    </div>
                    {saleDiscountAmount > 0 && (
                      <div className="flex justify-between text-rose-500">
                        <span>Sale Discount:</span>
                        <span className="tabular-nums">-${saleDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Delivery Fee:</span>
                        <span className="tabular-nums">+${deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-border/50">
                      <span className="text-sm font-bold text-foreground">Grand Total:</span>
                      <span className="text-xl font-extrabold text-foreground tabular-nums">
                        ${grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Sale Note Card ─── */}
              <div className="rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Sale Note / Remarks
                  </Label>
                  {notes.trim().length > 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums font-mono">
                      {notes.length} characters
                    </span>
                  )}
                </div>
                <Textarea
                  placeholder="Enter remarks, customer delivery instructions, courier preferences, or special warranty notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="min-h-[70px] text-xs resize-y leading-relaxed bg-background"
                />
              </div>
            </div>

            {/* ─── Pinned Sticky Footer: Always Visible at Bottom ─── */}
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              {/* Left Side: Summary snapshot */}
              <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Grand Total
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-foreground tabular-nums">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
                {paymentStatus === "partial" && (
                  <div className="flex flex-col border-l border-border pl-3">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      Paid: ${(paidAmount || 0).toFixed(2)}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      Due: ${Math.max(0, grandTotal - paidAmount).toFixed(2)}
                    </span>
                  </div>
                )}
                {cart.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground ml-auto sm:ml-0">
                    {totalItemCount} {totalItemCount === 1 ? "unit" : "units"}
                  </Badge>
                )}
              </div>

              {/* Right Side: Action Buttons */}
              <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    onOpenChange(false);
                  }}
                  className="h-9 px-4 text-xs font-medium flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || cart.length === 0}
                  className="h-9 px-5 text-xs font-bold gap-2 shadow-sm flex-1 sm:flex-none justify-center"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create Sale{cart.length > 0 ? ` — $${grandTotal.toFixed(2)}` : ""}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PackageLabelA5Dialog
        initialData={pendingPackageData}
        open={showPackageLabel}
        onOpenChange={setShowPackageLabel}
      />
    </>
  );
};

// ─── Warranty Select Component ────────────────────────────────────────────────
const WarrantySelect = ({
  value,
  onChange,
  onAutoDefault,
  hasProductWarranty,
}: {
  value: string;
  onChange: (v: string) => void;
  onAutoDefault?: (v: string) => void;
  hasProductWarranty?: boolean;
}) => {
  const { data } = useQuery({
    queryKey: ["warranties"],
    queryFn: () => warrantyApi.getAll(),
  });

  const warranties = data?.warranties || [];

  // Auto-select default warranty when data loads and no value is set, ONLY if no product warranty has been applied
  useEffect(() => {
    if (!value && warranties.length > 0 && !hasProductWarranty && onAutoDefault) {
      const defaultWarranty = warranties.find((w) => w.is_default);
      if (defaultWarranty) {
        onAutoDefault(defaultWarranty.name);
      }
    }
  }, [warranties, value, hasProductWarranty, onAutoDefault]);

  return (
    <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger className="h-9 text-xs bg-background">
        <SelectValue placeholder="No warranty (Optional)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">No warranty</SelectItem>
        {warranties.map((w) => (
          <SelectItem key={w.id} value={w.name}>
            {w.name} ({w.duration_days} days)
          </SelectItem>
        ))}
        {value && value !== "__none__" && !warranties.some((w) => w.name.toLowerCase() === value.toLowerCase()) && (
          <SelectItem value={value}>{value} (Product Warranty)</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};
