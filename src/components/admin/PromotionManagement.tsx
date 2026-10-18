import { useState, useEffect } from 'react';
import { 
  Flame, Plus, Trash2, Edit3, Tag, Percent, Calendar, Sparkles, Check, 
  Eye, RefreshCw, AlertCircle, ShoppingBag, Copy, ArrowRight, Layers,
  ExternalLink, CheckCircle2, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminDialog } from './AdminDialog';
import { CouponManagement } from './CouponManagement';
import { toast } from 'sonner';
import { promotionsApi, type PromotionCampaign } from '@/lib/promotions';
import { couponsApi, appsApi, type Coupon, type App } from '@/lib/api';

interface PromotionManagementProps {
  defaultTab?: 'campaigns' | 'coupons' | 'products';
}

export const PromotionManagement = ({ defaultTab = 'campaigns' }: PromotionManagementProps) => {
  const [activeSubTab, setActiveSubTab] = useState<'campaigns' | 'coupons' | 'products'>(defaultTab);
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  // Campaign Form Modal
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PromotionCampaign | null>(null);
  const [campaignForm, setCampaignForm] = useState<Partial<PromotionCampaign>>({
    title: '',
    title_km: '',
    subtitle: '',
    subtitle_km: '',
    badge: 'HOT DEAL',
    badge_km: 'ពិសេស',
    discount_text: '20% OFF',
    code: '',
    banner_url: '',
    link_url: '/promotions',
    start_date: '',
    end_date: '',
    is_active: true,
    featured: true,
    gradient: 'from-amber-500 via-rose-500 to-red-600',
    terms: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const campList = promotionsApi.getCampaigns();
      setCampaigns(campList);

      const couponsData = await couponsApi.getAll().catch(() => ({ coupons: [] }));
      setCoupons(couponsData.coupons || []);

      const appsData = await appsApi.getAll({ limit: 100 }).catch(() => ({ apps: [] }));
      setProducts(appsData.apps || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNewCampaign = () => {
    setEditingCampaign(null);
    setCampaignForm({
      title: '',
      title_km: '',
      subtitle: '',
      subtitle_km: '',
      badge: 'HOT DEAL',
      badge_km: 'ពិសេស',
      discount_text: '15% OFF',
      code: '',
      banner_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1200&q=80',
      link_url: '/promotions',
      start_date: '',
      end_date: '',
      is_active: true,
      featured: true,
      gradient: 'from-amber-500 via-rose-500 to-red-600',
      terms: '',
    });
    setShowCampaignModal(true);
  };

  const handleEditCampaign = (camp: PromotionCampaign) => {
    setEditingCampaign(camp);
    setCampaignForm({ ...camp });
    setShowCampaignModal(true);
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.title?.trim()) {
      toast.error('Campaign title is required');
      return;
    }

    const saved = promotionsApi.saveCampaign({
      ...campaignForm,
      id: editingCampaign?.id,
      title: campaignForm.title.trim(),
    });

    toast.success(editingCampaign ? 'Campaign updated successfully' : 'New campaign launched');
    setShowCampaignModal(false);
    setCampaigns(promotionsApi.getCampaigns());
  };

  const handleDeleteCampaign = (id: string) => {
    if (!confirm('Are you sure you want to remove this promotion campaign?')) return;
    promotionsApi.deleteCampaign(id);
    toast.success('Campaign removed');
    setCampaigns(promotionsApi.getCampaigns());
  };

  const handleToggleCampaign = (id: string) => {
    const updated = promotionsApi.toggleCampaign(id);
    if (updated) {
      toast.success(updated.is_active ? 'Campaign activated' : 'Campaign paused');
      setCampaigns(promotionsApi.getCampaigns());
    }
  };

  // Filter products that have discounts or promotional status
  const promoProducts = products.filter((p) => {
    const hasDiscount = p.variants?.some((v) => {
      // compare if variant has discount or product is featured
      return v.price_adjustment > 0;
    });
    return p.is_featured || p.is_popular || hasDiscount;
  });

  const activeCampaignsCount = campaigns.filter((c) => c.is_active).length;
  const activeCouponsCount = coupons.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Promotions & Discounts
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage promotional campaigns, store discount coupons, and deal highlights
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {activeSubTab === 'campaigns' && (
            <Button
              size="sm"
              onClick={handleOpenNewCampaign}
              className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </Button>
          )}

          <a
            href="/promotions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-primary" />
            View Frontend
          </a>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-border/60 bg-card flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-foreground">{activeCampaignsCount}</div>
            <div className="text-xs text-muted-foreground font-medium">Active Campaigns</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-foreground">{activeCouponsCount}</div>
            <div className="text-xs text-muted-foreground font-medium">Active Coupons</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-foreground">{promoProducts.length}</div>
            <div className="text-xs text-muted-foreground font-medium">Promotional Products</div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs
        value={activeSubTab}
        onValueChange={(v) => setActiveSubTab(v as any)}
        className="space-y-4"
      >
        <TabsList className="grid w-full sm:w-auto grid-cols-3 h-auto p-1 bg-muted/60">
          <TabsTrigger value="campaigns" className="gap-2 py-2 text-xs font-semibold">
            <Flame className="w-4 h-4 text-amber-500" />
            Campaigns & Banners ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="coupons" className="gap-2 py-2 text-xs font-semibold">
            <Tag className="w-4 h-4 text-emerald-500" />
            Coupons & Vouchers ({coupons.length})
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2 py-2 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Promo Products ({promoProducts.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Campaigns */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Active Promotional Banners</h2>
              <p className="text-xs text-muted-foreground">These campaigns appear in the frontend promotion tab, banner carousel, and deals page.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                promotionsApi.resetDefaultCampaigns();
                setCampaigns(promotionsApi.getCampaigns());
                toast.success('Campaigns reset to defaults');
              }}
              className="text-xs"
            >
              Reset Defaults
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className={`relative rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  camp.is_active ? 'bg-card border-border shadow-xs' : 'bg-muted/40 border-border/40 opacity-70'
                }`}
              >
                {/* Banner Header with Gradient */}
                <div className={`p-4 bg-gradient-to-r ${camp.gradient} text-white`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/30 backdrop-blur-md">
                      {camp.badge}
                    </span>
                    <Badge variant={camp.is_active ? "default" : "secondary"} className="text-[10px] bg-white/20 text-white border-0">
                      {camp.is_active ? "Live" : "Paused"}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold mt-2 leading-tight drop-shadow-xs">{camp.title}</h3>
                  {camp.title_km && (
                    <p className="text-xs opacity-90 font-khmer mt-0.5">{camp.title_km}</p>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-black bg-white/25 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                      {camp.discount_text}
                    </span>
                    {camp.code && (
                      <span className="text-xs font-mono bg-black/40 px-2 py-0.5 rounded">
                        Code: {camp.code}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {camp.subtitle || 'No subtitle provided'}
                  </p>

                  {camp.terms && (
                    <p className="text-[11px] text-muted-foreground/80 italic border-l-2 border-primary/40 pl-2">
                      {camp.terms}
                    </p>
                  )}

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={camp.is_active}
                        onCheckedChange={() => handleToggleCampaign(camp.id)}
                        id={`switch-${camp.id}`}
                      />
                      <Label htmlFor={`switch-${camp.id}`} className="text-xs cursor-pointer">
                        {camp.is_active ? 'Active' : 'Disabled'}
                      </Label>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCampaign(camp)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCampaign(camp.id)}
                        className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Coupons */}
        <TabsContent value="coupons" className="space-y-4">
          <CouponManagement />
        </TabsContent>

        {/* Tab 3: Products on Promotion */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Discounted & Promo Products</h2>
              <p className="text-xs text-muted-foreground">Products highlighted with special offers or featured promotional pricing</p>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Showing {promoProducts.length} items
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {promoProducts.map((product) => {
              const defaultVariant = product.variants?.find((v) => v.is_default) || product.variants?.[0];
              const price = defaultVariant ? Number(defaultVariant.price_adjustment) : 0;
              return (
                <div
                  key={product.id}
                  className="p-3 rounded-xl border border-border/60 bg-card hover:border-primary/50 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30">
                      {product.icon_url ? (
                        <img
                          src={product.icon_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ShoppingBag className="w-8 h-8 opacity-40" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                        PROMO
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-foreground line-clamp-1">{product.name}</h4>
                    {product.name_km && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 font-khmer">{product.name_km}</p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-sm font-bold text-destructive">${price.toFixed(2)}</span>
                    <a
                      href={`/${product.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Campaign Create/Edit Dialog */}
      <AdminDialog
        open={showCampaignModal}
        onOpenChange={setShowCampaignModal}
        title={editingCampaign ? "Edit Promotional Campaign" : "Launch Promotional Campaign"}
        description="Configure banner headline, discount offer, promotional code, and styling."
      >
        <form onSubmit={handleSaveCampaign} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Campaign Title (English) *</Label>
              <Input
                value={campaignForm.title || ''}
                onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                placeholder="e.g. Summer Mega Tech Sale"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Campaign Title (Khmer)</Label>
              <Input
                value={campaignForm.title_km || ''}
                onChange={(e) => setCampaignForm({ ...campaignForm, title_km: e.target.value })}
                placeholder="ឧ. មហាប្រូម៉ូសិនរដូវក្តៅ"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Subtitle / Details (English)</Label>
              <Input
                value={campaignForm.subtitle || ''}
                onChange={(e) => setCampaignForm({ ...campaignForm, subtitle: e.target.value })}
                placeholder="e.g. Save 15% on all monitors"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subtitle / Details (Khmer)</Label>
              <Input
                value={campaignForm.subtitle_km || ''}
                onChange={(e) => setCampaignForm({ ...campaignForm, subtitle_km: e.target.value })}
                placeholder="ឧ. បញ្ចុះតម្លៃ ១៥% លើអេក្រង់គ្រប់ប្រភេទ"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Discount Text *</Label>
              <Input
                value={campaignForm.discount_text || ''}
                onChange={(e) => setCampaignForm({ ...campaignForm, discount_text: e.target.value })}
                placeholder="e.g. 20% OFF or $50 OFF"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Badge Label</Label>
              <Input
                value={campaignForm.badge || ''}
                onChange={(e) => setCampaignForm({ ...campaignForm, badge: e.target.value })}
                placeholder="e.g. HOT DEAL, LIMITED"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Promo Coupon Code</Label>
              <Input
                value={campaignForm.code || ''}
                onChange={(e) => setCampaignForm({ ...campaignForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUMMER20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Banner Image URL</Label>
              <Input
                value={campaignForm.banner_url || ''}
                onChange={(e) => setCampaignForm({ ...campaignForm, banner_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Link URL</Label>
              <Input
                value={campaignForm.link_url || ''}
                onChange={(e) => setCampaignForm({ ...campaignForm, link_url: e.target.value })}
                placeholder="/promotions"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Gradient Style</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { name: 'Amber Red', val: 'from-amber-500 via-rose-500 to-red-600' },
                { name: 'Royal Blue', val: 'from-blue-600 via-indigo-600 to-purple-700' },
                { name: 'Emerald', val: 'from-emerald-500 via-teal-600 to-cyan-700' },
                { name: 'Dark Purple', val: 'from-purple-800 via-violet-900 to-slate-900' },
              ].map((grad) => (
                <button
                  type="button"
                  key={grad.val}
                  onClick={() => setCampaignForm({ ...campaignForm, gradient: grad.val })}
                  className={`h-8 rounded-lg bg-gradient-to-r ${grad.val} text-[10px] font-bold text-white flex items-center justify-center border-2 transition-all ${
                    campaignForm.gradient === grad.val ? 'border-primary ring-2 ring-primary/40' : 'border-transparent'
                  }`}
                >
                  {grad.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Terms & Conditions</Label>
            <Input
              value={campaignForm.terms || ''}
              onChange={(e) => setCampaignForm({ ...campaignForm, terms: e.target.value })}
              placeholder="e.g. Valid while supplies last. Minimum order $100."
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="flex items-center gap-2">
              <Switch
                checked={campaignForm.is_active}
                onCheckedChange={(checked) => setCampaignForm({ ...campaignForm, is_active: checked })}
                id="active-toggle"
              />
              <Label htmlFor="active-toggle" className="text-xs cursor-pointer">
                Campaign Active
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCampaignModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                {editingCampaign ? 'Save Changes' : 'Launch Campaign'}
              </Button>
            </div>
          </div>
        </form>
      </AdminDialog>
    </div>
  );
};
