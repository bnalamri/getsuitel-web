export const PLANS = [
  {
    id: 'basic', price: 29, popular: false,
    nameEn: 'Basic', nameAr: 'أساسي',
    descEn: 'Up to 2 properties · 10 units · 15 tenants', descAr: 'حتى عقارين · 10 وحدات · 15 مستأجر',
    maxProperties: 2, maxUnits: 10, maxTenants: 15,
    featuresEn: ['2 properties', '10 units', '15 tenants', 'Basic reports', 'Email support', 'PDF export'],
    featuresAr: ['عقارين', '10 وحدات', '15 مستأجر', 'تقارير أساسية', 'دعم بالبريد', 'تصدير PDF'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID ?? '',
  },
  {
    id: 'pro', price: 79, popular: true,
    nameEn: 'Pro', nameAr: 'احترافي',
    descEn: 'Up to 10 properties · 50 units · 75 tenants', descAr: 'حتى 10 عقارات · 50 وحدة · 75 مستأجر',
    maxProperties: 10, maxUnits: 50, maxTenants: 75,
    featuresEn: ['10 properties', '50 units', '75 tenants', 'Advanced reports', 'Priority support', 'Maintenance team', 'PDF export', 'Online rent payment'],
    featuresAr: ['10 عقارات', '50 وحدة', '75 مستأجر', 'تقارير متقدمة', 'دعم أولوية', 'فريق صيانة', 'تصدير PDF', 'دفع الإيجار أونلاين'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
  },
  {
    id: 'enterprise', price: 199, popular: false,
    nameEn: 'Enterprise', nameAr: 'مؤسسي',
    descEn: 'Up to 20 properties · Unlimited units & tenants', descAr: 'حتى 20 عقاراً · وحدات ومستأجرون غير محدودين',
    maxProperties: 20, maxUnits: -1, maxTenants: -1,
    featuresEn: ['20 properties', 'Unlimited units', 'Unlimited tenants', 'Smart analytics', 'Dedicated manager', 'API access', 'Full customization', 'SLA guarantee'],
    featuresAr: ['20 عقاراً', 'وحدات غير محدودة', 'مستأجرون غير محدودين', 'تحليلات ذكية', 'مدير مخصص', 'API access', 'تخصيص كامل', 'ضمان مستوى الخدمة'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID ?? '',
  },
]
