-- ── subscription_plans table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug           text        NOT NULL UNIQUE,          -- 'basic' | 'pro' | 'enterprise'
  name_en        text        NOT NULL,
  name_ar        text        NOT NULL DEFAULT '',
  desc_en        text        NOT NULL DEFAULT '',
  desc_ar        text        NOT NULL DEFAULT '',
  price_monthly  numeric(10,2) NOT NULL,
  stripe_price_id text       DEFAULT '',
  max_properties int         NOT NULL DEFAULT -1,      -- -1 = unlimited
  max_units      int         NOT NULL DEFAULT -1,
  max_tenants    int         NOT NULL DEFAULT -1,
  max_staff      int         NOT NULL DEFAULT -1,
  trial_days     int         NOT NULL DEFAULT 30,
  features_en    jsonb       NOT NULL DEFAULT '[]',
  features_ar    jsonb       NOT NULL DEFAULT '[]',
  is_popular     boolean     NOT NULL DEFAULT false,
  is_active      boolean     NOT NULL DEFAULT true,
  sort_order     int         NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Seed current plans
INSERT INTO subscription_plans
  (slug, name_en, name_ar, desc_en, desc_ar, price_monthly,
   max_properties, max_units, max_tenants, max_staff,
   is_popular, sort_order, features_en, features_ar)
VALUES
(
  'basic', 'Basic', 'أساسي',
  'Up to 2 properties · 10 units · 15 tenants',
  'حتى عقارين · 10 وحدات · 15 مستأجر',
  29, 2, 10, 15, 2, false, 1,
  '["2 properties","10 units","15 tenants","Basic reports","Email support","PDF export"]',
  '["عقارين","10 وحدات","15 مستأجر","تقارير أساسية","دعم بالبريد","تصدير PDF"]'
),
(
  'pro', 'Pro', 'احترافي',
  'Up to 10 properties · 50 units · 75 tenants',
  'حتى 10 عقارات · 50 وحدة · 75 مستأجر',
  79, 10, 50, 75, 10, true, 2,
  '["10 properties","50 units","75 tenants","Advanced reports","Priority support","Maintenance team","PDF export","Online rent payment"]',
  '["10 عقارات","50 وحدة","75 مستأجر","تقارير متقدمة","دعم أولوية","فريق صيانة","تصدير PDF","دفع الإيجار أونلاين"]'
),
(
  'enterprise', 'Enterprise', 'مؤسسي',
  'Up to 20 properties · Unlimited units & tenants',
  'حتى 20 عقاراً · وحدات ومستأجرون غير محدودين',
  199, 20, -1, -1, -1, false, 3,
  '["20 properties","Unlimited units","Unlimited tenants","Smart analytics","Dedicated manager","API access","Full customization","SLA guarantee"]',
  '["20 عقاراً","وحدات غير محدودة","مستأجرون غير محدودين","تحليلات ذكية","مدير مخصص","API access","تخصيص كامل","ضمان مستوى الخدمة"]'
)
ON CONFLICT (slug) DO NOTHING;

-- RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read active plans (landing page + register)
CREATE POLICY "public read active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- Superadmin reads ALL (including inactive)
CREATE POLICY "superadmin read all plans"
  ON subscription_plans FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- Superadmin can INSERT / UPDATE / DELETE
CREATE POLICY "superadmin manage plans"
  ON subscription_plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
