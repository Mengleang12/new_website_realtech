import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Zap,
  Heart,
  ExternalLink,
  Package,
  Check,
  AlertTriangle,
  Shield,
  Tag,
  ArrowRight,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/contexts/CartContext";
import { useQuery } from "@tanstack/react-query";
import { appsApi, type App, type ProductVariant } from "@/lib/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichContent } from "@/components/RichTextEditor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProductQuickViewModalProps {
  app: App | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchased?: boolean;
}

export const ProductQuickViewModal = ({
  app,
  open,
  onOpenChange,
  purchased,
}: ProductQuickViewModalProps) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toggle, isWishlisted } = useWishlist();
  const { addToCart, items } = useCart();

  // Fetch complete product details in the background (enrich screenshots, variants, description)
  const { data: fullAppData } = useQuery({
    queryKey: ["app", app?.id],
    queryFn: () => (app ? appsApi.getById(app.id) : null),
    enabled: !!app?.id && open,
    staleTime: 1000 * 60 * 5,
  });

  const appData = fullAppData || app;

  // Active variants - available sorted on top
  const activeVariants = useMemo(
    () =>
      (appData?.variants ? [...appData.variants] : [])
        .filter((v) => v.is_active)
        .sort((a, b) => {
          const aInStock = (Number(a.stock_quantity) || 0) > 0 ? 1 : 0;
          const bInStock = (Number(b.stock_quantity) || 0) > 0 ? 1 : 0;
          if (aInStock !== bInStock) return bInStock - aInStock;
          return 0;
        }),
    [appData?.variants]
  );

  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(0);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Reset variant and image indices when dialog opens or app changes
  useEffect(() => {
    if (open && appData) {
      const defaultIdx = activeVariants.findIndex((v) => v.is_default);
      setSelectedVariantIdx(defaultIdx >= 0 ? defaultIdx : activeVariants.length > 0 ? 0 : null);
      setActiveImageIndex(0);
    }
  }, [open, appData?.id]);

  const selectedVariant: ProductVariant | null = useMemo(() => {
    if (selectedVariantIdx === null || !activeVariants[selectedVariantIdx]) return null;
    return activeVariants[selectedVariantIdx];
  }, [selectedVariantIdx, activeVariants]);

  // Gallery images list: selected variant image (if any), icon_url, screenshots
  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (selectedVariant?.variant_image && !list.includes(selectedVariant.variant_image)) {
      list.push(selectedVariant.variant_image);
    }
    if (appData?.icon_url && !list.includes(appData.icon_url)) {
      list.push(appData.icon_url);
    }
    if (appData?.screenshots && appData.screenshots.length > 0) {
      const sorted = [...appData.screenshots].sort((a, b) => a.sort_order - b.sort_order);
      for (const s of sorted) {
        if (s.image_url && !list.includes(s.image_url)) {
          list.push(s.image_url);
        }
      }
    }
    return list;
  }, [appData?.icon_url, appData?.screenshots, selectedVariant?.variant_image]);

  // Ensure active image index is within bounds
  const currentImage = galleryImages[activeImageIndex] || galleryImages[0] || appData?.icon_url;

  if (!app) return null;

  const displayName = t(appData?.name_km, appData?.name || "");
  const displayDescription = t(appData?.description_km, appData?.description || "");

  // Pricing calculation
  const defaultVariantPrice = activeVariants.length > 0 ? Number(activeVariants[0].price_adjustment) || 0 : 0;
  const finalPrice = selectedVariant ? Number(selectedVariant.price_adjustment) || 0 : defaultVariantPrice;
  const isPaidApp = finalPrice > 0;

  // Stock calculation
  const totalStock = activeVariants.length > 0
    ? activeVariants.reduce((s, v) => s + v.stock_quantity, 0)
    : 0;
  const selectedStock = selectedVariant ? selectedVariant.stock_quantity : totalStock;
  const isOutOfStock = selectedStock <= 0;
  const isLowStock = selectedStock > 0 && selectedStock <= 5;

  const inCart = items.some((i) => i.app.id === app.id);
  const wishlisted = isWishlisted(app.id);

  const handleAddToCart = () => {
    if (!appData) return;
    if (isOutOfStock) {
      toast.error(language === "km" ? "ផលិតផលនេះអស់ស្តុក" : "This product is out of stock");
      return;
    }
    addToCart(appData, null, selectedVariant);
    toast.success(
      language === "km"
        ? `បានបន្ថែម "${displayName}" ទៅក្នុងកន្ត្រក`
        : `Added "${displayName}" to cart`
    );
  };

  const handleBuyNow = () => {
    if (!appData) return;
    if (isOutOfStock) {
      toast.error(language === "km" ? "ផលិតផលនេះអស់ស្តុក" : "This product is out of stock");
      return;
    }
    addToCart(appData, null, selectedVariant);
    onOpenChange(false);
    navigate("/checkout");
  };

  const handleViewFullPage = () => {
    if (!appData) return;
    onOpenChange(false);
    navigate(`/${appData.id}`);
  };

  // Human-friendly category label
  const categoryLabels: Record<string, string> = {
    programs: language === "km" ? "កម្មវិធី" : "Software",
    games: language === "km" ? "ហ្គេម" : "Games",
    extensions: language === "km" ? "ផ្នែកបន្ថែម" : "Extensions",
    os: language === "km" ? "ប្រព័ន្ធប្រតិបត្តិការ" : "Operating System",
  };

  const categoryName = categoryLabels[appData?.category || ""] || appData?.category;
  const warrantyText =
    appData?.warranty_period ||
    (typeof appData?.warranty === "string"
      ? appData.warranty
      : (appData?.warranty as { name?: string } | undefined)?.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id={`quick-view-modal-${app.id}`}
        className="sm:max-w-3xl md:max-w-4xl p-0 gap-0 overflow-hidden rounded-2xl border-border/70 shadow-2xl"
      >
        <DialogTitle className="sr-only">
          {language === "km" ? `មើលត្រួសៗ: ${displayName}` : `Quick View: ${displayName}`}
        </DialogTitle>

        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] overflow-y-auto md:overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border/50">
          {/* Left Column: Visual Media & Gallery (5 cols on desktop) */}
          <div className="md:col-span-5 p-4 sm:p-5 flex flex-col justify-between bg-muted/20">
            <div>
              {/* Main Image Container */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-background border border-border/50 shadow-inner group">
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={displayName}
                    className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                    <Package className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                )}

                {/* Stock Badge Overlay */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                  {purchased && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[11px] gap-1 shadow-xs font-semibold">
                      <Check className="w-3 h-3" />
                      {language === "km" ? "បានទិញ" : "Owned"}
                    </Badge>
                  )}
                  {isOutOfStock ? (
                    <Badge variant="destructive" className="text-[11px] shadow-xs font-semibold">
                      {language === "km" ? "អស់ស្តុក" : "Out of Stock"}
                    </Badge>
                  ) : isLowStock ? (
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[11px] gap-1 shadow-xs font-semibold">
                      <AlertTriangle className="w-3 h-3" />
                      {selectedStock} {language === "km" ? "នៅសល់" : "left"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {language === "km" ? "មានស្តុក" : "In Stock"}
                    </Badge>
                  )}
                </div>

                {/* Wishlist Button Overlay */}
                <button
                  id={`quick-view-wishlist-btn-${app.id}`}
                  onClick={() => toggle(app.id)}
                  aria-label="Wishlist toggle"
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-background/90 hover:bg-background backdrop-blur-md border border-border/60 flex items-center justify-center transition-transform active:scale-90 shadow-sm z-10"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      wishlisted ? "fill-rose-500 text-rose-500" : "text-muted-foreground hover:text-foreground"
                    }`}
                  />
                </button>

                {/* Left / Right arrows if multiple gallery images */}
                {galleryImages.length > 1 && (
                  <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          prev === 0 ? galleryImages.length - 1 : prev - 1
                        )
                      }
                      className="w-7 h-7 rounded-full bg-background/80 hover:bg-background text-foreground flex items-center justify-center shadow-md pointer-events-auto border border-border/60 transition-all active:scale-95"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          prev === galleryImages.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="w-7 h-7 rounded-full bg-background/80 hover:bg-background text-foreground flex items-center justify-center shadow-md pointer-events-auto border border-border/60 transition-all active:scale-95"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Thumbnails strip */}
              {galleryImages.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-thin">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={cn(
                        "w-12 h-12 rounded-lg overflow-hidden border-2 bg-background transition-all shrink-0 p-1",
                        idx === activeImageIndex
                          ? "border-primary ring-2 ring-primary/20 scale-102"
                          : "border-border/60 hover:border-muted-foreground/40 opacity-70 hover:opacity-100"
                      )}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Guarantee Badges */}
            <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>{warrantyText || (language === "km" ? "ការធានាផ្លូវការ" : "Official Warranty")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>100% {language === "km" ? "ពិតប្រាកដ" : "Genuine"}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Essential Details, Variants & Actions (7 cols on desktop) */}
          <div className="md:col-span-7 p-5 sm:p-6 flex flex-col justify-between min-h-0">
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4">
                {/* Category & Quick View Label */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {categoryName && (
                      <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold border-primary/30 text-primary">
                        {categoryName}
                      </Badge>
                    )}
                    {appData?.brand?.name && (
                      <Badge variant="secondary" className="text-xs font-medium">
                        {appData.brand.name}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md">
                    <Eye className="w-3 h-3 text-primary" />
                    {language === "km" ? "មើលត្រួសៗ" : "Quick View"}
                  </span>
                </div>

                {/* Product Title */}
                <h2 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
                  {displayName}
                </h2>

                {/* Price Display */}
                <div className="flex items-baseline gap-3 py-1">
                  {isPaidApp ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-destructive tracking-tight">
                        ${finalPrice.toFixed(2)}
                      </span>
                      {selectedVariant && Number(selectedVariant.price_adjustment) !== defaultVariantPrice && (
                        <span className="text-xs text-muted-foreground line-through">
                          ${defaultVariantPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {language === "km" ? "ឥតគិតថ្លៃ" : "Free"}
                    </span>
                  )}

                  {/* Stock State Badge */}
                  <div className="ml-auto">
                    {isOutOfStock ? (
                      <span className="text-xs font-semibold text-destructive px-2 py-1 bg-destructive/10 rounded-md">
                        {language === "km" ? "អស់ស្តុក" : "Out of stock"}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {isLowStock
                          ? (language === "km" ? `នៅសល់ ${selectedStock}` : `Only ${selectedStock} left`)
                          : (language === "km" ? "មានស្តុក" : "In Stock")}
                      </span>
                    )}
                  </div>
                </div>

                <Separator className="bg-border/60" />

                {/* Summary / Highlights */}
                {displayDescription && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {language === "km" ? "សង្ខេបផលិតផល" : "Product Summary"}
                    </p>
                    <div className="text-xs sm:text-sm text-muted-foreground/90 leading-relaxed max-h-24 overflow-y-auto pr-1">
                      <RichContent html={displayDescription} className="prose-p:my-1 prose-headings:my-1 text-xs sm:text-sm" />
                    </div>
                  </div>
                )}

                {/* Variant Selector */}
                {activeVariants.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {language === "km" ? "ជម្រើសផលិតផល" : "Options / Variants"}
                      </span>
                      {selectedVariant && (
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {Object.values(selectedVariant.combination).join(" / ")}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {activeVariants.map((v, idx) => {
                        const label = Object.values(v.combination).join(" / ");
                        const vOOS = v.stock_quantity <= 0;
                        const isSelected = selectedVariantIdx === idx;
                        const vPrice = Number(v.price_adjustment) || 0;

                        return (
                          <button
                            key={v.id || idx}
                            type="button"
                            onClick={() => setSelectedVariantIdx(idx)}
                            disabled={vOOS}
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all select-none text-left",
                              vOOS
                                ? "border-border/30 text-muted-foreground/40 bg-muted/20 line-through cursor-not-allowed"
                                : isSelected
                                ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                                : "border-border/70 bg-card hover:border-primary/50 text-foreground hover:bg-muted/40"
                            )}
                          >
                            {v.variant_image ? (
                              <img
                                src={v.variant_image}
                                alt={label}
                                className="w-4 h-4 rounded object-cover shrink-0"
                              />
                            ) : v.display_color ? (
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-border/40"
                                style={{ backgroundColor: v.display_color }}
                              />
                            ) : null}
                            <span>{label}</span>
                            {vPrice > 0 && !vOOS && (
                              <span
                                className={cn(
                                  "text-[10px] ml-0.5",
                                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                                )}
                              >
                                ${vPrice.toFixed(0)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Bottom Actions Section */}
            <div className="pt-4 mt-4 border-t border-border/60 space-y-2.5 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                {/* Add to Cart Button */}
                <Button
                  id={`quick-view-add-to-cart-${app.id}`}
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  variant={inCart ? "secondary" : "outline"}
                  className="h-11 font-semibold text-xs sm:text-sm gap-2 rounded-xl transition-all active:scale-98 border-border hover:border-primary/60"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {inCart
                    ? language === "km"
                      ? "ក្នុងកន្ត្រក (បន្ថែមទៀត)"
                      : "In Cart (Add More)"
                    : language === "km"
                    ? "បន្ថែមទៅកន្ត្រក"
                    : "Add to Cart"}
                </Button>

                {/* Direct Buy Button */}
                <Button
                  id={`quick-view-buy-now-${app.id}`}
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="h-11 font-semibold text-xs sm:text-sm gap-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm hover:shadow-md transition-all active:scale-98"
                >
                  <Zap className="w-4 h-4" />
                  {isOutOfStock
                    ? language === "km"
                      ? "អស់ស្តុក"
                      : "Out of Stock"
                    : language === "km"
                    ? "ទិញភ្លាម"
                    : "Buy Now"}
                </Button>
              </div>

              {/* View Full Page Link */}
              <button
                id={`quick-view-full-details-link-${app.id}`}
                type="button"
                onClick={handleViewFullPage}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group"
              >
                <span>{language === "km" ? "មើលព័ត៌មានលម្អិតពេញលេញ" : "View Full Product Page & Specs"}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
