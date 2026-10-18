import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Flame, Tag, Sparkles, Copy, Check, Percent, ArrowRight, ExternalLink 
} from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { promotionsApi, type PromotionCampaign } from "@/lib/promotions";
import { couponsApi, appsApi, type Coupon, type App } from "@/lib/api";
import { toast } from "sonner";

export const PromotionsSection = () => {
  const { language } = useLanguage();
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const campList = promotionsApi.getActiveCampaigns();
        setCampaigns(campList);

        const couponsRes = await couponsApi.getAll().catch(() => ({ coupons: [] }));
        setCoupons((couponsRes.coupons || []).filter((c) => c.is_active));

        const appsRes = await appsApi.getAll({ limit: 40 }).catch(() => ({ apps: [] }));
        setProducts(appsRes.apps || []);
      } catch (err) {
        console.error("Failed to load promotions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(
      language === "km"
        ? `បានចម្លងកូដ "${code}" រួចរាល់!`
        : `Coupon code "${code}" copied!`
    );
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const promoProducts = products.filter((p) => {
    return p.is_featured || p.is_popular || (p.variants && p.variants.some((v) => v.price_adjustment > 0));
  });

  return (
    <div className="space-y-8 mt-4 animate-in fade-in duration-300">
      {/* Top Promotional Hero Card */}
      <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 backdrop-blur-md text-[11px] font-black uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>{language === "km" ? "ប្រូម៉ូសិនពិសេសប្រចាំខែ" : "MONTHLY MEGA PROMOTIONS"}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black leading-tight drop-shadow-xs">
            {language === "km"
              ? "ការបញ្ចុះតម្លៃពិសេស & កាដូថែមឥតគិតថ្លៃ"
              : "Exclusive Discounts & Free Accessory Gifts"}
          </h2>

          <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal">
            {language === "km"
              ? "ប្រើប្រាស់កូដគូប៉ុងខាងក្រោមដើម្បីទទួលបានការបញ្ចុះតម្លៃបន្ថែមភ្លាមៗ ពេលធ្វើការកុម្ម៉ង់ទិញ MacBook ឬ អេក្រង់ចល័ត។"
              : "Use the discount vouchers below for instant savings at checkout on all portable monitors, laptops, and accessories."}
          </p>

          <div className="pt-2 flex items-center gap-3">
            <Link
              to="/promotions"
              className="inline-flex items-center gap-1.5 bg-white text-red-600 hover:bg-white/90 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <span>{language === "km" ? "ទំព័រប្រូម៉ូសិនពេញលេញ" : "View Full Promotions Hub"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Available Store Coupons Grid */}
      {coupons.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-500" />
              <h3 className="text-base font-bold text-foreground">
                {language === "km" ? "គូប៉ុងបញ្ចុះតម្លៃភ្លាមៗ" : "Available Discount Vouchers"}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div>
                  <Badge className="bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5">
                    {c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `$${Number(c.discount_value).toFixed(2)} OFF`}
                  </Badge>
                  <div className="font-bold text-xs text-foreground mt-1.5">{c.name}</div>
                  <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {c.code}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleCopyCode(c.code)}
                  className="gap-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  {copiedCode === c.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedCode === c.code ? (language === "km" ? "ចម្លង" : "Copied") : (language === "km" ? "ចម្លងកូដ" : "Copy")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promotional Campaign Banners */}
      {campaigns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-bold text-foreground">
              {language === "km" ? "កញ្ចប់ប្រូម៉ូសិនពិសេស" : "Featured Deal Campaigns"}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className={`rounded-2xl p-5 bg-gradient-to-r ${camp.gradient} text-white shadow-xs flex flex-col justify-between`}
              >
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-black/30">
                    {camp.badge}
                  </span>
                  <h4 className="text-base font-bold mt-2 text-white">
                    {language === "km" && camp.title_km ? camp.title_km : camp.title}
                  </h4>
                  <p className="text-xs text-white/85 mt-1 leading-relaxed">
                    {language === "km" && camp.subtitle_km ? camp.subtitle_km : camp.subtitle}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-white/20 flex items-center justify-between">
                  <span className="text-xs font-black bg-white/25 px-2.5 py-1 rounded">
                    {camp.discount_text}
                  </span>
                  {camp.code && (
                    <button
                      onClick={() => handleCopyCode(camp.code!)}
                      className="inline-flex items-center gap-1 text-xs font-mono bg-black/40 px-2 py-1 rounded hover:bg-black/60 transition-colors"
                    >
                      <span>Code: {camp.code}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promotional Products */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">
              {language === "km" ? "ទំនិញមានការបញ្ចុះតម្លៃ" : "Products On Promotion"}
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">{promoProducts.length} items</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {promoProducts.map((p) => (
              <ProductCard key={p.id} app={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
