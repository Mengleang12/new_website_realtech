import { Package, Heart, ShoppingCart, Zap, AlertTriangle, Check, Sparkles, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/contexts/CartContext";
import { useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appsApi, type App } from "@/lib/api";
import { ProductQuickViewModal } from "./ProductQuickViewModal";

interface ProductCardProps {
  app?: App;
  name?: string;
  name_km?: string;
  version?: string;
  description?: string;
  description_km?: string;
  icon?: string;
  icon_url?: string;
  iconBg?: string;
  hasUpdate?: boolean;
  size?: string;
  purchased?: boolean;
}

export const ProductCard = (props: ProductCardProps) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggle, isWishlisted } = useWishlist();
  const { addToCart, isOutOfStock } = useCart();
  const queryClient = useQueryClient();
  const imgRef = useRef<HTMLImageElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const appId = props.app?.id;
  const name = props.app?.name || props.name || "";
  const nameKm = props.app?.name_km || props.name_km;
  const iconUrl = props.app?.icon_url || props.icon_url;

  const activeVariants = props.app?.variants?.filter((v) => v.is_active) || [];
  const defaultVariant = activeVariants.find((v) => v.is_default) || activeVariants[0];
  const priceNum = defaultVariant ? Number(defaultVariant.price_adjustment) || 0 : 0;
  const isPaidApp = priceNum > 0;
  const displayName = t(nameKm, name);

  const outOfStock = props.app ? isOutOfStock(props.app) : false;

  // Calculate stock info
  const getStockInfo = () => {
    if (!props.app) return null;
    const app = props.app;
    const totalStock =
      app.variants && app.variants.length > 0
        ? app.variants.filter((v) => v.is_active).reduce((sum, v) => sum + v.stock_quantity, 0)
        : 0;
    const threshold = 5;
    if (totalStock <= 0)
      return { status: "out" as const, label: language === "km" ? "អស់ស្តុក" : "Out of stock", stock: totalStock };
    if (totalStock <= threshold)
      return {
        status: "low" as const,
        label: language === "km" ? `នៅសល់ ${totalStock}` : `${totalStock} left`,
        stock: totalStock,
      };
    return { status: "ok" as const, label: language === "km" ? "មានស្តុក" : "In Stock", stock: totalStock };
  };
  const stockInfo = getStockInfo();

  // Prefetch product data + JS chunk on hover
  const handlePrefetch = useCallback(() => {
    if (!props.app) return;
    queryClient.prefetchQuery({
      queryKey: ["app", props.app.id],
      queryFn: () => appsApi.getById(props.app!.id),
      staleTime: 1000 * 60 * 5,
    });
    import("@/pages/ProductDetail");
  }, [props.app, queryClient]);

  const handleClick = (e: React.MouseEvent) => {
    // Open Quick View Modal without leaving current page
    if (props.app) {
      setQuickViewOpen(true);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!props.app) return;
    if (outOfStock) {
      toast.error(language === "km" ? "ផលិតផលនេះអស់ស្តុក" : "This product is out of stock");
      return;
    }
    const sourceEl = imgRef.current || placeholderRef.current;
    addToCart(props.app, sourceEl);
    toast.success(
      language === "km"
        ? `បានបន្ថែម "${displayName}" ទៅក្នុងកន្ត្រក`
        : `Added "${displayName}" to cart`
    );
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!props.app) return;
    if (outOfStock) {
      toast.error(language === "km" ? "ផលិតផលនេះអស់ស្តុក" : "This product is out of stock");
      return;
    }
    const sourceEl = imgRef.current || placeholderRef.current;
    addToCart(props.app, sourceEl);
    navigate("/checkout");
  };

  return (
    <>
      <article
      className={`group relative rounded-2xl bg-card border border-border/60 overflow-hidden flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 dark:hover:shadow-primary/15 hover:border-primary/50 ${
        props.app ? "cursor-pointer" : ""
      } ${outOfStock ? "opacity-75" : ""}`}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      itemScope
      itemType="https://schema.org/Product"
    >
      {/* Top Border Glow Shimmer on Hover */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none" />

      {/* Top Image Container */}
      <div>
        <div className="relative w-full aspect-square bg-muted/20 overflow-hidden">
          {iconUrl ? (
            <img
              ref={imgRef}
              src={iconUrl}
              alt={`${displayName} - Realtech Computer`}
              itemProp="image"
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
              loading="lazy"
            />
          ) : (
            <div ref={placeholderRef} className="w-full h-full flex items-center justify-center bg-secondary">
              <Package className="w-12 h-12 text-muted-foreground/25 transition-transform duration-500 group-hover:scale-110" />
            </div>
          )}

          {/* Ambient Overlay Sheen on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Owned Badge */}
          {props.purchased && (
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs z-10">
              <Check className="w-3 h-3" /> {language === "km" ? "បានទិញ" : "Owned"}
            </div>
          )}

          {/* Stock Badge */}
          {stockInfo && stockInfo.status !== "ok" && (
            <div
              className={`absolute top-2.5 left-2.5 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-md z-10 ${
                stockInfo.status === "out"
                  ? "bg-destructive/90 text-destructive-foreground shadow-xs"
                  : "bg-amber-500/90 text-white shadow-xs"
              }`}
            >
              {stockInfo.status === "low" && <AlertTriangle className="w-2.5 h-2.5" />}
              {stockInfo.label}
            </div>
          )}

          {/* Wishlist Button (Always visible with micro-animation on hover) */}
          {appId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggle(appId);
              }}
              aria-label="Add to wishlist"
              className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-background/85 hover:bg-background backdrop-blur-md border border-border/50 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 shadow-xs z-10"
            >
              <Heart
                className={`w-4 h-4 transition-all duration-200 ${
                  isWishlisted(appId)
                    ? "fill-rose-500 text-rose-500 scale-105"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              />
            </button>
          )}

          {/* Quick View Hover Badge Overlay */}
          <div className="absolute inset-x-0 bottom-2.5 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/95 hover:bg-background text-foreground text-xs font-semibold backdrop-blur-md shadow-md border border-border/70 transition-transform transform group-hover:scale-100 scale-95 pointer-events-auto">
              <Eye className="w-3.5 h-3.5 text-primary" />
              {language === "km" ? "មើលត្រួសៗ" : "Quick View"}
            </span>
          </div>

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-background/65 backdrop-blur-[2px] flex items-center justify-center z-10">
              <span className="text-xs sm:text-sm font-bold text-destructive bg-background/90 border border-destructive/30 px-3 py-1.5 rounded-full shadow-xs">
                {language === "km" ? "អស់ស្តុក" : "Out of Stock"}
              </span>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-border/40" />

        {/* Info */}
        <div className="p-3.5 space-y-2">
          {/* Name with smooth title color shift on hover */}
          <h3
            className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-200 h-9"
            itemProp="name"
            title={displayName}
          >
            {displayName}
          </h3>

          {/* Price & Stock Indicator */}
          <div className="flex items-baseline justify-between pt-0.5">
            <div>
              {isPaidApp ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-base sm:text-lg font-bold text-destructive leading-none group-hover:scale-102 transition-transform origin-left">
                    ${priceNum.toFixed(2)}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {language === "km" ? "ឥតគិតថ្លៃ" : "Free"}
                </span>
              )}
            </div>

            {stockInfo && stockInfo.status === "ok" && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:animate-pulse" />
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  {language === "km" ? "មានស្តុក" : "In Stock"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="px-3.5 pb-3.5 pt-0">
        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border/30">
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-2.5 rounded-xl transition-all duration-200 ${
              outOfStock
                ? "bg-muted text-muted-foreground/50 border border-border/40 cursor-not-allowed"
                : "bg-muted/70 hover:bg-primary hover:text-primary-foreground text-foreground border border-border/60 hover:border-primary active:scale-95 shadow-2xs hover:shadow-sm"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
            <span className="truncate">{language === "km" ? "កន្ត្រក" : "Cart"}</span>
          </button>

          <button
            onClick={handleBuyNow}
            disabled={outOfStock}
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-2.5 rounded-xl transition-all duration-200 ${
              outOfStock
                ? "bg-muted text-muted-foreground/50 border border-border/40 cursor-not-allowed"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 shadow-xs hover:shadow-md hover:shadow-destructive/25"
            }`}
          >
            <Zap className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
            <span className="truncate">{language === "km" ? "ទិញភ្លាម" : "Buy"}</span>
          </button>
        </div>
      </div>
    </article>

    {/* Quick View Modal */}
    {props.app && (
      <ProductQuickViewModal
        app={props.app}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        purchased={props.purchased}
      />
    )}
  </>
  );
};
