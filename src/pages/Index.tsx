import { useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { HeroSlider } from "@/components/HeroSlider";
import { PopularApps } from "@/components/PopularApps";
import { CategoryProductSection } from "@/components/CategoryProductSection";
import { CategoryChips } from "@/components/CategoryChips";
import { PageTransition } from "@/components/PageTransition";
import { FloatingCartButton } from "@/components/FloatingCartButton";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";
import { PackageOpen } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StoreFooter } from "@/components/StoreFooter";
import { StoreDesktopTopBar } from "@/components/StoreDesktopTopBar";
import { StoreTrustBar } from "@/components/StoreTrustBar";
import { PromotionsSection } from "@/components/PromotionsSection";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { language } = useLanguage();
  const t = useTranslations();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  // Filter only active categories, sorted by sort_order
  const activeCategories = (Array.isArray(categories) ? categories : [])
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleCategoryChange = useCallback((slug: string) => {
    setActiveCategory(slug);
    setSidebarOpen(false);

    // If "all" view and selecting a specific category, scroll to that section
    if (slug !== "all") {
      setTimeout(() => {
        const el = document.getElementById(`category-${slug}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const renderContent = () => {
    // When searching, show all matching categories
    if (searchQuery) {
      return (
        <div className="space-y-8 mt-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {language === "km" ? `លទ្ធផលស្វែងរកសម្រាប់: "${searchQuery}"` : `Search Results for: "${searchQuery}"`}
            </h2>
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-primary font-medium hover:underline"
            >
              {language === "km" ? "សម្អាត" : "Clear Search"}
            </button>
          </div>
          {activeCategories.map((cat) => (
            <CategoryProductSection key={cat.id} category={cat} searchQuery={searchQuery} />
          ))}
        </div>
      );
    }

    // Promotions Tab selected
    if (activeCategory === "promotions") {
      return <PromotionsSection />;
    }

    // Specific category selected
    if (activeCategory !== "all") {
      const selectedCat = activeCategories.find((c) => c.slug === activeCategory);
      if (selectedCat) {
        return (
          <div className="mt-4">
            <CategoryProductSection category={selectedCat} searchQuery={searchQuery} limit={30} showEmpty />
          </div>
        );
      }
      return (
        <EmptyState
          icon={PackageOpen}
          title={language === "km" ? "មិនមានផលិតផលនៅឡើយ" : "No products available yet"}
          description={language === "km" ? "សូមពិនិត្យមើលពេលក្រោយ" : "Check back later for new products"}
        />
      );
    }

    // "all" — show popular + each category section
    return (
      <>
        <PopularApps />
        {categoriesLoading ? (
          <div className="space-y-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-6 w-40 mb-6" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="aspect-square rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          activeCategories.map((cat) => (
            <CategoryProductSection key={cat.id} category={cat} />
          ))
        )}
      </>
    );
  };

  return (
    <>
      <SEOHead url="/" />
      <div className={`min-h-screen bg-background flex flex-col ${language === "km" ? "font-khmer" : ""}`}>
        {/* Mobile Navigation Drawer Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile / Tablet Drawer Sidebar */}
        <Sidebar
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Desktop Top Store Info & Contact Ribbon */}
        <StoreDesktopTopBar />

        {/* Main Store Header */}
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
              isSidebarOpen={sidebarOpen}
              onCategorySelect={handleCategoryChange}
            />
          </div>
        </div>

        {/* Main Store Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Desktop & Mobile Hero Slider */}
          {!searchQuery && activeCategory === "all" && (
            <HeroSlider onSelectCategory={handleCategoryChange} />
          )}

          {/* Store Trust Value Propositions (Bento Cards) */}
          {!searchQuery && activeCategory === "all" && <StoreTrustBar />}

          {/* Quick Category Ribbon Filter */}
          {!searchQuery && activeCategories.length > 0 && (
            <CategoryChips
              categories={activeCategories}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
            />
          )}

          {/* Products Feed */}
          <PageTransition transitionKey={`${activeCategory}-${searchQuery}`}>
            {renderContent()}
          </PageTransition>
        </main>

        {/* Professional Store Footer */}
        <StoreFooter />

        {/* Floating Cart Button for Mobile / Quick Access */}
        <FloatingCartButton />
      </div>
    </>
  );
};

export default Index;
