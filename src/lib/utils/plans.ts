export const PLANS = [
  {
    id: 'basic', price: 29, popular: false,
    nameEn: 'Basic', nameAr: 'أساسي',
    descEn: 'Up to 10 units · 15 tenants', descAr: 'حتى 10 وحدات · 15 مستأجر',
    maxUnits: 10, maxTenants: 15,
    featuresEn: ['10 units', '15 tenants', 'Basic reports', 'Email support', 'PDF export'],
    featuresAr: ['10 وحدات', '15 مستأجر', 'تقارير أساسية', 'دعم بالبريد', 'تصدير PDF'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID ?? '',
  },
  {
    id: 'pro', price: 79, popular: true,
    nameEn: 'Pro', nameAr: 'احترافي',
    descEn: 'Up to 50 units · 100 tenants', descAr: 'حتى 50 وحدة · 100 مستأجر',
    maxUnits: 50, maxTenants: 100,
    featuresEn: ['50 units', '100 tenants', 'Advanced reports', 'Priority support', 'Maintenance team', 'PDF export', 'Online rent payment'],
    featuresAr: ['50 وحدة', '100 مستأجر', 'تقارير متقدمة', 'دعم أولوية', 'فريق صيانة', 'تصدير PDF', 'دفع الإيجار أونلاين'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
  },
  {
    id: 'enterprise', price: 199, popular: false,
    nameEn: 'Enterprise', nameAr: 'مؤسسي',
    descEn: 'Unlimited units & tenants', descAr: 'غير محدود',
    maxUnits: -1, maxTenants: -1,
    featuresEn: ['Unlimited', 'Smart analytics', 'Dedicated manager', 'API access', 'Full customization', 'SLA guarantee'],
    featuresAr: ['غير محدود', 'تحليلات ذكية', 'مدير مخصص', 'API access', 'تخصيص كامل', 'ضمان مستوى الخدمة'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID ?? '',
  },
]
