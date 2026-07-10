-- Migration 007: Add max_properties to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS max_properties int NOT NULL DEFAULT 2;

-- Set correct limits for existing orgs based on their plan
UPDATE public.organizations SET max_properties = 2   WHERE subscription_plan = 'basic';
UPDATE public.organizations SET max_properties = 10  WHERE subscription_plan = 'pro';
UPDATE public.organizations SET max_properties = 20 WHERE subscription_plan = 'enterprise';
