import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Laptop, Monitor, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { slidersApi } from "@/lib/api";

const fallbackSlides = [
  {
    id: 1,
    badge: "NEW ARRIVAL",
    badge_km: "មកដល់ថ្មី",
    title: "MacBook Pro M4 & M4 Max",
    title_km: "MacBook Pro M4 & M4 Max",
    subtitle: "Phenomenal performance with Liquid Retina XDR, up to 24-core GPU & all-day battery life.",
    subtitle_km: "កម្លាំងខ្លាំងអស្ចារ្យជាមួយអេក្រង់ Liquid Retina XDR, GPU រហូតដល់ 24-core និងថាមពលថ្មពេញមួយថ្ងៃ។",
    image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1400&h=650&fit=crop&q=90",
    gradient: "from-slate-950/90 via-slate-900/60 to-transparent",
    accent_color: "#007AFF",
    link_url: "",
  },
  {
    id: 2,
    badge: "BEST SELLER",
    badge_km: "លក់ដាច់បំផុត",
    title: "Ultra-Slim 2K & 4K Portable Monitors",
    title_km: "អេក្រង់ចល័ត 2K & 4K Ultra-Slim",
    subtitle: "Boost your mobile workspace. 100% sRGB IPS & OLED with USB-C one-cable connection.",
    subtitle_km: "ពង្រីកប្រសិទ្ធភាពការងារគ្រប់ទីកន្លែង។ កម្រិតពណ៌ 100% sRGB និងតភ្ជាប់ងាយស្រួលតាម USB-C។",
    image_url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1400&h=650&fit=crop&q=90",
    gradient: "from-slate-950/90 via-slate-900/60 to-transparent",
    accent_color: "#10B981",
    link_url: "",
  },
];

const INTERVAL = 5500;

interface HeroSliderProps {
  onSelectCategory?: (categorySlug: string) => void;
}

export const HeroSlider = ({ onSelectCategory }: HeroSliderProps) => {
  const [slides, setSlides] = useState<typeof fallbackSlides>(fallbackSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch sliders from API
  useEffect(() => {
    slidersApi
      .getActive()
      .then((res) => {
        if (res.sliders && res.sliders.length > 0) {
          setSlides(
            res.sliders.map((s) => ({
              id: s.id,
              title: s.title || "",
              title_km: s.title_km || "",
              subtitle: s.subtitle || "",
              subtitle_km: s.subtitle_km || "",
              badge: s.badge || "",
              badge_km: s.badge_km || "",
              image_url: s.image_url,
              gradient: s.gradient || "from-slate-950/90 via-slate-900/60 to-transparent",
              accent_color: s.accent_color || "#007AFF",
              link_url: s.link_url || "",
            }))
          );
        }
      })
      .catch(() => {
        /* use fallback */
      });
  }, []);

  const goToSlide = (index: number) => {
    if (animating || index === currentSlide) return;
    setPrevSlide(currentSlide);
    setAnimating(true);
    setCurrentSlide(index);
    setProgress(0);
    setTimeout(() => setAnimating(false), 600);
  };

  const nextSlide = () => goToSlide((currentSlide + 1) % slides.length);
  const prevSlideBtn = () => goToSlide((currentSlide - 1 + slides.length) % slides.length);

  const handleSlideClick = () => {
    const slide = slides[currentSlide];
    if (slide.link_url) {
      if (slide.link_url.startsWith("http")) {
        window.open(slide.link_url, "_blank");
      } else {
        navigate(slide.link_url);
      }
    }
  };

  // Progress bar + auto-advance
  useEffect(() => {
    if (slides.length <= 1) return;
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    const step = 100 / (INTERVAL / 50);
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + step, 100));
    }, 50);

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        setPrevSlide(prev);
        setAnimating(true);
        setTimeout(() => setAnimating(false), 600);
        setProgress(0);
        return (prev + 1) % slides.length;
      });
    }, INTERVAL);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSlide, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[currentSlide];
  const prev = prevSlide !== null ? slides[prevSlide] : null;

  return (
    <div className="mt-4 mb-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Hero Slider (Takes 8 cols on desktop) */}
        <div
          className={`lg:col-span-8 relative group overflow-hidden border border-border/80 shadow-md rounded-2xl ${
            slide.link_url ? "cursor-pointer" : ""
          }`}
          onClick={handleSlideClick}
        >
          <div className="relative h-60 sm:h-72 md:h-84 lg:h-96">
            {/* Previous slide (fades out) */}
            {prev && animating && (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${prev.image_url})`,
                  animation: "hero-fade-out 0.6s ease forwards",
                }}
              />
            )}

            {/* Current slide image (fades in) */}
            <div
              key={currentSlide}
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${slide.image_url})`,
                animation: "hero-fade-in 0.7s ease forwards",
              }}
            />

            {/* Gradient overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`}
              style={{ transition: "opacity 0.6s ease" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Content */}
            <div
              key={`content-${currentSlide}`}
              className="absolute inset-0 flex flex-col justify-end p-5 sm:p-7 md:p-8 z-10"
              style={{ animation: "hero-content-up 0.6s ease forwards" }}
            >
              {(slide.badge || slide.badge_km) && (
                <span
                  className="inline-flex items-center gap-1 self-start text-[11px] font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider text-white backdrop-blur-md shadow-xs"
                  style={{
                    backgroundColor: slide.accent_color,
                    boxShadow: `0 0 16px ${slide.accent_color}60`,
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  {language === "km" ? slide.badge_km || slide.badge : slide.badge}
                </span>
              )}

              {(slide.title || slide.title_km) && (
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight drop-shadow-md">
                  {language === "km" ? slide.title_km || slide.title : slide.title}
                </h2>
              )}
              {(slide.subtitle || slide.subtitle_km) && (
                <p className="text-xs sm:text-sm md:text-base text-white/85 mb-5 max-w-xl leading-relaxed">
                  {language === "km" ? slide.subtitle_km || slide.subtitle : slide.subtitle}
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectCategory) {
                      onSelectCategory("all");
                    }
                  }}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
                  style={{
                    backgroundColor: slide.accent_color,
                    boxShadow: `0 4px 14px ${slide.accent_color}50`,
                  }}
                >
                  <span>{language === "km" ? "ទិញឥឡូវនេះ" : "Shop Store Deals"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Arrow buttons */}
            {slides.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevSlideBtn();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 border border-white/20 hover:scale-110 z-20"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextSlide();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 border border-white/20 hover:scale-110 z-20"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Slide counter */}
            {slides.length > 1 && (
              <div className="absolute top-4 right-5 text-[11px] font-semibold text-white/80 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 z-20 tabular-nums">
                {currentSlide + 1} / {slides.length}
              </div>
            )}
          </div>

          {/* Dot indicators & progress bar */}
          {slides.length > 1 && (
            <div className="absolute bottom-4 right-5 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(index);
                  }}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    height: "5px",
                    width: index === currentSlide ? "22px" : "6px",
                    backgroundColor:
                      index === currentSlide ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop Side Promo Feature Cards (Visible on desktop lg+) */}
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
          {/* Promo Card 1: MacBooks */}
          <div
            onClick={() => onSelectCategory?.("macbook")}
            className="flex-1 relative rounded-2xl overflow-hidden border border-border/80 shadow-md group cursor-pointer bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 flex flex-col justify-between hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-500"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&fit=crop&q=80')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-600/90 text-white uppercase tracking-wider mb-2">
                <Laptop className="w-3 h-3" />
                {language === "km" ? "Apple MacBooks" : "Apple MacBooks"}
              </span>
              <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                MacBook Pro & Air Series
              </h3>
              <p className="text-[12px] text-white/70 mt-1 line-clamp-2">
                {language === "km"
                  ? "ម៉ាស៊ីនសុទ្ធ 100% ធានាគុណភាពផ្លូវការ និងសេវាដំឡើងកម្មវិធីដោយឥតគិតថ្លៃ"
                  : "M2, M3 & M4 Pro/Max with Apple Silicon speed, Retina displays and store warranty."}
              </p>
            </div>

            <div className="relative z-10 pt-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                {language === "km" ? "មើលផលិតផល" : "Explore MacBooks"}
                <ArrowRight className="w-3 h-3" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-white/90">
                {language === "km" ? "មានស្តុក" : "In Stock"}
              </span>
            </div>
          </div>

          {/* Promo Card 2: Portable Monitors */}
          <div
            onClick={() => onSelectCategory?.("portable-monitor")}
            className="flex-1 relative rounded-2xl overflow-hidden border border-border/80 shadow-md group cursor-pointer bg-gradient-to-br from-zinc-900 to-zinc-950 text-white p-5 flex flex-col justify-between hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-500"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&fit=crop&q=80')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600/90 text-white uppercase tracking-wider mb-2">
                <Monitor className="w-3 h-3" />
                {language === "km" ? "អេក្រង់ចល័ត" : "Portable Displays"}
              </span>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                15.6" - 17.3" 2K & 4K IPS/OLED
              </h3>
              <p className="text-[12px] text-white/70 mt-1 line-clamp-2">
                {language === "km"
                  ? "អេក្រង់ស្តើង ស្រាល តភ្ជាប់តាម Type-C និង HDMI សម្រាប់ធ្វើការ និងលេងហ្គេម"
                  : "Ultra-thin portable monitors for MacBooks, laptops, Dex and gaming consoles."}
              </p>
            </div>

            <div className="relative z-10 pt-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                {language === "km" ? "មើលអេក្រង់ចល័ត" : "Explore Monitors"}
                <ArrowRight className="w-3 h-3" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-white/90">
                {language === "km" ? "តម្លៃពិសេស" : "Top Deals"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hero-fade-in {
          from { opacity: 0; transform: scale(1.03); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes hero-fade-out {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.97); }
        }
        @keyframes hero-content-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
