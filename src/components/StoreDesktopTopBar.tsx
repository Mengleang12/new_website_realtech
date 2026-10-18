import { Phone, Send, MapPin, Clock, ShieldCheck, Truck, FileText, ShoppingBag, Heart, ChevronDown, Flame } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import { ThemeToggle } from "./ThemeToggle";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.realtechcomputer.com";

const languages = [
  { code: "km" as const, name: "ភាសាខ្មែរ", shortName: "KH", flag: "🇰🇭" },
  { code: "en" as const, name: "English", shortName: "EN", flag: "🇬🇧" },
];

export const StoreDesktopTopBar = () => {
  const { language, setLanguage } = useLanguage();
  const t = useTranslations();
  const { user } = useAuth();
  const { count: wishlistCount } = useWishlist();
  const [branding, setBranding] = useState<{
    support_phone?: string;
    telegram_url?: string;
    site_address?: string;
  }>({});
  const [showLangMenu, setShowLangMenu] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/settings/branding`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setBranding(d))
      .catch(() => {});
  }, []);

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  return (
    <div className="hidden lg:block bg-muted/60 dark:bg-card/80 border-b border-border/40 text-[12px] text-muted-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
        {/* Left: Store Contacts & Info */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 text-foreground/80 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {language === "km" ? "ធានាផលិតផលសុទ្ធ 100% និងសេវាថែទាំ" : "100% Genuine Apple & Portable Monitors"}
            </span>
          </div>

          <span className="text-border">|</span>

          <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <Truck className="w-3.5 h-3.5 text-primary" />
            <span>
              {language === "km" ? "ដឹកជញ្ជូនរហ័ស ភ្នំពេញ & គ្រប់ខេត្ត" : "Express Delivery in PP & Nationwide"}
            </span>
          </div>

          {branding.support_phone && (
            <>
              <span className="text-border">|</span>
              <a
                href={`tel:${branding.support_phone}`}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Phone className="w-3 h-3 text-primary" />
                <span>{branding.support_phone}</span>
              </a>
            </>
          )}

          {branding.telegram_url && (
            <a
              href={branding.telegram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              <Send className="w-3 h-3" />
              <span>{language === "km" ? "ឆាត Telegram" : "Telegram Support"}</span>
            </a>
          )}
        </div>

        {/* Right: Quick Services, Wishlist, Language & Theme */}
        <div className="flex items-center gap-4">
          <Link
            to="/promotions"
            className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold hover:text-amber-700 transition-colors"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>{language === "km" ? "ប្រូម៉ូសិនពិសេស" : "Hot Promotions"}</span>
          </Link>

          <span className="text-border">|</span>

          <Link
            to="/wishlist"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>{language === "km" ? "ទំនិញពេញចិត្ត" : "Wishlist"}</span>
            {wishlistCount > 0 && (
              <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {wishlistCount}
              </span>
            )}
          </Link>

          {user && (
            <>
              <span className="text-border">|</span>
              <Link
                to="/my-purchases"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                <span>{language === "km" ? "ការបញ្ជាទិញរបស់ខ្ញុំ" : "My Orders"}</span>
              </Link>
            </>
          )}

          <span className="text-border">|</span>

          {/* Language Menu */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 hover:text-foreground transition-colors py-1"
            >
              <span>{currentLang.flag}</span>
              <span className="font-medium text-foreground">{currentLang.shortName}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setShowLangMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-xl py-1 w-32 z-50 animate-in fade-in-50">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent ${
                        language === l.code ? "text-primary font-semibold bg-accent/40" : "text-foreground"
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <span className="text-border">|</span>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};
