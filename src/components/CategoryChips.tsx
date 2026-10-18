import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Category } from "@/lib/api";

interface CategoryChipsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (slug: string) => void;
}

export const CategoryChips = ({ categories, activeCategory, onCategoryChange }: CategoryChipsProps) => {
  const { language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active chip into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const chip = activeRef.current;
      const left = chip.offsetLeft - container.offsetLeft - 16;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeCategory]);

  const allItems = [
    { slug: "all", name: language === "km" ? "ទាំងអស់" : "All", icon_url: null, isPromo: false },
    { slug: "promotions", name: language === "km" ? "🔥 ប្រូម៉ូសិន" : "🔥 Promotions", icon_url: null, isPromo: true },
    ...categories.map(c => ({
      slug: c.slug,
      name: language === "km" && c.name_km ? c.name_km : c.name,
      icon_url: c.icon_url,
      isPromo: false,
    })),
  ];

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-y border-border/40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mt-4 mb-4">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {allItems.map((item) => {
          const isActive = activeCategory === item.slug;
          return (
            <button
              key={item.slug}
              ref={isActive ? activeRef : null}
              onClick={() => onCategoryChange(item.slug)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 whitespace-nowrap",
                isActive
                  ? item.isPromo
                    ? "bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 text-white border-transparent shadow-md font-bold"
                    : "bg-primary text-primary-foreground border-primary shadow-sm"
                  : item.isPromo
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 font-semibold"
                    : "bg-background text-foreground border-border hover:border-primary/50 hover:text-primary"
              )}
            >
              {item.icon_url && (
                <img src={item.icon_url} alt="" className="w-4 h-4 rounded object-contain" />
              )}
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
