import { couponsApi, appsApi, type Coupon, type App } from './api';

export interface PromotionCampaign {
  id: string;
  title: string;
  title_km?: string;
  subtitle?: string;
  subtitle_km?: string;
  badge: string;
  badge_km?: string;
  discount_text: string;
  code?: string;
  banner_url?: string;
  link_url?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  featured?: boolean;
  gradient: string;
  terms?: string;
}

const STORAGE_KEY = 'realtech_promotions_campaigns';

export const DEFAULT_CAMPAIGNS: PromotionCampaign[] = [
  {
    id: 'promo-1',
    title: 'Water Festival Mega Tech Sale',
    title_km: 'មហាប្រូម៉ូសិនបុណ្យអុំទូក',
    subtitle: 'Get up to 25% off on selected portable monitors & laptop accessories',
    subtitle_km: 'បញ្ចុះតម្លៃរហូតដល់ ២៥% លើអេក្រង់ចល័ត និងគ្រឿងបន្លាស់',
    badge: 'HOT DEAL',
    badge_km: 'លក់ដាច់ខ្លាំង',
    discount_text: 'Up to 25% OFF',
    code: 'WATER25',
    banner_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1200&q=80',
    link_url: '/promotions',
    is_active: true,
    featured: true,
    gradient: 'from-amber-500 via-rose-500 to-red-600',
    terms: 'Valid on all portable monitor orders above $150.',
  },
  {
    id: 'promo-2',
    title: 'MacBook Pro & Air Super Saver',
    title_km: 'ប្រូម៉ូសិនពិសេស MacBook Pro & Air',
    subtitle: 'Save $50 instantly on all genuine MacBook orders with free sleeve bag',
    subtitle_km: 'បញ្ចុះតម្លៃ $50 ភ្លាមៗលើរាល់ការបញ្ជាទិញ MacBook ជាមួយកាតាបថែមឥតគិតថ្លៃ',
    badge: 'APPLE SPECIAL',
    badge_km: 'ពិសេស APPLE',
    discount_text: '$50 OFF',
    code: 'MACBOOK50',
    banner_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
    link_url: '/promotions',
    is_active: true,
    featured: true,
    gradient: 'from-blue-600 via-indigo-600 to-purple-700',
    terms: 'Minimum purchase of $500 required.',
  },
  {
    id: 'promo-3',
    title: 'Free Express Courier Delivery',
    title_km: 'ដឹកជញ្ជូនរហ័សឥតគិតថ្លៃ',
    subtitle: 'Free delivery within Phnom Penh for all orders above $50',
    subtitle_km: 'ដឹកជញ្ជូនឥតគិតថ្លៃក្នុងក្រុងភ្នំពេញ សម្រាប់ការកុម្ម៉ង់ចាប់ពី $50 ឡើង',
    badge: 'FREE SHIPPING',
    badge_km: 'ដឹកឥតគិតថ្លៃ',
    discount_text: 'FREE DELIVERY',
    code: 'FREEDELIVERY',
    banner_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
    link_url: '/promotions',
    is_active: true,
    featured: false,
    gradient: 'from-emerald-500 via-teal-600 to-cyan-700',
    terms: 'Applies automatically at checkout or enter code.',
  },
];

export const promotionsApi = {
  getCampaigns: (): PromotionCampaign[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CAMPAIGNS));
        return DEFAULT_CAMPAIGNS;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_CAMPAIGNS;
    }
  },

  getActiveCampaigns: (): PromotionCampaign[] => {
    return promotionsApi.getCampaigns().filter((c) => c.is_active);
  },

  saveCampaign: (campaign: Partial<PromotionCampaign> & { title: string }): PromotionCampaign => {
    const list = promotionsApi.getCampaigns();
    if (campaign.id) {
      const index = list.findIndex((c) => c.id === campaign.id);
      if (index !== -1) {
        list[index] = { ...list[index], ...campaign } as PromotionCampaign;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        return list[index];
      }
    }
    const newCampaign: PromotionCampaign = {
      id: `promo-${Date.now()}`,
      title: campaign.title,
      title_km: campaign.title_km || '',
      subtitle: campaign.subtitle || '',
      subtitle_km: campaign.subtitle_km || '',
      badge: campaign.badge || 'PROMO',
      badge_km: campaign.badge_km || 'ប្រូម៉ូសិន',
      discount_text: campaign.discount_text || 'SPECIAL OFFER',
      code: campaign.code?.toUpperCase() || '',
      banner_url: campaign.banner_url || '',
      link_url: campaign.link_url || '/promotions',
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
      is_active: campaign.is_active !== undefined ? campaign.is_active : true,
      featured: !!campaign.featured,
      gradient: campaign.gradient || 'from-primary via-indigo-600 to-violet-600',
      terms: campaign.terms || '',
    };
    list.unshift(newCampaign);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return newCampaign;
  },

  deleteCampaign: (id: string): void => {
    const list = promotionsApi.getCampaigns().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  },

  toggleCampaign: (id: string): PromotionCampaign | null => {
    const list = promotionsApi.getCampaigns();
    const item = list.find((c) => c.id === id);
    if (item) {
      item.is_active = !item.is_active;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return item;
    }
    return null;
  },

  resetDefaultCampaigns: (): PromotionCampaign[] => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CAMPAIGNS));
    return DEFAULT_CAMPAIGNS;
  },
};
