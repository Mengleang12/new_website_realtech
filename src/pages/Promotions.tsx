import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Flame, Tag, Sparkles, Copy, Check, Percent, ArrowRight, ShieldCheck, 
  Clock, ShoppingCart, Eye, Gift, ChevronRight, ExternalLink 
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { StoreDesktopTopBar } from "@/components/StoreDesktopTopBar";
import { StoreFooter } from "@/components/StoreFooter";
import { FloatingCartButton } from "@/components/FloatingCartButton";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { promotionsApi, type PromotionCampaign } from "@/lib/promotions";
import { couponsApi, appsApi, type Coupon, type App } from "@/lib/api";
import { toast } from "sonner";

const Promotions = () => {
  const { language } = useLanguage();
  const t = useTranslations();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

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
        ? `បានចម្លងកូដបញ្ចុះតម្លៃ "${code}" រួចរាល់!`
        : `Coupon code "${code}" copied to clipboard!`
    );
    setTimeout(() => setCopiedCode(null), 3000);
  };

  // Filter products for promotional highlight
  const promoProducts = products.filter((p) => {
    if (searchQuery) {
      const matchName = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchNameKm = p.name_km?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchName || matchNameKm;
    }
    return p.is_featured || p.is_popular || (p.variants && p.variants.some((v) => v.price_adjustment > 0));
  });

  return (
    <>
      <SEOHead 
        title={language === "km" ? "ប្រូម៉ូសិន & ការបញ្ចុះតម្លៃពិសេស | Realtech Computer" : "Promotions & Hot Deals | Realtech Computer"}
        description="Exclusive discounts, promotional coupons, vouchers, and hot deals on MacBooks, portable monitors, and tech accessories at Realtech Computer."
        url="/promotions"
      />

      <div className={`min-h-screen bg-background flex flex-col ${language === "km" ? "font-khmer" : ""}`}>
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar
          activeCategory="promotions"
          onCategoryChange={() => {}}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Top Info Bar */}
        <StoreDesktopTopBar />

        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
              isSidebarOpen={sidebarOpen}
            />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-12">
          {/* Hero Banner Section */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-500 via-rose-600 to-red-700 text-white shadow-xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)] pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 px-6 sm:px-10 py-10 sm:py-14 max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-black tracking-wider uppercase">
                <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>
                  {language === "km" ? "ប្រូម៉ូសិនពិសេសប្រចាំរដូវកាល" : "HOT DEALS & SEASONAL PROMOTIONS"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
                {language === "km"
                  ? "ការបញ្ចុះតម្លៃពិសេស & គូប៉ុងសន្សំប្រាក់"
                  : "Super Tech Savings & Exclusive Vouchers"}
              </h1>

              <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal">
                {language === "km"
                  ? "ទទួលបានការបញ្ចុះតម្លៃពិសេសលើរាល់ការទិញ MacBook, អេក្រង់ចល័ត 2K/4K និងគ្រឿងបន្លាស់កុំព្យូទ័រគុណភាពខ្ពស់ ជាមួយការធានាផ្លូវការ។"
                  : "Enjoy instant discounts, limited-time vouchers, and genuine warranty on MacBook, Portable Monitors, and premium accessories."}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href="#deals-products"
                  className="inline-flex items-center gap-2 bg-white text-red-700 hover:bg-white/90 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {language === "km" ? "មើលទំនិញបញ្ចុះតម្លៃ" : "Browse Promo Deals"}
                </a>

                <a
                  href="#vouchers-section"
                  className="inline-flex items-center gap-2 bg-black/30 hover:bg-black/40 text-white border border-white/25 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm backdrop-blur-md transition-all"
                >
                  <Tag className="w-4 h-4" />
                  {language === "km" ? "ទទួលយកគូប៉ុង" : "Claim Vouchers"}
                </a>
              </div>
            </div>
          </div>

          {/* Featured Campaign Cards */}
          {campaigns.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">
                      {language === "km" ? "យុទ្ធនាការប្រូម៉ូសិនកំពុងដំណើរការ" : "Active Promotional Campaigns"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {language === "km" ? "ប្រូម៉ូសិនពិសេសមានកំណត់" : "Limited-time offers and exclusive store packages"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="relative rounded-2xl border border-border/70 overflow-hidden bg-card flex flex-col justify-between shadow-xs hover:shadow-lg transition-all duration-200 group"
                  >
                    {/* Visual Header with Gradient */}
                    <div className={`p-5 bg-gradient-to-r ${camp.gradient} text-white relative`}>
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/30 backdrop-blur-md">
                        {camp.badge}
                      </span>

                      <h3 className="text-lg font-bold mt-2.5 leading-snug text-white">
                        {language === "km" && camp.title_km ? camp.title_km : camp.title}
                      </h3>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-black bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                          {camp.discount_text}
                        </span>
                        {camp.code && (
                          <button
                            onClick={() => handleCopyCode(camp.code!)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-xs font-mono text-white transition-colors"
                          >
                            <span>{camp.code}</span>
                            {copiedCode === camp.code ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {language === "km" && camp.subtitle_km ? camp.subtitle_km : camp.subtitle}
                      </p>

                      {camp.terms && (
                        <p className="text-[11px] text-muted-foreground/75 italic">
                          * {camp.terms}
                        </p>
                      )}

                      {camp.code && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCode(camp.code!)}
                          className="w-full gap-2 text-xs font-semibold border-primary/30 hover:bg-primary/5 hover:text-primary mt-2"
                        >
                          {copiedCode === camp.code ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              {language === "km" ? "បានចម្លងកូដ" : "Code Copied!"}
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              {language === "km" ? `ចម្លងកូដ "${camp.code}"` : `Copy Code "${camp.code}"`}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vouchers & Coupons Section */}
          <div id="vouchers-section" className="space-y-4 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">
                    {language === "km" ? "គូប៉ុងបញ្ចុះតម្លៃ" : "Store Discount Coupons"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {language === "km" ? "ចុចចម្លងកូដដើម្បីទទួលបានការបញ្ចុះតម្លៃពេលបង់ប្រាក់" : "Click to copy code and apply at checkout"}
                  </p>
                </div>
              </div>
            </div>

            {coupons.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-border/80 text-center space-y-2 bg-muted/20">
                <Tag className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">
                  {language === "km" ? "មិនទាន់មានគូប៉ុងបន្ថែមទេ" : "No active public coupons right now"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === "km" ? "សូមតាមដានទំព័រនេះសម្រាប់ប្រូម៉ូសិនថ្មីៗ" : "Check back soon for new holiday promotional coupons!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map((coupon) => {
                  const isPercent = coupon.discount_type === "percentage";
                  const discountLabel = isPercent
                    ? `${coupon.discount_value}% OFF`
                    : `$${Number(coupon.discount_value).toFixed(2)} OFF`;

                  return (
                    <div
                      key={coupon.id}
                      className="relative rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 p-5 flex flex-col justify-between space-y-3 transition-transform hover:-translate-y-1 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge className="bg-emerald-600 text-white font-black text-xs px-2.5 py-0.5">
                            {discountLabel}
                          </Badge>
                          <h4 className="font-bold text-foreground text-sm mt-2">{coupon.name}</h4>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Percent className="w-4 h-4" />
                        </div>
                      </div>

                      {coupon.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {coupon.description}
                        </p>
                      )}

                      <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
                        {coupon.min_price > 0 && (
                          <p>
                            {language === "km" ? "ការបញ្ជាទិញអប្បបរមា:" : "Min. Spend:"}{" "}
                            <span className="font-semibold text-foreground">${Number(coupon.min_price).toFixed(2)}</span>
                          </p>
                        )}
                        {coupon.expires_at && (
                          <p>
                            {language === "km" ? "ផុតកំណត់:" : "Valid until:"}{" "}
                            <span className="font-semibold text-foreground">
                              {new Date(coupon.expires_at).toLocaleDateString()}
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Code Box */}
                      <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between gap-2">
                        <div className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-lg">
                          {coupon.code}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleCopyCode(coupon.code)}
                          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          {copiedCode === coupon.code ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              {language === "km" ? "បានចម្លង" : "Copied"}
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              {language === "km" ? "ចម្លងកូដ" : "Copy Code"}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Promotional Deals Product Grid */}
          <div id="deals-products" className="space-y-4 pt-4 border-t border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">
                    {language === "km" ? "ផលិតផលប្រូម៉ូសិនពិសេស" : "Hot Promotional Products"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {language === "km" ? "ទំនិញដែលមានការបញ្ចុះតម្លៃ និងប្រូម៉ូសិនថែម" : "Items on sale with exclusive discounts and bundled gifts"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  {promoProducts.length} {language === "km" ? "មុខទំនិញ" : "deals found"}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-2xl" />
                ))}
              </div>
            ) : promoProducts.length === 0 ? (
              <div className="p-12 text-center border rounded-2xl bg-muted/20">
                <p className="text-muted-foreground">No promotional products found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {promoProducts.map((product) => (
                  <ProductCard key={product.id} app={product} />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <StoreFooter />

        {/* Floating Cart Button */}
        <FloatingCartButton />
      </div>
    </>
  );
};

export default Promotions;
