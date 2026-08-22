// ── DB Plan type (from subscription_plans table) ──────────────────────────
export type DbPlan = {
  id: string
  slug: string
  name_en: string
  name_ar: string
  desc_en: string
  desc_ar: string
  price_monthly: number
  stripe_price_id: string
  max_properties: number   // -1 = unlimited
  max_units: number
  max_tenants: number
  max_staff: number
  trial_days: number
  features_en: string[]
  features_ar: string[]
  is_popular: boolean
  is_active: boolean
  sort_order: number
}

// ── Static fallback (used when API hasn't loaded yet) ─────────────────────
// These values mirror what's seeded in the DB.
// The DB is the single source of truth — update prices via /dashboard/admin/plans.
export const PLANS: DbPlan[] = [
  {
    id: 'static-basic', slug: 'basic',
    name_en: 'Basic', name_ar: 'أساسي',
    desc_en: 'Up to 2 properties · 10 units · 15 tenants',
    desc_ar: 'حتى عقارين · 10 وحدات · 15 مستأجر',
    price_monthly: 29, stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID ?? '',
    max_properties: 2, max_units: 10, max_tenants: 15, max_staff: 2,
    trial_days: 30, is_popular: false, is_active: true, sort_order: 1,
    features_en: ['2 properties','10 units','15 tenants','Basic reports','Email support','PDF export'],
    features_ar: ['عقارين','10 وحدات','15 مستأجر','تقارير أساسية','دعم بالبريد','تصدير PDF'],
  },
  {
    id: 'static-pro', slug: 'pro',
    name_en: 'Pro', name_ar: 'احترافي',
    desc_en: 'Up to 10 properties · 50 units · 75 tenants',
    desc_ar: 'حتى 10 عقارات · 50 وحدة · 75 مستأجر',
    price_monthly: 79, stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
    max_properties: 10, max_units: 50, max_tenants: 75, max_staff: 10,
    trial_days: 30, is_popular: true, is_active: true, sort_order: 2,
    features_en: ['10 properties','50 units','75 tenants','Advanced reports','Priority support','Maintenance team','PDF export','Online rent payment'],
    features_ar: ['10 عقارات','50 وحدة','75 مستأجر','تقارير متقدمة','دعم أولوية','فريق صيانة','تصدير PDF','دفع الإيجار أونلاين'],
  },
  {
    id: 'static-enterprise', slug: 'enterprise',
    name_en: 'Enterprise', name_ar: 'مؤسسي',
    desc_en: 'Up to 20 properties · Unlimited units & tenants',
    desc_ar: 'حتى 20 عقاراً · وحدات ومستأجرون غير محدودين',
    price_monthly: 199, stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID ?? '',
    max_properties: 20, max_units: -1, max_tenants: -1, max_staff: -1,
    trial_days: 30, is_popular: false, is_active: true, sort_order: 3,
    features_en: ['20 properties','Unlimited units','Unlimited tenants','Smart analytics','Dedicated manager','API access','Full customization','SLA guarantee'],
    features_ar: ['20 عقاراً','وحدات غير محدودة','مستأجرون غير محدودين','تحليلات ذكية','مدير مخصص','API access','تخصيص كامل','ضمان مستوى الخدمة'],
  },
]

// ── Hook helper for client components ─────────────────────────────────────
// Usage: const plans = usePlans()
// Returns static PLANS immediately, then updates from API.
// Import as: import { usePlans } from '@/lib/utils/plans'
export async function fetchPlans(): Promise<DbPlan[]> {
  try {
    const res = await fetch('/api/plans', { next: { revalidate: 300 } })
    if (!res.ok) return PLANS
    return await res.json()
  } catch {
    return PLANS
  }
}
