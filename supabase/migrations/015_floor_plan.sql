-- Add floor_plan_url to units table
ALTER TABLE units ADD COLUMN IF NOT EXISTS floor_plan_url TEXT;

-- Create storage bucket for floor plans (run in Supabase dashboard if not exists)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('floor-plans', 'floor-plans', true)
-- ON CONFLICT DO NOTHING;

-- RLS: owners can upload floor plans for their own org's units
-- Storage policies are managed in Supabase dashboard
