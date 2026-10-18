import {
  Search,
  X,
  User,
  LogOut,
  ShoppingBag,
  Menu,
  Settings,
  CreditCard,
  ChevronDown,
  Heart,
  ShoppingCart,
  Phone,
  Send,
  Sparkles,
  Layers,
  Laptop,
  Monitor,
  Package,
  Flame,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/hooks/useWishlist";
import { useCategories } from "@/hooks/useCategories";
import realtechLogo from "@/assets/realtech-logo.png";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "./NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const languages = [
  { code: "km" as const, name: "KH", fullName: "ភាសាខ្មែរ", flag: "🇰🇭" },
  { code: "en" as const, name: "EN", fullName: "English", flag: "🇬🇧" },
];

const popularKeywords = ["MacBook Pro", "MacBook Air", "2K Monitor", "4K OLED", "Arzopa", "Intehill", "Hub Type-C"];

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
  onCategorySelect?: (slug: string) => void;
}

export const Header = ({
  searchQuery,
  onSearchChange,
  onMenuToggle,
  isSidebarOpen,
  onCategorySelect,
}: HeaderProps) => {
  const { language, setLanguage } = useLanguage();
  const t = useTranslations();
  const { user, signOut } = useAuth();
  const { totalItems, totalPrice, setIsOpen: setCartOpen } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { data: categories } = useCategories();
  const navigate = useNavigate();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ support_phone?: string; telegram_url?: string }>({});

  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.realtechcomputer.com";
    fetch(`${API_BASE_URL}/api/admin/settings/branding`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setContactInfo({ support_phone: d.support_phone, telegram_url: d.telegram_url }))
      .catch(() => {});
  }, []);

  const activeCategories = (Array.isArray(categories) ? categories : [])
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  const handleSignOut = async () => {
    await signOut();
    setShowLogoutDialog(false);
    navigate("/");
  };

  return (
    <header className="py-2.5 sm:py-3 transition-all duration-200">
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 justify-between">
        {/* Left: Mobile Menu Toggle & Brand Logo for Top Navigation */}
        <div className="flex items-center gap-3 shrink-0">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          {/* Desktop Logo & Store Name */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-background shadow-xs border border-border/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
              <img 
                src={realtechLogo} 
                alt="Realtech" 
                className="w-full h-full object-contain p-0.5" 
                onError={(e) => { (e.target as HTMLImageElement).src = '/realtech-logo.png'; }}
              />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground text-sm sm:text-base tracking-tight leading-none group-hover:text-primary transition-colors">
                  Realtech
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
                  Store
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-none mt-1">
                {language === "km" ? "ហាងលក់ MacBook & អេក្រង់ចល័ត" : "MacBook & Portable Monitors"}
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Category Quick-Menu & Wide Search Input */}
        <div className="flex-1 max-w-2xl flex items-center gap-2">
          {/* Categories Dropdown button on desktop */}
          {onCategorySelect && activeCategories.length > 0 && (
            <div className="hidden xl:block shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-3.5 gap-2 rounded-xl border-border/80 bg-background/50 hover:bg-accent hover:border-primary/40 font-semibold text-xs"
                  >
                    <Layers className="w-4 h-4 text-primary" />
                    <span>{language === "km" ? "ប្រភេទទាំងអស់" : "Categories"}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1.5 shadow-xl rounded-xl">
                  <DropdownMenuItem
                    onClick={() => onCategorySelect("all")}
                    className="gap-2.5 py-2 text-xs font-medium cursor-pointer rounded-lg"
                  >
                    <Package className="w-4 h-4 text-primary" />
                    <span>{language === "km" ? "ផលិតផលទាំងអស់" : "All Products"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {activeCategories.map((cat) => {
                    const displayName = language === "km" && cat.name_km ? cat.name_km : cat.name;
                    return (
                      <DropdownMenuItem
                        key={cat.id}
                        onClick={() => onCategorySelect(cat.slug)}
                        className="gap-2.5 py-2 text-xs font-medium cursor-pointer rounded-lg"
                      >
                        {cat.icon_url ? (
                          <img src={cat.icon_url} alt="" className="w-4 h-4 rounded object-contain" />
                        ) : (
                          <Package className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="truncate">{displayName}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                language === "km"
                  ? "ស្វែងរក MacBook, អេក្រង់ចល័ត, គ្រឿងបន្លាស់..."
                  : "Search MacBooks, portable monitors, accessories..."
              }
              className="w-full pl-10 pr-9 py-2 h-10 text-xs sm:text-sm rounded-xl bg-muted/40 hover:bg-muted/60 focus:bg-background border border-border/70 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-hidden text-foreground placeholder:text-muted-foreground/70 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions Hub (Telegram Support, Wishlist, Cart, User Auth, Theme) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Telegram Support Chat Button */}
          {contactInfo.telegram_url && (
            <a
              href={contactInfo.telegram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{language === "km" ? "ជំនួយបច្ចេកទេស" : "Tech Support"}</span>
            </a>
          )}

          {/* Promotions Tab Link */}
          <Link
            to="/promotions"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all hover:scale-102 active:scale-95 group"
            title={language === "km" ? "ប្រូម៉ូសិនពិសេស" : "Hot Promotions"}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 group-hover:text-red-500 transition-colors animate-pulse" />
            <span>{language === "km" ? "ប្រូម៉ូសិន" : "Promotions"}</span>
            <span className="hidden lg:inline text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-red-600 text-white">
              HOT
            </span>
          </Link>

          {/* Wishlist Link */}
          <Link
            to="/wishlist"
            className="relative p-2 sm:px-2.5 sm:py-2 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground border border-transparent hover:border-border/60 transition-all flex items-center gap-1.5"
            title={language === "km" ? "បញ្ជីទំនិញពេញចិត្ត" : "Wishlist"}
          >
            <Heart className={`w-4 h-4 ${wishlistCount > 0 ? "fill-rose-500 text-rose-500" : ""}`} />
            {wishlistCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center leading-none shadow-xs">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Notifications */}
          {user && <NotificationBell />}

          {/* Interactive Cart Button with Total Amount Preview */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 active:scale-95 transition-all"
            aria-label="Open Shopping Cart"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center leading-none shadow-xs">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">
              {totalPrice > 0 ? `$${totalPrice.toFixed(2)}` : language === "km" ? "កន្ត្រក" : "Cart"}
            </span>
          </button>

          {/* User Profile / Login Dropdown */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-accent border border-transparent hover:border-border/60 transition-all text-xs font-medium text-foreground">
                  <Avatar className="w-7 h-7 border border-primary/20">
                    <AvatarImage src={user.avatar_url || ""} alt={user.full_name || user.email} />
                    <AvatarFallback className="text-[11px] bg-primary text-primary-foreground font-bold">
                      {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline max-w-[110px] truncate text-xs">
                    {user.full_name || user.email?.split("@")[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-60 hidden sm:inline" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl">
                <div className="px-3 py-2 bg-muted/40 rounded-lg mb-1">
                  <p className="text-xs font-semibold text-foreground truncate">{user.full_name || "Account"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/my-purchases" className="flex items-center gap-2.5 py-2 text-xs font-medium cursor-pointer rounded-lg">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <span>{language === "km" ? "ការបញ្ជាទិញរបស់ខ្ញុំ" : "My Purchases"}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/payment-history" className="flex items-center gap-2.5 py-2 text-xs font-medium cursor-pointer rounded-lg">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <span>{language === "km" ? "ប្រវត្តិបង់ប្រាក់" : "Payment History"}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2.5 py-2 text-xs font-medium cursor-pointer rounded-lg">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span>{language === "km" ? "ការកំណត់គណនី" : "Profile Settings"}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowLogoutDialog(true)}
                  className="text-destructive flex items-center gap-2.5 py-2 text-xs font-medium cursor-pointer rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{language === "km" ? "ចាកចេញ" : "Sign Out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl shadow-xs">
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.login}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Popular search tags ribbon for quick exploration on desktop */}
      {!searchQuery && (
        <div className="hidden lg:flex items-center gap-2 mt-2 pt-2 border-t border-border/30 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/70 shrink-0">
            {language === "km" ? "ពាក្យស្វែងរកពេញនិយម:" : "Popular Searches:"}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {popularKeywords.map((kw) => (
              <button
                key={kw}
                onClick={() => onSearchChange(kw)}
                className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "km" ? "បញ្ជាក់ការចាកចេញ" : "Confirm Sign Out"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "km"
                ? "តើអ្នកប្រាកដថាចង់ចាកចេញពីគណនីរបស់អ្នកមែនទេ?"
                : "Are you sure you want to sign out of your account?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              {language === "km" ? "បោះបង់" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              {language === "km" ? "ចាកចេញ" : "Sign Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
};
