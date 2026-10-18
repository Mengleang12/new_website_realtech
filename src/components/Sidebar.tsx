import { LayoutGrid, X, ShoppingCart, CreditCard, Settings, LogIn, Package, MapPin, Phone, Send, ShieldCheck, Heart, Flame } from "lucide-react";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/useCategories";
import realtechLogo from "@/assets/realtech-logo.png";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

interface SidebarProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const Sidebar = ({ activeCategory, onCategoryChange, isOpen = false, onToggle }: SidebarProps) => {
  const { language } = useLanguage();
  const t = useTranslations();
  const { user } = useAuth();
  const { count: wishlistCount } = useWishlist();
  const location = useLocation();
  const { data: categories, isLoading } = useCategories();
  const [contactInfo, setContactInfo] = useState<{ support_phone?: string; telegram_url?: string }>({});

  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.realtechcomputer.com";
    fetch(`${API_BASE_URL}/api/admin/settings/branding`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<string, string>) =>
        setContactInfo({ support_phone: d.support_phone, telegram_url: d.telegram_url })
      )
      .catch(() => {});
  }, []);

  const rawCategories = Array.isArray(categories) ? categories : [];
  const activeCategories = rawCategories
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const userMenuItems = [
    { path: "/my-purchases", label: language === "km" ? "ការបញ្ជាទិញរបស់ខ្ញុំ" : "My Orders", icon: ShoppingCart },
    { path: "/payment-history", label: language === "km" ? "ប្រវត្តិបង់ប្រាក់" : "Payment History", icon: CreditCard },
    { path: "/profile", label: language === "km" ? "ការកំណត់គណនី" : "Profile Settings", icon: Settings },
  ];

  const isOnIndex = location.pathname === "/";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-card/95 backdrop-blur-2xl border-r border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
        "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Drawer Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-background border border-border/60 flex items-center justify-center shrink-0">
            <img 
              src={realtechLogo} 
              alt="Realtech" 
              className="w-full h-full object-contain p-0.5" 
              onError={(e) => { (e.target as HTMLImageElement).src = '/realtech-logo.png'; }}
            />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm leading-tight">Realtech Store</h3>
            <p className="text-[10px] text-muted-foreground">MacBook & Portable Monitor</p>
          </div>
        </div>

        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Categories & Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Categories Section */}
        <div className="space-y-1">
          <p className="px-3 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
            {language === "km" ? "ប្រភេទផលិតផល" : "Product Categories"}
          </p>

          {/* All Products */}
          <button
            onClick={() => onCategoryChange("all")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left",
              isOnIndex && activeCategory === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-foreground hover:bg-accent hover:text-primary"
            )}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{language === "km" ? "ផលិតផលទាំងអស់" : "All Products"}</span>
          </button>

          {/* Dynamic categories */}
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
              </div>
            ))
          ) : (
            activeCategories.map((cat) => {
              const isActive = isOnIndex && activeCategory === cat.slug;
              const displayName = language === "km" && cat.name_km ? cat.name_km : cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange(cat.slug)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-foreground hover:bg-accent hover:text-primary"
                  )}
                >
                  {cat.icon_url ? (
                    <img src={cat.icon_url} alt="" className="w-4 h-4 rounded object-contain shrink-0" />
                  ) : (
                    <Package className="w-4 h-4 shrink-0 opacity-70" />
                  )}
                  <span className="flex-1 truncate">{displayName}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Quick Links Section */}
        <div className="space-y-1 pt-2 border-t border-border/40">
          <p className="px-3 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
            {language === "km" ? "សេវាកម្មរហ័ស" : "Quick Services"}
          </p>

          <Link
            to="/promotions"
            onClick={() => onToggle?.()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all mb-1"
          >
            <Flame className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
            <span className="flex-1 truncate">{language === "km" ? "ប្រូម៉ូសិនពិសេស" : "Hot Promotions"}</span>
            <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
              HOT
            </span>
          </Link>

          <Link
            to="/wishlist"
            onClick={() => onToggle?.()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-foreground hover:bg-accent hover:text-primary transition-all"
          >
            <Heart className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="flex-1 truncate">{language === "km" ? "ទំនិញពេញចិត្ត" : "Wishlist"}</span>
            {wishlistCount > 0 && (
              <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {wishlistCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => {
              const footer = document.getElementById("store-footer-contact");
              if (footer) {
                footer.scrollIntoView({ behavior: "smooth" });
                onToggle?.();
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-foreground hover:bg-accent hover:text-primary transition-all text-left"
          >
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="flex-1 truncate">{language === "km" ? "ទីតាំងហាង & ផែនទី" : "Store Location & Map"}</span>
          </button>
        </div>

        {/* User Menu */}
        {user && (
          <div className="space-y-1 pt-2 border-t border-border/40">
            <p className="px-3 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              {language === "km" ? "គណនីរបស់អ្នក" : "Your Account"}
            </p>
            {userMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => onToggle?.()}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-foreground hover:bg-accent hover:text-primary"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Drawer Footer */}
      <div className="p-3 border-t border-border/60 bg-muted/30">
        {!user ? (
          <Link
            to="/auth"
            onClick={() => onToggle?.()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-all mb-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{language === "km" ? "ចូលគណនី" : "Sign In to Account"}</span>
          </Link>
        ) : null}

        {contactInfo.telegram_url && (
          <a
            href={contactInfo.telegram_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onToggle?.()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram Support</span>
          </a>
        )}
      </div>
    </aside>
  );
};
