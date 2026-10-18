import { useState, useRef, useEffect, useCallback } from "react";
import { AdminDialog } from "./AdminDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Printer, Plus, Minus, Trash2, Loader2, Package, Ruler, StickyNote,
  Wifi, WifiOff, RefreshCw, Eye, Sparkles, Check, FileText
} from "lucide-react";
import { salesApi, serialsApi, type SaleProduct } from "@/lib/api";
import JsBarcode from "jsbarcode";
import { initPrinterService, detectConnectedPrinters, type PrinterStatus } from "@/lib/printer-service";
import { getGlobalLabelSize } from "@/lib/label-settings";
import { printLabelsBrowser, printLabelsUniversal, type UniversalLabelItem } from "@/lib/label-printer-utils";
import { PrinterDetectorDialog } from "./PrinterDetectorDialog";

interface LabelItem {
  id: string;
  product?: SaleProduct;
  variant_id?: number;
  name: string;
  variant?: string;
  serial_number?: string;
  barcode: string;
  price: number;
  sku?: string;
  quantity: number;
}

interface PrintLabelDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const PrintLabelDialog = ({ open, onOpenChange }: PrintLabelDialogProps) => {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [serialsLoading, setSerialsLoading] = useState(false);
  const [items, setItems] = useState<LabelItem[]>([]);
  
  // Custom manual label state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customBarcode, setCustomBarcode] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customVariant, setCustomVariant] = useState("");
  const [customQty, setCustomQty] = useState(1);

  // Label paper size
  const [labelWidth, setLabelWidth] = useState(40);
  const [labelHeight, setLabelHeight] = useState(30);

  // Printer SDK detection
  const [printing, setPrinting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>({ available: false, printers: [] });
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [checkingPrinter, setCheckingPrinter] = useState(false);
  const [showDetectorDialog, setShowDetectorDialog] = useState(false);

  // Initialize printer service and load global label size on mount
  useEffect(() => {
    checkPrinterService();
    getGlobalLabelSize().then((size) => {
      setLabelWidth(size.width || 40);
      setLabelHeight(size.height || 30);
    });
  }, []);

  const checkPrinterService = async () => {
    setCheckingPrinter(true);
    try {
      const status = await initPrinterService();
      setPrinterStatus(status);
      if (status.available && status.printerName && !selectedPrinter) {
        setSelectedPrinter(status.printerName);
      }
    } catch {
      setPrinterStatus({ available: false, printers: [] });
    }
    setCheckingPrinter(false);
  };

  const handleSearch = useCallback(async (q: string) => {
    setSearch(q);
    if (q.length < 1) {
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await salesApi.searchProducts(q);
      setProducts(res.products || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  // Add a product to the label list (handles both products WITH and WITHOUT serial records)
  const handleAddProduct = async (product: SaleProduct, variantId?: number) => {
    const variant = variantId ? product.variants.find((v) => v.id === variantId) : null;
    const price = variant
      ? Number(variant.price_adjustment || 0)
      : product.variants.length > 0
      ? Number(product.variants[0].price_adjustment || 0)
      : 0;

    const variantCombinationText = variant ? Object.values(variant.combination).join(" / ") : "";
    const skuCode = variant?.sku || product.variants[0]?.sku || `PRD-${product.id}`;
    const defaultBarcode = variant?.sku || `RT-${product.id}${variantId ? `-${variantId}` : ""}`;

    setSearch("");
    setProducts([]);
    setSerialsLoading(true);

    try {
      // Try to fetch available serial numbers if any exist
      let availableSerials: any[] = [];
      try {
        const res = await serialsApi.getAll({
          product_id: product.id,
          status: "available",
          limit: 100,
        });
        if (res && res.serials) {
          availableSerials = res.serials.filter((s) => !variantId || s.variant_id === variantId);
        }
      } catch {
        // Serials not tracked or error, proceed with general product label
      }

      if (availableSerials.length > 0) {
        // Add serialized labels
        const newItems: LabelItem[] = availableSerials.map((s) => {
          const sVariant = s.variant_id ? product.variants.find((v) => v.id === s.variant_id) : variant;
          const sPrice = sVariant ? Number(sVariant.price_adjustment || 0) : price;
          const sVariantText = sVariant ? Object.values(sVariant.combination).join(" / ") : "";

          return {
            id: `serial-${s.id || s.serial_number}`,
            product,
            variant_id: s.variant_id || variantId,
            name: product.name,
            variant: sVariantText,
            serial_number: s.serial_number,
            barcode: s.barcode || s.serial_number,
            price: sPrice,
            sku: sVariant?.sku,
            quantity: 1,
          };
        });

        // Filter out already added
        const uniqueToAdd = newItems.filter(
          (ni) => !items.some((ex) => ex.serial_number && ex.serial_number === ni.serial_number)
        );

        if (uniqueToAdd.length > 0) {
          setItems((prev) => [...prev, ...uniqueToAdd]);
          toast.success(`Added ${uniqueToAdd.length} serial label(s) for "${product.name}"`);
        } else {
          toast.info("All available serials for this product are already in the list");
        }
      } else {
        // Add general product barcode label
        const itemKey = `prod-${product.id}-${variantId || "default"}`;
        const existingIdx = items.findIndex((i) => i.id === itemKey);

        if (existingIdx >= 0) {
          setItems((prev) =>
            prev.map((it, idx) => (idx === existingIdx ? { ...it, quantity: it.quantity + 1 } : it))
          );
          toast.success(`Increased label quantity for "${product.name}"`);
        } else {
          const newItem: LabelItem = {
            id: itemKey,
            product,
            variant_id: variantId,
            name: product.name,
            variant: variantCombinationText,
            barcode: defaultBarcode,
            price: price,
            sku: skuCode,
            quantity: 1,
          };
          setItems((prev) => [...prev, newItem]);
          toast.success(`Added product label for "${product.name}"`);
        }
      }
    } catch (err: any) {
      toast.error("Failed to add product label");
    } finally {
      setSerialsLoading(false);
    }
  };

  const handleAddCustomLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      toast.error("Please enter a label name");
      return;
    }
    const barcodeVal = customBarcode.trim() || `TAG-${Date.now().toString().slice(-6)}`;
    const parsedPrice = parseFloat(customPrice) || 0;

    const newItem: LabelItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      variant: customVariant.trim(),
      barcode: barcodeVal,
      price: parsedPrice,
      quantity: Math.max(1, customQty || 1),
    };

    setItems((prev) => [...prev, newItem]);
    setCustomName("");
    setCustomBarcode("");
    setCustomPrice("");
    setCustomVariant("");
    setCustomQty(1);
    setShowCustomForm(false);
    toast.success("Added custom label");
  };

  const updateQty = (idx: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearAll = () => {
    setItems([]);
  };

  const totalLabels = items.reduce((sum, i) => sum + i.quantity, 0);

  // Print execution: works universally on ALL thermal printers, standard printers, and Detonger SDK
  const handlePrintUniversal = async (preferSDK = true) => {
    if (items.length === 0) {
      toast.error("Please add at least one product or label to print");
      return;
    }

    setPrinting(true);

    const universalLabels: UniversalLabelItem[] = items.map((it) => ({
      name: it.name,
      variant: it.variant,
      barcode: it.barcode,
      serial: it.serial_number,
      price: it.price,
      sku: it.sku,
      quantity: it.quantity,
    }));

    try {
      const res = await printLabelsUniversal({
        printerName: selectedPrinter,
        labelWidth,
        labelHeight,
        labels: universalLabels,
        preferSDK: preferSDK && printerStatus.available,
      });

      if (res.success) {
        if (res.method === "sdk") {
          toast.success(`Directly printed ${res.printed} label(s) via printer SDK`);
        } else {
          toast.success(`Opened print dialog for ${res.printed} label(s)`);
        }
      } else {
        // Fallback to browser print directly
        const fallbackSuccess = await printLabelsBrowser(universalLabels, {
          width: labelWidth,
          height: labelHeight,
        });
        if (fallbackSuccess) {
          toast.success(`Opened print dialog for ${totalLabels} label(s)`);
        } else {
          toast.error(res.error || "Print failed");
        }
      }
    } catch (err: any) {
      console.error("Print error:", err);
      // Final attempt: browser print
      await printLabelsBrowser(universalLabels, { width: labelWidth, height: labelHeight });
      toast.success(`Opened print dialog for ${totalLabels} label(s)`);
    } finally {
      setPrinting(false);
    }
  };

  const content = (
    <div className="space-y-5">
      {/* Top Search & Custom Action Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search Product */}
        <div className="md:col-span-2 relative">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search product by name, SKU, or ID..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-10 text-sm bg-background border-border/80 rounded-xl"
            disabled={serialsLoading}
          />
          {(loading || serialsLoading) && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}

          {/* Search dropdown */}
          {loading && search.length >= 1 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-popover border border-border rounded-xl shadow-xl p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Searching inventory...
            </div>
          )}

          {serialsLoading && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-popover border border-border rounded-xl shadow-xl p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading product details & serials...
            </div>
          )}

          {!loading && !serialsLoading && products.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-popover border border-border rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-border/40">
              {products.map((p) => (
                <div key={p.id} className="p-1">
                  {p.variants && p.variants.length > 0 ? (
                    p.variants.map((v) => (
                      <button
                        key={`${p.id}-${v.id}`}
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/80 rounded-lg text-sm flex items-center gap-3 transition-colors cursor-pointer"
                        onClick={() => handleAddProduct(p, v.id)}
                      >
                        {p.icon_url ? (
                          <img src={p.icon_url} className="w-8 h-8 rounded-md object-cover shrink-0 border border-border/50" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {p.name} <span className="text-muted-foreground font-normal text-xs">#{p.id}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Object.values(v.combination).join(" / ")}
                            {v.sku ? ` · SKU: ${v.sku}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-primary">${Number(v.price_adjustment || 0).toFixed(2)}</span>
                          <span className="block text-[10px] text-muted-foreground">Click to add</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/80 rounded-lg text-sm flex items-center gap-3 transition-colors cursor-pointer"
                      onClick={() => handleAddProduct(p)}
                    >
                      {p.icon_url ? (
                        <img src={p.icon_url} className="w-8 h-8 rounded-md object-cover shrink-0 border border-border/50" alt="" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">Product ID: {p.id}</p>
                      </div>
                      <span className="text-xs font-bold text-primary">Add Tag</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && !serialsLoading && products.length === 0 && search.length >= 1 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-popover border border-border rounded-xl shadow-xl p-4 text-center text-sm text-muted-foreground">
              No matching products found. Try adding a custom label.
            </div>
          )}
        </div>

        {/* Custom Tag Button */}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="w-full h-10 rounded-xl gap-2 font-medium border-dashed hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
            {showCustomForm ? "Hide Custom Tag" : "Add Custom / Manual Tag"}
          </Button>
        </div>
      </div>

      {/* Custom Label Form */}
      {showCustomForm && (
        <form onSubmit={handleAddCustomLabel} className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Create Custom Label
            </h4>
            <span className="text-[11px] text-muted-foreground">For custom accessories, promos, or manual barcodes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div>
              <Label className="text-[11px] text-muted-foreground">Item Name *</Label>
              <Input
                placeholder="e.g. Type-C Fast Hub"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="h-8 text-xs mt-1 bg-background"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Barcode / Serial</Label>
              <Input
                placeholder="e.g. HUB-2026-001 (auto if empty)"
                value={customBarcode}
                onChange={(e) => setCustomBarcode(e.target.value)}
                className="h-8 text-xs mt-1 bg-background"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="h-8 text-xs mt-1 bg-background"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Quantity</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={customQty}
                onChange={(e) => setCustomQty(parseInt(e.target.value) || 1)}
                className="h-8 text-xs mt-1 bg-background"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowCustomForm(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-7 text-xs gap-1">
              <Plus className="w-3.5 h-3.5" /> Add to Print Queue
            </Button>
          </div>
        </form>
      )}

      {/* Printer Connection Status & Paper Size Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Status */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
          {checkingPrinter ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Detecting Detonger driver...
            </div>
          ) : printerStatus.available ? (
            <>
              <Wifi className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Direct Thermal SDK Ready</span>
                <p className="text-[11px] text-muted-foreground truncate">{selectedPrinter || "Detonger Connected"}</p>
              </div>
            </>
          ) : (
            <>
              <Printer className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-foreground">Universal Print Ready</span>
                <p className="text-[11px] text-muted-foreground">Thermal Roll, Label Sheet & Browser Print</p>
              </div>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs gap-1.5 shrink-0 hover:bg-muted font-medium text-primary hover:text-primary"
            onClick={() => setShowDetectorDialog(true)}
            title="Open hardware detector"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingPrinter ? "animate-spin" : ""}`} />
            <span>Detect</span>
          </Button>
        </div>

        {/* Paper Size Presets */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-muted/20 overflow-x-auto">
          <Ruler className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Paper:</span>
          <div className="flex gap-1.5">
            {[
              { w: 30, h: 20, label: "30×20" },
              { w: 40, h: 30, label: "40×30" },
              { w: 50, h: 30, label: "50×30" },
              { w: 60, h: 40, label: "60×40" },
            ].map((opt) => {
              const active = labelWidth === opt.w && labelHeight === opt.h;
              return (
                <button
                  key={`${opt.w}x${opt.h}`}
                  type="button"
                  onClick={() => {
                    setLabelWidth(opt.w);
                    setLabelHeight(opt.h);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <StickyNote className="w-3 h-3" />
                  {opt.label} <span className="text-[9px] opacity-75">mm</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Label Queue Items List */}
      {items.length > 0 ? (
        <div className="border border-border/80 rounded-xl overflow-hidden shadow-xs bg-card">
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/50 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Print Queue</span>
              <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.2">
                {totalLabels} total tag{totalLabels !== 1 ? "s" : ""}
              </Badge>
            </div>
            <button
              onClick={clearAll}
              className="text-xs text-destructive hover:underline font-medium"
            >
              Clear All
            </button>
          </div>

          <div className="divide-y divide-border/40 max-h-64 overflow-y-auto">
            {items.map((item, idx) => (
              <div key={item.id || idx} className="grid grid-cols-[1fr_110px_75px_36px] gap-2 px-3.5 py-2.5 items-center hover:bg-muted/20 transition-colors">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{item.name}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                    {item.variant && <span className="text-primary font-medium">{item.variant}</span>}
                    {item.serial_number && <span className="font-mono bg-muted px-1.5 py-0.2 rounded text-[10px]">SN: {item.serial_number}</span>}
                    {item.barcode && !item.serial_number && <span className="font-mono text-[10px]">Code: {item.barcode}</span>}
                  </div>
                </div>

                {/* Quantity adjuster */}
                <div className="flex items-center gap-1 justify-center bg-muted/40 rounded-lg p-0.5 border border-border/40">
                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-background" onClick={() => updateQty(idx, -1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-background" onClick={() => updateQty(idx, 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                {/* Price */}
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    {item.price > 0 ? `$${item.price.toFixed(2)}` : "Free"}
                  </span>
                </div>

                {/* Remove */}
                <div className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-border/80 rounded-xl p-8 text-center bg-muted/10 space-y-2">
          <Package className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h4 className="text-sm font-bold text-foreground">No Products in Print Queue</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Search for any product above or click "Add Custom / Manual Tag" to start printing barcode price tags and serial labels.
          </p>
        </div>
      )}

      {/* Live Label Preview */}
      {items.length > 0 && (
        <div className="border border-border rounded-xl p-3.5 bg-muted/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide">
              <Eye className="w-3.5 h-3.5" /> Visual Label Preview ({labelWidth}×{labelHeight}mm)
            </div>
            <span className="text-[11px] text-muted-foreground">High-density barcode rendering</span>
          </div>

          <div className="flex flex-wrap gap-3 overflow-x-auto py-1">
            {items.slice(0, 4).map((item, idx) => (
              <LabelPreviewCard
                key={idx}
                item={item}
                width={labelWidth}
                height={labelHeight}
              />
            ))}
            {totalLabels > 4 && (
              <div
                style={{ width: `${Math.round(labelWidth * 2.8)}px`, height: `${Math.round(labelHeight * 2.8)}px` }}
                className="border border-dashed border-border/80 rounded-lg flex flex-col items-center justify-center text-xs text-muted-foreground bg-background/50"
              >
                <span className="font-bold text-sm text-foreground">+{totalLabels - 4}</span>
                <span className="text-[10px]">more tags</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Print Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
        <div className="text-xs text-muted-foreground">
          {totalLabels > 0 ? (
            <span>Ready to print <strong className="text-foreground">{totalLabels}</strong> label{totalLabels !== 1 ? "s" : ""}</span>
          ) : (
            <span>Add labels to begin</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenChange && (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
          )}

          {/* Primary Print Button: Always Universal */}
          <Button
            onClick={() => handlePrintUniversal(true)}
            disabled={items.length === 0 || printing}
            className="rounded-xl gap-2 font-bold px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
          >
            {printing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                Print {totalLabels > 0 ? `${totalLabels} Label${totalLabels !== 1 ? "s" : ""}` : "Labels"}
              </>
            )}
          </Button>
        </div>
      </div>

      <PrinterDetectorDialog
        open={showDetectorDialog}
        onOpenChange={setShowDetectorDialog}
        onPrinterSelected={(pName) => {
          setSelectedPrinter(pName);
          checkPrinterService();
        }}
      />
    </div>
  );

  if (!onOpenChange) return content;

  return (
    <AdminDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2 font-bold text-base">
          <Printer className="w-5 h-5 text-primary" /> Print Product & Serial Labels
        </span>
      }
      size="xl"
    >
      {content}
    </AdminDialog>
  );
};

// Render an individual preview card with SVG barcode
const LabelPreviewCard = ({ item, width, height }: { item: LabelItem; width: number; height: number }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pxW = Math.round(width * 2.8);
  const pxH = Math.round(height * 2.8);

  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, item.barcode || item.serial_number || "000000", {
          format: "CODE128",
          width: 1.0,
          height: Math.max(14, pxH * 0.25),
          displayValue: true,
          fontSize: 8,
          textMargin: 1,
          margin: 1,
          font: "Arial, sans-serif",
        });
      } catch {
        /* fallback */
      }
    }
  }, [item.barcode, item.serial_number, pxH]);

  return (
    <div
      style={{ width: `${pxW}px`, height: `${pxH}px` }}
      className="border border-border/80 rounded-lg bg-card p-1.5 flex flex-col justify-between items-center text-center shadow-xs overflow-hidden select-none"
    >
      <div className="w-full">
        <span className="text-[7px] font-extrabold uppercase tracking-wider text-muted-foreground block leading-none truncate">
          REALTECH
        </span>
        <p className="text-[8px] font-bold text-foreground leading-tight truncate mt-0.5" title={item.name}>
          {item.name}
        </p>
        {item.variant && (
          <p className="text-[6.5px] text-muted-foreground leading-none truncate">{item.variant}</p>
        )}
      </div>

      <div className="w-full flex justify-center items-center my-0.5 overflow-hidden">
        <svg ref={svgRef} className="max-w-[95%] h-auto max-h-[30px]" />
      </div>

      <div className="w-full flex items-baseline justify-between px-0.5 leading-none">
        <span className="text-[6.5px] font-mono text-muted-foreground truncate max-w-[55%]">
          {item.serial_number ? `SN:${item.serial_number}` : item.sku ? item.sku : item.barcode}
        </span>
        <span className="text-[9px] font-black text-foreground">
          {item.price > 0 ? `$${item.price.toFixed(2)}` : "FREE"}
        </span>
      </div>
    </div>
  );
};

// Standalone page version for admin tab
export const PrintLabelsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" /> Print Labels & Price Tags
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate and print barcode labels, product price tags, and serial stickers for any thermal or standard printer
          </p>
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-xs">
        <PrintLabelDialog />
      </div>
    </div>
  );
};
