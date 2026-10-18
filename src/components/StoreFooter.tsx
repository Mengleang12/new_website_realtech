import { useEffect, useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Facebook,
  Send,
  Instagram,
  ChevronRight,
  Play,
  ShieldCheck,
  Truck,
  Clock,
  CreditCard,
  Laptop,
  Monitor,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import realtechLogo from "@/assets/realtech-logo.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.realtechcomputer.com";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

interface BrandingData {
  site_name: string;
  site_tagline: string;
  site_logo_url: string;
  support_email: string;
  support_phone: string;
  site_address: string;
  store_hours?: string;
  store_hours_km?: string;
  facebook_url: string;
  telegram_url: string;
  instagram_url: string;
  tiktok_url: string;
  google_maps_api_key: string;
  youtube_video_url: string;
}

const defaults: BrandingData = {
  site_name: "Realtech Computer",
  site_tagline: "MacBook & Portable Monitor Store",
  site_logo_url: "",
  support_email: "support@realtechcomputer.com",
  support_phone: "+855 12 345 678",
  site_address: "Phnom Penh, Cambodia",
  store_hours: "Mon - Sun: 8:30 AM - 7:30 PM",
  store_hours_km: "ច័ន្ទ - អាទិត្យ: 8:30 ព្រឹក - 7:30 យប់",
  facebook_url: "",
  telegram_url: "https://t.me/realtechcomputer",
  instagram_url: "",
  tiktok_url: "",
  google_maps_api_key: "",
  youtube_video_url: "",
};

export function StoreFooter() {
  const { language } = useLanguage();
  const [branding, setBranding] = useState<BrandingData>(defaults);

  useEffect(() => {
    const loadBranding = () => {
      fetch(`${API_BASE_URL}/api/admin/settings/branding`)
        .then((r) => (r.ok ? r.json() : defaults))
        .then((d) => {
          const localHours = localStorage.getItem("rtc_store_hours");
          const localHoursKm = localStorage.getItem("rtc_store_hours_km");
          const localTiktok = localStorage.getItem("rtc_tiktok_url");
          const localFb = localStorage.getItem("rtc_facebook_url");
          const localIg = localStorage.getItem("rtc_instagram_url");
          setBranding({
            ...defaults,
            ...d,
            store_hours: d.store_hours || localHours || defaults.store_hours,
            store_hours_km: d.store_hours_km || localHoursKm || defaults.store_hours_km,
            tiktok_url: d.tiktok_url || localTiktok || defaults.tiktok_url,
            facebook_url: d.facebook_url || localFb || defaults.facebook_url,
            instagram_url: d.instagram_url || localIg || defaults.instagram_url,
          });
        })
        .catch(() => {
          const localHours = localStorage.getItem("rtc_store_hours");
          const localHoursKm = localStorage.getItem("rtc_store_hours_km");
          const localTiktok = localStorage.getItem("rtc_tiktok_url");
          const localFb = localStorage.getItem("rtc_facebook_url");
          const localIg = localStorage.getItem("rtc_instagram_url");
          setBranding((prev) => ({
            ...prev,
            store_hours: localHours || prev.store_hours,
            store_hours_km: localHoursKm || prev.store_hours_km,
            tiktok_url: localTiktok || prev.tiktok_url,
            facebook_url: localFb || prev.facebook_url,
            instagram_url: localIg || prev.instagram_url,
          }));
        });
    };

    loadBranding();

    const handleUpdate = (e: any) => {
      if (e.detail?.store_hours || e.detail?.store_hours_km) {
        setBranding((prev) => ({
          ...prev,
          store_hours: e.detail.store_hours ?? prev.store_hours,
          store_hours_km: e.detail.store_hours_km ?? prev.store_hours_km,
        }));
      } else {
        loadBranding();
      }
    };

    window.addEventListener("rtc_store_hours_updated", handleUpdate);
    window.addEventListener("rtc_branding_updated", loadBranding);
    window.addEventListener("storage", loadBranding);
    return () => {
      window.removeEventListener("rtc_store_hours_updated", handleUpdate);
      window.removeEventListener("rtc_branding_updated", loadBranding);
      window.removeEventListener("storage", loadBranding);
    };
  }, []);

  const socialLinks = [
    { url: branding.facebook_url, icon: Facebook, label: "Facebook", color: "hover:bg-blue-600" },
    { url: branding.telegram_url, icon: Send, label: "Telegram", color: "hover:bg-sky-500" },
    { url: branding.instagram_url, icon: Instagram, label: "Instagram", color: "hover:bg-pink-600" },
    {
      url: branding.tiktok_url,
      icon: TikTokIcon,
      label: "TikTok",
      color: "hover:bg-gray-900 dark:hover:bg-white dark:hover:text-black",
    },
  ].filter((s) => s.url);

  const popularCategories = [
    { label: language === "km" ? "Apple MacBook Pro & Air" : "Apple MacBook Series", href: "/#category-macbook" },
    { label: language === "km" ? "អេក្រង់ចល័ត 2K & 4K" : "Portable Monitors (2K / 4K)", href: "/#category-portable-monitor" },
    { label: language === "km" ? "គ្រឿងបន្លាស់ & Type-C Hubs" : "Accessories & Type-C Hubs", href: "/#category-accessories" },
    { label: language === "km" ? "សេវាដំឡើងកម្មវិធី macOS" : "macOS Software & Setup", href: "/#category-programs" },
  ];

  const customerServices = [
    { label: language === "km" ? "ប្រូម៉ូសិនពិសេស & គូប៉ុង" : "Promotions & Vouchers", href: "/promotions" },
    { label: language === "km" ? "ការបញ្ជាទិញរបស់ខ្ញុំ" : "My Orders", href: "/my-purchases" },
    { label: language === "km" ? "គោលការណ៍ធានា & ប្តូរ" : "Warranty & Return Policy", href: "#" },
    { label: language === "km" ? "វិធីសាស្រ្តដឹកជញ្ជូន" : "Shipping & Delivery Info", href: "#" },
    { label: language === "km" ? "ស្នើសុំសម្រង់តម្លៃ (Quotation)" : "Request Quotation", href: "#" },
  ];

  const hasMap = !!branding.google_maps_api_key;
  const hasVideo = !!branding.youtube_video_url;
  const currentYear = new Date().getFullYear();

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };
  const youtubeEmbedUrl = hasVideo ? getYouTubeEmbedUrl(branding.youtube_video_url) : null;

  const storeFeatures = [
    {
      icon: ShieldCheck,
      title: language === "km" ? "ធានាផលិតផលសុទ្ធ 100%" : "100% Genuine Products",
      desc: language === "km" ? "MacBook & អេក្រង់ចល័តគុណភាពខ្ពស់" : "MacBooks & High-End Displays",
    },
    {
      icon: Truck,
      title: language === "km" ? "ដឹកជញ្ជូនរហ័ស 25 ខេត្ត/ក្រុង" : "Fast Nationwide Delivery",
      desc: language === "km" ? "ភ្នំពេញ និងតាមបណ្តាខេត្តនានា" : "Phnom Penh & All Provinces",
    },
    {
      icon: Laptop,
      title: language === "km" ? "សេវាធានា & ជំនួយបច្ចេកទេស" : "Warranty & Tech Support",
      desc: language === "km" ? "ពិនិត្យ ដំឡើងកម្មវិធី និងថែទាំ" : "Setup, Installation & Care",
    },
    {
      icon: CreditCard,
      title: language === "km" ? "ទូទាត់ងាយស្រួល & សុវត្ថិភាព" : "Secure Payment Options",
      desc: language === "km" ? "Bakong KHQR, ABA, វីសា & សាច់ប្រាក់" : "KHQR, ABA, Cards & COD",
    },
  ];

  return (
    <footer id="store-footer-contact" className="relative mt-20">
      <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="bg-card/85 backdrop-blur-xl border-t border-border/50">
        {/* Top Trust Features Strip */}
        <div className="border-b border-border/40 bg-muted/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
              {storeFeatures.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div key={idx} className="flex items-center gap-3.5 p-2 rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary shadow-2xs">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground tracking-tight">{feat.title}</h4>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-18">
          {/* Main Store Footer Columns - Responds smoothly across mobile, tablet, and desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 mb-14">
            {/* Column 1: Store Brand Info */}
            <div className="sm:col-span-1 xl:col-span-4 space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-background shadow-sm border border-border/80 flex items-center justify-center shrink-0 p-1.5">
                  <img
                    src={branding.site_logo_url || realtechLogo}
                    alt={branding.site_name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = realtechLogo;
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-xl sm:text-2xl tracking-tight leading-tight">
                    {branding.site_name}
                  </h3>
                  <p className="text-xs sm:text-sm text-primary font-semibold mt-0.5">{branding.site_tagline}</p>
                </div>
              </div>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {language === "km"
                  ? "ហាងឯកទេសលក់ MacBook សុទ្ធ 100% និងអេក្រង់ចល័តគុណភាពខ្ពស់ ផ្តល់ជូនសេវាធានាត្រឹមត្រូវ និងជំនួយបច្ចេកទេសឥតគិតថ្លៃ។"
                  : "Your premier destination for genuine Apple MacBooks, high-performance portable displays, and professional IT & software installation services in Cambodia."}
              </p>

              {/* Social links */}
              {socialLinks.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider block mb-3">
                    {language === "km" ? "តាមដានបណ្តាញសង្គម" : "Connect With Us"}
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {socialLinks.map((s) => {
                      const Icon = s.icon;
                      return (
                        <a
                          key={s.label}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={s.label}
                          className={`w-10 h-10 rounded-xl bg-muted/80 border border-border/70 flex items-center justify-center text-muted-foreground transition-all duration-200 ${s.color} hover:text-white hover:shadow-md hover:scale-105`}
                        >
                          <Icon className="w-5 h-5" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Popular Categories */}
            <div className="sm:col-span-1 xl:col-span-2 space-y-4">
              <h4 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wider">
                {language === "km" ? "ប្រភេទពេញនិយម" : "Popular Categories"}
              </h4>
              <ul className="space-y-2.5">
                {popularCategories.map((item, idx) => (
                  <li key={idx}>
                    <a
                      href={item.href}
                      className="text-sm sm:text-base text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group py-0.5"
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Customer Care & Services */}
            <div className="sm:col-span-1 xl:col-span-2 space-y-4">
              <h4 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wider">
                {language === "km" ? "សេវាកម្មអតិថិជន" : "Customer Care"}
              </h4>
              <ul className="space-y-2.5">
                {customerServices.map((item, idx) => (
                  <li key={idx}>
                    <Link
                      to={item.href}
                      className="text-sm sm:text-base text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group py-0.5"
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Contact, Store Hours & Location */}
            <div className="sm:col-span-1 xl:col-span-4 space-y-4">
              <h4 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wider">
                {language === "km" ? "ព័ត៌មានហាង & ទំនាក់ទំនង" : "Store Info & Contact"}
              </h4>

              <div className="space-y-3.5">
                {/* Store Hours Card */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                  <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block">
                      {language === "km" ? "ម៉ោងធ្វើការប្រចាំថ្ងៃ" : "Store Hours"}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-foreground">
                      {language === "km"
                        ? (branding.store_hours_km || branding.store_hours || "ច័ន្ទ - អាទិត្យ: 8:30 ព្រឹក - 7:30 យប់")
                        : (branding.store_hours || "Mon - Sun: 8:30 AM - 7:30 PM")}
                    </span>
                  </div>
                </div>

                {/* Phone Card */}
                {branding.support_phone && (
                  <a
                    href={`tel:${branding.support_phone}`}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <Phone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block">
                        {language === "km" ? "លេខទូរស័ព្ទទំនាក់ទំនង (Hotline)" : "Phone / Call Support"}
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                        {branding.support_phone}
                      </span>
                    </div>
                  </a>
                )}

                {/* Telegram Card */}
                {branding.telegram_url && (
                  <a
                    href={branding.telegram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-xl bg-sky-500/5 border border-sky-500/20 hover:bg-sky-500/10 hover:border-sky-500/40 transition-all group"
                  >
                    <Send className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 block">
                        {language === "km" ? "ឆាតផ្ទាល់តាម Telegram" : "Chat on Telegram"}
                      </span>
                      <span className="text-sm sm:text-base font-bold text-sky-600 dark:text-sky-400 group-hover:underline">
                        @realtechcomputer
                      </span>
                    </div>
                  </a>
                )}

                {/* Email */}
                {branding.support_email && (
                  <a
                    href={`mailto:${branding.support_email}`}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block">
                        {language === "km" ? "អ៊ីមែលសេវាកម្ម" : "Email Inquiries"}
                      </span>
                      <span className="text-sm sm:text-base font-medium text-foreground group-hover:text-primary transition-colors">
                        {branding.support_email}
                      </span>
                    </div>
                  </a>
                )}

                {/* Address Card */}
                {branding.site_address && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                    <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block">
                        {language === "km" ? "អាសយដ្ឋានហាង" : "Store Location"}
                      </span>
                      <span className="text-sm sm:text-base font-medium text-foreground leading-snug">
                        {branding.site_address}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map & Video Section if available */}
          {(hasMap || youtubeEmbedUrl) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 pt-8 border-t border-border/50">
              {hasMap && (
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-rose-500" />
                    {language === "km" ? "ទីតាំងហាងជាក់ស្តែង (Google Maps)" : "Visit Our Store (Google Maps)"}
                  </h4>
                  <div className="rounded-2xl overflow-hidden border border-border/70 shadow-sm h-72 sm:h-80">
                    <iframe
                      title="Store Location"
                      src={`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(
                        branding.google_maps_api_key
                      )}&q=${encodeURIComponent(branding.site_address || branding.site_name)}&zoom=17`}
                      className="w-full h-full"
                      loading="lazy"
                      style={{ border: 0 }}
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {youtubeEmbedUrl && (
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    {language === "km" ? "វីដេអូបង្ហាញហាង & ផលិតផល" : "Store Tour & Highlights"}
                  </h4>
                  <div className="rounded-2xl overflow-hidden border border-border/70 shadow-sm h-72 sm:h-80">
                    <iframe
                      title="Store Video"
                      src={youtubeEmbedUrl}
                      className="w-full h-full"
                      loading="lazy"
                      style={{ border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Badges & Store Guarantees */}
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-5 pb-20 sm:pb-24 lg:pb-8">
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap justify-center md:justify-start">
              <span className="font-bold text-foreground">
                {language === "km" ? "វិធីសាស្ត្រទូទាត់:" : "Accepted Payments:"}
              </span>
              <span className="px-3.5 py-1.5 rounded-lg bg-muted/80 border border-border/60 font-bold text-xs sm:text-sm text-foreground shadow-2xs">
                ABA Pay
              </span>
              <span className="px-3.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 font-bold text-xs sm:text-sm text-red-600 dark:text-red-400 shadow-2xs">
                Bakong KHQR
              </span>
              <span className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 shadow-2xs">
                Cash on Delivery
              </span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground font-medium text-center md:text-right">
              © {currentYear} {branding.site_name}. {language === "km" ? "រក្សាសិទ្ធិគ្រប់យ៉ាង។" : "All rights reserved."}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
